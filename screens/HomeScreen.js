import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { supabase } from "../supabaseClient";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const FALLBACK_BANNER = "https://images.unsplash.com/photo-1566014633661-349c6fae61e9?w=800";
const PAGE_SIZE = 10;

export default function HomeScreen({ navigation }) {
  const [banners, setBanners] = useState([]);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [featuredProjects, setFeaturedProjects] = useState([]);
  const [testimonials, setTestimonials] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');

  const scrollRef = useRef(null);
  const currentIndex = useRef(0);
  const autoScrollTimer = useRef(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;


  // Sample testimonials
  const sampleTestimonials = [
    { id: 1, text: "Transformed our backyard into paradise!", name: "Sarah M.", rating: 5 },
    { id: 2, text: "Professional service, amazing results.", name: "John D.", rating: 5 },
    { id: 3, text: "Best pool maintenance in town!", name: "Robert K.", rating: 5 },
    { id: 4, text: "Our pool has never looked better.", name: "Lisa T.", rating: 5 },
  ];

  // Color Scheme
  const colors = {
    primary: "#2e4dc8",
    secondary: "#4ab8eb",
    accent: "#8B5CF6",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    seasonal: "#FF6B6B",
    seasonalGradient: ["#FF6B6B", "#FF8E53"],
    dark: "#1E293B",
    medium: "#64748B",
    light: "#F1F5F9",
    white: "#FFFFFF",
    gradientStart: "#4ab8eb",
    gradientEnd: "#2e4dc8",
    background: "#F8FAFC",
    card: "#FFFFFF",
    textPrimary: "#1E293B",
    textSecondary: "#64748B",
  };

  // Facebook preview images (instead of Instagram)
  const facebookPosts = [
    { 
      id: 1, 
      image: "https://ohcpyffkzopsmktqudlh.supabase.co/storage/v1/object/public/services/tropics%203.jpg",
      likes: 245,
      comments: 32,
      shares: 12
    },
    { 
      id: 2, 
      image: "https://ohcpyffkzopsmktqudlh.supabase.co/storage/v1/object/public/services/tropics%201.jpg",
      likes: 189,
      comments: 24,
      shares: 8
    },
    { 
      id: 3, 
      image: "https://ohcpyffkzopsmktqudlh.supabase.co/storage/v1/object/public/services/trpics%202.jpg",
      likes: 312,
      comments: 45,
      shares: 15
    },
    { 
      id: 4, 
      image: "https://ohcpyffkzopsmktqudlh.supabase.co/storage/v1/object/public/services/pool-renovation.jpg",
      likes: 156,
      comments: 18,
      shares: 6
    },
    


  ];

  // Function to get image URL
  const getImageUrl = (path) => {
    if (!path) return FALLBACK_BANNER;
    
    if (path.startsWith('http')) return path;
    
    const { data } = supabase.storage.from('categories').getPublicUrl(path);
    return data.publicUrl || FALLBACK_BANNER;
  };

  useEffect(() => {
    loadAllInitial();
    return () => stopAutoScroll();
  }, []);

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading]);

  const loadAllInitial = async () => {
    try {
      setLoading(true);
      setError(null);

      const [banRes, catRes, servRes, projRes] = await Promise.all([
        supabase.from("banners").select("*").order("created_at", { ascending: false }).limit(10),
        supabase.from("categories").select("*").order("name", { ascending: true }),
        supabase.from("services").select("*").order("id", { ascending: true }),
        supabase.from("projects").select("*").eq("featured", true).limit(4)
      ]);

      if (banRes.error || catRes.error || servRes.error) {
        throw new Error(
          banRes.error?.message || catRes.error?.message || servRes.error?.message || "Failed to fetch data"
        );
      }

      setBanners(banRes.data?.length ? banRes.data : [{ id: "fallback", image_url: FALLBACK_BANNER }]);
      setCategories(catRes.data || []);
      setServices(servRes.data || []);
      setFeaturedProjects(projRes.data || []);
      setTestimonials(sampleTestimonials);

      await loadProducts({ reset: true });

      startAutoScroll();
    } catch (err) {
      setError(err.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async ({ reset = false } = {}) => {
    try {
      if (reset) {
        setPage(0);
        setHasMore(true);
      }
      if (!hasMore && !reset) return;

      if (reset) setLoadingMore(true);

      if (query?.trim()) {
        setSearching(true);
        const q = query.trim();
        const res = await supabase
          .from("products")
          .select("*")
          .ilike("name", `%${q}%`)
          .order("created_at", { ascending: false })
          .range(0, PAGE_SIZE - 1);

        if (res.error) throw res.error;

        setProducts(res.data || []);
        setHasMore((res.data || []).length === PAGE_SIZE);
        setSearching(false);
        setLoadingMore(false);
        return;
      }

      let prodRes = await supabase
        .from("products")
        .select("*")
        .eq("is_featured", true)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (prodRes.error || !prodRes.data?.length) {
        const start = reset ? 0 : page * PAGE_SIZE;
        const end = start + PAGE_SIZE - 1;

        prodRes = await supabase
          .from("products")
          .select("*")
          .order("created_at", { ascending: false })
          .range(start, end);
      }

      if (prodRes.error) throw prodRes.error;

      setProducts(reset ? prodRes.data : [...products, ...prodRes.data]);

      const fetched = prodRes.data?.length || 0;
      if (fetched < PAGE_SIZE) {
        setHasMore(false);
      } else {
        setHasMore(true);
        setPage((prev) => prev + 1);
      }
    } catch (err) {
      setError(err.message || "Could not load products");
    } finally {
      setLoadingMore(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllInitial();
    setRefreshing(false);
  };

  const startAutoScroll = () => {
    stopAutoScroll();
    if (banners.length <= 1) return;
    
    autoScrollTimer.current = setInterval(() => {
      currentIndex.current = (currentIndex.current + 1) % banners.length;
      scrollRef.current?.scrollTo({ 
        x: currentIndex.current * SCREEN_WIDTH, 
        animated: true 
      });
      setBannerIndex(currentIndex.current);
    }, 4000);
  };

  const stopAutoScroll = () => {
    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current);
      autoScrollTimer.current = null;
    }
  };

  const handleBannerScroll = (event) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.floor(contentOffset / SCREEN_WIDTH);
    currentIndex.current = index;
    setBannerIndex(index);
  };

  // ================= COMPONENTS =================

  // Seasonal Promotions Banner
  const SeasonalPromotions = () => (
    <TouchableOpacity 
      style={styles.seasonalContainer}
      onPress={() => {
        try {
          navigation.navigate("Products");
        } catch {
          navigation.navigate("Home");
        }
      }}
    >
      
    </TouchableOpacity>
  );

  

  // Facebook Preview with Gallery View
const FacebookPreview = () => {
  const FACEBOOK_PHOTOS_URL = "https://web.facebook.com/tropicspoolsandlandscape/Photos";
  const [selectedImage, setSelectedImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const openFacebookPhotos = async () => {
    try {
      await Linking.openURL(FACEBOOK_PHOTOS_URL);
    } catch (error) {
      console.error('Error opening Facebook:', error);
    }
  };

  const openImageModal = (index) => {
    setCurrentIndex(index);
    setSelectedImage(facebookPosts[index]);
    setModalVisible(true);
  };

  const goToNextImage = () => {
    const nextIndex = (currentIndex + 1) % facebookPosts.length;
    setCurrentIndex(nextIndex);
    setSelectedImage(facebookPosts[nextIndex]);
  };

  const goToPrevImage = () => {
    const prevIndex = (currentIndex - 1 + facebookPosts.length) % facebookPosts.length;
    setCurrentIndex(prevIndex);
    setSelectedImage(facebookPosts[prevIndex]);
  };

  return (
    <View style={styles.facebookSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Facebook Gallery</Text>
        <TouchableOpacity onPress={openFacebookPhotos}>
          <Text style={styles.seeAll}>Open Facebook</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.facebookCard}>
        <LinearGradient
          colors={['#1877F2', '#0D5BC2']}
          style={styles.facebookCardGradient}
        >
          <View style={styles.facebookCardContent}>
            <Ionicons name="logo-facebook" size={40} color="white" />
            <View style={styles.facebookCardText}>
              <Text style={styles.facebookCardTitle}>Project Gallery</Text>
              <Text style={styles.facebookCardSubtitle}>Tap images to view full screen</Text>
              <Text style={styles.facebookCardUrl}>tropicspoolsandlandscape</Text>
            </View>
            <TouchableOpacity onPress={openFacebookPhotos}>
              <Ionicons name="open-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.facebookPhotosPreview}>
            {facebookPosts.slice(0, 4).map((post, index) => (
              <TouchableOpacity 
                key={post.id} 
                onPress={() => openImageModal(index)}
                activeOpacity={0.7}
              >
                <Image 
                  source={{ uri: post.image }} 
                  style={[
                    styles.facebookPreviewImage,
                    { marginLeft: index > 0 ? -20 : 0 }
                  ]} 
                />
                {index === 3 && facebookPosts.length > 4 && (
                  <View style={styles.moreImagesOverlay}>
                    <Text style={styles.moreImagesText}>+{facebookPosts.length - 4}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
          
          <TouchableOpacity 
            style={styles.viewAllButton}
            onPress={() => openImageModal(0)}
          >
            <Text style={styles.viewAllButtonText}>View All Photos ({facebookPosts.length})</Text>
            <Ionicons name="images-outline" size={16} color="white" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </LinearGradient>
      </View>

      {/* Full Screen Image Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setModalVisible(false)}
            >
              <Ionicons name="close" size={30} color="white" />
            </TouchableOpacity>
            <View style={styles.modalTitleContainer}>
              <Text style={styles.modalTitle}>Project Gallery</Text>
              <Text style={styles.modalCounter}>
                {currentIndex + 1} / {facebookPosts.length}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.openFacebookButton}
              onPress={openFacebookPhotos}
            >
              <Ionicons name="logo-facebook" size={24} color="white" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalImageContainer}>
            <TouchableOpacity 
              style={styles.navButtonLeft}
              onPress={goToPrevImage}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={36} color="white" />
            </TouchableOpacity>

            <Image 
              source={{ uri: selectedImage?.image }} 
              style={styles.fullSizeImage}
              resizeMode="contain"
            />

            <TouchableOpacity 
              style={styles.navButtonRight}
              onPress={goToNextImage}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-forward" size={36} color="white" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalFooter}>
            <View style={styles.imageStats}>
              <View style={styles.statItem}>
                <Ionicons name="heart" size={18} color="#FF4757" />
                <Text style={styles.statText}>{selectedImage?.likes || 0}</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="chatbubble" size={18} color="#2ED573" />
                <Text style={styles.statText}>{selectedImage?.comments || 0}</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="share-social" size={18} color="#1E90FF" />
                <Text style={styles.statText}>{selectedImage?.shares || 0}</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.downloadButton}
              onPress={() => {
                // You could add image download functionality here
                alert('Image download feature would go here!');
              }}
            >
              <Ionicons name="download-outline" size={20} color="white" />
              <Text style={styles.downloadButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

 

  // Keep your existing renderCategoryItem, renderServiceCard, renderProjectCard functions
  const renderCategoryItem = ({ item, index }) => (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <TouchableOpacity
        style={styles.categoryCard}
        onPress={() => navigation.navigate("Categories", { id: item.id })}
      >
        <View style={styles.categoryImageContainer}>
          <Image
            source={{ uri: getImageUrl(item.image_url) }}
            style={styles.categoryImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.3)']}
            style={styles.categoryImageOverlay}
          />
          <View style={[styles.categoryIconWrapper, { backgroundColor: colors.primary }]}>
            <Ionicons 
              name="water-outline" 
              size={18} 
              color={colors.white} 
            />
          </View>
        </View>
        <Text style={styles.categoryText} numberOfLines={2}>
          {item.name}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderServiceCard = ({ item, index }) => (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateX: slideAnim }],
      }}
    >
      <TouchableOpacity 
        style={styles.serviceCard}
        onPress={() => navigation.navigate("Services")}
      >
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          style={styles.serviceGradient}
        >
          <Ionicons name="construct-outline" size={28} color={colors.white} />
        </LinearGradient>
        <Text numberOfLines={2} style={styles.serviceName}>
          {item?.name}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderProjectCard = ({ item, index }) => (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <TouchableOpacity 
        style={styles.projectCard}
        onPress={() => navigation.navigate("Projects")}
      >
        <Image
          source={{ uri: item?.image_url || FALLBACK_BANNER }}
          style={styles.projectImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.projectOverlay}
        >
          <Text style={styles.projectTitle}>{item?.title}</Text>
          <Text style={styles.projectLocation}>{item?.location}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  // Quick Actions Component
  const QuickActionButton = ({ icon, title, onPress, color = "#2e4dc8" }) => (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <LinearGradient
        colors={[color, `${color}DD`]}
        style={styles.quickActionGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Ionicons name={icon} size={24} color="#FFFFFF" />
      </LinearGradient>
      <Text style={styles.quickActionText}>{title}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2e4dc8" />
        <Text style={styles.loadingText}>Loading Tropics Pools...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="sad-outline" size={64} color="#EF4444" />
        <Text style={styles.errorText}>Oops! Something went wrong</Text>
        <Text style={styles.errorSubtext}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setError(null);
            loadAllInitial();
          }}
        >
          <LinearGradient
            colors={['#4ab8eb', '#2e4dc8']}
            style={styles.retryButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={["#2e4dc8"]}
            tintColor="#2e4dc8"
            progressBackgroundColor="#fff"
          />
        } 
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        data={[1]}
        renderItem={() => (
          <>
            {/* Professional Header */}
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              style={styles.header}
            >
              <View style={styles.headerTop}>
                <View style={styles.logoContainer}>
                  <LinearGradient
                    colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
                    style={styles.logoBackground}
                  >
                    <Image
                      source={require('../assets/logo.png')}
                      style={styles.logo}
                    />
                  </LinearGradient>
                </View>
                <View style={styles.headerTextContainer}>
                  <Text style={styles.companyName}>Tropics Pools & Landscape</Text>
                  
                </View>
              </View>
            </LinearGradient>

            {/* Seasonal Promotions */}
            <SeasonalPromotions />

            {/* Quick Actions Grid */}
            <View style={styles.quickActionsGrid}>
              <QuickActionButton
                icon="calendar-outline"
                title="Book Service"
                onPress={() => navigation.navigate("Services")}
              />
              <QuickActionButton
                icon="call-outline"
                title="Contact Us"
                onPress={() => navigation.navigate("Contact")}
              />
              <QuickActionButton
                icon="images-outline"
                title="Projects"
                onPress={() => navigation.navigate("Projects")}
              />
            </View>

            {/* Weather Widget with REAL API */}
          

            {/* Banner Carousel */}
            <View style={styles.bannerContainer}>
              <ScrollView
                ref={scrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onTouchStart={stopAutoScroll}
                onMomentumScrollEnd={handleBannerScroll}
                onScrollBeginDrag={stopAutoScroll}
                onScrollEndDrag={() => setTimeout(startAutoScroll, 5000)}
              >
                {banners.map((banner, index) => (
                  <Pressable 
                    key={banner?.id || index} 
                    onPress={() => {
                      try {
                        navigation.navigate("Products");
                      } catch {}
                    }} 
                    style={styles.bannerItem}
                  >
                    <Image 
                      source={{ uri: banner?.image_url || FALLBACK_BANNER }} 
                      style={styles.bannerImage} 
                      resizeMode="cover" 
                    />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.3)']}
                      style={styles.bannerOverlay}
                    />
                  </Pressable>
                ))}
              </ScrollView>
              
              <View style={styles.dotsContainer}>
                {banners.map((_, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => {
                      currentIndex.current = index;
                      scrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
                      setBannerIndex(index);
                    }}
                  >
                    <View 
                      style={[
                        styles.dot,
                        index === bannerIndex ? styles.activeDot : styles.inactiveDot
                      ]} 
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Product Categories Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Product Categories</Text>
                <TouchableOpacity onPress={() => navigation.navigate("Categories")}>
                  <Text style={styles.seeAll}>View All</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={categories}
                horizontal
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={styles.categoriesList}
                showsHorizontalScrollIndicator={false}
                renderItem={renderCategoryItem}
              />
            </View>

            {/* Services Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Our Services</Text>
                <TouchableOpacity onPress={() => navigation.navigate("Services")}>
                  <Text style={styles.seeAll}>View All</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={services}
                horizontal
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={styles.servicesList}
                showsHorizontalScrollIndicator={false}
                renderItem={renderServiceCard}
              />
            </View>

            {/* Featured Projects */}
            {featuredProjects.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Featured Projects</Text>
                  <TouchableOpacity onPress={() => navigation.navigate("Projects")}>
                    <Text style={styles.seeAll}>View All</Text>
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={featuredProjects}
                  horizontal
                  keyExtractor={(item) => `project-${item.id}`}
                  contentContainerStyle={styles.projectsList}
                  showsHorizontalScrollIndicator={false}
                  renderItem={renderProjectCard}
                />
              </View>
            )}

            {/* Facebook Preview */}
            <FacebookPreview />

            {/* Testimonials Slider */}
            

            {/* Footer Note with Bottom Padding */}
            <LinearGradient
              colors={['#4ab8eb20', '#2e4dc820']}
              style={styles.footerNote}
            >
              <Ionicons name="shield-checkmark-outline" size={20} color="#2e4dc8" />
              <Text style={styles.footerNoteText}>
                Quality service guaranteed. Professional pool and landscape solutions since 2010.
              </Text>
            </LinearGradient>
            
            
          </>
        )}
        keyExtractor={() => 'home-screen'}
      />

      {/* Floating Action Button */}
     
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingBottom: 100,
  },
  bottomSpacing: {
    height: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  retryButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#2e4dc8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  retryButtonGradient: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  // Header with Gradient
  header: {
    paddingTop: 60,
    paddingBottom: 25,
    position: 'relative',
    overflow: 'hidden',
  },
  headerTop: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  logoBackground: {
    width: 84,
    height: 84,
    borderRadius: 42,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  headerTextContainer: {
    alignItems: 'center',
  },
  companyName: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  companyTagline: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  // Seasonal Promotions
  seasonalContainer: {
    marginHorizontal: 24,
    marginTop: 20,
    marginBottom: 10,
  },
  seasonalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  seasonalIconContainer: {
    marginRight: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 8,
  },
  seasonalContent: {
    flex: 1,
  },
  seasonalTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  seasonalSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    marginBottom: 8,
  },
  seasonalTimer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  seasonalTimerText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  // Quick Actions
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  quickAction: {
    alignItems: 'center',
    width: 70,
  },
  quickActionGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#2e4dc8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
  },
  // Weather Widget

  // Banner Carousel
  bannerContainer: {
    marginBottom: 30,
  },
  bannerItem: {
    width: SCREEN_WIDTH,
    height: 200,
  },
  bannerImage: {
    width: SCREEN_WIDTH - 48,
    height: 200,
    borderRadius: 20,
    marginHorizontal: 24,
  },
  bannerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 24,
    right: 24,
    height: 60,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#2e4dc8',
    width: 24,
  },
  inactiveDot: {
    backgroundColor: '#CBD5E1',
  },
  // Section Styles
  section: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: -0.4,
  },
  seeAll: {
    color: '#2e4dc8',
    fontWeight: '600',
    fontSize: 14,
  },
  // Categories
  categoriesList: {
    paddingHorizontal: 4,
  },
  categoryCard: {
    width: 100,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  categoryImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    marginBottom: 12,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  categoryImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
  },
  categoryIconWrapper: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
    lineHeight: 16,
  },
  // Services
  servicesList: {
    paddingHorizontal: 4,
  },
  serviceCard: {
    width: 140,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  serviceGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#2e4dc8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  serviceName: {
    fontWeight: '700',
    fontSize: 14,
    color: '#1E293B',
    textAlign: 'center',
    lineHeight: 18,
  },
  // Projects
  projectsList: {
    paddingHorizontal: 4,
  },
  projectCard: {
    width: 240,
    height: 160,
    borderRadius: 20,
    marginRight: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  projectImage: {
    width: '100%',
    height: '100%',
  },
  projectOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  projectTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 4,
  },
  projectLocation: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '500',
  },
  // Testimonials
  testimonialsSection: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    backgroundColor: '#F8FAFC',
  },
  testimonialsContainer: {
    paddingRight: 24,
  },
  testimonialCard: {
    width: 280,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  starContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  testimonialText: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 22,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  testimonialAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  // Facebook Preview
  facebookSection: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
 // Add these to your existing StyleSheet
facebookCard: {
  borderRadius: 20,
  overflow: 'hidden',
  shadowColor: '#1877F2',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.3,
  shadowRadius: 16,
  elevation: 10,
},

facebookCardGradient: {
  padding: 24,
  borderRadius: 20,
},

facebookCardContent: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 20,
},

facebookCardText: {
  flex: 1,
  marginLeft: 16,
},

facebookCardTitle: {
  color: 'white',
  fontSize: 20,
  fontWeight: '800',
  marginBottom: 4,
},

facebookCardSubtitle: {
  color: 'rgba(255,255,255,0.9)',
  fontSize: 14,
  marginBottom: 2,
},

facebookCardUrl: {
  color: 'rgba(255,255,255,0.8)',
  fontSize: 12,
  fontFamily: 'monospace',
},

facebookPhotosPreview: {
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
  height: 100,
  marginBottom: 20,
},

facebookPreviewImage: {
  width: 100,
  height: 100,
  borderRadius: 12,
  borderWidth: 3,
  borderColor: 'white',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 6,
},

moreImagesOverlay: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.7)',
  borderRadius: 12,
  justifyContent: 'center',
  alignItems: 'center',
  marginLeft: -20,
},

moreImagesText: {
  color: 'white',
  fontSize: 18,
  fontWeight: 'bold',
},

viewAllButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(255,255,255,0.2)',
  paddingVertical: 12,
  paddingHorizontal: 20,
  borderRadius: 12,
  alignSelf: 'center',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.3)',
},

viewAllButtonText: {
  color: 'white',
  fontSize: 14,
  fontWeight: '600',
},

// Modal Styles
modalContainer: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.95)',
},

modalHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingTop: 60,
  paddingHorizontal: 20,
  paddingBottom: 20,
},

modalCloseButton: {
  padding: 8,
},

modalTitleContainer: {
  alignItems: 'center',
},

modalTitle: {
  color: 'white',
  fontSize: 18,
  fontWeight: '600',
  marginBottom: 4,
},

modalCounter: {
  color: 'rgba(255,255,255,0.7)',
  fontSize: 14,
},

openFacebookButton: {
  padding: 8,
  backgroundColor: 'rgba(255,255,255,0.1)',
  borderRadius: 20,
},

modalImageContainer: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: 10,
},

navButtonLeft: {
  padding: 15,
  backgroundColor: 'rgba(255,255,255,0.2)',
  borderRadius: 30,
  marginLeft: 10,
},

navButtonRight: {
  padding: 15,
  backgroundColor: 'rgba(255,255,255,0.2)',
  borderRadius: 30,
  marginRight: 10,
},

fullSizeImage: {
  flex: 1,
  height: '80%',
  borderRadius: 10,
},

modalFooter: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: 20,
  paddingBottom: 40,
  backgroundColor: 'rgba(0,0,0,0.8)',
},

imageStats: {
  flexDirection: 'row',
  alignItems: 'center',
},

statItem: {
  flexDirection: 'row',
  alignItems: 'center',
  marginRight: 20,
},

statText: {
  color: 'white',
  fontSize: 16,
  fontWeight: '600',
  marginLeft: 6,
},

downloadButton: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#1877F2',
  paddingVertical: 10,
  paddingHorizontal: 20,
  borderRadius: 25,
},

downloadButtonText: {
  color: 'white',
  fontSize: 16,
  fontWeight: '600',
  marginLeft: 8,
},
  // Footer Note
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    marginHorizontal: 24,
    marginTop: 20,
    marginBottom: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  footerNoteText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  
});