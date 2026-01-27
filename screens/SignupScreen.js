import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../supabaseClient';

export default function SignupScreen({ navigation }) {
  const route = useRoute();
  const redirectTo = route.params?.redirectTo;

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSignup = async () => {
    // Validation
    if (!formData.full_name || !formData.email || !formData.password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    
    if (formData.full_name.trim().length < 2) {
      Alert.alert('Error', 'Full name must be at least 2 characters');
      return;
    }
    
    if (formData.phone && formData.phone.replace(/\D/g, '').length < 7) {
      Alert.alert('Error', 'Phone number must have at least 7 digits');
      return;
    }

    setLoading(true);
    
    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({ 
        email: formData.email, 
        password: formData.password 
      });

      if (authError) {
        Alert.alert('Signup Failed', authError.message);
        setLoading(false);
        return;
      }

      // 2. Create user profile in public.users table
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('users')
          .insert([{
            id: authData.user.id,
            full_name: formData.full_name.trim(),
            email: formData.email,
            phone: formData.phone.trim() || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);

        if (profileError) {
          console.error('Profile creation error:', profileError);
          // Still continue - the user can update profile later
        }
        
        // 3. Set user metadata in auth
        await supabase.auth.updateUser({
          data: {
            full_name: formData.full_name,
            phone: formData.phone
          }
        });
      }

      Alert.alert('Success', 'Account created successfully!');
      
      if (redirectTo) {
        navigation.replace('Login', { redirectTo });
      } else {
        navigation.navigate('Login');
      }
      
    } catch (error) {
      console.error('Signup error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Create an Account</Text>
      <Text style={styles.subtitle}>All fields are required for orders</Text>

      {/* Full Name */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Full Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="John Doe"
          value={formData.full_name}
          onChangeText={(text) => setFormData({...formData, full_name: text})}
          autoCapitalize="words"
        />
        <Text style={styles.helperText}>Required for placing orders</Text>
      </View>

      {/* Email */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Email *</Text>
        <TextInput
          style={styles.input}
          placeholder="your@email.com"
          value={formData.email}
          onChangeText={(text) => setFormData({...formData, email: text})}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      {/* Phone */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          style={styles.input}
          placeholder="(555) 123-4567"
          value={formData.phone}
          onChangeText={(text) => setFormData({...formData, phone: text})}
          keyboardType="phone-pad"
        />
        <Text style={styles.helperText}>Required for order notifications</Text>
      </View>

      {/* Password */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Password *</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Create a password"
            value={formData.password}
            onChangeText={(text) => setFormData({...formData, password: text})}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
            <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#666" />
          </TouchableOpacity>
        </View>
        <Text style={styles.helperText}>At least 6 characters</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSignup} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Account</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login', { redirectTo })}>
        <Text style={styles.link}>Already have an account? Log in</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 10,
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 12,
  },
  button: {
    backgroundColor: '#0096c7',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginVertical: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  link: {
    textAlign: 'center',
    color: '#0096c7',
    marginBottom: 20,
    fontSize: 15,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
});