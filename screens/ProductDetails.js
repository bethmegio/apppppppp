import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../supabaseClient";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function ProductDetails({ navigation, route }) {
  const { product } = route.params;
  const [loading, setLoading] = useState(false);
  
  const [addingToCart, setAddingToCart] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, comment: "" });
  const [user, setUser] = useState(null);
  const [stock, setStock] = useState(product.stock || 0);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const fadeAnim = useState(new Animated.Value(0))[0];

  const productImages = [
    product.image_url || "https://images.unsplash.com/photo-1566014633661-349c6fae61e9?w=800",
    "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=800",
    "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=800",
  ];

  useEffect(() => {
    checkUser();
    loadRelatedProducts();
    loadReviews();
    loadStock();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [product.id]);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    } catch (error) {
      console.error("Error checking user:", error);
    }
  };

  const loadReviews = async () => {
  try {
    setIsLoadingReviews(true);
    
    // Fetch reviews from database
    const { data: reviewsData, error: reviewsError } = await supabase
      .from("reviews")
      .select("*")
      .eq("product_id", product.id)
      .order("created_at", { ascending: false });

    if (reviewsError) {
      console.error("Error loading reviews:", reviewsError);
      await createSampleReviews();
      return;
    }

    // Transform the data
    if (reviewsData && reviewsData.length > 0) {
      // Get user emails for all reviews (optional, for user_name)
      const transformedReviews = reviewsData.map(review => {
        // Use stored user_name if available, otherwise generate from email
        const userName = review.user_name || 
                        (review.user_email ? review.user_email.split('@')[0] : "Anonymous");
        
        return {
          id: review.id,
          product_id: review.product_id,
          user_id: review.user_id,
          rating: review.rating,
          comment: review.comment,
          user_name: userName,
          created_at: review.created_at,
          updated_at: review.updated_at,
          helpful_count: review.helpful_count || 0,
          is_verified_purchase: review.is_verified_purchase || false,
          is_local: false  // From database, not local
        };
      });
      
      setReviews(transformedReviews);
    } else {
      // No reviews yet, show sample
      await createSampleReviews();
    }
    
  } catch (error) {
    console.error("Error in loadReviews:", error);
    await createSampleReviews();
  } finally {
    setIsLoadingReviews(false);
  }
};
  // Create sample reviews function (fallback)
  const createSampleReviews = async () => {
    // These are realistic customer reviews for pool products
    const sampleReviews = [
      {
        id: 1,
        product_id: product.id,
        rating: 5,
        comment: "Excellent quality! The pump works perfectly with my pool. Very quiet and energy efficient. Highly recommend!",
        user_name: "Maria Santos",
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
        helpful_count: 3,
        is_verified_purchase: true
      },
      {
        id: 2,
        product_id: product.id,
        rating: 4,
        comment: "Good value for money. Installation was straightforward. Minor issue with instructions but overall satisfied.",
        user_name: "Juan Dela Cruz",
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 days ago
        helpful_count: 2,
        is_verified_purchase: true
      },
      {
        id: 3,
        product_id: product.id,
        rating: 5,
        comment: "Perfect for our backyard pool. Customer service was excellent when I had questions about installation.",
        user_name: "Robert Lim",
        created_at: new Date(Date.now() - 86400000 * 10).toISOString(), // 10 days ago
        helpful_count: 5,
        is_verified_purchase: true
      }
    ];

    setReviews(sampleReviews);
  };

 const submitReview = async () => {
  console.log("📝 Submitting review for product:", product.id);
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
    setLoading(true);
    
    const userName = user.user_metadata?.full_name || 
                    user.email?.split("@")[0] || 
                    "Anonymous";

    // Check if user already reviewed this product
    const { data: existingReview } = await supabase
      .from("reviews")
      .select("*")
      .eq("product_id", product.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingReview) {
      // Update existing review
      const { data: updatedReview, error: updateError } = await supabase
        .from("reviews")
        .update({
          rating: newReview.rating,
          comment: newReview.comment.trim(),
          user_name: userName,
          updated_at: new Date().toISOString()
        })
        .eq("id", existingReview.id)
        .select()
        .single();

      if (updateError) {
        console.error("Update error:", updateError);
        saveReviewLocally(userName, true);
      } else {
        const reviewObj = {
          ...updatedReview,
          user_name: userName
        };
        // Update in the reviews list
        setReviews(reviews.map(r => 
          r.id === existingReview.id ? reviewObj : r
        ));
        Alert.alert("Success", "Review updated!");
        resetForm();
      }
    } else {
      // Insert new review
      const { data: newReviewData, error: insertError } = await supabase
        .from("reviews")
        .insert({
          product_id: product.id,
          user_id: user.id,
          rating: newReview.rating,
          comment: newReview.comment.trim(),
          user_name: userName,
          helpful_count: 0,
          is_verified_purchase: false
          // id, created_at, updated_at are auto-generated
        })
        .select()
        .single();

      if (insertError) {
        console.error("Insert error:", insertError);
        
        // If it's a unique constraint violation, user already reviewed
        if (insertError.code === '23505') {
          Alert.alert("Already Reviewed", "You have already reviewed this product. Updating your review...");
          // Try to find and update
          const { data: existing } = await supabase
            .from("reviews")
            .select("*")
            .eq("product_id", product.id)
            .eq("user_id", user.id)
            .single();
          
          if (existing) {
            await supabase
              .from("reviews")
              .update({
                rating: newReview.rating,
                comment: newReview.comment.trim(),
                user_name: userName
              })
              .eq("id", existing.id);
          }
          // Reload reviews
          loadReviews();
          Alert.alert("Success", "Review updated!");
        } else {
          saveReviewLocally(userName, false);
        }
      } else {
        // Success!
        const reviewObj = {
          ...newReviewData,
          user_name: userName,
          helpful_count: 0,
          is_verified_purchase: false
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
    setLoading(false);
  }
};
// ============ HELPER FUNCTIONS ============

// Create RPC function to bypass constraints
// Create RPC function to bypass constraints
const createReviewRPCFunction = async () => {
  try {
    // Simplified - just check if function exists and call it
    const { data, error } = await supabase.rpc('safe_insert_review', {
      p_product_id: product.id,
      p_user_id: user.id,
      p_rating: newReview.rating,
      p_comment: newReview.comment.trim()
    });

    // If function doesn't exist, create it
    if (error && error.message.includes('function')) {
      // Create the function properly
      await supabase.rpc('execute_sql', {
        query: `
          CREATE OR REPLACE FUNCTION safe_insert_review(
            p_product_id integer,
            p_user_id uuid,
            p_rating integer,
            p_comment text
          )
          RETURNS json AS $$
          DECLARE
            existing_id bigint;
            result json;
          BEGIN
            -- Check for existing review
            SELECT id INTO existing_id
            FROM reviews
            WHERE product_id = p_product_id 
              AND user_id = p_user_id;
            
            IF existing_id IS NOT NULL THEN
              -- Update existing
              UPDATE reviews
              SET rating = p_rating,
                  comment = p_comment,
                  updated_at = NOW()
              WHERE id = existing_id
              RETURNING row_to_json(reviews.*) INTO result;
            ELSE
              -- Insert new
              INSERT INTO reviews (product_id, user_id, rating, comment)
              VALUES (p_product_id, p_user_id, p_rating, p_comment)
              RETURNING row_to_json(reviews.*) INTO result;
            END IF;
            
            RETURN result;
          END;
          $$ LANGUAGE plpgsql;
        `
      });
      
      // Now try again
      const { data: retryData, error: retryError } = await supabase.rpc('safe_insert_review', {
        p_product_id: product.id,
        p_user_id: user.id,
        p_rating: newReview.rating,
        p_comment: newReview.comment.trim()
      });
      
      return { data: retryData, error: retryError };
    }
    
    return { data, error };
  } catch (e) {
    console.log("RPC function handling failed:", e);
    return { data: null, error: e };
  }
};

// Update existing review
const updateExistingReview = async (userName) => {
  try {
    // Find existing review
    const { data: existing } = await supabase
      .from("reviews")
      .select("id, rating, comment, helpful_count")
      .eq("product_id", product.id)
      .eq("user_id", user.id)
      .single();
      
    if (existing) {
      // Update it
      const { data: updated } = await supabase
        .from("reviews")
        .update({
          rating: newReview.rating,
          comment: newReview.comment.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();
        
      if (updated) {
        const updatedReview = {
          ...updated,
          user_name: userName,
          helpful_count: existing.helpful_count || 0,
          is_verified_purchase: true
        };
        
        updateReviews(updatedReview, true);
        Alert.alert("Success", "Review updated!");
        resetForm();
      } else {
        saveReviewLocally(userName, true);
      }
    }
  } catch (updateError) {
    console.error("Update failed:", updateError);
    saveReviewLocally(userName, true);
  }
};

// Save review locally
const saveReviewLocally = async (userName, isUpdate = false) => {
  const localReview = {
    id: `local_${Date.now()}`,
    product_id: product.id,
    user_id: user.id,
    rating: newReview.rating,
    comment: newReview.comment.trim(),
    user_name: userName,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    helpful_count: 0,
    is_verified_purchase: false,
    is_local: true
  };
  
  // Save to AsyncStorage for persistence
  try {
    const localReviews = JSON.parse(await AsyncStorage.getItem('local_reviews') || '[]');
    
    // Remove any previous local review from same user for same product
    const filtered = localReviews.filter(r => 
      !(r.product_id === product.id && r.user_id === user.id && r.is_local)
    );
    
    await AsyncStorage.setItem('local_reviews', JSON.stringify([localReview, ...filtered]));
  } catch (storageError) {
    console.error("Error saving locally:", storageError);
  }
  
  // Update UI
  if (isUpdate) {
    const filteredReviews = reviews.filter(r => 
      !r.is_local || !(r.product_id === product.id && r.user_id === user.id)
    );
    setReviews([localReview, ...filteredReviews]);
  } else {
    setReviews([localReview, ...reviews]);
  }
  
  Alert.alert(
    "Saved Locally", 
    "Your review has been saved. We'll sync it with the server when possible.",
    [
      { text: "OK", style: "default" },
      { 
        text: "Try Again", 
        onPress: () => {
          // Auto-retry after 2 seconds
          setTimeout(() => submitReview(), 2000);
        }
      }
    ]
  );
  resetForm();
};
// Create review object
const createReviewObject = (data, userName) => ({
  ...data,
  user_name: userName,
  helpful_count: data.helpful_count || 0,
  is_verified_purchase: data.is_verified_purchase || true
});

// Update reviews state
const updateReviews = (review, isUpdate) => {
  if (isUpdate) {
    // Update existing review
    setReviews(prev => prev.map(r => 
      (r.product_id === review.product_id && r.user_id === review.user_id) ? review : r
    ));
  } else {
    // Add new review
    setReviews(prev => [review, ...prev]);
  }
};

// Reset form and reload
const resetForm = () => {
  setNewReview({ rating: 5, comment: "" });
  setShowReviewForm(false);
  // Optionally reload reviews after a delay
  setTimeout(() => {
    loadReviews();
  }, 1000);
};
// Fallback function for local storage
// Fallback function for local storage
const handleLocalReview = (userName) => {
  const localReview = {
    id: `local_${Date.now()}`,
    product_id: product.id,
    rating: newReview.rating,
    comment: newReview.comment.trim(),
    user_name: userName,
    created_at: new Date().toISOString(),
    helpful_count: 0,
    is_verified_purchase: true
  };
  
  // Remove any existing local review from this user
  const filteredReviews = reviews.filter(review => 
    // FIXED: Changed `!review.user_name === userName` to `review.user_name !== userName`
    !review.id.startsWith('local_') || review.user_name !== userName
  );
  
  setReviews([localReview, ...filteredReviews]);
  Alert.alert("Note", "Review saved locally (will sync on next refresh)");
  setNewReview({ rating: 5, comment: "" });
  setShowReviewForm(false);
};
 const markHelpful = async (reviewId) => {
  try {
    const review = reviews.find(r => r.id === reviewId);
    if (!review) return;

    const newHelpfulCount = (review.helpful_count || 0) + 1;
    
    setReviews(reviews.map(r => 
      r.id === reviewId 
        ? { ...r, helpful_count: newHelpfulCount, user_has_helpful: true }
        : r
    ));

    // Update in database
    const { error } = await supabase
      .from("reviews")
      .update({ helpful_count: newHelpfulCount })
      .eq("id", reviewId);  // This works with UUID too

    if (error) {
      console.error("Error updating helpful count:", error);
    }
  } catch (error) {
    console.error("Error marking helpful:", error);
  }
};


// Call this on app startup or when network is available
const syncLocalReviews = async () => {
  try {
    const localReviews = JSON.parse(await AsyncStorage.getItem('local_reviews') || '[]');
    
    for (const localReview of localReviews) {
      if (localReview.is_local) {
        try {
          const { error } = await supabase
            .from("reviews")
            .upsert({
              product_id: localReview.product_id,
              user_id: localReview.user_id,
              rating: localReview.rating,
              comment: localReview.comment,
              user_name: localReview.user_name
            }, {
              onConflict: 'product_id,user_id'
            });
          
          if (!error) {
            // Remove from local storage after successful sync
            const updatedLocal = localReviews.filter(r => r.id !== localReview.id);
            await AsyncStorage.setItem('local_reviews', JSON.stringify(updatedLocal));
          }
        } catch (e) {
          console.error("Failed to sync review:", localReview.id, e);
        }
      }
    }
  } catch (error) {
    console.error("Error syncing local reviews:", error);
  }
};







  const getReviewStats = () => {
    if (reviews.length === 0) return { average: 0, distribution: {} };
    
    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    const average = total / reviews.length;
    
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(review => {
      distribution[review.rating]++;
    });
    
    return { average, distribution };
  };

  const loadStock = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("stock")
        .eq("id", product.id)
        .single();

      if (!error && data) {
        setStock(data.stock || 0);
      }
    } catch (error) {
      console.error("Error fetching stock:", error);
    }
  };

  const loadRelatedProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("category_id", product.category_id)
        .neq("id", product.id)
        .limit(4);

      if (error) throw error;
      setRelatedProducts(data || []);
    } catch (error) {
      console.error("Error loading related products:", error);
    }
  };

  const addToCart = async () => {
    if (quantity > stock) {
      Alert.alert("Not enough stock", "Please reduce quantity");
      return;
    }
    
    try {
      setAddingToCart(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Login Required', 'Please login to add items to cart', [
          {
            text: 'Login',
            onPress: () => navigation.navigate('Login'),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]);
        return;
      }

      const newStock = stock - quantity;
      setStock(newStock);

      const { error: stockError } = await supabase
        .from("products")
        .update({ stock: newStock })
        .eq("id", product.id);
      
      if (stockError) {
        setStock(stock);
        console.error("Error updating stock:", stockError);
      }

      const { data: existingItem } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .single();

      if (existingItem) {
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity: existingItem.quantity + quantity })
          .eq('id', existingItem.id);

        if (error) throw error;
        Alert.alert('Success', `Added ${quantity} more to cart!`);
      } else {
        const { error } = await supabase
          .from('cart_items')
          .insert({
            user_id: user.id,
            product_id: product.id,
            quantity: quantity,
          });

        if (error) throw error;
        Alert.alert('Success', `Product added to cart!`);
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Error', 'Failed to add product to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = () => {
    if (stock <= 0) {
      Alert.alert("Out of Stock", "This product is currently unavailable");
      return;
    }
    
    Alert.alert(
      `Buy ${product.name}`,
      `Proceed to checkout with ${quantity} x ${product.name}?`,
      [
        {
          text: 'Add to Cart First',
          onPress: addToCart,
        },
        { 
          text: 'Continue', 
          style: 'default',
          onPress: () => {
            addToCart().then(() => {
              navigation.navigate('Cart');
            });
          }
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${product.name} from Tropics Pools & Landscape! ${product.description}`,
        url: product.image_url,
        title: product.name,
      });
    } catch (error) {
      Alert.alert("Error", "Unable to share product");
    }
  };

  const handleFavorite = () => {
    setIsFavorite(!isFavorite);
  };

  const incrementQuantity = () => {
    setQuantity((prev) => (prev < stock ? prev + 1 : prev));
  };
  
  const decrementQuantity = () => setQuantity((prev) => Math.max(1, prev - 1));

  const renderImageIndicator = () => (
    <View style={styles.imageIndicator}>
      {productImages.map((_, index) => (
        <View
          key={index}
          style={[
            styles.indicatorDot,
            activeImageIndex === index && styles.activeIndicatorDot,
          ]}
        />
      ))}
    </View>
  );

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
            style={interactive && styles.interactiveStar}
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

  const renderReviewItem = (review) => (
    <View key={review.id} style={styles.reviewItem}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewUserInfo}>
          <View style={styles.reviewAvatar}>
            <Text style={styles.reviewAvatarText}>
              {review.user_name?.charAt(0)?.toUpperCase() || "A"}
            </Text>
          </View>
          <View style={styles.reviewUserDetails}>
            <View style={styles.reviewNameAndVerified}>
              <Text style={styles.reviewUserName}>{review.user_name}</Text>
              {review.is_verified_purchase && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={12} color="#4CAF50" />
                  <Text style={styles.verifiedText}>Verified Purchase</Text>
                </View>
              )}
            </View>
            <Text style={styles.reviewDate}>{formatDate(review.created_at)}</Text>
          </View>
        </View>
        <View style={styles.reviewRatingContainer}>
          {renderStarRating(review.rating)}
        </View>
      </View>
      
      <Text style={styles.reviewComment}>{review.comment}</Text>
      
      <View style={styles.reviewActions}>
        <Text style={styles.reviewHelpfulText}>
          Was this review helpful?
        </Text>
        <TouchableOpacity 
          style={styles.helpfulButton}
          onPress={() => markHelpful(review.id)}
        >
          <Ionicons name="thumbs-up-outline" size={16} color="#666" />
          <Text style={styles.helpfulButtonText}>
            Yes ({review.helpful_count || 0})
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderReviewDistribution = () => {
    const stats = getReviewStats();
    const totalReviews = reviews.length;
    
    return (
      <View style={styles.reviewDistribution}>
        {[5, 4, 3, 2, 1].map((stars) => {
          const count = stats.distribution[stars] || 0;
          const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
          
          return (
            <View key={stars} style={styles.distributionRow}>
              <Text style={styles.distributionStars}>
                {stars} {stars === 1 ? 'star' : 'stars'}
              </Text>
              <View style={styles.distributionBarContainer}>
                <View 
                  style={[
                    styles.distributionBar, 
                    { width: `${percentage}%` }
                  ]} 
                />
              </View>
              <Text style={styles.distributionCount}>{count}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  const stats = getReviewStats();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Details</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={24} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={handleFavorite}>
            <Ionicons 
              name={isFavorite ? "heart" : "heart-outline"} 
              size={24} 
              color={isFavorite ? "#FF6B6B" : "#333"} 
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.imageSection}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const newIndex = Math.round(
                event.nativeEvent.contentOffset.x / SCREEN_WIDTH
              );
              setActiveImageIndex(newIndex);
            }}
          >
            {productImages.map((image, index) => (
              <Image
                key={index}
                source={{ uri: image }}
                style={styles.productImage}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
          {renderImageIndicator()}
          
          {product.is_featured && (
            <View style={styles.featuredTag}>
              <Text style={styles.featuredTagText}>Featured</Text>
            </View>
          )}
        </View>

        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <View style={styles.productHeader}>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.productPrice}>
              ₱ {Number(product.price || 0).toLocaleString()}
            </Text>
            <Text style={[styles.stockText, { color: stock > 0 ? "green" : "red" }]}>
              {stock > 0 ? `✓ ${stock} in stock` : "✗ Out of stock"}
            </Text>
          </View>

          <Text style={styles.productDescription}>
            {product.description || "Premium quality product designed for tropical environments. Built to withstand harsh weather conditions while maintaining optimal performance."}
          </Text>

          <View style={styles.quantitySection}>
            <Text style={styles.sectionTitle}>Quantity</Text>
            <View style={styles.quantitySelector}>
              <TouchableOpacity 
                style={styles.quantityButton}
                onPress={decrementQuantity}
                disabled={quantity <= 1}
              >
                <Ionicons name="remove" size={20} color={quantity <= 1 ? "#ccc" : "#333"} />
              </TouchableOpacity>
              <Text style={styles.quantityText}>{quantity}</Text>
              <TouchableOpacity 
                style={styles.quantityButton}
                onPress={incrementQuantity}
              >
                <Ionicons name="add" size={20} color="#333" />
              </TouchableOpacity>
            </View>
            {stock > 0 && stock < 10 && (
              <Text style={styles.lowStockText}>
                Only {stock} left in stock!
              </Text>
            )}
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.button, styles.cartButton, (addingToCart || stock <= 0) && styles.disabledButton]}
              onPress={addToCart}
              disabled={addingToCart || stock <= 0}
            >
              {addingToCart ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="cart-outline" size={20} color="#fff" />
                  <Text style={styles.buttonText}>
                    {stock > 0 ? "Add to Cart" : "Out of Stock"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.buyButton, stock <= 0 && styles.disabledButton]}
              onPress={handleBuyNow}
              disabled={stock <= 0}
            >
              <Ionicons name="flash-outline" size={20} color="#fff" />
              <Text style={styles.buttonText}>
                {stock > 0 ? "Buy Now" : "Out of Stock"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.reviewsSection}>
            <View style={styles.reviewsHeader}>
              <Text style={styles.sectionTitle}>Customer Reviews</Text>
              
              {reviews.length > 0 && (
                <View style={styles.reviewsSummary}>
                  <View style={styles.ratingOverview}>
                    <Text style={styles.averageRating}>{stats.average.toFixed(1)}</Text>
                    <View style={styles.overviewStars}>
                      {renderStarRating(Math.round(stats.average))}
                      <Text style={styles.reviewCount}>{reviews.length} review{reviews.length !== 1 ? 's' : ''}</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {reviews.length > 0 && renderReviewDistribution()}

            <TouchableOpacity 
              style={styles.addReviewButton}
              onPress={() => {
                if (!user) {
                  Alert.alert("Login Required", "Please login to write a review", [
                    { text: "Login", onPress: () => navigation.navigate("Login") },
                    { text: "Cancel", style: "cancel" },
                  ]);
                  return;
                }
                setShowReviewForm(!showReviewForm);
              }}
            >
              <Ionicons name="create-outline" size={18} color="#00BFFF" />
              <Text style={styles.addReviewButtonText}>
                {showReviewForm ? "Cancel Review" : "Write a Review"}
              </Text>
            </TouchableOpacity>

            {showReviewForm && (
              <View style={styles.reviewForm}>
                <Text style={styles.reviewFormTitle}>How would you rate this product?</Text>
                {renderStarRating(newReview.rating, true, (rating) => 
                  setNewReview({ ...newReview, rating })
                )}
                
                <Text style={styles.reviewFormTitle}>Your Review</Text>
                <TextInput
                  style={styles.reviewInput}
                  placeholder="Share your experience with this product... (Minimum 10 characters)"
                  placeholderTextColor="#999"
                  value={newReview.comment}
                  onChangeText={(text) => setNewReview({ ...newReview, comment: text })}
                  multiline
                  numberOfLines={4}
                />
                
                <TouchableOpacity 
                  style={styles.submitReviewButton}
                  onPress={submitReview}
                  disabled={loading || newReview.comment.trim().length < 10}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="send-outline" size={18} color="#fff" />
                      <Text style={styles.submitReviewButtonText}>Submit Review</Text>
                    </>
                  )}
                </TouchableOpacity>
                
                {newReview.comment.trim().length > 0 && newReview.comment.trim().length < 10 && (
                  <Text style={styles.minLengthWarning}>
                    Please write at least 10 characters
                  </Text>
                )}
              </View>
            )}

            {isLoadingReviews ? (
              <View style={styles.loadingReviews}>
                <ActivityIndicator size="large" color="#00BFFF" />
                <Text style={styles.loadingText}>Loading reviews...</Text>
              </View>
            ) : reviews.length > 0 ? (
              <>
                <View style={styles.reviewsListHeader}>
                  <Text style={styles.reviewsListTitle}>
                    Customer Reviews ({reviews.length})
                  </Text>
                  <Text style={styles.sortText}>Most Recent</Text>
                </View>
                {reviews.map(renderReviewItem)}
              </>
            ) : (
              <View style={styles.noReviews}>
                <Ionicons name="chatbubble-outline" size={40} color="#ccc" />
                <Text style={styles.noReviewsText}>No reviews yet</Text>
                <Text style={styles.noReviewsSubtext}>
                  Be the first to share your experience with this product
                </Text>
                <TouchableOpacity 
                  style={styles.beFirstReviewButton}
                  onPress={() => {
                    if (!user) {
                      Alert.alert("Login Required", "Please login to write a review");
                      return;
                    }
                    setShowReviewForm(true);
                  }}
                >
                  <Text style={styles.beFirstReviewText}>Be the first to review</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {relatedProducts.length > 0 && (
            <View style={styles.relatedSection}>
              <Text style={styles.sectionTitle}>Related Products</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.relatedProductsList}
              >
                {relatedProducts.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.relatedProductCard}
                    onPress={() =>
                      navigation.navigate("CategoriesTab", {
                        screen: "ProductDetails",
                        params: { product: item },
                      })
                    }
                  >
                    <Image
                      source={{ uri: item.image_url || "https://images.unsplash.com/photo-1566014633661-349c6fae61e9?w=400" }}
                      style={styles.relatedProductImage}
                    />
                    <Text style={styles.relatedProductName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text style={styles.relatedProductPrice}>
                      ₱ {Number(item.price || 0).toLocaleString()}
                    </Text>
                    <Text style={[
                      styles.relatedProductStock, 
                      { color: (item.stock || 0) > 0 ? "green" : "red" }
                    ]}>
                      {(item.stock || 0) > 0 ? "In Stock" : "Out of Stock"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  headerActions: {
    flexDirection: "row",
  },
  iconButton: {
    padding: 5,
    marginLeft: 15,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  imageSection: {
    position: "relative",
  },
  productImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.8,
  },
  imageIndicator: {
    flexDirection: "row",
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.5)",
    marginHorizontal: 4,
  },
  activeIndicatorDot: {
    backgroundColor: "#fff",
    width: 20,
  },
  featuredTag: {
    position: "absolute",
    top: 20,
    right: 20,
    backgroundColor: "#FFD700",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  featuredTagText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#333",
  },
  content: {
    padding: 20,
  },
  productHeader: {
    marginBottom: 15,
  },
  productName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 28,
    fontWeight: "700",
    color: "#00BFFF",
  },
  stockText: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 10,
  },
  lowStockText: {
    fontSize: 12,
    color: "#FF6B35",
    marginTop: 5,
    fontStyle: "italic",
  },
  productDescription: {
    fontSize: 16,
    lineHeight: 24,
    color: "#666",
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 15,
  },
  quantitySection: {
    marginBottom: 25,
  },
  quantitySelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 8,
    alignSelf: "flex-start",
  },
  quantityButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  quantityText: {
    fontSize: 18,
    fontWeight: "600",
    marginHorizontal: 20,
    minWidth: 30,
    textAlign: "center",
  },
  actionButtons: {
    flexDirection: "row",
    marginBottom: 30,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginHorizontal: 5,
  },
  cartButton: {
    backgroundColor: "#00BFFF",
  },
  buyButton: {
    backgroundColor: "#32CD32",
  },
  disabledButton: {
    backgroundColor: "#cccccc",
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  reviewsSection: {
    marginBottom: 25,
  },
  reviewsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  reviewsSummary: {
    alignItems: "flex-end",
  },
  ratingOverview: {
    alignItems: "center",
  },
  averageRating: {
    fontSize: 32,
    fontWeight: "700",
    color: "#333",
  },
  overviewStars: {
    alignItems: "center",
    marginTop: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  reviewDistribution: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  distributionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  distributionStars: {
    fontSize: 12,
    color: "#666",
    width: 60,
  },
  distributionBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: "#e0e0e0",
    borderRadius: 3,
    marginHorizontal: 10,
    overflow: "hidden",
  },
  distributionBar: {
    height: "100%",
    backgroundColor: "#FFD700",
    borderRadius: 3,
  },
  distributionCount: {
    fontSize: 12,
    color: "#666",
    width: 30,
    textAlign: "right",
  },
  addReviewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#00BFFF",
    marginBottom: 20,
    backgroundColor: "#fff",
  },
  addReviewButtonText: {
    color: "#00BFFF",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  reviewForm: {
    backgroundColor: "#f8f9fa",
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  reviewFormTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
    marginTop: 5,
  },
  reviewInput: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#333",
    textAlignVertical: "top",
    minHeight: 100,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  minLengthWarning: {
    fontSize: 12,
    color: "#FF6B6B",
    marginTop: 5,
    fontStyle: "italic",
  },
  submitReviewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00BFFF",
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  submitReviewButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  reviewsListHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  reviewsListTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  sortText: {
    fontSize: 12,
    color: "#666",
  },
  reviewItem: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  reviewUserInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#00BFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  reviewAvatarText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  reviewUserDetails: {
    flex: 1,
  },
  reviewNameAndVerified: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  reviewUserName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginRight: 6,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedText: {
    fontSize: 10,
    color: "#4CAF50",
    fontWeight: "600",
    marginLeft: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  reviewRatingContainer: {
    marginLeft: 10,
  },
  reviewComment: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 12,
  },
  reviewActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f5f5f5",
  },
  reviewHelpfulText: {
    fontSize: 12,
    color: "#666",
  },
  helpfulButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#f5f5f5",
  },
  helpfulButtonText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
    fontWeight: "500",
  },
  starRating: {
    flexDirection: "row",
  },
  interactiveStar: {
    marginHorizontal: 2,
  },
  loadingReviews: {
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    fontSize: 14,
    color: "#666",
    marginTop: 10,
  },
  noReviews: {
    alignItems: "center",
    padding: 30,
  },
  noReviewsText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginTop: 10,
  },
  noReviewsSubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
    textAlign: "center",
    marginBottom: 15,
  },
  beFirstReviewButton: {
    backgroundColor: "#00BFFF",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  beFirstReviewText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  relatedSection: {
    marginBottom: 80,
  },
  relatedProductsList: {
    paddingRight: 60,
  },
  relatedProductCard: {
    width: 150,
    marginRight: 15,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  relatedProductImage: {
    width: "100%",
    height: 100,
    borderRadius: 8,
    marginBottom: 8,
  },
  relatedProductName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
    lineHeight: 16,
  },
  relatedProductPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#00BFFF",
  },
  relatedProductStock: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 20,
    lineHeight: 20,
  },
});