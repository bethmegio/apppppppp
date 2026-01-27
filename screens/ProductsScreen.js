import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../supabaseClient";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const FALLBACK_IMAGE = "https://placehold.co/600x400/1A8189/FFFFFF?text=Product";

export default function ProductsScreen({ route, navigation }) {
  const category_id = route?.params?.category_id;

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProducts = async () => {
    if (!category_id) {
      console.warn("No category_id passed!");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log("Fetching products for category:", category_id);

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("category_id", category_id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      console.log("Fetched products:", data);
      setProducts(data || []);
    } catch (err) {
      console.error("Products fetch error:", err);
      setError(err.message || "Failed to fetch products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [category_id]);

  if (loading)
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#00BFFF" />
        <Text style={{ marginTop: 10 }}>Loading products...</Text>
      </View>
    );

  if (error)
    return (
      <View style={styles.centered}>
        <Text style={{ color: "red", marginBottom: 12 }}>Error: {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchProducts}>
          <Text style={{ color: "#fff" }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );

  if (!products.length)
    return (
      <View style={styles.centered}>
        <Text style={{ color: "#444", fontWeight: "600" }}>No products found in this category.</Text>
      </View>
    );

  const CARD_WIDTH = (SCREEN_WIDTH - 44) / 2;

  const renderProductCard = ({ item }) => (
    <TouchableOpacity
      style={[styles.productCard, { width: CARD_WIDTH }]}
      onPress={() => navigation.navigate("ProductDetails", { id: item.id })}
    >
      <Image
        source={{ uri: item.image_url || FALLBACK_IMAGE }}
        style={styles.productImage}
        resizeMode="cover"
      />
      <Text numberOfLines={1} style={styles.productName}>{item.name}</Text>
      <Text style={styles.productPrice}>₱ {Number(item.price || 0).toLocaleString()}</Text>
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={products}
      numColumns={2}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={styles.productGrid}
      renderItem={renderProductCard}
    />
  );
}

const styles = StyleSheet.create({
  productGrid: { paddingHorizontal: 12, paddingBottom: 24 },
  productCard: {
    margin: 8,
    borderRadius: 12,
    backgroundColor: "#fff",
    padding: 10,
    elevation: 2,
  },
  productImage: { width: "100%", height: 110, borderRadius: 10, marginBottom: 8 },
  productName: { fontWeight: "600", fontSize: 14 },
  productPrice: { fontWeight: "700", color: "#00BFFF", marginTop: 4 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  retryButton: {
    backgroundColor: "#00BFFF",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
});
