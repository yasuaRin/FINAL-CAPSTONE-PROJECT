import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  User, Mail, Shield, Camera, Save, Loader2, CheckCircle2,
  Lock, Smartphone, Globe, Bell, Key, Zap, Briefcase, Users
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabase';

function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    role: '',
    bio: '',
    avatar: null
  });
  const [stats, setStats] = useState({
    brandsManaged: 0,
    teamMembers: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch profile from Supabase
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        // Fetch profile data
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!profileError && profileData) {
          setProfile({
            name: profileData.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || '',
            email: user.email || '',
            role: profileData.role || 'Administrator',
            bio: profileData.bio || 'Lead strategist and system administrator overseeing VidHelp Intelligence operations.',
            avatar: profileData.avatar_url || null
          });
        } else {
          setProfile({
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
            email: user.email || '',
            role: 'Administrator',
            bio: 'Lead strategist and system administrator overseeing VidHelp Intelligence operations.',
            avatar: null
          });
        }

        // Fetch stats (brands and team count)
        const [brandsCount, teamCount] = await Promise.all([
          supabase.from('brands').select('*', { count: 'exact', head: true }),
          supabase.from('staff').select('*', { count: 'exact', head: true })
        ]);

        setStats({
          brandsManaged: brandsCount.count || 0,
          teamMembers: teamCount.count || 0
        });

      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchProfile();
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Update profile in Supabase
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: profile.name,
          role: profile.role,
          bio: profile.bio,
          avatar_url: profile.avatar,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setNotification('Profile updated successfully');
      setIsEditing(false);
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setNotification('Failed to update profile');
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('profiles')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      setProfile({ ...profile, avatar: publicUrl });

      // Update profile with new avatar URL
      await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        });

      setNotification('Avatar updated successfully');
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setNotification('Failed to update avatar');
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = () => {
    return profile.name?.charAt(0).toUpperCase() || 'A';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-4 left-1/2 z-[100] bg-card backdrop-blur-xl text-foreground px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-border"
          >
            <div className="bg-emerald-500 rounded-full p-1">
              <CheckCircle2 size={16} />
            </div>
            <span className="text-sm font-bold tracking-tight">{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Page Title - text-3xl font-bold tracking-tight */}
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Profile Settings</h1>
        <p className="text-muted-foreground mt-2 font-light text-xs">Manage your agency portal credentials and preferences.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Card - Left Column */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="md:col-span-1"
        >
          <div className="bg-card border border-border rounded-2xl p-6 h-fit sticky top-24">
            {/* Avatar */}
            <div className="relative w-32 h-32 mx-auto mb-4 group">
              <div className="w-full h-full rounded-full overflow-hidden border-4 border-primary/20 bg-gradient-to-tr from-primary to-orange-500 p-0.5">
                {profile.avatar ? (
                  <img
                    src={profile.avatar}
                    alt={profile.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-4xl font-bold text-primary">{getInitials()}</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/80 disabled:opacity-50"
              >
                <Camera size={16} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            {/* Name & Role */}
            <div className="text-center">
              {/* User Name - text-xl font-bold */}
              <h2 className="text-xl font-bold text-foreground">{profile.name || 'Admin User'}</h2>
              {/* Role Badge - text-[10px] font-bold uppercase tracking-wider */}
              <p className="text-primary text-[10px] font-bold uppercase tracking-wider mt-1">{profile.role}</p>
            </div>

            {/* Stats */}
            <div className="mt-6 pt-6 border-t border-border flex justify-center gap-6">
              <div className="text-center">
                {/* Stat Value - text-2xl font-mono font-bold */}
                <p className="text-2xl font-mono font-bold text-foreground">{stats.brandsManaged}</p>
                {/* Stat Label - text-[10px] font-bold uppercase tracking-wider */}
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Brands</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="text-center">
                <p className="text-2xl font-mono font-bold text-foreground">{stats.teamMembers}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Team</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 space-y-2">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="w-full py-2.5 bg-muted/20 border border-border rounded-xl text-[10px] font-bold uppercase tracking-wider text-foreground hover:bg-muted/30 transition-colors"
              >
                {isEditing ? 'Cancel Editing' : 'Edit Profile'}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Forms - Right Column */}
        <div className="md:col-span-2 space-y-6">
          {/* Personal Info Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card border border-border rounded-2xl overflow-hidden"
          >
            <div className="p-5 border-b border-border bg-muted/20">
              {/* Section Header - text-[10px] font-bold uppercase tracking-[0.3em] */}
              <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] flex items-center gap-2 text-muted-foreground">
                <User size={18} className="text-primary" />
                PERSONAL INFORMATION
              </h3>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  {/* Form Label - text-[10px] font-bold uppercase tracking-wider */}
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Full Name</label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    disabled={!isEditing || isLoading}
                    className="w-full bg-background border border-input rounded-lg text-sm font-medium px-4 py-2.5 text-foreground focus:ring-1 focus:ring-primary outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email Address</label>
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="w-full bg-background border border-input rounded-lg text-sm font-medium px-4 py-2.5 text-muted-foreground/50 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Role</label>
                  <input
                    type="text"
                    value={profile.role}
                    onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                    disabled={!isEditing || isLoading}
                    className="w-full bg-background border border-input rounded-lg text-sm font-medium px-4 py-2.5 text-foreground focus:ring-1 focus:ring-primary outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Member Since</label>
                  <input
                    type="text"
                    value={new Date(user?.created_at || Date.now()).toLocaleDateString()}
                    disabled
                    className="w-full bg-background border border-input rounded-lg text-sm font-medium px-4 py-2.5 text-muted-foreground/50 cursor-not-allowed"
                  />
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Bio</label>
                  <textarea
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    disabled={!isEditing || isLoading}
                    rows={3}
                    className="w-full bg-background border border-input rounded-lg text-sm font-medium px-4 py-2.5 text-foreground focus:ring-1 focus:ring-primary outline-none transition-all resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Tell us about yourself..."
                  />
                </div>
              </div>

              {isEditing && (
                <div className="flex justify-end pt-4 border-t border-border">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex items-center justify-center rounded-xl text-xs font-bold uppercase tracking-wider transition-all bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8 py-2 gap-2 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              )}
            </form>
          </motion.div>

          {/* Security Settings Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card border border-border rounded-2xl overflow-hidden"
          >
            <div className="p-5 border-b border-border bg-muted/20">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] flex items-center gap-2 text-muted-foreground">
                <Shield size={18} className="text-primary" />
                SECURITY SETTINGS
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/10 rounded-xl border border-border hover:border-primary/30 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Key size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-foreground">Change Password</p>
                    <p className="text-xs font-light text-muted-foreground">Update your account password</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="px-4 py-2 bg-muted/20 border border-border rounded-lg text-[9px] font-bold uppercase tracking-wider text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
                >
                  Change
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/10 rounded-xl border border-border hover:border-primary/30 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Smartphone size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-foreground">Two-Factor Authentication</p>
                    <p className="text-xs font-light text-muted-foreground">Add an extra layer of security</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="px-4 py-2 bg-muted/20 border border-border rounded-lg text-[9px] font-bold uppercase tracking-wider text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
                >
                  Enable 2FA
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/10 rounded-xl border border-border hover:border-primary/30 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Bell size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-foreground">Notification Preferences</p>
                    <p className="text-xs font-light text-muted-foreground">Manage email and push notifications</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="px-4 py-2 bg-muted/20 border border-border rounded-lg text-[9px] font-bold uppercase tracking-wider text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
                >
                  Configure
                </button>
              </div>
            </div>
          </motion.div>

          {/* Session Management */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-card border border-border rounded-2xl overflow-hidden"
          >
            <div className="p-5 border-b border-border bg-muted/20">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] flex items-center gap-2 text-muted-foreground">
                <Globe size={18} className="text-primary" />
                ACTIVE SESSIONS
              </h3>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between p-3 bg-muted/10 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <div>
                    <p className="text-sm font-bold text-foreground">Current Session</p>
                    <p className="text-[9px] font-medium text-muted-foreground">Chrome on Windows • {new Date().toLocaleString()}</p>
                  </div>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">Active</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default Profile;