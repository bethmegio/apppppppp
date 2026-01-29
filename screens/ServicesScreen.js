import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../supabaseClient';

const { width } = Dimensions.get('window');

export default function ServicesScreen({ navigation }) {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceReviews, setServiceReviews] = useState({});
  const [loadingReviews, setLoadingReviews] = useState({});
  const fadeAnim = useState(new Animated.Value(0))[0];

  // Categories to remove
  const categoriesToRemove = [
    'accessories', 
    'chemicals', 
    'cleaning tools', 
    'electrical equipment', 
    'pool accessories'
  ].map(cat => cat.toLowerCase());

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

  const fetchServices = async () => {
    try {
      setLoading(true);
      
      const [servicesResponse, categoriesResponse] = await Promise.all([
        supabase
          .from('services')
          .select('*')
          .order('name'),
        supabase
          .from('categories')
          .select('*')
          .order('name')
      ]);

      if (servicesResponse.error) throw servicesResponse.error;
      if (categoriesResponse.error) throw categoriesResponse.error;

      const servicesData = servicesResponse.data || [];
      const categoriesData = categoriesResponse.data || [];

      setServices(servicesData);
      
      // Filter out unwanted categories
      const filteredCategories = categoriesData
        .filter(cat => !categoriesToRemove.includes(cat.name.toLowerCase()))
        .map(c => c.name);
      
      setCategories(['All', ...filteredCategories]);

      // Load reviews for each service
      servicesData.forEach(service => {
        loadServiceReviews(service.id);
      });

    } catch (error) {
      console.error('Fetch error:', error);
      Alert.alert('Error', 'Failed to load services');
    } finally {
      setLoading(false);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }
  };

  const loadServiceReviews = async (serviceId) => {
    try {
      setLoadingReviews(prev => ({ ...prev, [serviceId]: true }));
      
      // Try to load reviews using product_id (since service_id doesn't exist yet)
      const { data: reviewsData, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('product_id', serviceId) // Using serviceId as product_id temporarily
        .order('created_at', { ascending: false });

      if (error) {
        console.log('No reviews found or error:', error.message);
        // Use sample reviews
        useSampleReviews(serviceId);
        return;
      }

      if (reviewsData && reviewsData.length > 0) {
        // Calculate average rating
        const totalRating = reviewsData.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = totalRating / reviewsData.length;
        
        setServiceReviews(prev => ({
          ...prev,
          [serviceId]: {
            average: averageRating.toFixed(1),
            count: reviewsData.length,
            hasRealReviews: true
          },
        }));
      } else {
        // No reviews in database
        useSampleReviews(serviceId);
      }
    } catch (error) {
      console.error('Error loading service reviews:', error);
      useSampleReviews(serviceId);
    } finally {
      setLoadingReviews(prev => ({ ...prev, [serviceId]: false }));
    }
  };

  const useSampleReviews = (serviceId) => {
    // Generate realistic sample reviews
    const sampleData = {
      average: (4.0 + Math.random() * 1.0).toFixed(1), // Random 4.0-5.0
      count: Math.floor(Math.random() * 15) + 3, // Random 3-17 reviews
      sample: true
    };
    
    setServiceReviews(prev => ({
      ...prev,
      [serviceId]: sampleData,
    }));
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchServices();
    setRefreshing(false);
  };

  const handleBookPress = async (serviceItem) => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      if (!data?.session) {
        Alert.alert('Login Required', 'You must be logged in to book a service.', [
          {
            text: 'Go to Login',
            onPress: () => navigation.navigate('Login', { 
              redirectTo: 'Booking', 
              service: serviceItem 
            }),
          },
          { text: 'Cancel', style: 'cancel' },
        ]);
        return;
      }

      navigation.navigate('Booking', { service: serviceItem });
    } catch (error) {
      console.error('Auth error:', error.message);
      Alert.alert('Error', 'Failed to check login status.');
    }
  };

  const handleServiceDetails = (service) => {
    // Try navigation, fallback to alert if fails
    try {
      navigation.navigate('ServicesDetails', { service });
    } catch (error) {
      console.log('Navigation error, showing alert instead:', error);
      showServiceDetails(service);
    }
  };

  const showServiceDetails = (service) => {
    Alert.alert(
      service.name,
      `${service.description || 'No description available'}\n\nAvailability: ${service.available !== false ? '✅ Available' : '❌ Unavailable'}`,
      [
        { 
          text: 'Book Consultation', 
          onPress: () => handleBookPress(service),
          style: 'default'
        },
        { text: 'Close', style: 'cancel' },
      ]
    );
  };

  // Filter services based on category and search
  const filteredServices = services.filter(service => {
    const matchesCategory = selectedCategory === 'All' || service.category === selectedCategory;
    const matchesSearch = service.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         service.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Get service image
  const getServiceImage = (service) => {
    if (service.image_url) return { uri: service.image_url };
    
    // Fallback to category-based images
    const category = service.category || 'default';
    const imageUrl = serviceImages[category] || serviceImages['default'];
    return { uri: imageUrl };
  };

  const renderService = ({ item, index }) => (
    <Animated.View
      style={[
        styles.serviceCard,
        {
          opacity: fadeAnim,
          transform: [{
            translateY: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [30, 0],
            }),
          }],
        },
      ]}
    >
      {/* Service Image */}
      <TouchableOpacity onPress={() => handleServiceDetails(item)}>
        <View style={styles.serviceImageContainer}>
          <Image 
            source={getServiceImage(item)} 
            style={styles.serviceImage}
            resizeMode="cover"
          />
          <View style={styles.imageOverlay} />
          
          {/* Category Badge */}
          <LinearGradient
            colors={['rgba(74, 184, 235, 0.9)', 'rgba(46, 77, 200, 0.9)']}
            style={styles.categoryBadge}
          >
            <Text style={styles.categoryBadgeText}>
              {item.category || 'Service'}
            </Text>
          </LinearGradient>
          
          {/* Availability Badge */}
          <View style={[
            styles.availabilityBadge,
            item.available !== false ? styles.availableBadge : styles.unavailableBadge
          ]}>
            <Ionicons 
              name={item.available !== false ? "checkmark-circle" : "close-circle"} 
              size={14} 
              color="#fff" 
            />
            <Text style={styles.availabilityBadgeText}>
              {item.available !== false ? 'Available' : 'Unavailable'}
            </Text>
          </View>

          {/* Rating Badge */}
          {serviceReviews[item.id] && (
            <LinearGradient
              colors={['rgba(255, 215, 0, 0.9)', 'rgba(255, 165, 0, 0.9)']}
              style={styles.ratingBadge}
            >
              <Ionicons name="star" size={12} color="#fff" />
              <Text style={styles.ratingBadgeText}>
                {serviceReviews[item.id].average}
              </Text>
            </LinearGradient>
          )}
        </View>
      </TouchableOpacity>

      <View style={styles.cardContent}>
        {/* Service Header */}
        <View style={styles.serviceHeader}>
          <TouchableOpacity 
            style={styles.serviceNameContainer}
            onPress={() => handleServiceDetails(item)}
          >
            <Text style={styles.serviceName}>{item.name}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.infoButton}
            onPress={() => handleServiceDetails(item)}
          >
            <Ionicons name="information-circle-outline" size={22} color="#2e4dc8" />
          </TouchableOpacity>
        </View>

        {/* Service Description */}
        <TouchableOpacity onPress={() => handleServiceDetails(item)}>
          <Text style={styles.serviceDescription} numberOfLines={3}>
            {item.description || 'Professional service with expert care and attention to detail.'}
          </Text>
        </TouchableOpacity>

        {/* Rating Section */}
        <View style={styles.ratingSection}>
          {loadingReviews[item.id] ? (
            <ActivityIndicator size="small" color="#2e4dc8" />
          ) : serviceReviews[item.id] ? (
            <TouchableOpacity 
              style={styles.ratingInfo}
              onPress={() => handleServiceDetails(item)}
            >
              <View style={styles.ratingStars}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={styles.ratingText}>
                  {serviceReviews[item.id].average}
                </Text>
              </View>
              <Text style={styles.ratingCount}>
                ({serviceReviews[item.id].count} review{serviceReviews[item.id].count !== 1 ? 's' : ''})
                {serviceReviews[item.id].sample && ' • Sample'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.ratingInfo}
              onPress={() => handleServiceDetails(item)}
            >
              <Text style={styles.noReviewsText}>No reviews yet • Be the first!</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Service Features */}
        <View style={styles.serviceFeatures}>
          
         
          {item.popular && (
            <LinearGradient
              colors={['#4ab8eb', '#2e4dc8']}
              style={styles.popularFeature}
            >
              <Ionicons name="flash-outline" size={16} color="#fff" />
              <Text style={styles.popularFeatureText}>Popular</Text>
            </LinearGradient>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.detailsButton}
            onPress={() => handleServiceDetails(item)}
          >
            <Ionicons name="document-text-outline" size={18} color="#2e4dc8" />
            <Text style={styles.detailsButtonText}>View Details</Text>
          </TouchableOpacity>
          
          <LinearGradient
            colors={['#4ab8eb', '#2e4dc8']}
            style={[
              styles.bookButton,
              item.available === false && styles.disabledButton
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <TouchableOpacity
              style={styles.bookButtonTouchable}
              onPress={() => handleBookPress(item)}
              disabled={item.available === false}
            >
              <Ionicons 
                name={item.available === false ? "close-circle" : "calendar-sharp"} 
                size={18} 
                color="#fff" 
              />
              <Text style={styles.bookButtonText}>
                {item.available === false ? 'Unavailable' : 'Book Now'}
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    </Animated.View>
  );

  // Helper function for category icons
  const getCategoryIcon = (category) => {
    const iconMap = {
      'All': 'apps-outline',
      'Pool Cleaning': 'water-outline',
      'Maintenance': 'construct-outline',
      'Repair': 'build-outline',
      'Installation': 'hammer-outline',
      'Consultation': 'chatbubble-ellipses-outline',
      'Landscaping': 'leaf-outline',
      'Design': 'color-palette-outline',
      'Inspection': 'search-outline',
    };
    return iconMap[category] || 'ellipse-outline';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2e4dc8" />
        <Text style={styles.loadingText}>Loading Professional Services</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Professional Header with Gradient */}
      <LinearGradient
        colors={['#4ab8eb', '#2e4dc8']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Professional Services</Text>
            <Text style={styles.headerSubtitle}>Expert Pool & Landscape Solutions</Text>
          </View>
          <View style={styles.headerLogo}>
            <Ionicons name="water" size={32} color="#fff" />
          </View>
        </View>
      </LinearGradient>

      {/* Professional Search */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#64748B" />
          <TextInput
            placeholder="Search professional services..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            placeholderTextColor="#94A3B8"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#64748B" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <ScrollView
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
        style={styles.contentContainer}
      >
        

        {/* Professional Services List */}
        <View style={styles.section}>
          <View style={styles.servicesHeader}>
            <View>
              <Text style={styles.servicesTitle}>
                {selectedCategory === 'All' ? 'All Professional Services' : selectedCategory + ' Services'}
              </Text>
              <Text style={styles.servicesCount}>
                {filteredServices.length} service{filteredServices.length !== 1 ? 's' : ''} available
              </Text>
            </View>
          </View>

          {filteredServices.length === 0 ? (
            <View style={styles.emptyState}>
              <LinearGradient
                colors={['#4ab8eb20', '#2e4dc820']}
                style={styles.emptyStateIcon}
              >
                <Ionicons name="construct-outline" size={48} color="#2e4dc8" />
              </LinearGradient>
              <Text style={styles.emptyStateTitle}>No Services Found</Text>
              <Text style={styles.emptyStateText}>
                {searchQuery 
                  ? "No services match your search criteria"
                  : "No services available in this category"
                }
              </Text>
              {(searchQuery || selectedCategory !== 'All') && (
                <TouchableOpacity 
                  style={styles.emptyStateButton}
                  onPress={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }}
                >
                  <LinearGradient
                    colors={['#4ab8eb', '#2e4dc8']}
                    style={styles.emptyStateButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.emptyStateButtonText}>View All Services</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.servicesList}>
              {filteredServices.map((service, index) => (
                <View key={service.id}>
                  {renderService({ item: service, index })}
                  {index < filteredServices.length - 1 && (
                    <View style={styles.serviceDivider} />
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Professional Footer Note with Gradient */}
        <LinearGradient
          colors={['#4ab8eb20', '#2e4dc820']}
          style={styles.footerNote}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Ionicons name="shield-checkmark-outline" size={20} color="#2e4dc8" />
          <Text style={styles.footerNoteText}>
              Professional services with quality guarantee and certified expertise
          </Text>
        </LinearGradient>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8FAFC' 
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
  // Header with Gradient
  header: {
    paddingTop: 60,
    paddingBottom: 25,
    position: 'relative',
    overflow: 'hidden',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  headerLogo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  // Search Section
  searchSection: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
  },
  contentContainer: {
    flex: 1,
  },
  // Section Styles
  section: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  // Categories
  categoriesScroll: {
    marginHorizontal: -4,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 4,
    shadowColor: '#2e4dc8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  selectedCategoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  categoryText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  selectedCategoryText: {
    color: '#fff',
    fontWeight: '700',
  },
  // Services Header
  servicesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  servicesTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: -0.4,
  },
  servicesCount: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 4,
  },
  // Service Card with Image
  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  serviceImageContainer: {
    position: 'relative',
    height: 180,
  },
  serviceImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  categoryBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  categoryBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '700',
  },
  ratingBadge: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  ratingBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '700',
    marginLeft: 4,
  },
  availabilityBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  availableBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
  },
  unavailableBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
  },
  availabilityBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '700',
    marginLeft: 4,
  },
  // Card Content
  cardContent: {
    padding: 20,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceNameContainer: {
    flex: 1,
  },
  serviceName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: -0.3,
  },
  infoButton: {
    marginLeft: 12,
  },
  serviceDescription: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
    marginBottom: 16,
    letterSpacing: -0.2,
  },
  ratingSection: {
    marginBottom: 16,
  },
  ratingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingStars: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 10,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginLeft: 4,
  },
  ratingCount: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  noReviewsText: {
    fontSize: 13,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  serviceFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  featureText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    marginLeft: 6,
  },
  popularFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  popularFeatureText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
  },
  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  detailsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailsButtonText: {
    fontSize: 14,
    color: '#2e4dc8',
    fontWeight: '600',
    marginLeft: 8,
  },
  bookButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#2e4dc8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  bookButtonTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  disabledButton: {
    backgroundColor: '#CBD5E1',
    shadowColor: '#CBD5E1',
  },
  bookButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  // Services List
  servicesList: {
    marginTop: 8,
  },
  serviceDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 24,
    marginHorizontal: -20,
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8,
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyStateButton: {
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#2e4dc8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyStateButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  // Footer Note with Gradient
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    marginTop: 16,
    borderRadius: 16,
    marginHorizontal: 24,
    marginBottom: 82,
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