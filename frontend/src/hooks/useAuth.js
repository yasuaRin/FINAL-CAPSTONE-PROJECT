import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [memberData, setMemberData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMemberData = async (authUser) => {
    if (!authUser) { setMemberData(null); return; }

    const { data } = await supabase
      .from('team_members')
      .select('role, status, name, avatar_url, phone')
      .eq('auth_user_id', authUser.id)
      .single();

    // Auto-save Google avatar if not set yet
    const googleAvatar = authUser.user_metadata?.picture || authUser.user_metadata?.avatar_url;
    if (data && !data.avatar_url && googleAvatar) {
      await supabase
        .from('team_members')
        .update({ avatar_url: googleAvatar })
        .eq('auth_user_id', authUser.id);
      data.avatar_url = googleAvatar;
    }

    setMemberData(data || null);
  };

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        await fetchMemberData(session?.user ?? null);
        if (session?.access_token) {
          localStorage.setItem('token', session.access_token);
        }
      } catch (error) {
        console.error('Auth error:', error);
        setUser(null);
        setMemberData(null);
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
        await fetchMemberData(session?.user ?? null);
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

  const logout = async () => {
    setUser(null);
    setMemberData(null);
    localStorage.removeItem('token');
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
    role: memberData?.role || null,
    isActive: memberData?.status === 'active',
    adminProfile: memberData,
  };
};