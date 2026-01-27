import { ImageBackground, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function AboutScreen() {
  return (
    <ImageBackground
      source={require('../assets/images/pool-bg.jpg')}
      style={styles.background}
      blurRadius={0}
    >
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <Text style={styles.title}>ABOUT US</Text>
        <Text style={styles.subtitle}>
          TROPICS POOLS has been building custom, quality pools and picturesque landscapes
          for home and resort owners in Negros Oriental and Siquijor since 2001.
        </Text>

        {/* Our Story */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Story</Text>
          <Text style={styles.text}>
            Founded in Dumaguete City, <Text style={styles.bold}>Tropics Pools & Landscape</Text> has been delivering
            top-quality pool solutions and outdoor designs for homeowners and resorts across Negros Oriental.
            Our journey began with a simple goal — to bring tropical elegance and relaxation into every home and resort we touch.
          </Text>
          <Text style={styles.text}>
            We specialize in custom pool construction, maintenance, landscaping, and accessories that enhance your
            outdoor living experience. Every project we build reflects our commitment to excellence, precision, and style.
          </Text>
        </View>

        {/* Core Values */}
        <Text style={styles.sectionHeader}>Our Core Values</Text>
        <View style={styles.valuesContainer}>
          <View style={styles.valueBox}>
            <Text style={styles.valueTitle}>MISSION</Text>
            <Text style={styles.textSmall}>
              Our mission is to provide our clients with the highest quality custom pools that exceed their expectations.
              We strive to create backyard oases that bring joy and relaxation to families and resort owners.
            </Text>
          </View>

          <View style={styles.valueBox}>
            <Text style={styles.valueTitle}>VISION</Text>
            <Text style={styles.textSmall}>
              Our vision is to be the go-to provider for custom pool design, construction, and supplies in the region.
              We are committed to delivering exceptional service and innovative solutions to our valued customers.
            </Text>
          </View>

          <View style={styles.valueBox}>
            <Text style={styles.valueTitle}>CREATIVITY</Text>
            <Text style={styles.textSmall}>
              Every pool we build is a work of art — tailored to your space, lifestyle, and tropical dreams.
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>© 2025 Tropics Pools & Landscape</Text>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: 'cover',
  },
  container: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 25,
    letterSpacing: 1,
  },
  subtitle: {
    color: '#e0f7fa',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 12,
    maxWidth: 350,
  },
  section: {
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderRadius: 15,
    padding: 18,
    marginTop: 20,
    width: '95%',
  },
  sectionTitle: {
    color: '#facc15',
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 8,
  },
  text: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 10,
  },
  bold: {
    fontWeight: 'bold',
  },
  sectionHeader: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '700',
    marginTop: 30,
  },
  valuesContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: 10,
    width: '95%',
  },
  valueBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderRadius: 15,
    padding: 15,
    marginVertical: 10,
    width: '100%',
  },
  valueTitle: {
    color: '#facc15',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  textSmall: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    color: '#e0f7fa',
    fontSize: 14,
    marginVertical: 30,
  },
});
