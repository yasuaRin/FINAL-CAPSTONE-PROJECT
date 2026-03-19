import { supabase, supabaseAdmin } from '../utils/supabase.js';

// POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    // Get admin details
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('*')
      .eq('id', data.user.id)
      .single();

    res.json({
      success: true,
      token: data.session.access_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        role: admin?.role || 'admin',
        full_name: admin?.full_name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ success: false, message: error.message });
  }
};

// POST /api/auth/signup
export const signup = async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    });

    if (error) throw error;

    // Add to admins table
    const { error: adminError } = await supabaseAdmin
      .from('admins')
      .insert([{
        id: data.user.id,
        email,
        full_name: fullName,
        role: 'admin',
        is_active: true
      }]);

    if (adminError) throw adminError;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: data.user.id,
        email: data.user.email
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// POST /api/auth/logout
export const logout = async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/auth/forgot-password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'http://localhost:5173/reset-password'
    });

    if (error) throw error;

    res.json({ 
      success: true, 
      message: 'Password reset email sent' 
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// GET /api/auth/me
export const getMe = async (req, res) => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) throw error;

    const { data: admin } = await supabase
      .from('admins')
      .select('*')
      .eq('id', user.id)
      .single();

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: admin?.role,
        full_name: admin?.full_name
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(401).json({ success: false, message: error.message });
  }
};