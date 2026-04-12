import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabase';
import { usePageSearch } from '../../hooks/usePageSearch';
import {
  LayoutDashboard, Users, LogOut, Search,
  TrendingUp, Menu, X, Briefcase, User, Radar,
  FileText, Zap,
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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-[3px] border-muted border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  const pageSegment = location.pathname.split('/').filter(Boolean).pop() || 'Dashboard';

  const SidebarContent = () => (
    <div className="flex flex-col h-[calc(100vh-1rem)] sm:h-[calc(100vh-2rem)] m-2 sm:m-4 rounded-xl bg-white shadow-xl overflow-hidden border border-black/10">
      <div className="p-4 sm:p-6 flex items-center justify-between border-b border-black/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-black/5">
            <LayoutDashboard size={18} style={{ color: '#344767' }} />
          </div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: '#344767' }}>VidHelp</h1>
        </div>
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
            <span className="text-sm font-light">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-black/10">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-all text-sm font-light hover:bg-black/5"
          style={{ color: '#7b809a' }}
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden relative">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 sm:w-72 flex flex-col transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent />
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        <header
          className="shrink-0 z-30 px-4 sm:px-6 lg:px-8"
          style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'nowrap' }}
        >
          {/* LEFT: hamburger + breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 hover:bg-white/50 rounded-md"
              style={{ color: '#344767' }}
              aria-label="Open sidebar"
            >
              <Menu size={22} />
            </button>
            <div>
              <p style={{ fontSize: '11px', color: '#7b809a', margin: 0, fontWeight: 300 }}>
                Pages / {pageSegment}
              </p>
              <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#344767', margin: 0, textTransform: 'capitalize' }}>
                {pageSegment}
              </h2>
            </div>
          </div>

          {/* RIGHT: glass pill */}
          <div
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: 'white',
              borderRadius: '16px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              border: '1px solid #f1f1f1',
              padding: '8px 16px',
            }}
          >
            {/* ── SEARCH (desktop only) with live dropdown ── */}
            <div
              ref={searchRef}
              className="hidden lg:flex flex-col"
              style={{ minWidth: '200px', position: 'relative' }}
            >
              {/* Input row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Search size={16} style={{ color: '#7b809a', flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); if (!e.target.value) { setHighlightQuery(''); clearHighlights(); } }}
                  onKeyDown={e => { if (e.key === 'Enter' && searchQuery.trim()) { setHighlightQuery(searchQuery.trim()); setSearchQuery(''); } }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: '14px',
                    color: '#344767',
                    width: '100%',
                    padding: '2px 0',
                  }}
                />
                {/* Clear button */}
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(''); setHighlightQuery(''); clearHighlights(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                    <X size={14} style={{ color: '#7b809a' }} />
                  </button>
                )}
              </div>
              {/* Underline */}
              <div style={{ height: '1px', background: searchQuery ? '#344767' : '#e2e8f0', marginTop: '4px', transition: 'background 0.2s' }} />


              {/* ── DROPDOWN ── */}
              {showDropdown && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 12px)',
                  left: '-16px',
                  right: '-16px',
                  background: 'white',
                  borderRadius: '14px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  border: '1px solid #f1f1f1',
                  overflow: 'hidden',
                  zIndex: 100,
                  padding: '6px 0',
                }}>
                  {allResults.length > 0 ? allResults.map(result => (
                    <button
                      key={result.id}
                      onClick={() => { setHighlightQuery(searchQuery.trim()); navigate(result.path); setSearchQuery(''); }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 16px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 500, color: '#344767' }}>{result.title}</span>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#7b809a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{result.category}</span>
                      </div>
                      <CategoryIcon category={result.category} />
                    </button>
                  )) : (
                    <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: '12px', color: '#7b809a' }}>
                      No results for "{searchQuery}"
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Divider — desktop only */}
            <div className="hidden lg:block" style={{ width: '1px', height: '28px', background: '#e2e8f0' }} />

            {/* Avatar — always visible */}
            <div
              onClick={() => navigate('/admin/profile')}
              title={displayName}
              style={{
                width: '36px', height: '36px', borderRadius: '50%',
                border: '1px solid #e2e8f0', overflow: 'hidden',
                cursor: 'pointer', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#f0f2f5', transition: 'transform 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#344767', userSelect: 'none' }}>
                  {initials}
                </span>
              )}
            </div>
          </div>
        </header>

        <section ref={pageContentRef} className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8" style={{ position: 'relative' }}>
          <div className="max-w-7xl mx-auto pt-4">
            <Outlet />
          </div>
        </section>


        {/* ── FLOATING FIND BAR (Ctrl+F style) ─────────────────────────────
            Appears at the bottom-right when highlightQuery is active.
            Shows: query text | currentMatch/matchCount | prev | next | close
        ──────────────────────────────────────────────────────────────────── */}
        {highlightQuery && (
          <div
            style={{
              position: 'fixed',
              top: '88px',
              right: '24px',
              zIndex: 200,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: '#1e293b',
              borderRadius: '10px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              padding: '8px 12px',
              color: 'white',
              fontSize: '13px',
              userSelect: 'none',
            }}
          >
            {/* Query text */}
            <span style={{ color: '#94a3b8', marginRight: '4px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {highlightQuery}
            </span>

            {/* Match counter */}
            <span style={{ color: '#FEF08A', fontWeight: 700, minWidth: '36px', textAlign: 'center' }}>
              {matchCount === 0 ? '0/0' : `${currentMatch}/${matchCount}`}
            </span>

            {/* Divider */}
            <div style={{ width: '1px', height: '16px', background: '#334155', margin: '0 4px' }} />

            {/* Prev ^ */}
            <button
              onClick={goPrev}
              disabled={matchCount === 0}
              title="Previous match"
              style={{
                background: 'none', border: 'none', cursor: matchCount ? 'pointer' : 'not-allowed',
                color: matchCount ? 'white' : '#475569', padding: '2px 6px', borderRadius: '4px',
                fontSize: '14px', lineHeight: 1, transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (matchCount) e.currentTarget.style.background = '#334155'; }}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              &#8743;
            </button>

            {/* Next v */}
            <button
              onClick={goNext}
              disabled={matchCount === 0}
              title="Next match"
              style={{
                background: 'none', border: 'none', cursor: matchCount ? 'pointer' : 'not-allowed',
                color: matchCount ? 'white' : '#475569', padding: '2px 6px', borderRadius: '4px',
                fontSize: '14px', lineHeight: 1, transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (matchCount) e.currentTarget.style.background = '#334155'; }}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              &#8744;
            </button>

            {/* Divider */}
            <div style={{ width: '1px', height: '16px', background: '#334155', margin: '0 4px' }} />

            {/* Close X */}
            <button
              onClick={() => { setHighlightQuery(''); clearHighlights(); }}
              title="Close"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#94a3b8', padding: '2px 6px', borderRadius: '4px',
                fontSize: '16px', lineHeight: 1, transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#334155'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              &#x2715;
            </button>
          </div>
        )}
      </main>
    </div>
  );
};