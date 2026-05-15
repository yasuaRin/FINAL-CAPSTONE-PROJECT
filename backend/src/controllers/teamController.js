import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// GET /api/team/read
export const getTeam = async (req, res) => {
  try {
    const [{ data: admins, error: adminsError }, { data: staff, error: staffError }] = await Promise.all([
      supabaseAdmin.from('admins').select('id, full_name, email, role, is_active, avatar_url, phone').order('created_at', { ascending: false }),
      supabaseAdmin.from('staff').select('id, name, email, phone, role, status, avatar_url').order('created_at', { ascending: false }),
    ]);
    if (adminsError) throw adminsError;
    if (staffError)  throw staffError;
    res.json({ success: true, data: { admins: admins || [], staff: staff || [] } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/team/create-admin
export const createAdmin = async (req, res) => {
  try {
    const { email, password, name, phone, role, avatar_url } = req.body;
    if (!email || !password || !name || !role) {
      return res.status(400).json({ success: false, message: 'Email, password, name, and role are required.' });
    }
    const allowedRoles = ['admin', 'super_admin'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role. Must be admin or super_admin.' });
    }
    if (role === 'super_admin' && req.adminRole !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Only Super Admin can create another Super Admin.' });
    }
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (authError) throw authError;
    const userId = authData.user.id;
    const { error: dbError } = await supabaseAdmin.from('team_members').insert({
      auth_user_id: userId,
      email,
      name,
      phone: phone || null,
      role,
      status: 'active',
      avatar_url: avatar_url || null,
    });
    if (dbError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw dbError;
    }
    res.json({ success: true, message: `Admin account created for ${email}.` });
  } catch (error) {
    console.error('createAdmin error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/team/create-staff
export const createStaff = async (req, res) => {
  try {
    const { name, email, phone, role, status, avatar_url } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required.' });
    }
    const { error: dbError } = await supabaseAdmin.from('team_members').insert({
      auth_user_id: null,
      name,
      email,
      phone: phone || null,
      role: 'staff',
      role_description: role || 'Staff',
      status: status || 'active',
      avatar_url: avatar_url || null,
    });
    if (dbError) throw dbError;
    res.json({ success: true, message: `Staff member ${name} created.` });
  } catch (error) {
    console.error('createStaff error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/team/update-member
export const updateMember = async (req, res) => {
  try {
    const { id, name, phone, status, avatar_url, roleDescription } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, message: 'ID is required.' });
    }
    const { error } = await supabaseAdmin
      .from('team_members')
      .update({
        name,
        phone: phone || null,
        status: status || 'active',
        avatar_url: avatar_url || null,
        role_description: roleDescription || null,
      })
      .eq('id', id);
    if (error) throw error;
    res.json({ success: true, message: 'Member updated successfully.' });
  } catch (error) {
    console.error('updateMember error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/team/delete-member
export const deleteMember = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, message: 'ID is required.' });
    }
    const { data: member, error: fetchError } = await supabaseAdmin
      .from('team_members')
      .select('id, auth_user_id')
      .eq('id', id)
      .single();
    if (fetchError || !member) {
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }
    if (member.auth_user_id) {
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(member.auth_user_id);
      if (authError) throw authError;
    }
    const { error: dbError } = await supabaseAdmin
      .from('team_members')
      .delete()
      .eq('id', id);
    if (dbError) throw dbError;
    res.json({ success: true, message: 'Member removed successfully.' });
  } catch (error) {
    console.error('deleteMember error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
