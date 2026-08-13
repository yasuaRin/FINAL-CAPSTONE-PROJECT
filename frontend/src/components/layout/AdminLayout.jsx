// frontend/src/components/layout/AdminLayout.jsx
import { useState, useEffect, useRef, useMemo, createContext, useCallback } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabase';
import { usePageSearch } from '../../hooks/usePageSearch';
import {
  LogOut, Menu, X, Search, Download
} from 'lucide-react';
import Footer from './Footer';
import { format } from 'date-fns';

const STATIC_ITEMS = [
  { id: 'p1', title: 'Dashboard',      category: 'Page',   path: '/admin',          keywords: 'home main overview stats' },
  { id: 'p2', title: 'Revenue',        category: 'Page',   path: '/admin/revenue',  keywords: 'money income profit analytics reports' },
  { id: 'p3', title: 'Brands',         category: 'Page',   path: '/admin/brands',   keywords: 'clients companies partners' },
  { id: 'p4', title: 'Lead Radar',     category: 'Page',   path: '/admin/leads',    keywords: 'leads prospects pipeline crm' },
  { id: 'p5', title: 'Team',           category: 'Page',   path: '/admin/team',     keywords: 'team members employees people' },
  { id: 'p6', title: 'My Profile',     category: 'Page',   path: '/admin/profile',  keywords: 'account settings avatar name' },
  { id: 'a1', title: 'Add New Brand',  category: 'Action', path: '/admin/brands',   keywords: 'create new client plus' },
  { id: 'a2', title: 'Add New Staff',  category: 'Action', path: '/admin/team',     keywords: 'create hire new member plus' },
  { id: 'a3', title: 'AI Settings',    category: 'Action', path: '/admin/ai-settings', keywords: 'artificial intelligence settings configuration' },
];

const CategoryIcon = ({ category }) => {
  return null;
};

export const AdminActionContext = createContext({
  registerActions: () => {},
});

export const AdminLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen]       = useState(false);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef(null);
  const actionHandlers = useRef({
    onAllData: null,
    onExportReport: null,
  });

  const registerActions = useCallback((handlers) => {
    actionHandlers.current = {
      ...actionHandlers.current,
      ...handlers,
    };
  }, []);

  const handleExportReport = useCallback(() => {
    if (actionHandlers.current.onExportReport) {
      actionHandlers.current.onExportReport();
    }
  }, []);

  const [searchQuery, setSearchQuery]       = useState('');
  const [supabaseItems, setSupabaseItems]   = useState([]);
  const [highlightQuery, setHighlightQuery] = useState('');
  const searchRef      = useRef(null);
  const pageContentRef = useRef(null);

  // ── Admin color theme: apply to <html> so it also reaches portaled
  //    content (modals/toasts/dropdowns render on document.body, still
  //    a descendant of <html>, but NOT of this component's own div). ──────
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'admin');
    return () => document.documentElement.removeAttribute('data-theme');
  }, []);

  // ── Theme: follow system preference only ─────────────────────────────────
  useEffect(() => {
    localStorage.removeItem('theme');
    localStorage.removeItem('themeSource');

    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    if (mq.matches) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

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
    { label: 'Dashboard',  path: '/admin' },
    { label: 'Revenue',    path: '/admin/revenue' },
    { label: 'Brands',     path: '/admin/brands' },
    { label: 'Lead Radar', path: '/admin/leads' },
    { label: 'Team',       path: '/admin/team' },
    { label: 'My Profile', path: '/admin/profile' },
    { label: 'AI Settings', path: '/admin/ai-settings' },
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
        <div className="font-sans font-black text-primary text-xl">VH</div>
        <button onClick={() => setIsSidebarOpen(false)} className="p-2.5 sm:p-2 rounded-lg transition-colors text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5">
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
              `flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 min-h-[44px] ${
                isActive ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5'
              }`
            }
          >
            <span className="text-[10px] uppercase tracking-widest font-sans">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-sidebar-border space-y-2">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-all text-sm text-destructive hover:bg-red-50 dark:hover:bg-red-950/30 min-h-[44px]"
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
    <div data-layout="admin" className="flex h-screen bg-[#EEEEEE] dark:bg-[#0a0f1a] text-foreground overflow-hidden relative">
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* max-w-[85vw] guards against the drawer overflowing extremely narrow
          (e.g. 280px) devices; w-64/w-72 are unchanged for normal phones+. */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 sm:w-72 max-w-[85vw] flex flex-col bg-white dark:bg-card transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ paddingLeft: 'env(safe-area-inset-left, 0px)' }}
      >
        <SidebarContent />
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header
          className="shrink-0 z-30 bg-white dark:bg-card border-b border-border sticky top-0 shadow-sm"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
          <div className="px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

            {/* LEFT: Hamburger + Page Title + Date */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2.5 sm:p-1.5 -m-1 sm:m-0 rounded-lg hover:bg-muted dark:hover:bg-white/5 transition-colors"
              >
                <Menu size={18} className="text-muted-foreground" />
              </button>

              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-primary">Admin Panel</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-muted-foreground">
                    {new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT: Search + Action Buttons + Avatar */}
            <div className="flex items-center gap-2 flex-wrap">

              {/* Search */}
              <div ref={searchRef} className="flex-1 sm:flex-none relative">
                <div className="flex items-center gap-2 bg-muted border border-border rounded-lg px-3 py-1.5 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all min-w-[160px] sm:min-w-[200px]">
                  <Search size={14} className="text-muted-foreground flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); if (!e.target.value) { setHighlightQuery(''); clearHighlights(); } }}
                    onKeyDown={e => { if (e.key === 'Enter' && searchQuery.trim()) { setHighlightQuery(searchQuery.trim()); setSearchQuery(''); } }}
                    /* text-base (16px) on mobile prevents iOS Safari's
                       automatic zoom-on-focus for inputs under 16px;
                       reverts to the original 13px from sm: up. */
                    className="w-full bg-transparent border-none outline-none text-base sm:text-[13px] text-foreground placeholder:text-muted-foreground/60 py-0.5"
                  />
                  {searchQuery && (
                    <button onClick={() => { setSearchQuery(''); setHighlightQuery(''); clearHighlights(); }} className="text-muted-foreground hover:text-foreground transition-colors p-1 -m-1">
                      <X size={14} />
                    </button>
                  )}
                </div>

                {showDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50 py-1 max-h-[60vh] overflow-y-auto">
                    {allResults.length > 0 ? allResults.map(result => (
                      <button
                        key={result.id}
                        onClick={() => { setHighlightQuery(searchQuery.trim()); navigate(result.path); setSearchQuery(''); }}
                        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted transition-colors text-left min-h-[44px]"
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

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleExportReport}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all whitespace-nowrap min-h-[36px]"
                >
                  <Download size={13} />
                  Export Report
                </button>
              </div>

              {/* Avatar */}
              <div
                onClick={() => navigate('/admin/profile')}
                title={displayName}
                className="relative w-9 h-9 sm:w-7 sm:h-7 rounded-full border-2 border-primary/20 overflow-hidden cursor-pointer flex-shrink-0 bg-muted hover:border-primary hover:scale-105 transition-all duration-200"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/10">
                    <span className="text-[10px] font-bold text-primary">{initials}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <section ref={pageContentRef} className="flex-1 overflow-y-auto" style={{ position: 'relative' }}>
          <AdminActionContext.Provider value={{ registerActions }}>
            <div className="max-w-7xl mx-auto pt-4 p-4 sm:p-6 md:p-8">
              <Outlet />
            </div>
          </AdminActionContext.Provider>
          <Footer variant="admin" />
        </section>

        {highlightQuery && (
          <div
            className="fixed z-[200] top-[104px] sm:top-[88px] right-3 sm:right-6 left-3 sm:left-auto flex items-center gap-1 rounded-[10px] shadow-[0_8px_32px_rgba(0,0,0,0.3)] px-2.5 sm:px-3 py-2 text-white text-[13px] select-none sm:max-w-none max-w-[calc(100vw-1.5rem)]"
            style={{ background: '#1e293b' }}
          >
            <span className="text-[#94a3b8] mr-1 max-w-[100px] sm:max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap">
              {highlightQuery}
            </span>
            <span style={{ color: '#FEF08A', fontWeight: 700, minWidth: '36px', textAlign: 'center' }}>
              {matchCount === 0 ? '0/0' : `${currentMatch}/${matchCount}`}
            </span>
            <div style={{ width: '1px', height: '16px', background: '#334155', margin: '0 4px' }} />
            <button onClick={goPrev} disabled={matchCount === 0} className="min-w-[32px] min-h-[32px]" style={{ background: 'none', border: 'none', cursor: matchCount ? 'pointer' : 'not-allowed', color: matchCount ? 'white' : '#475569', padding: '2px 6px', borderRadius: '4px', fontSize: '14px', lineHeight: 1 }}>&#8743;</button>
            <button onClick={goNext} disabled={matchCount === 0} className="min-w-[32px] min-h-[32px]" style={{ background: 'none', border: 'none', cursor: matchCount ? 'pointer' : 'not-allowed', color: matchCount ? 'white' : '#475569', padding: '2px 6px', borderRadius: '4px', fontSize: '14px', lineHeight: 1 }}>&#8744;</button>
            <div style={{ width: '1px', height: '16px', background: '#334155', margin: '0 4px' }} />
            <button onClick={() => { setHighlightQuery(''); clearHighlights(); }} className="min-w-[32px] min-h-[32px]" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px 6px', borderRadius: '4px', fontSize: '16px', lineHeight: 1 }}>&#x2715;</button>
          </div>
        )}
      </main>

      {/* PDF Export Containers */}
      <div
        id="pdf-export-wrapper"
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          zIndex: -9999,
          width: '1200px',
        }}
      >
        <div id="dashboard-export-container" />
        <div id="revenue-export-container" />
        <div id="brands-export-container" />
        <div id="team-export-container" />
        <div id="leads-export-container" />
      </div>
    </div>
  );
};