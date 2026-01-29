import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../supabaseClient';

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [user, setUser] = useState(null);

  // First, create the notifications table if it doesn't exist
  const createNotificationsTable = async () => {
    // This would be run in Supabase SQL editor, not here in the app
    // But we'll handle it gracefully if table doesn't exist
  };

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      return user;
    } catch (error) {
      console.error('Error checking user:', error);
      return null;
    }
  };

  const loadNotifications = async () => {
    try {
      setLoading(true);
      
      const currentUser = await checkUser();
      if (!currentUser) {
        console.log('No user logged in');
        // Show sample notifications for demo
        setNotifications(getSampleNotifications());
        setUnreadCount(2);
        setLoading(false);
        return;
      }

      try {
        // Try to fetch notifications from database
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          console.log('No notifications table or error:', error);
          // Use sample notifications
          setNotifications(getSampleNotifications());
          setUnreadCount(2);
        } else {
          if (data && data.length > 0) {
            // Transform the data
            const formattedNotifications = data.map(notification => ({
              id: notification.id,
              title: notification.title || 'Notification',
              message: notification.message,
              type: notification.type || 'info',
              is_read: notification.is_read || false,
              created_at: notification.created_at,
              icon: notification.icon || getIconForType(notification.type),
              action: notification.action,
              data: notification.data || {}
            }));
            
            setNotifications(formattedNotifications);
            
            // Calculate unread count
            const unread = formattedNotifications.filter(n => !n.is_read).length;
            setUnreadCount(unread);
          } else {
            // No notifications yet
            setNotifications(getSampleNotifications());
            setUnreadCount(2);
          }
        }
      } catch (dbError) {
        console.error('Database error:', dbError);
        // Fallback to sample notifications
        setNotifications(getSampleNotifications());
        setUnreadCount(2);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotifications(getSampleNotifications());
      setUnreadCount(2);
    } finally {
      setLoading(false);
    }
  };

  const getSampleNotifications = () => {
    return [
      {
        id: '1',
        title: 'Booking Confirmed',
        message: 'Your pool cleaning service has been confirmed for tomorrow at 2 PM.',
        type: 'booking',
        is_read: false,
        created_at: new Date().toISOString(),
        icon: 'calendar-check',
        action: 'view_booking'
      },
      {
        id: '2',
        title: 'New Product Available',
        message: 'Check out our new pool cleaning chemicals now available in store.',
        type: 'product',
        is_read: false,
        created_at: new Date(Date.now() - 3600000).toISOString(),
        icon: 'cube',
        action: 'view_products'
      },
      {
        id: '3',
        title: 'Service Reminder',
        message: 'Your monthly pool maintenance is due next week. Book now to ensure availability.',
        type: 'reminder',
        is_read: true,
        created_at: new Date(Date.now() - 86400000).toISOString(),
        icon: 'alarm',
        action: 'book_service'
      },
      {
        id: '4',
        title: 'Payment Received',
        message: 'Payment for your recent service has been processed successfully.',
        type: 'payment',
        is_read: true,
        created_at: new Date(Date.now() - 172800000).toISOString(),
        icon: 'card',
        action: 'view_invoice'
      },
      {
        id: '5',
        title: 'Special Offer',
        message: 'Get 20% off on all landscaping services this month! Limited time offer.',
        type: 'promotion',
        is_read: true,
        created_at: new Date(Date.now() - 259200000).toISOString(),
        icon: 'pricetag',
        action: 'view_offers'
      }
    ];
  };

  const getIconForType = (type) => {
    const iconMap = {
      'booking': 'calendar-check',
      'product': 'cube',
      'reminder': 'alarm',
      'payment': 'card',
      'promotion': 'pricetag',
      'info': 'information-circle',
      'warning': 'warning',
      'success': 'checkmark-circle',
      'error': 'alert-circle'
    };
    return iconMap[type] || 'notifications';
  };

  const getIconColor = (type) => {
    const colorMap = {
      'booking': '#2e4dc8',
      'product': '#4ab8eb',
      'reminder': '#FF9800',
      'payment': '#4CAF50',
      'promotion': '#FF6B6B',
      'info': '#2196F3',
      'warning': '#FF9800',
      'success': '#4CAF50',
      'error': '#F44336'
    };
    return colorMap[type] || '#64748B';
  };

  const markAsRead = async (notificationId) => {
    try {
      if (!user) return;

      // Update locally first
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      );

      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));

      // Try to update in database if notification is from DB
      const notification = notifications.find(n => n.id === notificationId);
      if (notification && typeof notification.id === 'number') {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notificationId);
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      if (!user) return;

      // Update all locally
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, is_read: true }))
      );

      setUnreadCount(0);

      // Update all in database
      if (notifications.some(n => typeof n.id === 'number')) {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', user.id)
          .eq('is_read', false);
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleNotificationPress = (notification) => {
    // Mark as read
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // Handle different actions
    switch (notification.action) {
      case 'view_booking':
        navigation.navigate('Booking');
        break;
      case 'book_service':
        navigation.navigate('Services');
        break;
      case 'view_products':
        navigation.navigate('Products');
        break;
      case 'view_offers':
        navigation.navigate('Home');
        break;
      case 'view_invoice':
        navigation.navigate('Profile', { screen: 'Invoices' });
        break;
      default:
        // Show notification details
        Alert.alert(notification.title, notification.message, [
          { text: 'OK', style: 'default' }
        ]);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      // Remove locally
      setNotifications(prev => prev.filter(n => n.id !== notificationId));

      // Update unread count
      const notification = notifications.find(n => n.id === notificationId);
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      // Delete from database if it exists there
      if (typeof notificationId === 'number') {
        await supabase
          .from('notifications')
          .delete()
          .eq('id', notificationId);
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const renderNotificationItem = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.notificationItem,
        !item.is_read && styles.unreadNotification
      ]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={[getIconColor(item.type), `${getIconColor(item.type)}99`]}
              style={styles.iconGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons 
                name={item.icon} 
                size={20} 
                color="#fff" 
              />
            </LinearGradient>
          </View>
          
          <View style={styles.textContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.notificationTitle} numberOfLines={1}>
                {item.title}
              </Text>
              {!item.is_read && (
                <View style={styles.unreadDot} />
              )}
            </View>
            <Text style={styles.notificationTime}>
              {formatTime(item.created_at)}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => deleteNotification(item.id)}
          >
            <Ionicons name="close" size={20} color="#94A3B8" />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.notificationMessage} numberOfLines={2}>
          {item.message}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotifications().finally(() => setRefreshing(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [])
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#4ab8eb', '#2e4dc8']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Notifications</Text>
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          
          <TouchableOpacity 
            style={styles.markAllButton}
            onPress={markAllAsRead}
            disabled={unreadCount === 0}
          >
            <Text style={[
              styles.markAllText,
              unreadCount === 0 && styles.markAllDisabled
            ]}>
              Mark all read
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2e4dc8" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={80} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>No notifications</Text>
          <Text style={styles.emptyText}>
            You're all caught up! Check back later for updates.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderNotificationItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#2e4dc8']}
              tintColor="#2e4dc8"
            />
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderText}>
                Recent Notifications
              </Text>
            </View>
          }
        />
      )}
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
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginRight: 10,
  },
  badge: {
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  markAllButton: {
    padding: 8,
  },
  markAllText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  markAllDisabled: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  listHeader: {
    marginBottom: 16,
  },
  listHeaderText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
  },
  notificationItem: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  unreadNotification: {
    backgroundColor: '#F0F9FF',
    borderColor: '#E0F2FE',
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    marginRight: 12,
  },
  iconGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2e4dc8',
    marginLeft: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
});