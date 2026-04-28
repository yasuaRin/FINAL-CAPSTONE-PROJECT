import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';

const AdminAuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        navigate('/admin/login', { replace: true });
        return;
      }

      try {
        const user = session.user;

        // Validasi domain
        const allowedDomains = ['gmail.com', 'vidhelp.com'];
        const domain = user.email.split('@')[1];
        if (!allowedDomains.includes(domain)) {
          await supabase.auth.signOut();
          navigate('/admin/login', {
            replace: true,
            state: { message: 'Only @gmail.com or @vidhelp.com email addresses are allowed.' },
          });
          return;
        }

        // Validasi di tabel admins
        const { data: adminData, error: dbError } = await supabase
          .from('admins')
          .select('role, is_active')
          .eq('id', user.id)
          .single();

        if (dbError || !adminData) {
          await supabase.auth.signOut();
          navigate('/admin/login', {
            replace: true,
            state: { message: 'Account not found in the system. Please contact Super Admin.' },
          });
          return;
        }

        if (!adminData.is_active) {
          await supabase.auth.signOut();
          navigate('/admin/login', {
            replace: true,
            state: { message: 'Your account has been deactivated. Please contact Super Admin.' },
          });
          return;
        }

        if (adminData.role === 'staff') {
          await supabase.auth.signOut();
          navigate('/admin/login', {
            replace: true,
            state: { message: 'Staff accounts do not have access to the Admin Portal.' },
          });
          return;
        }

        // Lolos semua validasi → ke dashboard
        navigate('/admin', { replace: true });

      } catch (err) {
        await supabase.auth.signOut();
        navigate('/admin/login', { replace: true });
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Verifying your account...</p>
      </div>
    </div>
  );
};

export default AdminAuthCallback;