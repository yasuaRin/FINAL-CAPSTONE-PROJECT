import { supabase } from '../utils/supabase.js';

export const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'No token provided' 
      });
    }

    const token = authHeader.split(' ')[1];
    
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid or expired token' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Authentication failed' 
    });
  }
};

export const requireRole = (roles) => {
  return async (req, res, next) => {
    try {
      const { data: admin, error } = await supabase
        .from('admins')
        .select('role')
        .eq('id', req.user.id)
        .single();

      if (error || !admin || !roles.includes(admin.role)) {
        return res.status(403).json({ 
          success: false, 
          message: 'Insufficient permissions' 
        });
      }

      req.adminRole = admin.role;
      next();
    } catch (error) {
      console.error('Role check error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Permission check failed' 
      });
    }
  };
};