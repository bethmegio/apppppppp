import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity
} from 'react-native';

export default function WelcomeScreen({ navigation }) {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 4,
          tension: 120,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(buttonOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <LinearGradient
      colors={['#e1f7ff', '#ffffff']}
      style={styles.container}
    >
      {/* Logo */}
      <Animated.View 
        style={[
          styles.logoContainer, 
          { opacity: logoOpacity, transform: [{ scale }] }
        ]}
      >
        <Image 
          source={require('../assets/logo.png')} 
          style={styles.logo} 
        />
      </Animated.View>

      {/* Text Section */}
      <Animated.Text style={[styles.title, { opacity: textOpacity }]}>
        Tropics Pools & Landscape
      </Animated.Text>

      <Animated.Text style={[styles.subtitle, { opacity: textOpacity }]}>
        Shop premium pool & landscape materials anytime, anywhere.
      </Animated.Text>

      {/* Main Button */}
      <Animated.View style={{ opacity: buttonOpacity }}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.replace('MainTabs')} /* ✅ FIXED: Changed 'Tabs' to 'MainTabs' */
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 25,
  },

  logoContainer: {
    width: 190,
    height: 190,
    borderRadius: 100,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',

    // Beautiful soft shadow
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },

    elevation: 8,
    marginBottom: 30,
  },

  logo: {
    width: 150,
    height: 150,
    resizeMode: 'contain',
  },

  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#053B50',
    textAlign: 'center',
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 16,
    color: '#4F6F7D',
    textAlign: 'center',
    marginHorizontal: 20,
    marginBottom: 50,
    lineHeight: 22,
  },

  button: {
    backgroundColor: '#00BFFF',
    paddingVertical: 14,
    paddingHorizontal: 70,
    borderRadius: 40,

    // smooth shadow
    shadowColor: '#00BFFF',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },

    elevation: 5,
  },

  buttonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 17,
    letterSpacing: 0.5,
  }
});