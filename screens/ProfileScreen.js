import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Appearance,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme
} from 'react-native';
import { supabase } from '../supabaseClient';


export default function ProfileScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [settings, setSettings] = useState({
    notifications: true,
    darkMode: false,
    locationServices: true,
  });
  const [bookings, setBookings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('bookings');
  const [editProfileModal, setEditProfileModal] = useState(false);
  const [termsModal, setTermsModal] = useState(false);
  const [aboutModal, setAboutModal] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    email: '',
  });
  const colorScheme = useColorScheme();

  // Initialize dark mode from system preference or saved setting
  useEffect(() => {
    const initDarkMode = async () => {
      try {
        const saved = await AsyncStorage.getItem('darkMode');
        if (saved !== null) {
          setSettings(prev => ({ ...prev, darkMode: JSON.parse(saved) }));
        } else {
          setSettings(prev => ({ ...prev, darkMode: colorScheme === 'dark' }));
        }
      } catch (error) {
        console.log('Error loading dark mode preference:', error);
        setSettings(prev => ({ ...prev, darkMode: colorScheme === 'dark' }));
      }
    };
    
    initDarkMode();
    
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (colorScheme === 'dark') {
        setSettings(prev => ({ ...prev, darkMode: true }));
      } else {
        setSettings(prev => ({ ...prev, darkMode: false }));
      }
    });
    
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    checkUser();
  }, []);

  // Define color schemes
  const colors = useMemo(() => ({
    light: {
      primary: '#0077b6',
      background: '#f8f9fa',
      card: '#ffffff',
      text: '#333333',
      textSecondary: '#666666',
      border: '#f0f0f0',
      shadow: '#000',
      gradient: ['#4ab8ebff', '#2e4dc8ff'],
      danger: '#FF6B6B',
      success: '#10B981',
      warning: '#F59E0B',
    },
    dark: {
      primary: '#4ab8eb',
      background: '#121212',
      card: '#1e1e1e',
      text: '#ffffff',
      textSecondary: '#b0b0b0',
      border: '#333333',
      shadow: '#000',
      gradient: ['#1a3b5d', '#0d1b3a'],
      danger: '#ff5252',
      success: '#34d399',
      warning: '#fbbf24',
    }
  }), []);

  const currentColors = settings.darkMode ? colors.dark : colors.light;

  const dynamicStyles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: currentColors.background,
    },
    scrollView: {
      flex: 1,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: currentColors.background,
      padding: 20,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 16,
      color: currentColors.textSecondary,
    },
    loginTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      marginTop: 16,
      marginBottom: 8,
      color: currentColors.text,
    },
    loginSubtitle: {
      fontSize: 16,
      color: currentColors.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
    },
    header: {
      paddingTop: 70,
      paddingBottom: 30,
      borderBottomLeftRadius: 25,
      borderBottomRightRadius: 25,
    },
    profileHeader: {
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    avatarContainer: {
      marginBottom: 16,
    },
    avatarPlaceholder: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: 'rgba(255,255,255,0.3)',
    },
    avatarText: {
      fontSize: 40,
      fontWeight: 'bold',
      color: '#fff',
    },
    userName: {
      fontSize: 28,
      fontWeight: 'bold',
      color: '#fff',
      marginBottom: 4,
    },
    userEmail: {
      fontSize: 16,
      color: 'rgba(255,255,255,0.8)',
      marginBottom: 4,
    },
    statsContainer: {
      flexDirection: 'row',
      backgroundColor: currentColors.card,
      marginHorizontal: 20,
      marginTop: -15,
      borderRadius: 15,
      paddingVertical: 20,
      paddingHorizontal: 10,
      shadowColor: currentColors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
    },
    statDivider: {
      width: 1,
      backgroundColor: currentColors.border,
      marginHorizontal: 10,
    },
    statNumber: {
      fontSize: 24,
      fontWeight: 'bold',
      color: currentColors.primary,
    },
    statLabel: {
      fontSize: 14,
      color: currentColors.textSecondary,
      marginTop: 4,
    },
    section: {
      marginTop: 24,
      paddingHorizontal: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: currentColors.text,
      marginBottom: 12,
    },
    sectionContent: {
      backgroundColor: currentColors.card,
      borderRadius: 15,
      overflow: 'hidden',
    },
    tabContainer: {
      flexDirection: 'row',
      backgroundColor: currentColors.background,
      borderRadius: 10,
      padding: 4,
      marginBottom: 16,
    },
    tab: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: 8,
    },
    activeTab: {
      backgroundColor: currentColors.card,
    },
    tabText: {
      fontSize: 14,
      color: currentColors.textSecondary,
      fontWeight: '500',
    },
    activeTabText: {
      color: currentColors.primary,
      fontWeight: '600',
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: currentColors.border,
    },
    menuItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    menuIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    menuTextContainer: {
      flex: 1,
    },
    menuTitle: {
      fontSize: 16,
      color: currentColors.text,
      marginBottom: 2,
    },
    menuSubtitle: {
      fontSize: 14,
      color: currentColors.textSecondary,
    },
    bookingItem: {
      backgroundColor: currentColors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: currentColors.border,
    },
    bookingHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    serviceInfo: {
      flex: 1,
    },
    serviceName: {
      fontSize: 16,
      fontWeight: '600',
      color: currentColors.text,
      marginBottom: 4,
    },
    bookingDate: {
      fontSize: 14,
      color: currentColors.textSecondary,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      gap: 4,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
    },
    adminNotes: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: currentColors.primary + '10',
      padding: 12,
      borderRadius: 8,
      marginBottom: 12,
      gap: 8,
    },
    notesText: {
      fontSize: 14,
      color: currentColors.text,
      flex: 1,
      lineHeight: 20,
    },
    bookingFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    contactText: {
      fontSize: 14,
      color: currentColors.textSecondary,
    },
    bookingId: {
      fontSize: 12,
      color: currentColors.textSecondary,
    },
    orderItem: {
      backgroundColor: currentColors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: currentColors.border,
    },
    orderHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    orderInfo: {
      flex: 1,
    },
    orderId: {
      fontSize: 16,
      fontWeight: '600',
      color: currentColors.text,
      marginBottom: 4,
    },
    orderDate: {
      fontSize: 14,
      color: currentColors.textSecondary,
    },
    orderProducts: {
      marginBottom: 12,
    },
    productItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: currentColors.border + '30',
    },
    productImage: {
      width: 50,
      height: 50,
      borderRadius: 8,
      marginRight: 12,
    },
    productDetails: {
      flex: 1,
    },
    productName: {
      fontSize: 14,
      color: currentColors.text,
      marginBottom: 4,
    },
    productPrice: {
      fontSize: 12,
      color: currentColors.textSecondary,
    },
    productTotal: {
      fontSize: 14,
      fontWeight: '600',
      color: currentColors.text,
    },
    orderFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: currentColors.border,
    },
    orderTotal: {
      fontSize: 16,
      fontWeight: 'bold',
      color: currentColors.text,
    },
    trackButton: {
      backgroundColor: currentColors.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
    },
    trackButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
    loadingContainer: {
      padding: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyState: {
      padding: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyStateText: {
      fontSize: 18,
      fontWeight: '600',
      color: currentColors.text,
      marginTop: 16,
      marginBottom: 8,
    },
    emptyStateSubtext: {
      fontSize: 14,
      color: currentColors.textSecondary,
      textAlign: 'center',
      marginBottom: 20,
    },
    actionButton: {
      backgroundColor: currentColors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 25,
    },
    actionButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: currentColors.danger + '10',
      marginHorizontal: 20,
      marginVertical: 24,
      padding: 16,
      borderRadius: 15,
      gap: 8,
    },
    logoutText: {
      fontSize: 16,
      fontWeight: '600',
      color: currentColors.danger,
    },
    versionContainer: {
      alignItems: 'center',
      paddingVertical: 20,
      paddingHorizontal: 20,
      marginBottom: 100,
    },
    versionText: {
      fontSize: 12,
      color: currentColors.textSecondary,
      marginBottom: 4,
    },
    // Modal Styles
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      padding: 20,
    },
    modalContent: {
      backgroundColor: currentColors.card,
      borderRadius: 20,
      padding: 24,
      width: '100%',
      maxHeight: '90%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 5,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: currentColors.border,
    },
    modalTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: currentColors.text,
    },
    modalCloseButton: {
      padding: 4,
    },
    modalBody: {
      marginBottom: 20,
    },
    modalFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: currentColors.border,
    },
    modalButton: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
      minWidth: 80,
    },
    modalCancelButton: {
      backgroundColor: currentColors.danger + '10',
    },
    modalCancelButtonText: {
      color: currentColors.danger,
      fontWeight: '600',
      textAlign: 'center',
    },
    modalSaveButton: {
      backgroundColor: currentColors.primary,
    },
    modalSaveButtonText: {
      color: '#fff',
      fontWeight: '600',
      textAlign: 'center',
    },
    formGroup: {
      marginBottom: 16,
    },
    formLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: currentColors.text,
      marginBottom: 6,
    },
    formInput: {
      backgroundColor: currentColors.background,
      borderWidth: 1,
      borderColor: currentColors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      color: currentColors.text,
    },
    formError: {
      color: currentColors.danger,
      fontSize: 12,
      marginTop: 4,
    },
    contentContainer: {
      paddingVertical: 8,
    },
    contentTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: currentColors.primary,
      marginBottom: 16,
      textAlign: 'center',
    },
    contentSection: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: currentColors.text,
      marginBottom: 8,
    },
    contentText: {
      fontSize: 15,
      color: currentColors.textSecondary,
      lineHeight: 22,
      marginBottom: 12,
    },
    contentBullet: {
      fontSize: 15,
      color: currentColors.textSecondary,
      lineHeight: 22,
      marginBottom: 6,
      marginLeft: 8,
    },
    contactItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    aboutImage: {
      width: '100%',
      height: 200,
      borderRadius: 12,
      marginBottom: 16,
    },
    contentSubtitle: {
      fontSize: 16,
      fontWeight: '600',
      color: currentColors.text,
      marginBottom: 8,
    },
  }), [currentColors, settings.darkMode]);

  // ================= CHECK USER FUNCTION =================
  const checkUser = async () => {
    try {
      console.log('🔄 Checking user authentication...');
      
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.log('❌ Auth error:', authError);
        setUser(null);
        setLoading(false);
        return;
      }

      if (authUser) {
        console.log('✅ User authenticated:', authUser.email);
        
        const userFromAuth = {
          id: authUser.id,
          email: authUser.email,
          full_name: authUser.user_metadata?.full_name || 
                     authUser.user_metadata?.name || 
                     (authUser.email ? authUser.email.split('@')[0] : 'User'),
          phone: authUser.user_metadata?.phone || '',
          created_at: authUser.created_at,
        };
        
        console.log('👤 User from auth:', userFromAuth);
        
        try {
          console.log('📋 Attempting to fetch user profile from database...');
          const { data: userProfile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .maybeSingle();
          
          if (profileError && profileError.code !== 'PGRST116') {
            console.log('⚠️ Profile fetch error:', profileError.message);
          }
          
          if (userProfile) {
            console.log('✅ User profile found in database:', userProfile);
            setUser({
              ...userFromAuth,
              full_name: userProfile.full_name || userFromAuth.full_name,
              phone: userProfile.phone || userFromAuth.phone,
              created_at: userProfile.created_at || userFromAuth.created_at,
            });
          } else {
            console.log('📝 No profile in database, using auth data only');
            setUser(userFromAuth);
          }
        } catch (profileHandlingError) {
          console.log('⚠️ Error in profile handling:', profileHandlingError.message);
          setUser(userFromAuth);
        }
        
        console.log('🔄 Loading bookings and orders...');
        Promise.all([loadBookings(), loadOrders()])
          .then(() => console.log('✅ Bookings and orders loaded'))
          .catch(err => console.log('⚠️ Error loading bookings/orders:', err.message));
        
      } else {
        console.log('❌ No authenticated user found');
        setUser(null);
      }
    } catch (error) {
      console.log('❌ Unexpected error in checkUser:', error.message);
      setUser(null);
    } finally {
      console.log('🏁 checkUser completed');
      setLoading(false);
    }
  };

  // ================= LOAD BOOKINGS FUNCTION =================
  const loadBookings = async () => {
    try {
      setBookingsLoading(true);
      
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        setBookings([]);
        return;
      }

      console.log('🔄 Loading bookings for user:', currentUser.id);
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (bookingsError) {
        console.log('❌ Error loading bookings:', bookingsError);
        setBookings([]);
        return;
      }

      console.log(`✅ Found ${bookingsData?.length || 0} bookings:`, bookingsData);
      setBookings(bookingsData || []);
      
    } catch (error) {
      console.log('❌ Error in loadBookings:', error);
      setBookings([]);
    } finally {
      setBookingsLoading(false);
    }
  };

  // ================= LOAD ORDERS FUNCTION =================
  const loadOrders = async () => {
    try {
      setOrdersLoading(true);
      
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        console.log('❌ No user for loading orders');
        setOrders([]);
        return;
      }

      console.log('🔄 Loading orders for user:', currentUser.id);
      
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.log('❌ Error loading orders:', ordersError.message);
        setOrders([]);
        return;
      }

      console.log(`✅ Found ${ordersData?.length || 0} orders`);

      if (ordersData && ordersData.length > 0) {
        const orderIds = ordersData.map(order => order.id);
        console.log('🔄 Fetching items for order IDs:', orderIds);
        
        try {
          const { data: orderItemsData, error: itemsError } = await supabase
            .from('order_items')
            .select(`
              *,
              products (
                id,
                name,
                price,
                image_url,
                description
              )
            `)
            .in('order_id', orderIds);
          
          if (itemsError) {
            console.log('⚠️ Error loading order items:', itemsError.message);
            const ordersWithoutItems = ordersData.map(order => ({
              ...order,
              order_items: []
            }));
            setOrders(ordersWithoutItems);
          } else {
            console.log(`✅ Found ${orderItemsData?.length || 0} order items`);
            const ordersWithItems = ordersData.map(order => ({
              ...order,
              order_items: (orderItemsData || []).filter(item => item.order_id === order.id)
            }));
            
            setOrders(ordersWithItems);
          }
        } catch (itemsCatchError) {
          console.log('⚠️ Exception fetching order items:', itemsCatchError.message);
          const ordersWithoutItems = ordersData.map(order => ({
            ...order,
            order_items: []
          }));
          setOrders(ordersWithoutItems);
        }
      } else {
        console.log('ℹ️ No orders found');
        setOrders([]);
      }
    } catch (error) {
      console.log('❌ Error in loadOrders:', error.message);
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  // ================= EDIT PROFILE FUNCTIONS =================
  const openEditProfile = () => {
    if (!user) return;
    
    setEditForm({
      full_name: user.full_name || '',
      phone: user.phone || '',
      email: user.email || '',
    });
    setEditProfileModal(true);
  };

  const handleSaveProfile = async () => {
    try {
      if (!user) return;

      // Validate inputs
      if (!editForm.full_name.trim()) {
        Alert.alert('Error', 'Full name is required');
        return;
      }

      if (editForm.full_name.trim().length < 2) {
        Alert.alert('Error', 'Full name must be at least 2 characters');
        return;
      }

      if (!editForm.email.trim()) {
        Alert.alert('Error', 'Email is required');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editForm.email)) {
        Alert.alert('Error', 'Please enter a valid email address');
        return;
      }

      if (editForm.phone && !/^[\d\s\-\+\(\)]{7,15}$/.test(editForm.phone)) {
        Alert.alert('Error', 'Please enter a valid phone number');
        return;
      }

      const updateData = {
        full_name: editForm.full_name.trim(),
        phone: editForm.phone.trim() || null,
        updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id);

      if (updateError) {
        console.log('Database update error:', updateError);
        throw updateError;
      }

      if (editForm.email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: editForm.email.trim()
        });
        
        if (emailError) {
          console.log('Email update error:', emailError);
          Alert.alert('Note', 'Profile updated! Email change requires confirmation. Check your email.');
        }
      }

      await supabase.auth.updateUser({
        data: {
          full_name: editForm.full_name.trim(),
          phone: editForm.phone.trim() || null
        }
      });

      setUser(prev => ({
        ...prev,
        ...updateData,
        email: editForm.email.trim()
      }));

      setEditProfileModal(false);
      Alert.alert('Success', 'Profile updated successfully!');
      
    } catch (error) {
      console.log('Error updating profile:', error);
      Alert.alert('Error', error.message || 'Failed to update profile. Please try again.');
    }
  };

  // ================= TOGGLE SETTINGS =================
  const toggleSetting = async (setting) => {
    try {
      const newValue = !settings[setting];
      const newSettings = { ...settings, [setting]: newValue };
      setSettings(newSettings);
      
      if (setting === 'darkMode') {
        await AsyncStorage.setItem('darkMode', JSON.stringify(newValue));
      }
      
      const settingNames = {
        notifications: 'Push Notifications',
        darkMode: 'Dark Mode',
        locationServices: 'Location Services'
      };
      
      Alert.alert(
        'Settings Updated',
        `${settingNames[setting]} ${newValue ? 'enabled' : 'disabled'}`
      );
    } catch (error) {
      console.log('Error saving setting:', error);
    }
  };

  // ================= LOGOUT FUNCTION =================
  const handleLogout = async () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.auth.signOut();
              if (error) throw error;
              
              setUser(null);
              setBookings([]);
              setOrders([]);
              navigation.reset({
                index: 0,
                routes: [{ name: 'Home' }],
              });
            } catch (error) {
              console.log('Error logging out:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          }
        }
      ]
    );
  };

  // ================= REFRESH FUNCTION =================
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await checkUser();
      if (user) {
        await Promise.all([loadBookings(), loadOrders()]);
      }
    } catch (error) {
      console.log('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // ================= FORMAT FUNCTIONS =================
  const formatDate = (dateString) => {
    if (!dateString) return 'Date not set';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const formatCurrency = (amount) => {
    return `₱${Number(amount || 0).toLocaleString()}`;
  };

  // ================= PAYMENT HISTORY =================
  const getPaymentHistory = () => {
    const payments = [];
    
    orders.forEach(order => {
      if (order.status === 'completed' || order.status === 'delivered') {
        payments.push({
          id: `payment_${order.id}`,
          type: 'Product Purchase',
          amount: order.total_amount || order.total || 0,
          date: order.created_at,
          status: 'Paid',
          orderId: order.id,
          method: order.payment_method || 'Credit Card'
        });
      }
    });
    
    bookings.forEach(booking => {
      if (booking.status === 'completed') {
        const bookingAmount = booking.price || booking.total_amount || 500;
        payments.push({
          id: `payment_${booking.id}`,
          type: `Service: ${booking.service_name || 'Pool Service'}`,
          amount: bookingAmount,
          date: booking.booking_date || booking.created_at,
          status: 'Paid',
          bookingId: booking.id,
          method: booking.payment_method || 'Cash'
        });
      }
    });
    
    return payments.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  // ================= RENDER BOOKINGS =================
  // ================= RENDER BOOKINGS =================
// ================= RENDER BOOKINGS =================
// ================= RENDER BOOKINGS =================
const renderBookings = () => {
  if (bookingsLoading) {
    return (
      <View style={dynamicStyles.loadingContainer}>
        <ActivityIndicator size="large" color={currentColors.primary} />
        <Text style={[dynamicStyles.loadingText, { marginTop: 12 }]}>
          Loading bookings...
        </Text>
      </View>
    );
  }

  if (bookings.length === 0) {
    return (
      <View style={dynamicStyles.emptyState}>
        <Ionicons name="calendar-outline" size={64} color={currentColors.textSecondary} />
        <Text style={dynamicStyles.emptyStateText}>No Bookings Yet</Text>
        <Text style={dynamicStyles.emptyStateSubtext}>
          You haven't made any service bookings yet.
        </Text>
        <TouchableOpacity 
          style={dynamicStyles.actionButton}
          onPress={() => navigation.navigate('ServicesTab')}
        >
          <Text style={dynamicStyles.actionButtonText}>Browse Services</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View>
      {bookings.map((booking, index) => {
        const bookingId = booking?.id?.toString() || `booking-${index}`;
        const status = booking?.status?.toLowerCase() || 'pending';
        const serviceName = booking?.service_name || booking?.service || 'Pool Service';
        const bookingDate = booking?.booking_date || booking?.created_at;
        const adminNotes = booking?.admin_notes;
        // Use 'contact' field from booking data
        const contactNumber = booking?.contact || booking?.contact_number || user?.phone || 'No contact number';
        
        let statusColor = currentColors.textSecondary;
        let statusIcon = 'time-outline';
        
        switch (status) {
          case 'confirmed':
            statusColor = currentColors.success;
            statusIcon = 'checkmark-circle-outline';
            break;
          case 'completed':
            statusColor = currentColors.primary;
            statusIcon = 'checkmark-done-outline';
            break;
          case 'cancelled':
            statusColor = currentColors.danger;
            statusIcon = 'close-circle-outline';
            break;
          case 'pending':
            statusColor = currentColors.warning;
            statusIcon = 'hourglass-outline';
            break;
        }

        let formattedDate = 'Date not set';
        try {
          if (bookingDate) {
            formattedDate = new Date(bookingDate).toLocaleDateString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
          }
        } catch (error) {
          console.log('Error formatting date:', error);
        }

        return (
          <View key={bookingId} style={dynamicStyles.bookingItem}>
            <View style={dynamicStyles.bookingHeader}>
              <View style={dynamicStyles.serviceInfo}>
                <Text style={dynamicStyles.serviceName}>
                  {serviceName}
                </Text>
                <Text style={dynamicStyles.bookingDate}>
                  <Ionicons name="calendar-outline" size={14} color={currentColors.textSecondary} />
                  <Text> </Text>
                  <Text>{formattedDate}</Text>
                </Text>
              </View>
              <View style={[dynamicStyles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                <Ionicons name={statusIcon} size={14} color={statusColor} />
                <Text style={[dynamicStyles.statusText, { color: statusColor }]}>
                  {booking.status || 'Pending'}
                </Text>
              </View>
            </View>

            {adminNotes && (
              <View style={dynamicStyles.adminNotes}>
                <Ionicons name="information-circle-outline" size={18} color={currentColors.primary} />
                <Text style={dynamicStyles.notesText}>
                  <Text style={{ fontWeight: '600' }}>Admin Note: </Text>
                  <Text>{adminNotes}</Text>
                </Text>
              </View>
            )}

            <View style={dynamicStyles.bookingFooter}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="call-outline" size={14} color={currentColors.textSecondary} />
                <Text style={dynamicStyles.contactText}>
                  {' '}{contactNumber}
                </Text>
              </View>
              <Text style={dynamicStyles.bookingId}>
                ID: {bookingId.length > 8 ? bookingId.substring(0, 8) : bookingId}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};
 


// Then in renderBookings, replace the contactText with:
<View style={{ flexDirection: 'row', alignItems: 'center' }}>
  <Ionicons name="call-outline" size={14} color={currentColors.textSecondary} />
  
</View>

  // ================= RENDER ORDERS =================
 // ================= RENDER ORDERS =================
const renderOrders = () => {
  if (ordersLoading) {
    return (
      <View style={dynamicStyles.loadingContainer}>
        <ActivityIndicator size="large" color={currentColors.primary} />
        <Text style={[dynamicStyles.loadingText, { marginTop: 12 }]}>
          Loading orders...
        </Text>
      </View>
    );
  }

  if (orders.length === 0) {
    return (
      <View style={dynamicStyles.emptyState}>
        <Ionicons name="cart-outline" size={64} color={currentColors.textSecondary} />
        <Text style={dynamicStyles.emptyStateText}>No Orders Yet</Text>
        <Text style={dynamicStyles.emptyStateSubtext}>
          You haven't placed any orders yet.
        </Text>
        <TouchableOpacity 
          style={dynamicStyles.actionButton}
          onPress={() => navigation.navigate('Store')}
        >
          <Text style={dynamicStyles.actionButtonText}>Browse Store</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View>
      {orders.map((order, index) => {
        const orderId = order?.id?.toString() || `order-${index}`;
        const status = order?.status?.toLowerCase() || 'processing';
        const orderItems = order?.order_items || [];
        const totalAmount = order?.total_amount || order?.total || 0;
        
        let formattedDate = 'Date not set';
        try {
          if (order.created_at) {
            formattedDate = new Date(order.created_at).toLocaleDateString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
          }
        } catch (error) {
          console.log('Error formatting order date:', error);
        }

        let statusColor = currentColors.textSecondary;
        switch (status) {
          case 'delivered':
            statusColor = currentColors.success;
            break;
          case 'shipped':
            statusColor = currentColors.primary;
            break;
          case 'cancelled':
            statusColor = currentColors.danger;
            break;
          case 'processing':
            statusColor = currentColors.warning;
            break;
        }

        return (
          <View key={orderId} style={dynamicStyles.orderItem}>
            <View style={dynamicStyles.orderHeader}>
              <View style={dynamicStyles.orderInfo}>
                <Text style={dynamicStyles.orderId}>Order #{orderId.length > 8 ? orderId.substring(0, 8) : orderId}</Text>
                <Text style={dynamicStyles.orderDate}>
                  <Ionicons name="calendar-outline" size={14} color={currentColors.textSecondary} />{' '}
                  {formattedDate}
                </Text>
              </View>
              <View style={[dynamicStyles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                <Text style={[dynamicStyles.statusText, { color: statusColor }]}>
                  {order.status || 'Processing'}
                </Text>
              </View>
            </View>

            <View style={dynamicStyles.orderProducts}>
              {orderItems.slice(0, 2).map((item, itemIndex) => {
                const productPrice = item?.products?.price || item?.price || 0;
                const quantity = item?.quantity || 1;
                const productName = item?.products?.name || item?.product_name || 'Product';
                const productImage = item?.products?.image_url || item?.image_url || 'https://via.placeholder.com/50';
                
                return (
                  <View key={itemIndex} style={dynamicStyles.productItem}>
                    <Image
                      source={{ uri: productImage }}
                      style={dynamicStyles.productImage}
                    />
                    <View style={dynamicStyles.productDetails}>
                      <Text style={dynamicStyles.productName} numberOfLines={1}>
                        {productName}
                      </Text>
                      <Text style={dynamicStyles.productPrice}>
                        ₱{productPrice.toLocaleString()} × {quantity}
                      </Text>
                    </View>
                    <Text style={dynamicStyles.productTotal}>
                      ₱{(productPrice * quantity).toLocaleString()}
                    </Text>
                  </View>
                );
              })}
              
              {orderItems.length > 2 && (
                <Text style={[dynamicStyles.productPrice, { textAlign: 'center', paddingVertical: 8 }]}>
                  +{orderItems.length - 2} more items
                </Text>
              )}
            </View>

            <View style={dynamicStyles.orderFooter}>
              <Text style={dynamicStyles.orderTotal}>
                Total: ₱{totalAmount.toLocaleString()}
              </Text>
              {/* Track Order button has been removed */}
            </View>
          </View>
        );
      })}
    </View>
  );
};

  // ================= PAYMENT HISTORY ITEM =================
  const PaymentHistoryItem = ({ payment }) => {
    const paymentId = payment?.id?.toString() || 'unknown';
    
    return (
      <View style={[dynamicStyles.menuItem, { borderBottomWidth: 0, marginVertical: 4 }]}>
        <View style={dynamicStyles.menuItemLeft}>
          <View style={[dynamicStyles.menuIconContainer, { 
            backgroundColor: payment.status === 'Paid' ? '#10B98120' : '#F59E0B20' 
          }]}>
            <Ionicons 
              name={payment.status === 'Paid' ? 'checkmark-circle' : 'time'} 
              size={22} 
              color={payment.status === 'Paid' ? '#10B981' : '#F59E0B'} 
            />
          </View>
          <View style={dynamicStyles.menuTextContainer}>
            <Text style={dynamicStyles.menuTitle}>{payment.type}</Text>
            <Text style={dynamicStyles.menuSubtitle}>
              {formatDate(payment.date)} • {payment.method}
            </Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[dynamicStyles.menuTitle, { color: currentColors.primary }]}>
            {formatCurrency(payment.amount)}
          </Text>
          <View style={[
            dynamicStyles.statusBadge, 
            { 
              backgroundColor: payment.status === 'Paid' ? '#10B98120' : '#F59E0B20',
              marginTop: 4
            }
          ]}>
            <Text style={[
              dynamicStyles.statusText, 
              { color: payment.status === 'Paid' ? '#10B981' : '#F59E0B' }
            ]}>
              {payment.status}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // ================= MENU ITEM COMPONENT =================
  const MenuItem = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    showArrow = true, 
    isSwitch = false, 
    switchValue, 
    onToggle,
    color = "#0077b6"
  }) => (
    <TouchableOpacity 
      style={dynamicStyles.menuItem} 
      onPress={onPress}
      disabled={isSwitch}
    >
      <View style={dynamicStyles.menuItemLeft}>
        <View style={[dynamicStyles.menuIconContainer, { backgroundColor: `${color}20` }]}>
          <Ionicons name={icon} size={22} color={color} />
        </View>
        <View style={dynamicStyles.menuTextContainer}>
          <Text style={dynamicStyles.menuTitle}>{title}</Text>
          {subtitle && <Text style={dynamicStyles.menuSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      
      {isSwitch ? (
        <Switch
          value={switchValue}
          onValueChange={onToggle}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={switchValue ? '#0077b6' : '#f4f3f4'}
        />
      ) : showArrow ? (
        <Ionicons name="chevron-forward" size={20} color={currentColors.textSecondary} />
      ) : null}
    </TouchableOpacity>
  );

  // ================= PROFILE SECTION COMPONENT =================
  const ProfileSection = ({ title, children }) => (
    <View style={dynamicStyles.section}>
      <Text style={dynamicStyles.sectionTitle}>{title}</Text>
      <View style={dynamicStyles.sectionContent}>
        {children}
      </View>
    </View>
  );

  // ================= MODALS =================
  const TermsAndConditionsModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={termsModal}
      onRequestClose={() => setTermsModal(false)}
    >
      <View style={dynamicStyles.modalContainer}>
        <View style={dynamicStyles.modalContent}>
          <View style={dynamicStyles.modalHeader}>
            <Text style={dynamicStyles.modalTitle}>Terms & Conditions</Text>
            <TouchableOpacity 
              style={dynamicStyles.modalCloseButton}
              onPress={() => setTermsModal(false)}
            >
              <Ionicons name="close" size={24} color={currentColors.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={dynamicStyles.modalBody} showsVerticalScrollIndicator={false}>
            <View style={dynamicStyles.contentContainer}>
              <Text style={dynamicStyles.contentTitle}>Tropics Pools & Landscape - Terms of Service</Text>
              
              <View style={dynamicStyles.contentSection}>
                <Text style={dynamicStyles.sectionTitle}>1. Acceptance of Terms</Text>
                <Text style={dynamicStyles.contentText}>
                  By accessing and using Tropics Pools services, you agree to be bound by these Terms and Conditions.
                </Text>
              </View>
              
              <View style={dynamicStyles.contentSection}>
                <Text style={dynamicStyles.sectionTitle}>2. Services</Text>
                <Text style={dynamicStyles.contentText}>
                  We provide custom pool design, construction, maintenance, and supply services. All services are subject to availability and site inspection.
                </Text>
              </View>
              
              <View style={dynamicStyles.contentSection}>
                <Text style={dynamicStyles.sectionTitle}>3. Booking and Payments</Text>
                <Text style={dynamicStyles.contentBullet}>• Bookings require a 30% deposit</Text>
                <Text style={dynamicStyles.contentBullet}>• Balance due upon project completion</Text>
                <Text style={dynamicStyles.contentBullet}>• Cancellations within 48 hours may incur charges</Text>
                <Text style={dynamicStyles.contentBullet}>• All prices are in Philippine Pesos (₱)</Text>
              </View>
              
              <View style={dynamicStyles.contentSection}>
                <Text style={dynamicStyles.sectionTitle}>4. Warranty</Text>
                <Text style={dynamicStyles.contentText}>
                  We provide a 2-year warranty on construction workmanship and a 1-year warranty on pool equipment.
                </Text>
              </View>
              
              <View style={dynamicStyles.contentSection}>
                <Text style={dynamicStyles.sectionTitle}>5. Liability</Text>
                <Text style={dynamicStyles.contentText}>
                  Tropics Pools is not liable for damages caused by natural disasters, improper maintenance by clients, or modifications made by third parties.
                </Text>
              </View>
              
              <View style={dynamicStyles.contentSection}>
                <Text style={dynamicStyles.sectionTitle}>6. Privacy Policy</Text>
                <Text style={dynamicStyles.contentText}>
                  We respect your privacy. Your personal information is used only for service provision and will not be shared without your consent.
                </Text>
              </View>
              
              <View style={dynamicStyles.contentSection}>
                <Text style={dynamicStyles.sectionTitle}>7. Changes to Terms</Text>
                <Text style={dynamicStyles.contentText}>
                  We reserve the right to modify these terms at any time. Continued use of services constitutes acceptance of changes.
                </Text>
              </View>
              
              <View style={dynamicStyles.contentSection}>
                <Text style={dynamicStyles.sectionTitle}>8. Contact</Text>
                <Text style={dynamicStyles.contentText}>
                  For questions about these terms, contact us at:
                </Text>
                <View style={dynamicStyles.contactItem}>
                  <Ionicons name="call-outline" size={16} color={currentColors.primary} />
                  <Text style={[dynamicStyles.contentText, { marginLeft: 8 }]}>0915 736 2648</Text>
                </View>
                <View style={dynamicStyles.contactItem}>
                  <Ionicons name="location-outline" size={16} color={currentColors.primary} />
                  <Text style={[dynamicStyles.contentText, { marginLeft: 8 }]}>
                    Purok Bougainvillea, Dumaguete City
                  </Text>
                </View>
                <View style={dynamicStyles.contactItem}>
                  <Ionicons name="mail-outline" size={16} color={currentColors.primary} />
                  <Text style={[dynamicStyles.contentText, { marginLeft: 8 }]}>tropicspools@example.com</Text>
                </View>
              </View>
              
              <Text style={[dynamicStyles.contentText, { fontStyle: 'italic', marginTop: 20, fontSize: 13 }]}>
                Last Updated: January 2024
              </Text>
            </View>
          </ScrollView>
          
          <View style={dynamicStyles.modalFooter}>
            <TouchableOpacity 
              style={[dynamicStyles.modalButton, dynamicStyles.modalCancelButton]}
              onPress={() => setTermsModal(false)}
            >
              <Text style={dynamicStyles.modalCancelButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const AboutUsModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={aboutModal}
      onRequestClose={() => setAboutModal(false)}
    >
      <View style={dynamicStyles.modalContainer}>
        <View style={dynamicStyles.modalContent}>
          <View style={dynamicStyles.modalHeader}>
            <Text style={dynamicStyles.modalTitle}>About Tropics Pools</Text>
            <TouchableOpacity 
              style={dynamicStyles.modalCloseButton}
              onPress={() => setAboutModal(false)}
            >
              <Ionicons name="close" size={24} color={currentColors.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={dynamicStyles.modalBody} showsVerticalScrollIndicator={false}>
            <View style={dynamicStyles.contentContainer}>
              <Image
                source={{ 
                  uri: 'https://ohcpyffkzopsmktqudlh.supabase.co/storage/v1/object/public/services/tropics%203.jpg'
                }}
                style={dynamicStyles.aboutImage}
              />
              
              <Text style={dynamicStyles.contentTitle}>ABOUT US</Text>
              <Text style={dynamicStyles.contentText}>
                TROPICS POOLS has been building custom, quality pools and picturesque landscapes to home and resort owners in Negros Oriental and Siquijor since 2001!
              </Text>
              
              <View style={dynamicStyles.contentSection}>
                <Text style={dynamicStyles.contentSubtitle}>Our Story</Text>
                <Text style={dynamicStyles.contentText}>
                  Founded in 2001, Tropics Pools began as a small family business with a passion for creating beautiful aquatic spaces. Over two decades, we've grown to become the leading pool and landscape specialist in the region, completing over 500 projects for satisfied clients.
                </Text>
              </View>
              
              <View style={dynamicStyles.contentSection}>
                <Text style={dynamicStyles.contentSubtitle}>MISSION</Text>
                <Text style={dynamicStyles.contentText}>
                  Our mission is to provide our clients with the highest quality custom pools that exceed their expectations. We strive to create a backyard oasis that brings joy and relaxation to families and resort owners.
                </Text>
              </View>
              
              <View style={dynamicStyles.contentSection}>
                <Text style={dynamicStyles.contentSubtitle}>VISION</Text>
                <Text style={dynamicStyles.contentText}>
                  Our vision is to be the go-to provider for custom pool design, construction, and supplies in the region. We are committed to delivering exceptional service and innovative solutions to our valued customers.
                </Text>
              </View>
              
              <View style={dynamicStyles.contentSection}>
                <Text style={dynamicStyles.contentSubtitle}>Our Values</Text>
                <Text style={dynamicStyles.contentBullet}>• Quality craftsmanship in every project</Text>
                <Text style={dynamicStyles.contentBullet}>• Customer satisfaction as our top priority</Text>
                <Text style={dynamicStyles.contentBullet}>• Innovation in design and technology</Text>
                <Text style={dynamicStyles.contentBullet}>• Integrity in all business dealings</Text>
                <Text style={dynamicStyles.contentBullet}>• Environmental responsibility</Text>
              </View>
              
              <View style={dynamicStyles.contentSection}>
                <Text style={dynamicStyles.contentSubtitle}>Our Services</Text>
                <Text style={dynamicStyles.contentBullet}>• Custom Pool Design & Construction</Text>
                <Text style={dynamicStyles.contentBullet}>• Pool Renovation & Repair</Text>
                <Text style={dynamicStyles.contentBullet}>• Landscape Design & Installation</Text>
                <Text style={dynamicStyles.contentBullet}>• Pool Maintenance & Cleaning</Text>
                <Text style={dynamicStyles.contentBullet}>• Quality Pool Supplies & Equipment</Text>
              </View>
              
              <View style={dynamicStyles.contentSection}>
                <Text style={dynamicStyles.contentSubtitle}>Contact Information</Text>
                <View style={dynamicStyles.contactItem}>
                  <Ionicons name="location-outline" size={18} color={currentColors.primary} />
                  <Text style={[dynamicStyles.contentText, { marginLeft: 10 }]}>
                    Purok Bougainvillea, Dumaguete City
                  </Text>
                </View>
                <View style={dynamicStyles.contactItem}>
                  <Ionicons name="call-outline" size={18} color={currentColors.primary} />
                  <Text style={[dynamicStyles.contentText, { marginLeft: 10 }]}>0915 736 2648</Text>
                </View>
                <View style={dynamicStyles.contactItem}>
                  <Ionicons name="time-outline" size={18} color={currentColors.primary} />
                  <Text style={[dynamicStyles.contentText, { marginLeft: 10 }]}>Mon-Sun, 7:00 AM - 7:00 PM</Text>
                </View>
                <View style={dynamicStyles.contactItem}>
                  <Ionicons name="mail-outline" size={18} color={currentColors.primary} />
                  <Text style={[dynamicStyles.contentText, { marginLeft: 10 }]}>tropicspools@example.com</Text>
                </View>
              </View>
              
              
            </View>
          </ScrollView>
          
          <View style={dynamicStyles.modalFooter}>
            <TouchableOpacity 
              style={[dynamicStyles.modalButton, dynamicStyles.modalCancelButton]}
              onPress={() => setAboutModal(false)}
            >
              <Text style={dynamicStyles.modalCancelButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const EditProfileModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={editProfileModal}
      onRequestClose={() => setEditProfileModal(false)}
    >
      <View style={dynamicStyles.modalContainer}>
        <View style={dynamicStyles.modalContent}>
          <View style={dynamicStyles.modalHeader}>
            <Text style={dynamicStyles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity 
              style={dynamicStyles.modalCloseButton}
              onPress={() => setEditProfileModal(false)}
            >
              <Ionicons name="close" size={24} color={currentColors.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={dynamicStyles.modalBody} showsVerticalScrollIndicator={false}>
            <View style={dynamicStyles.formGroup}>
              <Text style={dynamicStyles.formLabel}>Full Name</Text>
              <TextInput
                style={dynamicStyles.formInput}
                value={editForm.full_name}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, full_name: text }))}
                placeholder="Enter your full name"
                placeholderTextColor={currentColors.textSecondary + '80'}
              />
            </View>
            
            <View style={dynamicStyles.formGroup}>
              <Text style={dynamicStyles.formLabel}>Email Address</Text>
              <TextInput
                style={dynamicStyles.formInput}
                value={editForm.email}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, email: text }))}
                placeholder="Enter your email"
                placeholderTextColor={currentColors.textSecondary + '80'}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            
            <View style={dynamicStyles.formGroup}>
              <Text style={dynamicStyles.formLabel}>Phone Number</Text>
              <TextInput
                style={dynamicStyles.formInput}
                value={editForm.phone}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, phone: text }))}
                placeholder="Enter your phone number"
                placeholderTextColor={currentColors.textSecondary + '80'}
                keyboardType="phone-pad"
              />
            </View>
          </ScrollView>
          
          <View style={dynamicStyles.modalFooter}>
            <TouchableOpacity 
              style={[dynamicStyles.modalButton, dynamicStyles.modalCancelButton]}
              onPress={() => setEditProfileModal(false)}
            >
              <Text style={dynamicStyles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[dynamicStyles.modalButton, dynamicStyles.modalSaveButton]}
              onPress={handleSaveProfile}
            >
              <Text style={dynamicStyles.modalSaveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // ================= LOADING & LOGIN STATES =================
  if (loading) {
    return (
      <View style={dynamicStyles.centered}>
        <ActivityIndicator size="large" color={currentColors.primary} />
        <Text style={dynamicStyles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={dynamicStyles.centered}>
        <Ionicons name="person-circle-outline" size={80} color={currentColors.primary} />
        <Text style={dynamicStyles.loginTitle}>Welcome to Tropics Pools!</Text>
        <Text style={dynamicStyles.loginSubtitle}>Please login to view your profile and orders</Text>
        <TouchableOpacity 
          style={[styles.loginButton, { backgroundColor: currentColors.primary }]}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginButtonText}>Login to Your Account</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.signupButton, { borderColor: currentColors.primary }]}
          onPress={() => navigation.navigate('Signup')}
        >
          <Text style={[styles.signupButtonText, { color: currentColors.primary }]}>
            Create New Account
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ================= MAIN RENDER =================
  const paymentHistory = getPaymentHistory();
  const gradientColors = settings.darkMode 
    ? currentColors.gradient 
    : ['#4ab8ebff', '#2e4dc8ff'];

  return (
    <View style={dynamicStyles.container}>
      <ScrollView 
        style={dynamicStyles.scrollView}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[currentColors.primary]}
            tintColor={currentColors.primary}
            progressBackgroundColor={currentColors.card}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Gradient */}
        <LinearGradient
          colors={gradientColors}
          style={dynamicStyles.header}
        >
          <View style={dynamicStyles.profileHeader}>
            <TouchableOpacity 
              style={dynamicStyles.avatarContainer}
              onPress={openEditProfile}
            >
              <View style={dynamicStyles.avatarPlaceholder}>
                <Text style={dynamicStyles.avatarText}>
                  {user?.full_name?.[0]?.toUpperCase() || 'U'}
                </Text>
              </View>
            </TouchableOpacity>
            
            <Text style={dynamicStyles.userName}>{user?.full_name || 'User'}</Text>
            <Text style={dynamicStyles.userEmail}>{user?.email || 'No email'}</Text>
         {user?.phone && (
  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    <Text style={[dynamicStyles.userEmail, { fontSize: 14 }]}>📱</Text>
    <Text style={[dynamicStyles.userEmail, { fontSize: 14, marginLeft: 4 }]}>
      {user.phone}
    </Text>
  </View>

)}
               </View>
        </LinearGradient>

        {/* Stats */}
        <View style={dynamicStyles.statsContainer}>
          <View style={dynamicStyles.statItem}>
            <Text style={dynamicStyles.statNumber}>{bookings.length}</Text>
            <Text style={dynamicStyles.statLabel}>Bookings</Text>
          </View>
          <View style={dynamicStyles.statDivider} />
          <View style={dynamicStyles.statItem}>
            <Text style={dynamicStyles.statNumber}>{orders.length}</Text>
            <Text style={dynamicStyles.statLabel}>Orders</Text>
          </View>
          <View style={dynamicStyles.statDivider} />
          <View style={dynamicStyles.statItem}>
            <Text style={dynamicStyles.statNumber}>
              {new Date(user?.created_at).getFullYear()}
            </Text>
            <Text style={dynamicStyles.statLabel}>Member Since</Text>
          </View>
        </View>

      {/* Bookings & Orders Section */}
      <ProfileSection title="My Activities">
        <View style={dynamicStyles.tabContainer}>
          <TouchableOpacity 
            style={[dynamicStyles.tab, activeTab === 'bookings' && dynamicStyles.activeTab]}
            onPress={() => setActiveTab('bookings')}
          >
            <Text style={[dynamicStyles.tabText, activeTab === 'bookings' && dynamicStyles.activeTabText]}>
              Bookings ({bookings.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[dynamicStyles.tab, activeTab === 'orders' && dynamicStyles.activeTab]}
            onPress={() => setActiveTab('orders')}
          >
            <Text style={[dynamicStyles.tabText, activeTab === 'orders' && dynamicStyles.activeTabText]}>
              Orders ({orders.length})
            </Text>
          </TouchableOpacity>
        </View>

        <View style={dynamicStyles.sectionContent}>
          {activeTab === 'bookings' ? renderBookings() : renderOrders()}
        </View>
      </ProfileSection>

        {/* Account Section */}
        <ProfileSection title="Account">
          <MenuItem
            icon="person-outline"
            title="Personal Information"
            subtitle={`${user.full_name} • ${user.phone || 'No phone'}`}
            onPress={openEditProfile}
            color="#4CAF50"
          />
          <MenuItem
            icon="receipt-outline"
            title="Payment History"
            subtitle={`${paymentHistory.length} transactions`}
            onPress={() => {
              if (paymentHistory.length > 0) {
                const totalSpent = paymentHistory.reduce((sum, payment) => sum + payment.amount, 0);
                Alert.alert(
                  'Payment Summary',
                  `Total Payments: ${formatCurrency(totalSpent)}\nTransactions: ${paymentHistory.length}`,
                  [{ text: 'OK' }]
                );
              } else {
                Alert.alert('No Payments', 'You have no payment history yet.');
              }
            }}
          />
        </ProfileSection>

        {/* Preferences Section */}
        <ProfileSection title="Preferences">
          <MenuItem
            icon="moon-outline"
            title="Dark Mode"
            isSwitch={true}
            switchValue={settings.darkMode}
            onToggle={() => toggleSetting('darkMode')}
          />
          <MenuItem
            icon="notifications-outline"
            title="Notifications"
            isSwitch={true}
            switchValue={settings.notifications}
            onToggle={() => toggleSetting('notifications')}
          />
        </ProfileSection>

        {/* Support Section */}
        <ProfileSection title="Support">
          <MenuItem
            icon="document-text-outline"
            title="Terms & Conditions"
            onPress={() => setTermsModal(true)}
          />
          <MenuItem
            icon="information-circle-outline"
            title="About Us"
            onPress={() => setAboutModal(true)}
          />
        </ProfileSection>

        {/* Logout Button */}
        <TouchableOpacity 
          style={dynamicStyles.logoutButton}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={22} color={currentColors.danger} />
          <Text style={dynamicStyles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/* App Version */}
        <View style={dynamicStyles.versionContainer}>
          <Text style={dynamicStyles.versionText}>Tropics Pools & Landscape</Text>
          <Text style={dynamicStyles.versionText}>Version 1.0.0</Text>
          <Text style={dynamicStyles.versionText}>
            Member since {new Date(user.created_at).getFullYear()}
          </Text>
        </View>
      </ScrollView>

      {/* Modals */}
      <EditProfileModal />
      <TermsAndConditionsModal />
      <AboutUsModal />
    </View>
  );
}

const styles = StyleSheet.create({
  loginButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  signupButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 2,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  signupButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});