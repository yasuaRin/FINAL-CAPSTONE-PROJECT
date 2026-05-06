// frontend/src/pages/admin/Profile.jsx
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
            className="fixed top-4 left-1/2 z-[100] bg-[#1A1A1A] text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10"
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
        <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">Profile Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your agency portal credentials and preferences.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Card - Left Column */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="md:col-span-1"
        >
          <div className="border border-white/5 bg-[#111111] rounded-2xl p-6 h-fit sticky top-24">
            {/* Avatar */}
            <div className="relative w-32 h-32 mx-auto mb-4 group">
              <div className="w-full h-full rounded-full overflow-hidden border-4 border-red-600/20 bg-gradient-to-tr from-red-600 to-orange-500 p-0.5">
                {profile.avatar ? (
                  <img
                    src={profile.avatar}
                    alt={profile.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-red-600/20 flex items-center justify-center">
                    <span className="text-4xl font-bold text-red-500">{getInitials()}</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="absolute bottom-0 right-0 bg-red-600 text-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 disabled:opacity-50"
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
              <h2 className="text-xl font-bold text-white">{profile.name || 'Admin User'}</h2>
              <p className="text-red-500 font-mono text-xs uppercase tracking-widest mt-1">{profile.role}</p>
            </div>

            {/* Stats */}
            <div className="mt-6 pt-6 border-t border-white/5 flex justify-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{stats.brandsManaged}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-tighter">Brands</p>
              </div>
              <div className="w-px h-8 bg-white/5" />
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{stats.teamMembers}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-tighter">Team</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 space-y-2">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="w-full py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm font-bold text-white hover:bg-white/10 transition-colors"
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
            className="border border-white/5 bg-[#111111] rounded-2xl overflow-hidden"
          >
            <div className="p-5 border-b border-white/5 bg-white/5">
              <h3 className="font-bold flex items-center gap-2 text-white">
                <User size={18} className="text-red-500" />
                PERSONAL INFORMATION
              </h3>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Full Name</label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    disabled={!isEditing || isLoading}
                    className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg text-sm px-4 py-2.5 text-white focus:ring-1 focus:ring-red-600 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Email Address</label>
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg text-sm px-4 py-2.5 text-white/50 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Role</label>
                  <input
                    type="text"
                    value={profile.role}
                    onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                    disabled={!isEditing || isLoading}
                    className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg text-sm px-4 py-2.5 text-white focus:ring-1 focus:ring-red-600 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Member Since</label>
                  <input
                    type="text"
                    value={new Date(user?.created_at || Date.now()).toLocaleDateString()}
                    disabled
                    className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg text-sm px-4 py-2.5 text-white/50 cursor-not-allowed"
                  />
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Bio</label>
                  <textarea
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    disabled={!isEditing || isLoading}
                    rows={3}
                    className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg text-sm px-4 py-2.5 text-white focus:ring-1 focus:ring-red-600 outline-none transition-all resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Tell us about yourself..."
                  />
                </div>
              </div>

              {isEditing && (
                <div className="flex justify-end pt-4 border-t border-white/5">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex items-center justify-center rounded-xl text-sm font-bold transition-all bg-red-600 text-white hover:bg-red-700 h-11 px-8 py-2 gap-2 shadow-lg shadow-red-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="border border-white/5 bg-[#111111] rounded-2xl overflow-hidden"
          >
            <div className="p-5 border-b border-white/5 bg-white/5">
              <h3 className="font-bold flex items-center gap-2 text-white">
                <Shield size={18} className="text-red-500" />
                SECURITY SETTINGS
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between p-4 bg-[#1A1A1A] rounded-xl border border-white/5 hover:border-red-600/30 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-red-600/10 rounded-lg">
                    <Key size={18} className="text-red-500" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">Change Password</p>
                    <p className="text-xs text-gray-500">Update your account password</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-white hover:bg-red-600 hover:border-red-600 transition-all"
                >
                  Change
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-[#1A1A1A] rounded-xl border border-white/5 hover:border-red-600/30 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-red-600/10 rounded-lg">
                    <Smartphone size={18} className="text-red-500" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">Two-Factor Authentication</p>
                    <p className="text-xs text-gray-500">Add an extra layer of security</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-white hover:bg-red-600 hover:border-red-600 transition-all"
                >
                  Enable 2FA
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-[#1A1A1A] rounded-xl border border-white/5 hover:border-red-600/30 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-red-600/10 rounded-lg">
                    <Bell size={18} className="text-red-500" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">Notification Preferences</p>
                    <p className="text-xs text-gray-500">Manage email and push notifications</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-white hover:bg-red-600 hover:border-red-600 transition-all"
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
            className="border border-white/5 bg-[#111111] rounded-2xl overflow-hidden"
          >
            <div className="p-5 border-b border-white/5 bg-white/5">
              <h3 className="font-bold flex items-center gap-2 text-white">
                <Globe size={18} className="text-red-500" />
                ACTIVE SESSIONS
              </h3>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-lg border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <div>
                    <p className="text-sm font-medium text-white">Current Session</p>
                    <p className="text-[10px] text-gray-500">Chrome on Windows • {new Date().toLocaleString()}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">Active</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default Profile;