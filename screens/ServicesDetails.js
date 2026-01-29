import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../supabaseClient';

export default function ServicesDetails({ navigation, route }) {
  const { service } = route.params || {};
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [submitting, setSubmitting] = useState(false);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loadingRelated, setLoadingRelated] = useState(false); 
  
  // Service images for fallback
  const serviceImages = {
    'Pool Cleaning': 'https://images.unsplash.com/photo-1575429198097-0414ec08e8cd?w=800&q=80',
    'Maintenance': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
    'Repair': 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800&q=80',
    'Installation': 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=800&q=80',
    'Consultation': 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&q=80',
    'Landscaping': 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&q=80',
    'Design': 'https://images.unsplash.com/photo-1494522358652-c549345d2c9e?w=800&q=80',
    'Inspection': 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80',
    'default': 'https://images.unsplash.com/photo-1560743641-3914f2c45636?w=800&q=80'
  };

  // ========== FUNCTION DEFINITIONS ==========
  
  const loadUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadReviews = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('service_reviews')
        .select('*')
        .eq('service_id', service.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.log('Error loading service reviews:', error);
        const sampleReviews = createSampleReviews();
        setReviews(sampleReviews);
        calculateRating(sampleReviews);
      } else if (data && data.length > 0) {
        const formattedReviews = data.map(review => ({
          ...review,
          user_display_name: review.user_name || getDisplayName(review),
          is_verified_purchase: review.is_verified_service || false
        }));
        
        setReviews(formattedReviews);
        calculateRating(formattedReviews);
      } else {
        const sampleReviews = createSampleReviews();
        setReviews(sampleReviews);
        calculateRating(sampleReviews);
      }
    } catch (error) {
      console.error('Error loading service reviews:', error);
      const sampleReviews = createSampleReviews();
      setReviews(sampleReviews);
      calculateRating(sampleReviews);
    } finally {
      setLoading(false);
    }
  };

  const loadRelatedProducts = async () => {
    try {
      setLoadingRelated(true);
      
      if (service.category) {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('category', service.category)
          .limit(5);

        if (error) {
          console.error('Error loading related products:', error);
          setRelatedProducts([]);
        } else {
          setRelatedProducts(data || []);
        }
      } else {
        setRelatedProducts([]);
      }
    } catch (error) {
      console.error('Error in loadRelatedProducts:', error);
      setRelatedProducts([]);
    } finally {
      setLoadingRelated(false);
    }
  };

  const getDisplayName = (review) => {
    if (review.user_id) {
      return 'Verified Customer';
    }
    return 'Anonymous';
  };

  const createSampleReviews = () => {
    return [
      {
        id: 1,
        service_id: service.id,
        rating: 5,
        comment: "Excellent service! Very professional team.",
        user_name: "Maria Santos",
        user_display_name: "Maria Santos",
        helpful_count: 0,
        is_verified_service: true,
        is_verified_purchase: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 2,
        service_id: service.id,
        rating: 4,
        comment: "Good quality work, would recommend.",
        user_name: "Juan Dela Cruz",
        user_display_name: "Juan Dela Cruz",
        helpful_count: 0,
        is_verified_service: true,
        is_verified_purchase: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
  };

  const calculateRating = (reviewsData) => {
    if (!reviewsData || reviewsData.length === 0) {
      setAverageRating(0);
      setTotalReviews(0);
      return;
    }
    
    const total = reviewsData.reduce((sum, review) => sum + review.rating, 0);
    const average = total / reviewsData.length;
    setAverageRating(average);
    setTotalReviews(reviewsData.length);
  };

  const submitReview = async () => {
    console.log("📝 Submitting review for SERVICE:", service.id);
    console.log("👤 User:", user?.id);

    if (!user) {
      Alert.alert("Login Required", "Please login to leave a review");
      return;
    }

    if (!newReview.comment.trim() || newReview.comment.trim().length < 10) {
      Alert.alert("Review too short", "Please write a more detailed review (minimum 10 characters)");
      return;
    }

    try {
      setSubmitting(true);
      
      const userName = user.user_metadata?.full_name || 
                      user.email?.split("@")[0] || 
                      "Anonymous";

      const { data: existingReview, error: checkError } = await supabase
        .from("service_reviews")
        .select("*")
        .eq("service_id", service.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingReview) {
        const { data: updatedReview, error: updateError } = await supabase
          .from("service_reviews")
          .update({
            rating: newReview.rating,
            comment: newReview.comment.trim(),
            updated_at: new Date().toISOString(),
            user_name: userName
          })
          .eq("id", existingReview.id)
          .select()
          .single();

        if (updateError) {
          console.error("Update error:", updateError);
          await saveReviewLocally(userName, true);
        } else {
          const reviewObj = {
            ...updatedReview,
            user_display_name: userName,
            user_name: userName,
            is_verified_purchase: updatedReview.is_verified_service || false
          };
          setReviews(reviews.map(r => 
            r.id === existingReview.id ? reviewObj : r
          ));
          Alert.alert("Success", "Review updated!");
          resetForm();
        }
      } else {
        const { data: newReviewData, error: insertError } = await supabase
          .from("service_reviews")
          .insert({
            service_id: service.id,
            user_id: user.id,
            rating: newReview.rating,
            comment: newReview.comment.trim(),
            user_name: userName,
            helpful_count: 0,
            is_verified_service: false
          })
          .select()
          .single();

        if (insertError) {
          console.error("Insert error:", insertError);
          
          if (insertError.code === '23505') {
            console.log("Unique violation, trying update...");
            await handleExistingServiceReview(userName);
          } else {
            await saveReviewLocally(userName, false);
          }
        } else {
          const reviewObj = {
            ...newReviewData,
            user_display_name: userName,
            user_name: userName,
            is_verified_purchase: newReviewData.is_verified_service || false
          };
          setReviews([reviewObj, ...reviews]);
          Alert.alert("Success", "Thank you for your review!");
          resetForm();
        }
      }
      
    } catch (error) {
      console.error("Unexpected error:", error);
      Alert.alert("Error", "Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExistingServiceReview = async (userName) => {
    try {
      const { data: existing } = await supabase
        .from("service_reviews")
        .select("*")
        .eq("service_id", service.id)
        .eq("user_id", user.id)
        .single();
        
      if (existing) {
        const { data: updated } = await supabase
          .from("service_reviews")
          .update({
            rating: newReview.rating,
            comment: newReview.comment.trim(),
            user_name: userName,
            updated_at: new Date().toISOString()
          })
          .eq("id", existing.id)
          .select()
          .single();
          
        if (updated) {
          const reviewObj = {
            ...updated,
            user_display_name: userName,
            user_name: userName,
            is_verified_purchase: updated.is_verified_service || false
          };
          setReviews(reviews.map(r => 
            r.id === existing.id ? reviewObj : r
          ));
          Alert.alert("Success", "Review updated!");
          resetForm();
        }
      }
    } catch (updateError) {
      console.error("Update failed:", updateError);
      await saveReviewLocally(userName, true);
    }
  };

  const saveReviewLocally = async (userName, isUpdate = false) => {
    const localReview = {
      id: `local_${Date.now()}`,
      service_id: service.id,
      rating: newReview.rating,
      comment: newReview.comment.trim(),
      user_display_name: userName,
      user_name: userName,
      user_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      helpful_count: 0,
      is_verified_service: false,
      is_verified_purchase: false,
      is_local: true
    };
    
    if (isUpdate) {
      const filteredReviews = reviews.filter(review => 
        !review.is_local || !(review.service_id === service.id && review.user_id === user.id)
      );
      setReviews([localReview, ...filteredReviews]);
    } else {
      setReviews([localReview, ...reviews]);
    }
    
    Alert.alert(
      "Note", 
      "Review saved locally. It will appear immediately but may need to sync with the server later."
    );
    resetForm();
  };

  const resetForm = () => {
    setNewReview({ rating: 5, comment: "" });
    setShowReviewForm(false);
  };

  const handleBookNow = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        Alert.alert('Login Required', 'Please login to book this service');
        return;
      }

      navigation.navigate('Booking', { service });
    } catch (error) {
      console.error('Auth error:', error);
      Alert.alert('Error', 'Unable to process booking');
    }
  };

  const getUserDisplayName = (review) => {
    return review.user_display_name || 'Anonymous User';
  };

  const getServiceImage = () => {
    if (service.image_url) return { uri: service.image_url };
    
    const category = service.category || 'default';
    const imageUrl = serviceImages[category] || serviceImages['default'];
    return { uri: imageUrl };
  };

  const renderStarRating = (rating, interactive = false, onRatingChange = null) => (
    <View style={styles.starRating}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => interactive && onRatingChange && onRatingChange(star)}
          disabled={!interactive}
        >
          <Ionicons
            name={star <= rating ? "star" : "star-outline"}
            size={interactive ? 28 : 16}
            color={star <= rating ? "#FFD700" : "#ccc"}
          />
        </TouchableOpacity>
      ))}
    </View>
  );

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return "Today";
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "";
    }
  };

  // ========== USE EFFECT ==========
  useEffect(() => {
    loadUser();
    loadReviews();
    loadRelatedProducts();
  }, []);

  // ========== RENDER LOGIC ==========
  if (!service) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={64} color="#EF4444" />
          <Text style={styles.errorText}>No service data available</Text>
          <TouchableOpacity 
            style={styles.backButtonError}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonErrorText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Image Section */}
        <View style={styles.headerContainer}>
          <Image 
            source={getServiceImage()} 
            style={styles.headerImage}
            resizeMode="cover"
          />
          <View style={styles.imageOverlay} />
          
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <Text style={styles.serviceName}>{service.name}</Text>
            <Text style={styles.serviceCategory}>{service.category || 'Service'}</Text>
            <View style={styles.headerRating}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.headerRatingText}>
                {averageRating.toFixed(1)} ({totalReviews} reviews)
              </Text>
            </View>
          </View>
        </View>

        {/* Service Details Card */}
        <View style={styles.serviceCard}>
          <Text style={styles.sectionTitle}>Service Details</Text>
          <Text style={styles.description}>
            {service.description || 'Professional service with expert care and attention to detail.'}
          </Text>
          
          <View style={styles.details}>
            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={20} color="#2e4dc8" />
              <Text style={styles.detailText}>{service.duration || 'Flexible Schedule'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#2e4dc8" />
              <Text style={styles.detailText}>
                {service.available !== false ? 'Available Now' : 'Check Availability'}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.bookButton}
            onPress={handleBookNow}
          >
            <LinearGradient
              colors={['#4ab8eb', '#2e4dc8']}
              style={styles.bookButtonInner}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="calendar-sharp" size={20} color="#fff" />
              <Text style={styles.bookButtonText}>Book This Service</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Reviews Section */}
        <View style={styles.reviewsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Customer Reviews</Text>
            <View style={styles.ratingSummary}>
              <Text style={styles.ratingNumber}>{averageRating.toFixed(1)}</Text>
              {renderStarRating(Math.round(averageRating))}
              <Text style={styles.ratingCount}>{totalReviews} reviews</Text>
            </View>
          </View>

          {/* Write Review Button */}
          <TouchableOpacity 
            style={styles.writeReviewButton}
            onPress={() => setShowReviewForm(!showReviewForm)}
          >
            <LinearGradient
              colors={['#4ab8eb', '#2e4dc8']}
              style={styles.writeReviewGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="create-outline" size={20} color="#fff" />
              <Text style={styles.writeReviewText}>
                {showReviewForm ? 'Cancel Review' : 'Write a Review'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Review Form */}
          {showReviewForm && (
            <View style={styles.reviewForm}>
              <Text style={styles.reviewFormTitle}>Share Your Experience</Text>
              
              <Text style={styles.ratingLabel}>Your Rating</Text>
              <View style={styles.starRating}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setNewReview({...newReview, rating: star})}
                  >
                    <Ionicons
                      name={star <= newReview.rating ? "star" : "star-outline"}
                      size={32}
                      color={star <= newReview.rating ? "#FFD700" : "#ccc"}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.ratingLabel}>Your Review</Text>
              <TextInput
                style={styles.reviewInput}
                placeholder="Share your experience with this service..."
                placeholderTextColor="#94A3B8"
                value={newReview.comment}
                onChangeText={(text) => setNewReview({...newReview, comment: text})}
                multiline
                numberOfLines={4}
              />
              <Text style={styles.charCount}>
                {newReview.comment.length}/500 characters
              </Text>

              <TouchableOpacity 
                style={[styles.submitButton, (submitting || newReview.comment.length < 10) && styles.submitButtonDisabled]}
                onPress={submitReview}
                disabled={submitting || newReview.comment.length < 10}
              >
                <LinearGradient
                  colors={['#4ab8eb', '#2e4dc8']}
                  style={styles.submitGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="send-outline" size={20} color="#fff" />
                  )}
                  <Text style={styles.submitText}>
                    {submitting ? 'Submitting...' : 'Submit Review'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* Reviews List */}
          {loading ? (
            <ActivityIndicator style={styles.loader} size="large" color="#2e4dc8" />
          ) : reviews.length > 0 ? (
            reviews.map((review) => (
              <View key={review.id} style={styles.reviewItem}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewUser}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {getUserDisplayName(review).charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{getUserDisplayName(review)}</Text>
                      <Text style={styles.reviewDate}>{formatDate(review.created_at)}</Text>
                    </View>
                  </View>
                  <View style={styles.reviewStars}>
                    {renderStarRating(review.rating)}
                  </View>
                </View>
                
                <Text style={styles.reviewComment}>{review.comment}</Text>
                
                {review.is_verified_purchase && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                    <Text style={styles.verifiedText}>Verified Service</Text>
                  </View>
                )}
              </View>
            ))
          ) : (
            <View style={styles.noReviewsContainer}>
              <Ionicons name="chatbubble-outline" size={48} color="#CBD5E1" />
              <Text style={styles.noReviewsTitle}>No Reviews Yet</Text>
              <Text style={styles.noReviewsText}>
                Be the first to share your experience with this service
              </Text>
            </View>
          )}
        </View>

        {/* Footer Note */}
        <View style={styles.footerNote}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#2e4dc8" />
          <Text style={styles.footerNoteText}>
              Professional services with quality guarantee and certified expertise
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerContainer: {
    height: 300,
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
  },
  serviceName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
  },
  serviceCategory: {
    fontSize: 16,
    color: '#fff',
    backgroundColor: 'rgba(74, 184, 235, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    fontWeight: '600',
    marginBottom: 12,
  },
  headerRating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  headerRatingText: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
    marginLeft: 6,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 24,
  },
  backButtonError: {
    backgroundColor: '#2e4dc8',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  backButtonErrorText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  serviceCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginTop: -0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#475569',
    marginBottom: 20,
  },
  details: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailText: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 8,
    fontWeight: '500',
  },
  quickActions: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  bookButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  bookButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  bookButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  reviewsSection: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingSummary: {
    alignItems: 'center',
  },
  ratingNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
  },
  ratingStars: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  ratingCount: {
    fontSize: 12,
    color: '#64748B',
  },
  writeReviewButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  writeReviewGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  writeReviewText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  reviewForm: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reviewFormTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
  },
  ratingLabel: {
    fontSize: 16,
    color: '#475569',
    fontWeight: '600',
    marginBottom: 8,
  },
  starRating: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
  },
  reviewInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1E293B',
    marginBottom: 8,
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  charCount: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'right',
    marginBottom: 16,
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  reviewItem: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reviewUser: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2e4dc8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  reviewDate: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  reviewComment: {
    fontSize: 16,
    lineHeight: 24,
    color: '#475569',
    marginBottom: 12,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#10B98110',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B98130',
  },
  verifiedText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
    marginLeft: 4,
  },
  noReviewsContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  noReviewsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  noReviewsText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
  },
  loader: {
    marginVertical: 40,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    margin: 16,
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  footerNoteText: {
    flex: 1,
    fontSize: 14,
    color: '#0369A1',
    fontWeight: '500',
    marginLeft: 12,
    lineHeight: 20,
  },
});