import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
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

    const googleAvatar = authUser.user_metadata?.picture || authUser.user_metadata?.avatar_url;
    if (data && !data.avatar_url && googleAvatar) {
      await supabase.from('team_members').update({ avatar_url: googleAvatar }).eq('auth_user_id', authUser.id);
      data.avatar_url = googleAvatar;
    }
    setMemberData(data || null);
  };

  useEffect(() => {
    // Skip jika sedang di auth callback
    if (window.location.hash.includes('access_token=')) {
      setLoading(false);
      return;
    }

    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          setUser(session.user);
          await fetchMemberData(session.user);
          if (session.access_token) localStorage.setItem('token', session.access_token);
        } else {
          // Fallback: baca dari localStorage manual save
          const stored = localStorage.getItem('sb-auth-token');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed?.user) {
              setUser(parsed.user);
              await fetchMemberData(parsed.user);
              localStorage.setItem('token', parsed.access_token);
            }
          }
        }
      } catch (e) {
        console.error('Failed to init session:', e);
      } finally {
        setLoading(false);
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') return;
      if (window.location.hash.includes('access_token=')) return;
      setUser(session?.user ?? null);
      await fetchMemberData(session?.user ?? null);
      setLoading(false);
      if (session?.access_token) {
        localStorage.setItem('token', session.access_token);
      } else {
        localStorage.removeItem('token');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    setUser(null);
    setMemberData(null);
  
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-')) localStorage.removeItem(key);
    });
    localStorage.removeItem('token');
    
    await supabase.auth.signOut(); 
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      logout,
      role: memberData?.role || null,
      isActive: memberData?.status === 'active',
      adminProfile: memberData,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);