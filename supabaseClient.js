import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const SUPABASE_URL = 'https://ohcpyffkzopsmktqudlh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oY3B5ZmZrem9wc21rdHF1ZGxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNzY3MzIsImV4cCI6MjA3Njg1MjczMn0.tJdZYRYbhxZSzI8NAHKTnHyXnQ2Cm7HNrIry3jwBXrU';

// Create a single instance of the Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Optional: Add global error handling to suppress auth errors
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    // Clear storage on sign out
    AsyncStorage.removeItem('supabase.auth.token');
  }
});

export { supabase };
