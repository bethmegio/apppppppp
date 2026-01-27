import { useNavigation, useRoute } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { supabase } from '../supabaseClient';

export default function BookingScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const selectedService = route.params?.service;

  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contact, setContact] = useState('');
  const [location, setLocation] = useState('');
  const [service, setService] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [bookedDates, setBookedDates] = useState({});
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    if (!selectedService) {
      Alert.alert('Error', 'No service selected.');
      navigation.goBack();
      return;
    }
    setService(selectedService.name);
  }, [selectedService]);

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getSession();
      const currentUser = data?.session?.user;

      if (!currentUser) {
        Alert.alert('Login Required', 'You must log in to book.');
        navigation.navigate('Login', { redirectTo: 'Booking', service: selectedService });
        return;
      }

      setUser(currentUser);
      setEmail(currentUser.email || '');
      setName(currentUser.user_metadata?.full_name || '');
    };

    fetchUser();
  }, []);

  // Fetch unavailable dates
  useEffect(() => {
    const fetchBookedDates = async () => {
      if (!service) return;
      const { data, error } = await supabase
        .from('bookings')
        .select('date')
        .eq('status', 'approved')
        .eq('service', service);

      if (error) {
        console.error(error.message);
        return;
      }

      const marked = {};
      data?.forEach((item) => {
        const d = new Date(item.date).toISOString().split('T')[0];
        marked[d] = { marked: true, dotColor: '#dc2626', disabled: true, disableTouchEvent: true };
      });
      setBookedDates(marked);
    };
    fetchBookedDates();
  }, [service]);

  const handleDayPress = (day) => {
    if (bookedDates[day.dateString]) {
      Alert.alert('Unavailable', 'This date is already booked.');
      return;
    }
    setSelectedDate(day.dateString);
  };

  const handleBooking = async () => {
  if (!user?.id) {
    Alert.alert('Error', 'You must be logged in to book.');
    return;
  }

  if (!name || !contact || !location || !service || !selectedDate) {
    Alert.alert('Missing Info', 'Please complete all required fields.');
    return;
  }

  setLoading(true);
  const { error } = await supabase.from('bookings').insert([
    {
      name,
      email,
      contact,
      location,
      service,
      date: selectedDate,
      message,
      status: 'pending',
      user_id: user.id,
    },
  ]);
  setLoading(false);

  if (error) {
    console.error(error.message);
    Alert.alert('Error', error.message);
    return;
  }

  Alert.alert(
    'Success',
    'Your booking has been submitted!',
    [
      {
        text: 'View My Bookings',
        onPress: () => navigation.navigate('MyBookings'),
      },
      {
        text: 'OK',
        onPress: () => navigation.goBack(),
        style: 'cancel',
      },
    ]
  );
}; //

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Book a Service</Text>
      <Text style={styles.subtitle}>Selected Service: {service}</Text>

      <TextInput style={styles.input} placeholder="Full Name" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Email" value={email} editable={false} />
      <TextInput
        style={styles.input}
        placeholder="Contact Number"
        value={contact}
        onChangeText={setContact}
        keyboardType="phone-pad"
      />
      <TextInput
        style={styles.input}
        placeholder="Location / Address"
        value={location}
        onChangeText={setLocation}
      />

      <View style={styles.calendarContainer}>
        <Text style={styles.calendarLabel}>Select a Date:</Text>
        <Calendar
          onDayPress={handleDayPress}
          markedDates={{
            ...bookedDates,
            ...(selectedDate && { [selectedDate]: { selected: true, selectedColor: '#0096c7', selectedTextColor: '#fff' } }),
          }}
          minDate={new Date().toISOString().split('T')[0]}
          theme={{ todayTextColor: '#0077b6', arrowColor: '#0096c7', textDayFontWeight: '500' }}
        />
      </View>

      <TextInput
        style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
        placeholder="Additional Message (optional)"
        value={message}
        onChangeText={setMessage}
        multiline
      />

      <TouchableOpacity style={[styles.button, loading && { opacity: 0.5 }]} disabled={loading} onPress={handleBooking}>
        <Text style={styles.buttonText}>{loading ? 'Submitting...' : 'Submit Booking'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#f8fafc', flexGrow: 1 },
  title: { fontSize: 26, fontWeight: '700', color: '#0f172a', textAlign: 'center', marginBottom: 5 },
  subtitle: { fontSize: 15, color: '#475569', textAlign: 'center', marginBottom: 15 },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 12, borderColor: '#cbd5e1', borderWidth: 1, fontSize: 16 },
  button: { backgroundColor: '#0096c7', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  calendarContainer: { backgroundColor: '#fff', borderRadius: 12, padding: 10, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  calendarLabel: { fontWeight: '700', fontSize: 16, marginBottom: 10, color: '#0f172a' },
});
