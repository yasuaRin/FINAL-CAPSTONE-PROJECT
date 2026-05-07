import { useState, useEffect, useRef, useMemo } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabase';
import { usePageSearch } from '../../hooks/usePageSearch';
import {
  LayoutDashboard, Users, LogOut, Search,
  TrendingUp, Menu, X, Briefcase, User, Radar,
  FileText, Zap, Sun, Moon, Server, Phone, Instagram, Mail, ArrowUp,
} from 'lucide-react';

// ─── TIER 1: Static index (pages + actions) ───────────────────────────────────
// These never change so there's zero latency — no DB call needed.
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

// Icon per category for the dropdown
const CategoryIcon = ({ category }) => {
  const props = { size: 13, style: { flexShrink: 0 } };
  if (category === 'Page')   return <FileText {...props} style={{ ...props.style, color: '#1a73e8' }} />;
  if (category === 'Action') return <Zap      {...props} style={{ ...props.style, color: '#fb8c00' }} />;
  if (category === 'Brand')  return <Briefcase {...props} style={{ ...props.style, color: '#43a047' }} />;
  if (category === 'Staff')  return <Users    {...props} style={{ ...props.style, color: '#7b809a' }} />;
  return null;
};

// ─────────────────────────────────────────────────────────────────────────────

export const AdminLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // ── Search state ────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery]       = useState('');
  const [supabaseItems, setSupabaseItems]   = useState([]);  // Tier 2: live DB results
  const [highlightQuery, setHighlightQuery] = useState('');   // committed query that drives highlights
  const searchRef                           = useRef(null);  // for click-outside
  const pageContentRef                      = useRef(null);  // page content container for highlight
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);
  // ───────────────────────────────────────────────────────────────────────────

  // Highlight engine — runs when user commits a search (Enter or dropdown click)
  const { matchCount, currentMatch, goNext, goPrev, clearHighlights } = usePageSearch(highlightQuery, pageContentRef);

  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, loading: authLoading } = useAuth();

  // Profile data from auth.users
  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'Admin';

  const avatarUrl =
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    null;

  const initials = displayName.charAt(0).toUpperCase();

  // ── TIER 2: Supabase search (brands + staff) ────────────────────────────────
  // Fires only when user has typed ≥ 2 characters to avoid hammering the DB.
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSupabaseItems([]);
      return;
    }

    const fetchFromSupabase = async () => {
      const q = searchQuery.trim();

      // Search brands table
      const { data: brands } = await supabase
        .from('brands')
        .select('brand_id, brand_name')
        .ilike('brand_name', `%${q}%`)
        .limit(3);

      // Search team/staff table — adjust column name if yours differs
      const { data: staff } = await supabase
        .from('staff')
        .select('id, name')
        .ilike('name', `%${q}%`)
        .limit(3);

      const brandItems = (brands ?? []).map(b => ({
        id:       `brand-${b.brand_id}`,
        title:    b.brand_name,
        category: 'Brand',
        path:     '/admin/brands',
        keywords: '',
      }));

      const staffItems = (staff ?? []).map(s => ({
        id:       `staff-${s.id}`,
        title:    s.name,
        category: 'Staff',
        path:     '/admin/team',
        keywords: '',
      }));

      setSupabaseItems([...brandItems, ...staffItems]);
    };

    // Debounce 300ms so we don't fire on every keystroke
    const timer = setTimeout(fetchFromSupabase, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  // ───────────────────────────────────────────────────────────────────────────

  // ── Filter static items against query ──────────────────────────────────────
  const filteredStatic = searchQuery.trim() === '' ? [] : STATIC_ITEMS.filter(item => {
    const q = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.keywords.toLowerCase().includes(q)
    );
  });

  // Merge Tier 1 + Tier 2, cap at 6 results
  const allResults = [...filteredStatic, ...supabaseItems].slice(0, 6);
  const showDropdown = searchQuery.trim().length > 0;
  // ───────────────────────────────────────────────────────────────────────────

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/admin/login', { replace: true });
    }
  }, [authLoading, user, navigate]);

  // Close sidebar on route change
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  const navItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard',  path: '/admin' },
    { icon: <TrendingUp size={20} />,      label: 'Revenue',    path: '/admin/revenue' },
    { icon: <Briefcase size={20} />,       label: 'Brands',     path: '/admin/brands' },
    { icon: <Radar size={20} />,           label: 'Lead Radar', path: '/admin/leads' },
    { icon: <Users size={20} />,           label: 'Staff',      path: '/admin/team' },
    { icon: <User size={20} />,            label: 'My Profile', path: '/admin/profile' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login', { replace: true });
  };

  // ── Derive breadcrumb segment from path ──────────────────────────────────
  const pageSegment = useMemo(() => {
    const path = location.pathname.split('/').pop();
    if (!path || path === 'admin') return 'Dashboard';
    return path.charAt(0).toUpperCase() + path.slice(1);
  }, [location.pathname]);

  // ── Sidebar content (reused by mobile overlay + desktop static bar) ─────
  const SidebarContent = () => (
    <>
      <div className="p-4 sm:p-6 flex items-center justify-between border-b border-sidebar-border">
        {/* Logo/Brand Name - text-xl font-bold tracking-tight */}
        <h1 className="text-xl font-bold tracking-tight text-sidebar-foreground">VidHelp</h1>
        <button
          onClick={() => setIsSidebarOpen(false)}
          className="p-2 rounded-lg transition-colors hover:bg-black/5"
          style={{ color: '#7b809a' }}
        >
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
            {/* Nav Link - text-sm font-light */}
            <span className="text-sm font-light">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-sidebar-border space-y-2">
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-all text-sm hover:bg-black/5"
          style={{ color: '#7b809a' }}
        >
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
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

  // ── Loading state ───────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden relative">
      {/* Mobile backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 sm:w-72 flex flex-col bg-white dark:bg-card transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent />
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header - Fixed with CSS variables for dark mode */}
        <header className="shrink-0 z-30 px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between bg-background/80 backdrop-blur-md border-b border-border sticky top-0">
          {/* LEFT: hamburger + breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-foreground hover:bg-muted rounded-md transition-colors"
              aria-label="Open sidebar"
            >
              <Menu size={22} />
            </button>
            <div className="hidden sm:flex flex-col">
              {/* Breadcrumb - text-xs text-muted-foreground font-light */}
              <p className="text-xs text-muted-foreground font-light">
                Pages / {pageSegment}
              </p>
              {/* Page Title - text-sm font-bold capitalize */}
              <h2 className="text-sm font-bold capitalize text-foreground">
                {pageSegment}
              </h2>
            </div>
          </div>

          {/* RIGHT: glass pill - Fully responsive to dark mode */}
          <div className="flex items-center gap-3 bg-white dark:bg-card rounded-2xl shadow-md border border-border/50 px-4 py-2">
            {/* Search (desktop) */}
            <div ref={searchRef} className="hidden lg:flex flex-col min-w-[200px] relative">
              <div className="flex items-center gap-2">
                <Search size={16} className="text-muted-foreground flex-shrink-0" />
                {/* Search Text - text-xs */}
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); if (!e.target.value) { setHighlightQuery(''); clearHighlights(); } }}
                  onKeyDown={e => { if (e.key === 'Enter' && searchQuery.trim()) { setHighlightQuery(searchQuery.trim()); setSearchQuery(''); } }}
                  className="w-full bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted-foreground py-1"
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(''); setHighlightQuery(''); clearHighlights(); }} className="text-muted-foreground hover:text-foreground transition-colors">
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className={`h-px mt-1 transition-all duration-200 ${searchQuery ? 'bg-primary' : 'bg-border'}`} />

              {/* Dropdown */}
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
                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                      No results for "{searchQuery}"
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="hidden lg:block w-px h-7 bg-border" />

            {/* Avatar */}
            <div
              onClick={() => navigate('/admin/profile')}
              title={displayName}
              className="relative w-9 h-9 rounded-full border border-border overflow-hidden cursor-pointer flex-shrink-0 bg-muted hover:border-primary hover:scale-105 transition-all duration-200"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-sm font-bold text-foreground">{initials}</span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <section ref={pageContentRef} className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8" style={{ position: 'relative' }}>
          <div className="max-w-7xl mx-auto pt-4">
            <Outlet />
          </div>
        </section>

        {/* Floating find bar - Premium Technical Footer styling */}
        {highlightQuery && (
          <div style={{
            position: 'fixed', top: '88px', right: '24px', zIndex: 200,
            display: 'flex', alignItems: 'center', gap: '4px', background: '#0d0d0d',
            borderRadius: '10px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            padding: '8px 12px', color: 'white', fontSize: '13px', userSelect: 'none',
            borderLeft: '3px solid #DB1A1A'
          }}>
            <span style={{ color: '#DB1A1A', fontWeight: 700, marginRight: '4px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              {highlightQuery}
            </span>
            <span style={{ color: '#FEF08A', fontWeight: 700, minWidth: '36px', textAlign: 'center', fontSize: '10px' }}>
              {matchCount === 0 ? '0/0' : `${currentMatch}/${matchCount}`}
            </span>
            <div style={{ width: '1px', height: '16px', background: '#334155', margin: '0 4px' }} />
            <button onClick={goPrev} disabled={matchCount === 0} style={{ background: 'none', border: 'none', cursor: matchCount ? 'pointer' : 'not-allowed', color: matchCount ? '#DB1A1A' : '#475569', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', lineHeight: 1, fontWeight: 700 }}>
              &#8743;
            </button>
            <button onClick={goNext} disabled={matchCount === 0} style={{ background: 'none', border: 'none', cursor: matchCount ? 'pointer' : 'not-allowed', color: matchCount ? '#DB1A1A' : '#475569', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', lineHeight: 1, fontWeight: 700 }}>
              &#8744;
            </button>
            <div style={{ width: '1px', height: '16px', background: '#334155', margin: '0 4px' }} />
            <button onClick={() => { setHighlightQuery(''); clearHighlights(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', lineHeight: 1 }}>
              &#x2715;
            </button>
          </div>
        )}
      </main>
    </div>
  );
};