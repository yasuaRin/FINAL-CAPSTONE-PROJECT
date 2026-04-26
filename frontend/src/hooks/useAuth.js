import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        if (session?.access_token) {
          localStorage.setItem('token', session.access_token);
        }
      } catch (error) {
        console.error('Auth error:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Jangan set user kalau ini adalah recovery session
        if (event === 'PASSWORD_RECOVERY') {
          setLoading(false);
          return;
        }

        setUser(session?.user ?? null);
        setLoading(false);

        if (session?.access_token) {
          localStorage.setItem('token', session.access_token);
        } else {
          localStorage.removeItem('token');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw new Error(error.message);
    if (data.session) {
      localStorage.setItem('token', data.session.access_token);
    }
    return data;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('token');
    setUser(null);
  };

  return { user, loading, login, logout };
};