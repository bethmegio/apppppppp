import {
  Alert,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';

export default function ContactScreen() {

  const handlePhonePress = async () => {
    const phoneNumber = 'tel:09959503268';
    const supported = await Linking.canOpenURL(phoneNumber);

    if (supported) {
      Linking.openURL(phoneNumber);
    } else {
      Alert.alert('Error', 'Phone calls are not supported on this device');
    }
  };

  const handleEmailPress = async () => {
    const emailUrl = 'mailto:louiebaring@email.com?subject=Inquiry%20from%20App';
    const supported = await Linking.canOpenURL(emailUrl);

    if (supported) {
      Linking.openURL(emailUrl);
    } else {
      Alert.alert('Error', 'Email app not available');
    }
  };

  const handleFacebookPress = async () => {
    const facebookUrl =
      'https://web.facebook.com/search/top?q=tropics%20pools%20and%20landscape';
    const supported = await Linking.canOpenURL(facebookUrl);

    if (supported) {
      Linking.openURL(facebookUrl);
    } else {
      Alert.alert('Error', 'Unable to open Facebook');
    }
  };

  const openMap = async () => {
    const lat = 9.294824;
    const lng = 123.299898;
    const label = 'Tropics Pools & Landscape';

    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${label})`
    });

    const supported = await Linking.canOpenURL(url);

    if (supported) {
      Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Unable to open maps');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>

      {/* Logo */}
      <Image
        source={require('../assets/logo.png')}
        style={styles.logo}
      />

      {/* Title */}
      <Text style={styles.title}>Contact Us</Text>

      {/* Contact Info */}
      <View style={styles.contactContainer}>

        <TouchableOpacity style={styles.contactItem} onPress={openMap}>
          <Text style={styles.contactIcon}>📍</Text>
          <Text style={styles.contactText}>Tropics Pools & Landscape</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.contactItem} onPress={handlePhonePress}>
          <Text style={styles.contactIcon}>📞</Text>
          <Text style={styles.contactText}>0995-950-3268</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.contactItem, { borderBottomWidth: 0 }]}
          onPress={handleEmailPress}
        >
          <Text style={styles.contactIcon}>✉️</Text>
          <Text style={styles.contactText}>louiebaring@email.com</Text>
        </TouchableOpacity>

      </View>

      {/* Social Media */}
      <View style={styles.socialContainer}>
        <Text style={styles.socialTitle}>Follow us on:</Text>

        <View style={styles.socialIcons}>

          <TouchableOpacity
            onPress={handleFacebookPress}
            style={styles.socialButton}
          >
            <View style={styles.facebookIconContainer}>
              <Text style={styles.facebookIcon}>f</Text>
            </View>
            <Text style={styles.socialText}>Facebook</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleEmailPress}
            style={styles.socialButton}
          >
            <View style={styles.emailIconContainer}>
              <Text style={styles.emailIcon}>📧</Text>
            </View>
            <Text style={styles.socialText}>Email</Text>
          </TouchableOpacity>

        </View>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: 9.294824,
            longitude: 123.299898,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01
          }}
        >
          <Marker
            coordinate={{ latitude: 9.294824, longitude: 123.299898 }}
            title="Tropics Pools & Landscape"
            description="Visit us here!"
          />
        </MapView>

       <TouchableOpacity
  style={styles.mapOverlay}
  onPress={openMap}
>
  <Text style={styles.mapHint}>
    Tap to open in Google Maps
  </Text>
</TouchableOpacity>

      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#E6F4FE',
    alignItems: 'center',
    padding: 20,
    flexGrow: 1,
    paddingBottom: 40
  },

  logo: {
    width: 160,
    height: 160,
    resizeMode: 'contain',
    marginTop: 20,
    marginBottom: 10
  },

  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#0077b6',
    marginVertical: 10
  },

  contactContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginVertical: 15,
    elevation: 3
  },

  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },

  contactIcon: {
    fontSize: 20,
    marginRight: 15,
    width: 30
  },

  contactText: {
    color: '#023e8a',
    fontSize: 16,
    flex: 1
  },

  socialContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 3
  },

  socialTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0077b6',
    marginBottom: 15,
    textAlign: 'center'
  },

  socialIcons: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },

  socialButton: {
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#F0F8FF',
    width: '45%'
  },

  facebookIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1877F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5
  },

  facebookIcon: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold'
  },

  emailIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EA4335',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5
  },

  emailIcon: {
    fontSize: 20,
    color: '#FFFFFF'
  },

  socialText: {
    color: '#023e8a',
    fontSize: 14,
    fontWeight: '500'
  },

  mapContainer: {
    width: '100%',
    marginBottom: 20
  },

  map: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden'
  },

  mapOverlay: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20
  },

  mapHint: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic'
  }
});
