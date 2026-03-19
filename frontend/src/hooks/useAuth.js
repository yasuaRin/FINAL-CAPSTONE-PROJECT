import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { supabase } from '../services/supabase';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
    
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          localStorage.setItem('token', session.access_token);
          await fetchUser(session.user.id);
        } else {
          setUser(null);
          localStorage.removeItem('token');
        }
        setLoading(false);
      }
    );

    return () => authListener?.subscription.unsubscribe();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      localStorage.setItem('token', session.access_token);
      await fetchUser(session.user.id);
    }
    setLoading(false);
  };

  const fetchUser = async (userId) => {
    try {
      const { data } = await supabase
        .from('admins')
        .select('*')
        .eq('id', userId)
        .single();
      setUser(data);
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const login = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      localStorage.setItem('token', data.session.access_token);
      await fetchUser(data.user.id);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('token');
    setUser(null);
  };

  return { user, loading, login, logout, isAuthenticated: !!user };
};