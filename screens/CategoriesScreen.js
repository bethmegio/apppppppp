import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { supabase } from "../supabaseClient";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ===== PRODUCT SIZE CONFIGURATION =====
const PRODUCT_CONFIG = {
  NUM_COLUMNS: 2,
  IMAGE_HEIGHT: 140,
  CARD_MARGIN: 0,               // NO margin - products will touch each other
  CARD_PADDING: 8,              // Minimal internal padding
  IMAGE_ASPECT_RATIO: 1.0,
  GRID_PADDING: 8,              // Only padding around the entire grid
};
// ======================================

export default function CategoriesScreen({ navigation, route }) {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [addingToCart, setAddingToCart] = useState({}); // Track which product is being added

  // Get category from navigation params if coming from HomeScreen
  const initialCategory = route.params?.id || null;

  // Helper function for safe product counting
  const getProductsCountByCategory = (products, categoryId) => {
    return products.filter(p => p && p.category_id === categoryId).length;
  };

  useEffect(() => {
    loadCategoriesAndProducts();
  }, []);

  useEffect(() => {
    if (initialCategory && categories.length > 0) {
      const category = categories.find(cat => cat.id === initialCategory);
      if (category) {
        setSelectedCategory(category);
        filterProductsByCategory(category.id);
      }
    }
  }, [initialCategory, categories]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = products.filter(product =>
        product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredProducts(filtered);
    } else if (selectedCategory) {
      filterProductsByCategory(selectedCategory.id);
    } else {
      setFilteredProducts(products);
    }
  }, [searchQuery, products, selectedCategory]);

  const loadCategoriesAndProducts = async () => {
    try {
      setLoading(true);

      const [categoriesRes, productsRes] = await Promise.all([
        supabase.from("categories").select("*").order("name"),
        supabase.from("products").select("*").order("created_at", { ascending: false })
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (productsRes.error) throw productsRes.error;

      setCategories(categoriesRes.data || []);
      setProducts(productsRes.data || []);
      
      // If no specific category selected, show all products
      if (!initialCategory) {
        setFilteredProducts(productsRes.data || []);
      }

    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterProductsByCategory = (categoryId) => {
    // ✅ FIXED: Safe filtering with null check
    const filtered = products.filter(product => {
      if (!product || product.category_id === undefined || product.category_id === null) {
        return false; // Skip products without category_id
      }
      return product.category_id === categoryId;
    });
    setFilteredProducts(filtered);
  };

  const handleCategoryPress = (category) => {
    setSelectedCategory(category);
    filterProductsByCategory(category.id);
    setSearchQuery(""); // Clear search when selecting category
  };

  const handleShowAll = () => {
    setSelectedCategory(null);
    setFilteredProducts(products);
    setSearchQuery(""); // Clear search when showing all
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCategoriesAndProducts();
    setRefreshing(false);
  };

  // Add to Cart function
  const addToCart = async (product) => {
    try {
      setAddingToCart(prev => ({ ...prev, [product.id]: true }));
      
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

      // Check if product already in cart
      const { data: existingItem } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .single();

      if (existingItem) {
        // Update quantity if already in cart
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity: existingItem.quantity + 1 })
          .eq('id', existingItem.id);

        if (error) throw error;
        Alert.alert('Success', 'Product quantity updated in cart!');
      } else {
        // Add new item to cart
        const { error } = await supabase
          .from('cart_items')
          .insert({
            user_id: user.id,
            product_id: product.id,
            quantity: 1,
          });

        if (error) throw error;
        Alert.alert('Success', 'Product added to cart!');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Error', 'Failed to add product to cart');
    } finally {
      setAddingToCart(prev => ({ ...prev, [product.id]: false }));
    }
  };

  const getCategoryIcon = (categoryName) => {
    const name = categoryName?.toLowerCase() || "";
    if (name.includes("pool") || name.includes("water")) return "water-outline";
    if (name.includes("chem")) return "flask-outline";
    if (name.includes("equip") || name.includes("pump")) return "construct-outline";
    if (name.includes("clean")) return "sparkles-outline";
    if (name.includes("landscape") || name.includes("garden")) return "leaf-outline";
    if (name.includes("light")) return "bulb-outline";
    if (name.includes("heater")) return "thermometer-outline";
    if (name.includes("filter")) return "funnel-outline";
    return "grid-outline";
  };

  const getCategoryColor = (categoryName) => {
    const name = categoryName?.toLowerCase() || "";
    if (name.includes("pool") || name.includes("water")) return "#0EA5E9";
    if (name.includes("chem")) return "#F59E0B";
    if (name.includes("equip")) return "#14B8A6";
    if (name.includes("landscape")) return "#10B981";
    if (name.includes("clean")) return "#8B5CF6";
    if (name.includes("light")) return "#FCD34D";
    if (name.includes("heater")) return "#EF4444";
    return "#64748B";
  };

  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        selectedCategory?.id === item.id && styles.selectedCategory
      ]}
      onPress={() => handleCategoryPress(item)}
    >
      <View style={[styles.categoryIcon, { backgroundColor: getCategoryColor(item.name) }]}>
        <Ionicons name={getCategoryIcon(item.name)} size={24} color="#fff" />
      </View>
      <Text style={styles.categoryName} numberOfLines={2}>
        {item.name}
      </Text>
      <Text style={styles.productCount}>
        {/* ✅ FIXED: Using safe helper function */}
        {getProductsCountByCategory(products, item.id)} products
      </Text>
    </TouchableOpacity>
  );

  const renderProductItem = ({ item }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => navigation.navigate("ProductDetails", { 
  productId: item.id,  // ← ADD THIS
  product: item 
})}
    >
      <Image
        source={{ uri: item.image_url || "https://images.unsplash.com/photo-1566014633661-349c6fae61e9?w=400" }}
        style={[
          styles.productImage,
          { 
            height: PRODUCT_CONFIG.IMAGE_HEIGHT,
            aspectRatio: PRODUCT_CONFIG.IMAGE_ASPECT_RATIO,
          }
        ]}
        resizeMode="cover"
      />
      
      {/* Badges */}
      <View style={styles.badgeContainer}>
        {item.is_featured && (
          <LinearGradient
            colors={['#4ab8eb', '#2e4dc8']}
            style={styles.featuredBadge}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.badgeText}>Featured</Text>
          </LinearGradient>
        )}
      </View>

      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.productDescription} numberOfLines={2}>
          {item.description || "Premium quality product"}
        </Text>
        <Text style={styles.productPrice}>
          ₱ {Number(item.price || 0).toLocaleString()}
        </Text>
        
        {/* Add to Cart Button */}
        <TouchableOpacity
          style={[
            styles.addToCartButton,
            addingToCart[item.id] && styles.addToCartButtonDisabled
          ]}
          onPress={(e) => {
            e.stopPropagation(); // Prevent navigation to product details
            addToCart(item);
          }}
          disabled={addingToCart[item.id]}
        >
          {addingToCart[item.id] ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="cart-outline" size={14} color="#fff" />
              <Text style={styles.addToCartText}>Add to Cart</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2e4dc8" />
        <Text style={styles.loadingText}>Loading Products...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#4ab8eb', '#2e4dc8']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>
              {selectedCategory ? selectedCategory.name : "All Categories"}
            </Text>
            <Text style={styles.headerSubtitle}>
              {selectedCategory
                ? `${filteredProducts.length} products available`
                : "Browse all products"
              }
            </Text>
          </View>
          <View style={styles.headerLogo}>
            <Ionicons name="grid-outline" size={32} color="#fff" />
          </View>
        </View>
      </LinearGradient>

      {/* Search Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#64748B" />
          <TextInput
            placeholder="Search products..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            placeholderTextColor="#94A3B8"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
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
      >
        {/* Categories Grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <TouchableOpacity onPress={handleShowAll}>
              <Text style={styles.seeAllButton}>
                {selectedCategory ? "Show All" : "View All"}
              </Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={categories}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.categoriesList}
            renderItem={renderCategoryItem}
          />
        </View>

        {/* Products Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {selectedCategory ? selectedCategory.name : "All Products"} 
              {` (${filteredProducts.length})`}
            </Text>
          </View>

          {filteredProducts.length === 0 ? (
            <View style={styles.emptyState}>
              <LinearGradient
                colors={['#4ab8eb20', '#2e4dc820']}
                style={styles.emptyStateIcon}
              >
                <Ionicons name="search-outline" size={48} color="#2e4dc8" />
              </LinearGradient>
              <Text style={styles.emptyStateTitle}>No Products Found</Text>
              <Text style={styles.emptyStateText}>
                {searchQuery 
                  ? "No products match your search criteria"
                  : "No products available in this category"
                }
              </Text>
              {(searchQuery || selectedCategory) && (
                <TouchableOpacity 
                  style={styles.emptyStateButton}
                  onPress={() => {
                    setSearchQuery('');
                    setSelectedCategory(null);
                  }}
                >
                  <LinearGradient
                    colors={['#4ab8eb', '#2e4dc8']}
                    style={styles.emptyStateButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.emptyStateButtonText}>View All Products</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <FlatList
              data={filteredProducts}
              scrollEnabled={false}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.productsGrid}
              renderItem={renderProductItem}
              numColumns={PRODUCT_CONFIG.NUM_COLUMNS}
            />
          )}
        </View>

        {/* Footer Note */}
        <LinearGradient
          colors={['#4ab8eb20', '#2e4dc820']}
          style={styles.footerNote}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="#2e4dc8" />
          <Text style={styles.footerNoteText}>
            All products are genuine and come with warranty
          </Text>
        </LinearGradient>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
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
  // Section Styles
  section: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    letterSpacing: -0.4,
  },
  seeAllButton: {
    color: "#2e4dc8",
    fontWeight: "600",
    fontSize: 14,
  },
  // Categories
  categoriesList: {
    paddingHorizontal: 4,
    paddingBottom: 10,
  },
  categoryItem: {
    width: 140,
    alignItems: "center",
    marginHorizontal: 8,
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  selectedCategory: {
    borderWidth: 2,
    borderColor: "#2e4dc8",
    backgroundColor: "#f0f9ff",
    shadowColor: '#2e4dc8',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
    textAlign: "center",
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  productCount: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    fontWeight: '500',
  },
  // Products Grid - COMPACT
  productsGrid: {
    paddingHorizontal: PRODUCT_CONFIG.CARD_MARGIN,
  },
  productCard: {
    flex: 1,
    margin: PRODUCT_CONFIG.CARD_MARGIN,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: PRODUCT_CONFIG.CARD_PADDING,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  productImage: {
    width: "100%",
    borderRadius: 6,
    marginBottom: 8,
  },
  badgeContainer: {
    position: "absolute",
    top: PRODUCT_CONFIG.CARD_PADDING,
    left: PRODUCT_CONFIG.CARD_PADDING,
  },
  featuredBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#fff",
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontWeight: "700",
    fontSize: 13,
    color: "#1E293B",
    marginBottom: 4,
    lineHeight: 16,
  },
  productDescription: {
    fontSize: 11,
    color: "#64748B",
    marginBottom: 6,
    lineHeight: 14,
  },
  productPrice: {
    fontWeight: "800",
    color: "#2e4dc8",
    fontSize: 14,
    marginBottom: 8,
  },
  addToCartButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2e4dc8",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    shadowColor: '#2e4dc8',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  addToCartButtonDisabled: {
    backgroundColor: "#CBD5E1",
    shadowColor: '#CBD5E1',
  },
  addToCartText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  // Empty State
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8,
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyStateButton: {
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#2e4dc8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyStateButtonGradient: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  emptyStateButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  // Footer Note
  footerNote: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    marginTop: 16,
    borderRadius: 12,
    marginHorizontal: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  footerNoteText: {
    flex: 1,
    fontSize: 13,
    color: "#0369A1",
    fontWeight: "500",
    marginLeft: 10,
    lineHeight: 18,
  },
});