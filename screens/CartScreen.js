import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../supabaseClient';

const { width } = Dimensions.get('window');

export default function CartScreen({ navigation }) {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cash');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [productStocks, setProductStocks] = useState({});
  const fadeAnim = useState(new Animated.Value(0))[0];

  useFocusEffect(
    useCallback(() => {
      checkUser();
      loadCartItems();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCartItems();
    setRefreshing(false);
  };

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (!user) {
        Alert.alert('Login Required', 'Please login to view your cart', [
          {
            text: 'Login',
            onPress: () => navigation.navigate('Login'),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]);
      }
    } catch (error) {
      console.error('Error checking user:', error);
    }
  };

  const loadCartItems = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          *,
          products (
            id,
            name,
            price,
            image_url,
            category_id,
            description,
            stock
          )
        `)
        .eq('user_id', user.id)
        .order('added_at', { ascending: false });

      if (error) throw error;

      const transformedCartItems = data.map(item => ({
        id: item.id,
        product_id: item.product_id,
        name: item.products?.name || 'Unknown Product',
        price: item.products?.price || 0,
        quantity: item.quantity,
        image_url: item.products?.image_url || 'https://images.unsplash.com/photo-1566014633661-349c6fae61e9?w=400',
        category: item.products?.category_id || 'General',
        description: item.products?.description || '',
        stock: item.products?.stock || 0,
        added_at: item.added_at
      }));

      setCartItems(transformedCartItems || []);
      
      // Fetch latest stock for all products
      const productIds = transformedCartItems.map(item => item.product_id);
      await fetchProductStocks(productIds);
      
    } catch (error) {
      console.error('Error loading cart:', error);
      Alert.alert('Error', 'Failed to load cart items');
    } finally {
      setLoading(false);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }
  };

  const fetchProductStocks = async (productIds) => {
    try {
      if (!productIds || productIds.length === 0) return {};
      
      const { data, error } = await supabase
        .from('products')
        .select('id, stock, name')
        .in('id', productIds);
      
      if (error) throw error;
      
      const stockMap = {};
      data.forEach(product => {
        stockMap[product.id] = {
          stock: product.stock || 0,
          name: product.name
        };
      });
      
      setProductStocks(stockMap);
      return stockMap;
    } catch (error) {
      console.error('Error fetching product stocks:', error);
      return {};
    }
  };

  const updateQuantity = async (itemId, newQuantity) => {
    try {
      const cartItem = cartItems.find(item => item.id === itemId);
      if (!cartItem) return;
      
      const productId = cartItem.product_id;
      const productStockInfo = productStocks[productId];
      
      if (!productStockInfo) {
        const stockMap = await fetchProductStocks([productId]);
        if (!stockMap[productId]) {
          Alert.alert('Error', 'Could not check product availability');
          return;
        }
      }
      
      const availableStock = productStocks[productId]?.stock || cartItem.stock || 0;
      
      if (newQuantity > availableStock) {
        Alert.alert(
          'Insufficient Stock',
          `Only ${availableStock} units of "${cartItem.name}" available in stock.`,
          [{ text: 'OK' }]
        );
        return;
      }
      
      if (newQuantity < 1) {
        removeFromCart(itemId);
        return;
      }
      
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('id', itemId);

      if (error) throw error;

      setCartItems(prevItems =>
        prevItems.map(item =>
          item.id === itemId ? { ...item, quantity: newQuantity } : item
        )
      );
      
      if (productStocks[productId]) {
        setProductStocks(prev => ({
          ...prev,
          [productId]: {
            ...prev[productId],
          }
        }));
      }
      
    } catch (error) {
      console.error('Error updating quantity:', error);
      Alert.alert('Error', 'Failed to update quantity');
    }
  };

  const removeFromCart = async (itemId) => {
    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this item from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('cart_items')
                .delete()
                .eq('id', itemId);

              if (error) throw error;
              
              const itemToRemove = cartItems.find(item => item.id === itemId);
              if (itemToRemove) {
                setProductStocks(prev => {
                  const newStocks = { ...prev };
                  delete newStocks[itemToRemove.product_id];
                  return newStocks;
                });
              }
              
              setCartItems(prevItems => prevItems.filter(item => item.id !== itemId));
              
            } catch (error) {
              console.error('Error removing item:', error);
              Alert.alert('Error', 'Failed to remove item from cart');
            }
          }
        }
      ]
    );
  };

const continueShopping = () => {
  navigation.navigate('Categories');

  };

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal();
  };

  const validateStockBeforeCheckout = () => {
    const outOfStockItems = [];
    const lowStockItems = [];
    
    cartItems.forEach(item => {
      const productId = item.product_id;
      const productStock = productStocks[productId]?.stock || item.stock || 0;
      const quantityInCart = item.quantity;
      
      if (productStock === 0) {
        outOfStockItems.push({
          name: item.name,
          stock: productStock
        });
      } else if (quantityInCart > productStock) {
        outOfStockItems.push({
          name: item.name,
          stock: productStock,
          requested: quantityInCart
        });
      } else if (productStock < 5) {
        lowStockItems.push({
          name: item.name,
          stock: productStock
        });
      }
    });
    
    if (outOfStockItems.length > 0) {
      const itemNames = outOfStockItems.map(item => {
        if (item.requested) {
          return `${item.name} (only ${item.stock} available, ${item.requested} in cart)`;
        }
        return `${item.name} (out of stock)`;
      }).join('\n• ');
      
      Alert.alert(
        'Stock Issues',
        `Some items in your cart have stock issues:\n\n• ${itemNames}\n\nPlease update quantities or remove items before checkout.`,
        [{ text: 'OK' }]
      );
      return false;
    }
    
    if (lowStockItems.length > 0) {
      Alert.alert(
        'Low Stock Warning',
        `Some items are running low in stock. Please proceed quickly to ensure availability.`,
        [
          { text: 'Continue Anyway', style: 'default' },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
    
    return true;
  };

  const checkStockAvailability = async () => {
    try {
      const productIds = cartItems.map(item => item.product_id);
      const latestStocks = await fetchProductStocks(productIds);
      
      const insufficientStockItems = [];
      
      cartItems.forEach(item => {
        const productStock = latestStocks[item.product_id]?.stock || 0;
        if (item.quantity > productStock) {
          insufficientStockItems.push({
            name: item.name,
            available: productStock,
            requested: item.quantity
          });
        }
      });
      
      if (insufficientStockItems.length > 0) {
        const message = insufficientStockItems.map(item => 
          `• ${item.name}: ${item.available} available, ${item.requested} requested`
        ).join('\n');
        
        Alert.alert(
          'Stock Changed',
          `Stock availability has changed:\n\n${message}\n\nPlease update your cart.`,
          [{ text: 'OK', onPress: () => loadCartItems() }]
        );
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error checking stock:', error);
      return true;
    }
  };

  const getCustomerInfo = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return { name: '', email: '', phone: '' };

      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('full_name, email, phone')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (!profileError && userProfile) {
        return {
          name: userProfile.full_name || currentUser.user_metadata?.full_name || '',
          email: userProfile.email || currentUser.email || '',
          phone: userProfile.phone || currentUser.user_metadata?.phone || ''
        };
      }

      return {
        name: currentUser.user_metadata?.full_name || 
               currentUser.user_metadata?.name || 
               '',
        email: currentUser.email || '',
        phone: currentUser.user_metadata?.phone || ''
      };
    } catch (error) {
      console.error('Error getting customer info:', error);
      return { name: '', email: '', phone: '' };
    }
  };

  const createOrder = async () => {
    try {
      setCheckoutLoading(true);
      
      const stockAvailable = await checkStockAvailability();
      if (!stockAvailable) {
        setCheckoutLoading(false);
        return false;
      }
      
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        throw new Error('User not logged in');
      }

      const customerInfo = await getCustomerInfo();
      let customerName = customerInfo.name.trim();
      
      const invalidNames = ['customer', 'user', 'placeholder', 'test', 'default'];
      const isInvalidName = !customerName || 
        customerName.length < 2 ||
        invalidNames.some(name => customerName.toLowerCase().includes(name));
      
      if (isInvalidName) {
        return new Promise((resolve) => {
          Alert.alert(
            'Enter Your Name',
            'Please enter your full name for the order:',
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => {
                  setCheckoutLoading(false);
                  resolve(false);
                }
              },
              {
                text: 'Submit',
                onPress: async () => {
                  resolve(true);
                }
              }
            ]
          );
        }).then(async (shouldProceed) => {
          if (!shouldProceed) return false;
          
          return await promptForCustomerName(currentUser, customerInfo.email, customerInfo.phone);
        });
      }

      return await completeOrderCreation(currentUser, customerName, customerInfo.email, customerInfo.phone);
      
    } catch (error) {
      console.error('Error creating order:', error);
      Alert.alert('Error', error.message || 'Failed to create order');
      setCheckoutLoading(false);
      return false;
    }
  };

  const updateProductStockAfterOrder = async () => {
    try {
      const updates = cartItems.map(async (item) => {
        const { data: productData } = await supabase
          .from('products')
          .select('stock')
          .eq('id', item.product_id)
          .single();
          
        if (productData) {
          const newStock = Math.max(0, (productData.stock || 0) - item.quantity);
          
          const { error } = await supabase
            .from('products')
            .update({ stock: newStock })
            .eq('id', item.product_id);
            
          if (error) {
            console.error(`Error updating stock for product ${item.product_id}:`, error);
          }
        }
      });
      
      await Promise.all(updates);
      return true;
    } catch (error) {
      console.error('Error updating product stock:', error);
      return false;
    }
  };

  const completeOrderCreation = async (currentUser, customerName, customerEmail, customerPhone) => {
    try {
      const totalAmount = calculateTotal();
      
      const orderData = {
        user_id: currentUser.id,
        customer_name: customerName,
        customer_email: customerEmail || currentUser.email,
        customer_phone: customerPhone || '',
        total_amount: totalAmount,
        status: 'pending',
        payment_method: 'cash',
        payment_status: 'pending',
        channel: 'mobile_app'
      };
      
      console.log('Creating order with data:', orderData);

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single();

      if (orderError) {
        console.error('Order creation error:', orderError);
        
        if (orderError.code === '42703') {
          delete orderData.channel;
          const { data: retryOrder, error: retryError } = await supabase
            .from('orders')
            .insert([orderData])
            .select()
            .single();
            
          if (retryError) {
            throw new Error(retryError.message || 'Failed to create order');
          }
        } else {
          throw new Error(orderError.message || 'Failed to create order');
        }
      }

      const orderItems = cartItems.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('Order items error:', itemsError);
        throw new Error('Failed to add items to order');
      }

      await updateProductStockAfterOrder();
      
      const { error: deleteError } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', currentUser.id);

      if (deleteError) {
        console.error('Cart clear error:', deleteError);
      }

      setCheckoutLoading(false);
      
      Alert.alert(
        'Order Placed Successfully!',
        `Thank you ${customerName}!\n\nOrder Total: ₱${Number(totalAmount).toLocaleString()}\nPayment Method: Cash on Pickup\n\nPickup Address:\nPurok Bougainvillea, Dumaguete City\nOpen: Mon-Sun, 7AM-7PM\nContact: 0915 736 2648`,
        [{ text: 'OK', onPress: () => {
          setCartItems([]);
          setProductStocks({});
          navigation.navigate('ProfileTab');
        }}]
      );
      
      return true;
      
    } catch (error) {
      console.error('Error in completeOrderCreation:', error);
      setCheckoutLoading(false);
      
      let errorMessage = 'Failed to create order. Please try again.';
      if (error.message.includes('generated column')) {
        errorMessage = 'Database error. Please contact support.';
      } else if (error.message.includes('real customer name')) {
        errorMessage = 'Please enter your real name for the order.';
      }
      
      Alert.alert('Error', errorMessage);
      return false;
    }
  };

  const promptForCustomerName = async (currentUser, customerEmail, customerPhone) => {
    return new Promise((resolve) => {
      Alert.prompt(
        'Enter Your Full Name',
        'Please enter your real name for the order (minimum 2 characters):',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              setCheckoutLoading(false);
              resolve(false);
            }
          },
          {
            text: 'Submit',
            onPress: async (newName) => {
              if (newName && newName.trim().length >= 2) {
                const customerName = newName.trim();
                const success = await completeOrderCreation(currentUser, customerName, customerEmail, customerPhone);
                resolve(success);
              } else {
                Alert.alert('Invalid Name', 'Please enter a valid name (minimum 2 characters)');
                setCheckoutLoading(false);
                resolve(false);
              }
            }
          }
        ],
        'plain-text'
      );
    });
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to your cart before checkout.');
      return;
    }

    if (checkoutLoading) {
      return;
    }

    if (!validateStockBeforeCheckout()) {
      return;
    }

    Alert.alert(
      'Confirm Order',
      `Your total is ₱${Number(calculateTotal()).toLocaleString()}. Pay with cash when you pick up your order.\n\nPickup Address: Purok Bougainvillea, Dumaguete City`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Place Order',
          onPress: async () => {
            try {
              await createOrder();
            } catch (error) {
              Alert.alert('Error', 'Failed to place order. Please try again.');
            }
          }
        }
      ]
    );
  };

  const renderCartItem = ({ item }) => {
    const productId = item.product_id;
    const availableStock = productStocks[productId]?.stock || item.stock || 0;
    const isLowStock = availableStock < 10 && availableStock > 0;
    const isOutOfStock = availableStock === 0;
    const exceedsStock = item.quantity > availableStock;
    
    return (
      <Animated.View
        style={[
          styles.cartItem,
          exceedsStock && styles.outOfStockItem,
          {
            opacity: fadeAnim,
            transform: [{
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              }),
            }],
          },
        ]}
      >
        <Image
          source={{ uri: item.image_url }}
          style={[styles.itemImage, isOutOfStock && styles.outOfStockImage]}
        />
        
        <View style={styles.itemDetails}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
            {exceedsStock && (
              <View style={styles.stockWarningBadge}>
                <Ionicons name="warning" size={12} color="#fff" />
                <Text style={styles.stockWarningText}>Exceeds stock</Text>
              </View>
            )}
            {isLowStock && !exceedsStock && (
              <View style={styles.lowStockBadge}>
                <Text style={styles.lowStockText}>Low Stock</Text>
              </View>
            )}
            {isOutOfStock && (
              <View style={styles.outOfStockBadge}>
                <Text style={styles.outOfStockText}>Out of Stock</Text>
              </View>
            )}
          </View>
          
          <Text style={styles.itemCategory}>{item.category || 'General'}</Text>
          <Text style={styles.itemPrice}>₱{Number(item.price).toLocaleString()}</Text>
          
          <View style={styles.stockInfo}>
            <Ionicons 
              name={isOutOfStock ? "close-circle" : isLowStock ? "warning" : "checkmark-circle"} 
              size={12} 
              color={isOutOfStock ? "#FF6B6B" : isLowStock ? "#FFA500" : "#4CAF50"} 
            />
            <Text style={[
              styles.stockText,
              { color: isOutOfStock ? "#FF6B6B" : isLowStock ? "#FFA500" : "#4CAF50" }
            ]}>
              {isOutOfStock ? 'Out of stock' : `${availableStock} available`}
            </Text>
          </View>
          
          <View style={styles.quantityContainer}>
            <TouchableOpacity
              style={[styles.quantityButton, isOutOfStock && styles.disabledButton]}
              onPress={() => updateQuantity(item.id, item.quantity - 1)}
              disabled={isOutOfStock}
            >
              <Ionicons name="remove-outline" size={16} color={isOutOfStock ? "#ccc" : "#333"} />
            </TouchableOpacity>
            
            <Text style={[styles.quantityText, isOutOfStock && styles.disabledText]}>{item.quantity}</Text>
            
            <TouchableOpacity
              style={[styles.quantityButton, (isOutOfStock || item.quantity >= availableStock) && styles.disabledButton]}
              onPress={() => updateQuantity(item.id, item.quantity + 1)}
              disabled={isOutOfStock || item.quantity >= availableStock}
            >
              <Ionicons name="add-outline" size={16} color={(isOutOfStock || item.quantity >= availableStock) ? "#ccc" : "#333"} />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.itemActions}>
          <Text style={[styles.itemTotal, isOutOfStock && styles.disabledText]}>
            ₱{Number(item.price * item.quantity).toLocaleString()}
          </Text>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => removeFromCart(item.id)}
          >
            <Ionicons name="trash-outline" size={16} color="#fff" />
            <Text style={styles.clearButtonText}>Remove</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00BFFF" />
        <Text style={styles.loadingText}>Loading Your Cart...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Shopping Cart</Text>
          <Text style={styles.headerSubtitle}>Please login to view your cart</Text>
        </View>
        <View style={styles.emptyCart}>
          <Ionicons name="log-in-outline" size={100} color="#ccc" />
          <Text style={styles.emptyCartTitle}>Login Required</Text>
          <Text style={styles.emptyCartText}>
            Please login to view and manage your shopping cart
          </Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Ionicons name="log-in-outline" size={20} color="#fff" />
            <Text style={styles.shopButtonText}>Login Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Shopping Cart</Text>
            <Text style={styles.headerSubtitle}>Your cart is empty</Text>
          </View>
        </View>
        
        <View style={styles.emptyCart}>
          <Ionicons name="cart-outline" size={100} color="#ccc" />
          <Text style={styles.emptyCartTitle}>Your Cart is Empty</Text>
          <Text style={styles.emptyCartText}>
            Add some amazing plants and accessories to your cart!
          </Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={continueShopping}
          >
            <Ionicons name="leaf-outline" size={20} color="#fff" />
            <Text style={styles.shopButtonText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Shopping Cart</Text>
          <Text style={styles.headerSubtitle}>{cartItems.length} item{cartItems.length !== 1 ? 's' : ''} in cart</Text>
        </View>
        {cartItems.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              Alert.alert(
                'Clear Cart',
                'Are you sure you want to remove all items from your cart?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Clear All',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        const { data: { user: currentUser } } = await supabase.auth.getUser();
                        if (currentUser) {
                          const { error } = await supabase
                            .from('cart_items')
                            .delete()
                            .eq('user_id', currentUser.id);
                          
                          if (error) throw error;
                          setCartItems([]);
                          setProductStocks({});
                        }
                      } catch (error) {
                        console.error('Error clearing cart:', error);
                        Alert.alert('Error', 'Failed to clear cart');
                      }
                    }
                  }
                ]
              );
            }}
          >
            <Ionicons name="trash-outline" size={16} color="#fff" />
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={["#00BFFF"]} 
            tintColor="#00BFFF"
            progressBackgroundColor="#fff"
          />
        }
      >
        {/* Cart Items List */}
        <View style={styles.cartList}>
          <FlatList
            data={cartItems}
            renderItem={renderCartItem}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        </View>

        {/* Order Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal ({cartItems.length} item{cartItems.length !== 1 ? 's' : ''})</Text>
            <Text style={styles.summaryValue}>₱{Number(calculateSubtotal()).toLocaleString()}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Shipping</Text>
            <Text style={styles.summaryValue}>₱0.00</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax</Text>
            <Text style={styles.summaryValue}>₱0.00</Text>
          </View>
          
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₱{Number(calculateTotal()).toLocaleString()}</Text>
          </View>

          {/* Pickup Info */}
          <View style={styles.pickupInfo}>
            <Ionicons name="information-circle-outline" size={20} color="#0077b6" />
            <View style={styles.pickupTextContainer}>
              <Text style={styles.pickupTitle}>Store Pickup Only</Text>
              <Text style={styles.pickupDescription}>
                All items are available for store pickup only. Please visit our store to collect your order.
              </Text>
            </View>
          </View>
        </View>

        {/* Store Info */}
        <View style={styles.storeSection}>
          <Text style={styles.sectionTitle}>Store Pickup Location</Text>
          <View style={styles.storeInfo}>
            <View style={styles.storeDetail}>
              <Ionicons name="location-outline" size={16} color="#0077b6" />
              <Text style={styles.storeText}>
                Purok Bougainvillea, Dumaguete City, 6200 Negros Oriental
              </Text>
            </View>
            <View style={styles.storeDetail}>
              <Ionicons name="time-outline" size={16} color="#0077b6" />
              <Text style={styles.storeText}>Mon-Sun: 7:00 AM - 7:00 PM</Text>
            </View>
            <View style={styles.storeDetail}>
              <Ionicons name="call-outline" size={16} color="#0077b6" />
              <Text style={styles.storeText}>0915 736 2648</Text>
            </View>
          </View>
        </View>

        {/* Payment Method Section (Only Cash) */}
        <View style={styles.paymentSection}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          
          {/* Cash on Pickup Option */}
          <TouchableOpacity 
            style={[
              styles.paymentOption,
              selectedPaymentMethod === 'cash' && styles.paymentOptionSelected
            ]}
            onPress={() => setSelectedPaymentMethod('cash')}
          >
            <View style={styles.paymentOptionLeft}>
              <View style={[styles.paymentIconContainer, { backgroundColor: '#28a745' }]}>
                <Ionicons name="cash-outline" size={24} color="#fff" />
              </View>
              <View>
                <Text style={styles.paymentOptionTitle}>Cash on Pickup</Text>
                <Text style={styles.paymentOptionSubtitle}>Pay at our store when you collect your order</Text>
              </View>
            </View>
            <View style={styles.paymentOptionRight}>
              <Ionicons name="checkmark-circle" size={24} color="#00BFFF" />
            </View>
          </TouchableOpacity>
          
          {/* Cash Payment Instructions */}
          <View style={styles.cashInstructions}>
            <View style={styles.cashHeader}>
              <Ionicons name="information-circle" size={18} color="#28a745" />
              <Text style={styles.cashHeaderText}>Payment Instructions</Text>
            </View>
            <Text style={styles.cashText}>
              Please bring the exact amount in cash when you pick up your order.
            </Text>
            <Text style={[styles.cashText, styles.cashHighlight]}>
              Total Amount: ₱{Number(calculateTotal()).toLocaleString()}
            </Text>
            <Text style={styles.cashNote}>
              Note: Have your order confirmation ready to show at pickup.
            </Text>
          </View>
        </View>

        {/* Checkout Button */}
        <TouchableOpacity
          style={styles.checkoutButton}
          onPress={handleCheckout}
          disabled={checkoutLoading || cartItems.length === 0}
        >
          <View style={[styles.checkoutGradient, { 
            backgroundColor: checkoutLoading || cartItems.length === 0 ? '#ccc' : '#00BFFF' 
          }]}>
            {checkoutLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="cart" size={24} color="#fff" />
                <Text style={styles.checkoutButtonText}>Place Order</Text>
                <Text style={styles.checkoutPrice}>₱{Number(calculateTotal()).toLocaleString()}</Text>
              </>
            )}
          </View>
        </TouchableOpacity>

        {/* Continue Shopping Button */}
        <TouchableOpacity
          style={styles.continueButton}
          onPress={continueShopping}
        >
          <Ionicons name="arrow-back-outline" size={20} color="#00BFFF" />
          <Text style={styles.continueButtonText}>Continue Shopping</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FBFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#00BFFF',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  emptyCart: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyCartTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyCartText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  shopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00BFFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  shopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  cartList: {
    padding: 20,
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  outOfStockItem: {
    borderWidth: 1,
    borderColor: '#FFE5E5',
    backgroundColor: '#FFF5F5',
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  outOfStockImage: {
    opacity: 0.5,
  },
  itemDetails: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'space-between',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  stockWarningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  stockWarningText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 2,
  },
  lowStockBadge: {
    backgroundColor: '#FFA500',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  lowStockText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  outOfStockBadge: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  outOfStockText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  itemCategory: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00BFFF',
    marginBottom: 4,
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stockText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  quantityButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    elevation: 2,
  },
  disabledButton: {
    backgroundColor: '#f0f0f0',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 15,
    minWidth: 20,
    textAlign: 'center',
  },
  disabledText: {
    color: '#ccc',
  },
  itemActions: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  summarySection: {
    backgroundColor: '#fff',
    margin: 20,
    marginBottom: 10,
    padding: 20,
    borderRadius: 16,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#00BFFF',
  },
  pickupInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  pickupTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  pickupTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0077b6',
    marginBottom: 2,
  },
  pickupDescription: {
    fontSize: 12,
    color: '#0077b6',
    lineHeight: 16,
  },
  storeSection: {
    backgroundColor: '#fff',
    margin: 20,
    marginBottom: 10,
    padding: 20,
    borderRadius: 16,
    elevation: 4,
  },
  storeInfo: {
    gap: 8,
  },
  storeDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storeText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  checkoutButton: {
    margin: 20,
    marginBottom: 10,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
  },
  checkoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 18,
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  checkoutPrice: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    margin: 40,
    padding: 16,
    borderRadius: 16,
    elevation: 2,
  },
  continueButtonText: {
    color: '#00BFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  paymentSection: {
    backgroundColor: '#fff',
    margin: 20,
    marginBottom: 10,
    padding: 20,
    borderRadius: 16,
    elevation: 4,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#00BFFF',
    backgroundColor: '#f0f8ff',
  },
  paymentOptionSelected: {
    borderColor: '#00BFFF',
    backgroundColor: '#f0f8ff',
  },
  paymentOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentOptionRight: {
    marginLeft: 10,
  },
  paymentOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  paymentOptionSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  cashInstructions: {
    backgroundColor: '#f0f8ff',
    padding: 15,
    borderRadius: 12,
    marginTop: 10,
  },
  cashHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cashHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#28a745',
    marginLeft: 8,
  },
  cashText: {
    fontSize: 13,
    color: '#333',
    marginBottom: 6,
    lineHeight: 18,
  },
  cashHighlight: {
    fontWeight: '700',
    color: '#28a745',
    backgroundColor: 'rgba(40, 167, 69, 0.1)',
    padding: 8,
    borderRadius: 6,
    marginVertical: 4,
  },
  cashNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(40, 167, 69, 0.2)',
  },
});