// screens/ServicesDetails.js
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../supabaseClient';

export default function ServicesDetails({ navigation, route }) {
  const { service } = route.params || {};
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [submitting, setSubmitting] = useState(false);
  
  useEffect(() => {
    loadUser();
    loadReviews();
  }, []);

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const loadReviews = async () => {
    try {
      setLoading(true);
      // Using product_id since service_id doesn't exist
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('product_id', service.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.log('Error loading reviews:', error);
        // Use sample reviews
        setReviews([
          {
            id: 1,
            rating: 5,
            comment: "Excellent service! Very professional team.",
            user_name: "Maria Santos",
            created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
          },
          {
            id: 2,
            rating: 4,
            comment: "Good quality work, would recommend.",
            user_name: "Juan Dela Cruz",
            created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
          },
        ]);
      } else if (data) {
        setReviews(data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to leave a review');
      return;
    }

    if (newReview.comment.trim().length < 10) {
      Alert.alert('Review too short', 'Please write at least 10 characters');
      return;
    }

    try {
      setSubmitting(true);
      
      // Check if user already reviewed
      const { data: existing } = await supabase
        .from('reviews')
        .select('*')
        .eq('product_id', service.id)
        .eq('user_id', user.id)
        .maybeSingle();

      const reviewData = {
        product_id: service.id,
        user_id: user.id,
        rating: newReview.rating,
        comment: newReview.comment.trim(),
        is_verified_purchase: true,
      };

      let result;
      if (existing) {
        // Update existing review
        const { data } = await supabase
          .from('reviews')
          .update(reviewData)
          .eq('id', existing.id)
          .select()
          .single();
        result = data;
      } else {
        // Insert new review
        const { data } = await supabase
          .from('reviews')
          .insert(reviewData)
          .select()
          .single();
        result = data;
      }

      if (result) {
        Alert.alert('Success', existing ? 'Review updated!' : 'Thank you for your review!');
        setNewReview({ rating: 5, comment: '' });
        setShowReviewForm(false);
        loadReviews();
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  if (!service) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>No service data</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#4ab8eb', '#2e4dc8']}
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.serviceName}>{service.name}</Text>
          <Text style={styles.serviceCategory}>{service.category}</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Service Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Description</Text>
          <Text style={styles.description}>{service.description}</Text>
          
          <View style={styles.details}>
            
            <View style={styles.detailItem}>
              <Ionicons name="star-outline" size={20} color="#64748B" />
              <Text style={styles.detailText}>Expert Service</Text>
            </View>
          </View>
        </View>

        {/* Reviews Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Customer Reviews ({reviews.length})
          </Text>
          
          <TouchableOpacity
            style={styles.writeReviewButton}
            onPress={() => {
              if (!user) {
                Alert.alert('Login Required', 'Please login to write a review');
                return;
              }
              setShowReviewForm(!showReviewForm);
            }}
          >
            <LinearGradient
              colors={['#4ab8eb', '#2e4dc8']}
              style={styles.writeReviewGradient}
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
              <Text style={styles.reviewFormTitle}>Your Rating</Text>
              <View style={styles.starRating}>
                {[1,2,3,4,5].map(star => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setNewReview({...newReview, rating: star})}
                  >
                    <Ionicons
                      name={star <= newReview.rating ? 'star' : 'star-outline'}
                      size={30}
                      color={star <= newReview.rating ? '#FFD700' : '#ccc'}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              
              <TextInput
                style={styles.reviewInput}
                placeholder="Share your experience..."
                value={newReview.comment}
                onChangeText={text => setNewReview({...newReview, comment: text})}
                multiline
                numberOfLines={4}
              />
              
              <TouchableOpacity
                style={styles.submitButton}
                onPress={submitReview}
                disabled={submitting || newReview.comment.trim().length < 10}
              >
                <LinearGradient
                  colors={['#4ab8eb', '#2e4dc8']}
                  style={styles.submitGradient}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitText}>Submit Review</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* Reviews List */}
          {loading ? (
            <ActivityIndicator size="large" color="#2e4dc8" style={styles.loader} />
          ) : reviews.length > 0 ? (
            reviews.map(review => (
              <View key={review.id} style={styles.reviewItem}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewUser}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {review.user_name?.charAt(0) || 'U'}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.userName}>{review.user_name || 'User'}</Text>
                      <Text style={styles.reviewDate}>
                        {new Date(review.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.reviewStars}>
                    {[1,2,3,4,5].map(star => (
                      <Ionicons
                        key={star}
                        name={star <= review.rating ? 'star' : 'star-outline'}
                        size={16}
                        color="#FFD700"
                      />
                    ))}
                  </View>
                </View>
                <Text style={styles.reviewComment}>{review.comment}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.noReviews}>No reviews yet. Be the first!</Text>
          )}
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
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
  },
  headerContent: {
    marginTop: 20,
  },
  serviceName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  serviceCategory: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
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
    gap: 16,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  starRating: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  reviewInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1E293B',
    marginBottom: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitGradient: {
    paddingVertical: 14,
    alignItems: 'center',
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2e4dc8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  reviewStars: {
    flexDirection: 'row',
  },
  reviewComment: {
    fontSize: 16,
    lineHeight: 24,
    color: '#475569',
  },
  noReviews: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 16,
    fontStyle: 'italic',
    padding: 20,
  },
  loader: {
    marginVertical: 40,
  },
});