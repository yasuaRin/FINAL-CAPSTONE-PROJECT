// frontend/src/hooks/useAuth.js
import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async (authUser) => {
    if (!authUser) { setAdminData(null); return; }
    const { data } = await supabase
      .from('admins')
      .select('role, is_active, full_name, avatar_url, phone')
      .eq('id', authUser.id)
      .single();
    setAdminData(data || null);
  };

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        await fetchAdminData(session?.user ?? null);
        if (session?.access_token) {
          localStorage.setItem('token', session.access_token);
        }
      } catch (error) {
        console.error('Auth error:', error);
        setUser(null);
        setAdminData(null);
      } finally {
        setLoading(false);
      }
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setLoading(false);
          return;
        }
        setUser(session?.user ?? null);
        await fetchAdminData(session?.user ?? null);
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
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    if (data.session) localStorage.setItem('token', data.session.access_token);
    return data;
  };

  // ── Robust logout: clear local state first, then try Supabase signOut ──
  const logout = async () => {
    // Clear local state immediately so UI redirects right away
    setUser(null);
    setAdminData(null);
    localStorage.removeItem('token');

    // Attempt Supabase signOut — ignore errors (session may already be dead)
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (err) {
      console.warn('SignOut error (ignored):', err);
    }
  };

  return {
    user,
    loading,
    login,
    logout,
    role: adminData?.role || null,
    isActive: adminData?.is_active || false,
    adminProfile: adminData,
  };
};