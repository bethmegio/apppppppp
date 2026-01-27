import { useState } from 'react';
import {
    Dimensions,
    FlatList,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity
} from 'react-native';
import ImageViewing from 'react-native-image-viewing';

const { width } = Dimensions.get('window');

const projects = [
  {
    id: '1',
    name: 'Atmosphere Resort',
    image: require('../assets/projects/Atmosphere Resort.jpg'),
    description: 'Luxury beachfront resort with tropical-inspired pools and villas.',
  },
  {
    id: '2',
    name: 'Atmosphere Resort 2',
    image: require('../assets/projects/Atmosphere-Resort2.jpg'),
    description: 'Serene pool design surrounded by lush greenery and modern comfort.',
  },
  {
    id: '3',
    name: 'Hotel Dumaguete',
    image: require('../assets/projects/Hotel Dumaguete.jpg'),
    description: 'Elegant hotel project featuring infinity pools and modern design.',
  },
  {
    id: '4',
    name: 'Hotel Dumaguete 2',
    image: require('../assets/projects/Hotel Dumaguete2.jpg'),
    description: 'Contemporary resort ambiance with relaxing poolside experience.',
  },
  {
    id: '5',
    name: 'Liquid Resort',
    image: require('../assets/projects/Liquid Resort.jpg'),
    description: 'Chic coastal resort offering vibrant pools and outdoor luxury.',
  },
  {
    id: '6',
    name: 'Liquid Resort 2',
    image: require('../assets/projects/Liquid Resort2.jpg'),
    description: 'Modern beachfront concept blending nature and architecture.',
  },
  {
    id: '7',
    name: 'Mkes Dauin Resort 2',
    image: require('../assets/projects/Mkes Dauin Resort2.jpg'),
    description: 'Beautiful Dauin resort project with unique tropical charm.',
  },
];

export default function ProjectsScreen() {
  const [visible, setVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const openImage = (index) => {
    setSelectedImage(index);
    setVisible(true);
  };

  const renderProject = ({ item, index }) => (
    <TouchableOpacity style={styles.card} onPress={() => openImage(index)}>
      <Image source={item.image} style={styles.image} />
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🏝 Our Projects</Text>

      <FlatList
        data={projects}
        renderItem={renderProject}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        scrollEnabled={false}
      />

      {/* Fullscreen Image Viewer */}
      <ImageViewing
        images={projects.map((p) => ({ uri: Image.resolveAssetSource(p.image).uri }))}
        imageIndex={selectedImage || 0}
        visible={visible}
        onRequestClose={() => setVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    marginVertical: 15,
  },
  row: {
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    alignItems: 'center',
    width: width / 2.2,
    elevation: 3,
    padding: 8,
  },
  image: {
    width: '100%',
    height: 120,
    borderRadius: 10,
    resizeMode: 'cover',
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0096c7',
    marginTop: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 12,
    color: '#475569',
    textAlign: 'center',
    marginTop: 4,
  },
});
