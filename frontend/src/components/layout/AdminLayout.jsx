import { useState, useEffect, useRef, useMemo } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabase';
import { usePageSearch } from '../../hooks/usePageSearch';
import {
  LayoutDashboard, Users, LogOut, Search,
  TrendingUp, Menu, X, Briefcase, User, Radar,
  FileText, Zap, Sun, Moon,
} from 'lucide-react';
import Footer from './Footer';

const STATIC_ITEMS = [
  { id: 'p1', title: 'Dashboard',      category: 'Page',   path: '/admin',          keywords: 'home main overview stats' },
  { id: 'p2', title: 'Revenue',        category: 'Page',   path: '/admin/revenue',  keywords: 'money income profit analytics reports' },
  { id: 'p3', title: 'Brands',         category: 'Page',   path: '/admin/brands',   keywords: 'clients companies partners' },
  { id: 'p4', title: 'Lead Radar',     category: 'Page',   path: '/admin/leads',    keywords: 'leads prospects pipeline crm' },
  { id: 'p5', title: 'Staff',          category: 'Page',   path: '/admin/team',     keywords: 'team members employees people' },
  { id: 'p6', title: 'My Profile',     category: 'Page',   path: '/admin/profile',  keywords: 'account settings avatar name' },
  { id: 'a1', title: 'Add New Brand',  category: 'Action', path: '/admin/brands',   keywords: 'create new client plus' },
  { id: 'a2', title: 'Add New Staff',  category: 'Action', path: '/admin/team',     keywords: 'create hire new member plus' },
];

const CategoryIcon = ({ category }) => {
  const props = { size: 13, style: { flexShrink: 0 } };
  if (category === 'Page')   return <FileText  {...props} style={{ ...props.style, color: '#1a73e8' }} />;
  if (category === 'Action') return <Zap       {...props} style={{ ...props.style, color: '#fb8c00' }} />;
  if (category === 'Brand')  return <Briefcase {...props} style={{ ...props.style, color: '#43a047' }} />;
  if (category === 'Staff')  return <Users     {...props} style={{ ...props.style, color: '#7b809a' }} />;
  return null;
};

export const  AdminLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen]       = useState(false);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef(null);

  const [searchQuery, setSearchQuery]       = useState('');
  const [supabaseItems, setSupabaseItems]   = useState([]);
  const [highlightQuery, setHighlightQuery] = useState('');
  const searchRef      = useRef(null);
  const pageContentRef = useRef(null);

  // ── Theme: follow system preference only ─────────────────────────────────
  useEffect(() => {
    // Clear any stale manual theme from localStorage
    localStorage.removeItem('theme');
    localStorage.removeItem('themeSource');

    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    // Apply on mount
    if (mq.matches) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Listen for system changes
    const handler = (e) => {
      if (e.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // ── Toggle (commented out — re-enable if manual override is needed) ──────
  // const [themeSource, setThemeSource] = useState(() => {
  //   return localStorage.getItem('themeSource') || 'system';
  // });
  // const [systemDark, setSystemDark] = useState(() =>
  //   window.matchMedia('(prefers-color-scheme: dark)').matches
  // );
  // const isDarkMode =
  //   themeSource === 'system' ? systemDark :
  //   themeSource === 'dark'   ? true       : false;
  // const handleThemeToggle = () => {
  //   setThemeSource(prev => {
  //     const next = prev === 'system' ? (isDarkMode ? 'light' : 'dark')
  //                : prev === 'dark'   ? 'light'
  //                : 'system';
  //     localStorage.setItem('themeSource', next);
  //     return next;
  //   });
  // };
  // ─────────────────────────────────────────────────────────────────────────

  const { matchCount, currentMatch, goNext, goPrev, clearHighlights } = usePageSearch(highlightQuery, pageContentRef);

  const navigate = useNavigate();
  const location = useLocation();

  const { user, logout, loading: authLoading, adminProfile } = useAuth();

  const displayName =
    adminProfile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'Admin';

  const avatarUrl =
    adminProfile?.avatar_url ||
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    null;

  const initials = displayName.charAt(0).toUpperCase();

  // ── Supabase search ───────────────────────────────────────────────────────
  useEffect(() => {
    if (searchQuery.trim().length < 2) { setSupabaseItems([]); return; }

    const fetchFromSupabase = async () => {
      const q = searchQuery.trim();
      const { data: brands } = await supabase.from('brands').select('brand_id, brand_name').ilike('brand_name', `%${q}%`).limit(3);
      const { data: staff }  = await supabase.from('staff').select('id, name').ilike('name', `%${q}%`).limit(3);

      setSupabaseItems([
        ...(brands ?? []).map(b => ({ id: `brand-${b.brand_id}`, title: b.brand_name, category: 'Brand', path: '/admin/brands', keywords: '' })),
        ...(staff  ?? []).map(s => ({ id: `staff-${s.id}`,       title: s.name,        category: 'Staff', path: '/admin/team',   keywords: '' })),
      ]);
    };

    const timer = setTimeout(fetchFromSupabase, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredStatic = searchQuery.trim() === '' ? [] : STATIC_ITEMS.filter(item => {
    const q = searchQuery.toLowerCase();
    return item.title.toLowerCase().includes(q) || item.category.toLowerCase().includes(q) || item.keywords.toLowerCase().includes(q);
  });

  const allResults   = [...filteredStatic, ...supabaseItems].slice(0, 6);
  const showDropdown = searchQuery.trim().length > 0;

  useEffect(() => {
    const handler = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) setSearchQuery(''); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const handler = (e) => { if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target)) setIsAvatarMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) navigate('/admin/login', { replace: true });
  }, [authLoading, user, navigate]);

  useEffect(() => { setIsSidebarOpen(false); }, [location.pathname]);

  const navItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard',  path: '/admin' },
    { icon: <TrendingUp size={20} />,      label: 'Revenue',    path: '/admin/revenue' },
    { icon: <Briefcase size={20} />,       label: 'Brands',     path: '/admin/brands' },
    { icon: <Radar size={20} />,           label: 'Lead Radar', path: '/admin/leads' },
    { icon: <Users size={20} />,           label: 'Staff',      path: '/admin/team' },
    { icon: <User size={20} />,            label: 'My Profile', path: '/admin/profile' },
  ];

  const handleLogout = async () => { await logout(); navigate('/admin/login', { replace: true }); };

  const pageSegment = useMemo(() => {
    const path = location.pathname.split('/').pop();
    if (!path || path === 'admin') return 'Dashboard';
    return path.charAt(0).toUpperCase() + path.slice(1);
  }, [location.pathname]);

  const SidebarContent = () => (
    <>
      <div className="p-4 sm:p-6 flex items-center justify-between border-b border-sidebar-border">
        <div className="font-serif font-black text-primary text-xl">VH</div>
        <button onClick={() => setIsSidebarOpen(false)} className="p-2 rounded-lg transition-colors hover:bg-black/5" style={{ color: '#7b809a' }}>
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/admin'}
            className={({ isActive }) =>
              `flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive ? 'primary-gradient text-white shadow-md' : 'hover:bg-black/5'
              }`
            }
            style={({ isActive }) => isActive ? {} : { color: '#7b809a' }}
          >
            <span className="shrink-0">{item.icon}</span>
            <span className="text-[10px] uppercase tracking-widest font-sans">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-sidebar-border space-y-2">
        {/* Toggle button — commented out, re-enable for manual override */}
        {/* <button
          onClick={handleThemeToggle}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-all text-sm hover:bg-black/5"
          style={{ color: '#7b809a' }}
        >
          <Moon size={18} />
          <span>Dark Mode</span>
        </button> */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-all text-sm hover:bg-black/5"
          style={{ color: '#7b809a' }}
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </>
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden relative">
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 sm:w-72 flex flex-col bg-white dark:bg-card transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent />
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="shrink-0 z-30 px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between bg-background/80 backdrop-blur-md border-b border-border sticky top-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-foreground hover:bg-muted rounded-md transition-colors" aria-label="Open sidebar">
              <Menu size={22} />
            </button>
            <div className="hidden sm:flex flex-col">
              <p className="text-[11px] text-muted-foreground font-light">Pages / {pageSegment}</p>
              <h2 className="text-sm font-bold capitalize text-foreground">{pageSegment}</h2>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white dark:bg-card rounded-2xl shadow-md border border-border/50 px-4 py-2">
            <div ref={searchRef} className="hidden lg:flex flex-col min-w-[200px] relative">
              <div className="flex items-center gap-2">
                <Search size={16} className="text-muted-foreground flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); if (!e.target.value) { setHighlightQuery(''); clearHighlights(); } }}
                  onKeyDown={e => { if (e.key === 'Enter' && searchQuery.trim()) { setHighlightQuery(searchQuery.trim()); setSearchQuery(''); } }}
                  className="w-full bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground py-1"
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(''); setHighlightQuery(''); clearHighlights(); }} className="text-muted-foreground hover:text-foreground transition-colors">
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className={`h-px mt-1 transition-all duration-200 ${searchQuery ? 'bg-primary' : 'bg-border'}`} />

              {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50 py-1">
                  {allResults.length > 0 ? allResults.map(result => (
                    <button
                      key={result.id}
                      onClick={() => { setHighlightQuery(searchQuery.trim()); navigate(result.path); setSearchQuery(''); }}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted transition-colors text-left"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium text-foreground">{result.title}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{result.category}</span>
                      </div>
                      <CategoryIcon category={result.category} />
                    </button>
                  )) : (
                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">No results for "{searchQuery}"</div>
                  )}
                </div>
              )}
            </div>

            <div className="hidden lg:block w-px h-7 bg-border" />

            <div
              onClick={() => navigate('/admin/profile')}
              title={displayName}
              className="relative w-9 h-9 rounded-full border border-border overflow-hidden cursor-pointer flex-shrink-0 bg-muted hover:border-primary hover:scale-105 transition-all duration-200"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-sm font-bold text-foreground">{initials}</span>
                </div>
              )}
            </div>
          </div>
        </header>

      
        <section ref={pageContentRef} className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8" style={{ position: 'relative' }}>
          <div className="max-w-7xl mx-auto pt-4">
            <Outlet />
          </div>
          <Footer /> 
        </section>

        {highlightQuery && (
          <div style={{
            position: 'fixed', top: '88px', right: '24px', zIndex: 200,
            display: 'flex', alignItems: 'center', gap: '4px', background: '#1e293b',
            borderRadius: '10px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            padding: '8px 12px', color: 'white', fontSize: '13px', userSelect: 'none',
          }}>
            <span style={{ color: '#94a3b8', marginRight: '4px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {highlightQuery}
            </span>
            <span style={{ color: '#FEF08A', fontWeight: 700, minWidth: '36px', textAlign: 'center' }}>
              {matchCount === 0 ? '0/0' : `${currentMatch}/${matchCount}`}
            </span>
            <div style={{ width: '1px', height: '16px', background: '#334155', margin: '0 4px' }} />
            <button onClick={goPrev} disabled={matchCount === 0} style={{ background: 'none', border: 'none', cursor: matchCount ? 'pointer' : 'not-allowed', color: matchCount ? 'white' : '#475569', padding: '2px 6px', borderRadius: '4px', fontSize: '14px', lineHeight: 1 }}>&#8743;</button>
            <button onClick={goNext} disabled={matchCount === 0} style={{ background: 'none', border: 'none', cursor: matchCount ? 'pointer' : 'not-allowed', color: matchCount ? 'white' : '#475569', padding: '2px 6px', borderRadius: '4px', fontSize: '14px', lineHeight: 1 }}>&#8744;</button>
            <div style={{ width: '1px', height: '16px', background: '#334155', margin: '0 4px' }} />
            <button onClick={() => { setHighlightQuery(''); clearHighlights(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px 6px', borderRadius: '4px', fontSize: '16px', lineHeight: 1 }}>&#x2715;</button>
          </div>
        )}
      </main>

      {/* ========== PDF EXPORT CONTAINERS - ADDED FOR MULTI-PAGE EXPORT ========== */}
      {/* These containers render all pages hidden for PDF export without affecting user experience */}
      <div style={{ 
        position: 'fixed', 
        left: '-9999px', 
        top: 0, 
        zIndex: -9999,
        width: '1200px',
        backgroundColor: '#ffffff'
      }}>
        <div id="dashboard-export-container">
          {/* Dashboard content will be populated by React Router */}
        </div>
        <div id="revenue-export-container">
          {/* Revenue content will be populated by React Router */}
        </div>
        <div id="brands-export-container">
          {/* Brands content will be populated by React Router */}
        </div>
        <div id="team-export-container">
          {/* Team content will be populated by React Router */}
        </div>
        <div id="leads-export-container">
          {/* Leads content will be populated by React Router */}
        </div>
      </div>
      {/* ========== END PDF EXPORT CONTAINERS ========== */}
    </div>
  );
};