import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { registerRootComponent } from 'expo';
import { LogBox, Platform } from 'react-native';

// Suppress specific warnings
LogBox.ignoreLogs([
  'AuthSessionMissingError',
  'The data in this module is over two months old',
]);

// Screens
import BookingScreen from './screens/BookingScreen';
import CartScreen from './screens/CartScreen';
import CategoriesScreen from './screens/CategoriesScreen';
import ContactScreen from './screens/ContactScreen';
import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';
import MyBookingsScreen from './screens/MyBookingsScreen';
import ProductDetails from './screens/ProductDetails';
import ProductsScreen from './screens/ProductsScreen';
import ProfileScreen from './screens/ProfileScreen';
import ProjectsScreen from './screens/ProjectsScreen';
import ServicesDetails from './screens/ServicesDetails';
import ServicesScreen from './screens/ServicesScreen';
import SignupScreen from './screens/SignupScreen';
import WelcomeScreen from './screens/WelcomeScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Screen Names
const SCREENS = {
  HOME: 'Home',
  CATEGORIES: 'Categories',
  SERVICES: 'Services',
  CART: 'Cart',
  PROFILE: 'Profile',
};

// Bottom Tab Navigator
function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Home: 'home-outline',
            Categories: 'grid-outline',
            Services: 'construct-outline',
            Cart: 'cart-outline',
            Profile: 'person-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#0EA5E9',
        tabBarInactiveTintColor: '#777',
        tabBarStyle: {
          position: 'absolute',
          marginHorizontal: 0,
          marginBottom: 0,
          borderRadius: 0,
          height: 110,
          backgroundColor: '#f5f7faff',
          elevation: 3,
          shadowColor: '#000',
          shadowOpacity: 0.35,
          shadowRadius: 8,
          borderWidth: 0,
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          paddingHorizontal: 10,
          paddingBottom: Platform.OS === 'ios' ? 20 : 10,
          paddingTop: 5,
        },
        tabBarItemStyle: {
          paddingHorizontal: 8,
          marginHorizontal: 2,
          height: 50,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '1000',
          marginBottom: Platform.OS === 'android' ? 10 : 10,
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginTop: 8,
        },
        tabBarHideOnKeyboard: true, // Add this
      })}
    >
      <Tab.Screen name={SCREENS.HOME} component={HomeScreen} />
      <Tab.Screen name={SCREENS.CATEGORIES} component={CategoriesScreen} />
      <Tab.Screen name={SCREENS.SERVICES} component={ServicesScreen} />
      <Tab.Screen name={SCREENS.CART} component={CartScreen} />
      <Tab.Screen name={SCREENS.PROFILE} component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// Main App
function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Welcome"
        screenOptions={{
          gestureEnabled: true,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen
          name="Welcome"
          component={WelcomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="MainTabs"
          component={TabNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Products"
          component={ProductsScreen}
          options={({ route }) => ({
            title: route?.params?.category ?? 'Products',
          })}
        />
        <Stack.Screen
          name="ProductDetails"
          component={ProductDetails}
          options={({ route }) => ({
            title: route?.params?.product?.name ?? 'Product Details',
          })}
        />

         

        {/* Add these if you want standalone stack screens */}
        <Stack.Screen
          name="CategoriesStack"
          component={CategoriesScreen}
          options={{ title: 'Categories' }}
        />
        <Stack.Screen
          name="ServicesStack"
          component={ServicesScreen}
          options={{ title: 'Services' }}
          />
          <Stack.Screen 
  name="ServicesDetails" 
  component={ServicesDetails}
  options={{ 
    headerShown: false,
  }} 
        />
        <Stack.Screen
          name="ProfileStack"
          component={ProfileScreen}
          options={{ title: 'My Profile' }}
        />
        <Stack.Screen
          name="Checkout"
          component={CartScreen}
          options={{ title: 'Checkout' }}
        />
        <Stack.Screen 
          name="Booking" 
          component={BookingScreen} 
          options={{ title: 'Book Service' }}
        />
        <Stack.Screen 
          name="Projects" 
          component={ProjectsScreen} 
          options={{ title: 'Our Projects' }}
        />
        <Stack.Screen 
          name="Contact" 
          component={ContactScreen} 
          options={{ title: 'Contact Us' }}
        />
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Signup" 
          component={SignupScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="MyBookings" 
          component={MyBookingsScreen} 
          options={{ title: 'My Bookings' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

registerRootComponent(App);
export default App;