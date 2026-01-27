import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase'; // ✅ adjust path if needed

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    const session = supabase.auth.getSession().then(({ data }) => {
      if (data?.session) setUser(data.session.user);
    });

    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// 🧩 Hook to use in screens
export const useAuth = () => useContext(AuthContext);
