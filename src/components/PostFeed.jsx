import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, SlidersHorizontal, LayoutGrid, List, ChevronDown, RotateCcw } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { TARGET_AUDIENCES, SUBJECT_GROUPS, FORMATS, SUBJECT_LABEL } from '../utils/premium';
import PostCard from './PostCard';
import LocationSelector from './LocationSelector';
import { DAYS_SHORT, HOURS } from './AvailabilityMatrix';

const EMPTY_FILTERS = {
  search: '', subject: '', location: '', grades: [], formats: [], priceMin: '', priceMax: '',
  days: [], hourStart: '', hourEnd: '', vipOnly: false, topRated: false,
};

const POPULAR_SUBJECTS = [
  { key: 'math', label: 'მათემატიკა' },
  { key: 'english', label: 'ინგლისური' },
  { key: 'physics', label: 'ფიზიკა' },
  { key: 'frontend', label: 'Frontend' },
  { key: 'chemistry', label: 'ქიმია' },
  { key: 'georgian', label: 'ქართული' },
];

const SORT_OPTIONS = [
  { key: 'recommended', label: 'რეკომენდებული' },
  { key: 'newest', label: 'ახალი დამატებული' },
  { key: 'rating', label: 'რეიტინგით' },
  { key: 'price_asc', label: 'ფასით — ზრდადი' },
  { key: 'price_desc', label: 'ფასით — კლებადი' },
];

// Small filter pill (used in sidebar groups + quick category row).
function Pill({ active, onClick, icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`lp-chip !py-1.5 !px-3 !text-[12.5px] ${active ? 'is-active' : ''}`}
    >
      {icon && <i className={`fas ${icon} text-[11px]`}></i>}
      {children}
    </button>
  );
}

export default function PostFeed({ refreshKey, addToast, highlightId, initial = {} }) {
  const { token } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // `initial` seeds filters from URL params (e.g. the landing hero search card).
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS, ...initial });
  const [sort, setSort] = useState('recommended');
  const [view, setView] = useState('grid');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const highlightDone = useRef(false);

  const toggleIn = (bucket, key) =>
    setFilters((f) => ({
      ...f,
      [bucket]: f[bucket].includes(key) ? f[bucket].filter((k) => k !== key) : [...f[bucket], key],
    }));

  const activeCount =
    (filters.subject ? 1 : 0) +
    (filters.location ? 1 : 0) +
    filters.grades.length +
    filters.formats.length +
    (filters.priceMin !== '' ? 1 : 0) +
    (filters.priceMax !== '' ? 1 : 0) +
    filters.days.length +
    (filters.hourStart !== '' || filters.hourEnd !== '' ? 1 : 0) +
    (filters.vipOnly ? 1 : 0) +
    (filters.topRated ? 1 : 0);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch('/posts', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setPosts(data.posts || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts, refreshKey]);

  // Shared-link support: /?post=<id> scrolls to and highlights that post.
  useEffect(() => {
    if (!highlightId || loading || highlightDone.current) return;
    const el = document.getElementById(`post-${highlightId}`);
    if (el) {
      highlightDone.current = true;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('post-card-highlighted');
      setTimeout(() => el.classList.remove('post-card-highlighted'), 3000);
    }
  }, [highlightId, loading, posts]);

  const handlePostUpdated = (postId, fields) => {
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, ...fields } : p)));
  };
  const handlePostRemoved = (postId) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  // ── Client-side matching engine (unchanged logic) ──
  // Posts arrive already tier-sorted from the server (VIP+ → VIP → standard);
  // filter() preserves that order, so 'recommended' keeps premium listings on top.
  const min = filters.priceMin === '' ? null : Number(filters.priceMin);
  const max = filters.priceMax === '' ? null : Number(filters.priceMax);
  const filtered = posts.filter((p) => {
    if (filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      const hay = [p.title, p.content, p.teacherName, SUBJECT_LABEL[p.subject] || p.subject]
        .filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.vipOnly) {
      const pkg = p.effectivePackage || p.packageType || 'standard';
      if (pkg === 'standard') return false;
    }
    if (filters.topRated && !((p.avgRating || 0) >= 4.5)) return false;
    if (filters.subject && p.subject !== filters.subject) return false;
    if (filters.location === 'online') {
      if (!(p.city === 'online' || p.format === 'online' || p.format === 'both')) return false;
    } else if (filters.location) {
      if (p.city !== filters.location) return false;
    }
    if (filters.grades.length && !(p.targetAudience || []).some((g) => filters.grades.includes(g))) return false;
    if (filters.formats.length) {
      const fmtOk = filters.formats.some(
        (f) => p.format === f || (p.format === 'both' && (f === 'online' || f === 'in_person')),
      );
      if (!fmtOk) return false;
    }
    if (min != null || max != null) {
      if (p.price == null) return false;
      if (min != null && p.price < min) return false;
      if (max != null && p.price > max) return false;
    }
    if (filters.days.length || filters.hourStart !== '' || filters.hourEnd !== '') {
      const hs = filters.hourStart === '' ? 0 : Number(filters.hourStart);
      const he = filters.hourEnd === '' ? 24 : Number(filters.hourEnd);
      const ok = (p.availability || []).some(
        (s) => (filters.days.length === 0 || filters.days.includes(s.day)) && s.hour >= hs && s.hour < he,
      );
      if (!ok) return false;
    }
    return true;
  });

  // ── Sort (applied after filtering) ──
  const sorted = [...filtered];
  if (sort === 'price_asc') sorted.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
  else if (sort === 'price_desc') sorted.sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));
  else if (sort === 'rating') sorted.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));
  else if (sort === 'newest') sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  const resetFilters = () => setFilters(EMPTY_FILTERS);

  // ── Sidebar filter body (shared between desktop aside + mobile drawer) ──
  const filterBody = (
    <div className="flex flex-col">
      <FilterSection title="საგანი" defaultOpen>
        <select
          className="tc-input !text-[13px]"
          value={filters.subject}
          onChange={(e) => setFilters((f) => ({ ...f, subject: e.target.value }))}
        >
          <option value="">ყველა საგანი</option>
          {SUBJECT_GROUPS.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.subjects.map((s) => (<option key={s.key} value={s.key}>{s.label}</option>))}
            </optgroup>
          ))}
        </select>
      </FilterSection>

      <FilterSection title="ფასი (₾/სთ)" defaultOpen>
        <div className="flex items-center gap-2">
          <input type="number" min={0} placeholder="დან" className="tc-input !text-[13px] w-full"
            value={filters.priceMin} onChange={(e) => setFilters((f) => ({ ...f, priceMin: e.target.value }))} />
          <span className="text-[var(--lp-text-mute)]">—</span>
          <input type="number" min={0} placeholder="მდე" className="tc-input !text-[13px] w-full"
            value={filters.priceMax} onChange={(e) => setFilters((f) => ({ ...f, priceMax: e.target.value }))} />
        </div>
      </FilterSection>

      <FilterSection title="ლოკაცია" defaultOpen>
        <LocationSelector value={filters.location} onChange={(v) => setFilters((f) => ({ ...f, location: v }))} allowAll />
      </FilterSection>

      <FilterSection title="ფორმატი">
        <div className="flex flex-wrap gap-2">
          {FORMATS.filter((f) => f.key !== 'both').map((f) => (
            <Pill key={f.key} icon={f.icon} active={filters.formats.includes(f.key)} onClick={() => toggleIn('formats', f.key)}>
              {f.label}
            </Pill>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="მოსწავლის დონე">
        <div className="flex flex-wrap gap-2">
          {TARGET_AUDIENCES.map((a) => (
            <Pill key={a.key} icon={a.icon} active={filters.grades.includes(a.key)} onClick={() => toggleIn('grades', a.key)}>
              {a.label}
            </Pill>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="სტატუსი">
        <div className="flex flex-wrap gap-2">
          <Pill icon="fa-crown" active={filters.vipOnly} onClick={() => setFilters((f) => ({ ...f, vipOnly: !f.vipOnly }))}>VIP+</Pill>
          <Pill icon="fa-star" active={filters.topRated} onClick={() => setFilters((f) => ({ ...f, topRated: !f.topRated }))}>მაღალი შეფასება</Pill>
        </div>
      </FilterSection>

      <FilterSection title="თავისუფალი დრო">
        <div className="flex flex-wrap gap-2 mb-3">
          {DAYS_SHORT.map((d, i) => (
            <Pill key={d} active={filters.days.includes(i)} onClick={() => toggleIn('days', i)}>{d}</Pill>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select className="tc-input !text-[13px] w-full" value={filters.hourStart} onChange={(e) => setFilters((f) => ({ ...f, hourStart: e.target.value }))}>
            <option value="">დან</option>
            {HOURS.map((h) => (<option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>))}
          </select>
          <span className="text-[var(--lp-text-mute)]">—</span>
          <select className="tc-input !text-[13px] w-full" value={filters.hourEnd} onChange={(e) => setFilters((f) => ({ ...f, hourEnd: e.target.value }))}>
            <option value="">მდე</option>
            {[...HOURS, 22].map((h) => (<option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>))}
          </select>
        </div>
      </FilterSection>
    </div>
  );

  // ── Results area (swaps by state; chrome always stays visible) ──
  let results;
  if (loading) {
    results = (
      <div className={view === 'grid' ? 'grid gap-4 sm:grid-cols-2' : 'flex flex-col gap-4'}>
        {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
      </div>
    );
  } else if (error) {
    results = (
      <div className="lp-card flex flex-col items-center justify-center py-16 text-center px-6">
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-3">
          <i className="fas fa-triangle-exclamation text-red-500 text-lg"></i>
        </div>
        <p className="text-[13px] text-red-500 font-semibold m-0">{error}</p>
        <button onClick={loadPosts} className="mt-4 px-4 py-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 text-indigo-500 text-[12px] font-semibold cursor-pointer transition-all">
          <i className="fas fa-redo mr-1.5 text-[10px]"></i>ხელახლა ცდა
        </button>
      </div>
    );
  } else if (posts.length === 0) {
    results = (
      <div className="lp-card flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-xl bg-[var(--lp-surface-2)] border border-[var(--lp-border)] flex items-center justify-center mb-3">
          <i className="fas fa-file-lines text-[var(--lp-text-mute)] text-lg"></i>
        </div>
        <p className="text-[14px] text-[var(--lp-text-dim)] m-0">განცხადებები ჯერჯერობით არ არის</p>
      </div>
    );
  } else if (sorted.length === 0) {
    results = (
      <div className="lp-card flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
          <Search size={22} className="text-indigo-500" />
        </div>
        <p className="text-[15px] font-bold m-0" style={{ color: 'var(--lp-text)' }}>შედეგი ვერ მოიძებნა</p>
        <p className="text-[13px] m-0 mt-1 max-w-xs" style={{ color: 'var(--lp-text-mute)' }}>
          სცადეთ სხვა საძიებო სიტყვა ან შეამცირეთ ფილტრები.
        </p>
        <button onClick={resetFilters} className="mt-4 px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-[13px] font-semibold cursor-pointer transition-colors inline-flex items-center gap-1.5">
          <RotateCcw size={13} />ფილტრის გასუფთავება
        </button>
      </div>
    );
  } else {
    results = (
      <div className={view === 'grid' ? 'grid gap-4 sm:grid-cols-2 items-start' : 'flex flex-col gap-4'}>
        {sorted.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            addToast={addToast}
            onPostUpdated={handlePostUpdated}
            onPostRemoved={handlePostRemoved}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ══════════ SEARCH BANNER ══════════ */}
      <div className="lp-card px-4 py-5 sm:px-6 sm:py-6">
        <h1 className="m-0 mb-3.5 font-extrabold tracking-tight text-[clamp(1.4rem,3vw,1.9rem)]" style={{ color: 'var(--lp-text)' }}>
          რისი სწავლა გსურს?
        </h1>
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 min-w-0">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--lp-text-mute)' }} />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              placeholder="ძებნა საგნით, მასწავლებლით ან სათაურით…"
              className="lp-search-input h-12 pl-11 pr-9 text-[14px] font-medium"
            />
            {filters.search && (
              <button onClick={() => setFilters((f) => ({ ...f, search: '' }))} title="გასუფთავება"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 grid place-items-center rounded-md bg-transparent border-none cursor-pointer" style={{ color: 'var(--lp-text-mute)' }}>
                <X size={15} />
              </button>
            )}
          </div>
          {/* Mobile: open filter drawer. Desktop: sidebar is always visible. */}
          <button onClick={() => setDrawerOpen(true)} className="lp-btn lp-btn-ghost lg:hidden shrink-0 !h-12 !px-4">
            <SlidersHorizontal size={16} />
            {activeCount > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full text-white text-[10px] font-bold grid place-items-center" style={{ background: 'var(--lp-accent)' }}>{activeCount}</span>
            )}
          </button>
        </div>

        {/* Quick category links */}
        <div className="flex items-center gap-2 flex-wrap mt-3.5">
          {POPULAR_SUBJECTS.map((s) => (
            <Pill key={s.key} active={filters.subject === s.key} onClick={() => setFilters((f) => ({ ...f, subject: f.subject === s.key ? '' : s.key }))}>
              {s.label}
            </Pill>
          ))}
        </div>
      </div>

      {/* ══════════ BODY: sidebar + main ══════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-[248px_1fr] gap-5 items-start">
        {/* LEFT SIDEBAR (desktop) */}
        <aside className="hidden lg:block sticky top-4 self-start">
          <div className="lp-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--lp-border)' }}>
              <span className="font-bold text-[14px] flex items-center gap-2" style={{ color: 'var(--lp-text)' }}>
                <SlidersHorizontal size={15} style={{ color: 'var(--lp-accent)' }} />ფილტრები
              </span>
              {activeCount > 0 && (
                <button onClick={resetFilters} className="text-[12px] font-semibold bg-transparent border-none cursor-pointer inline-flex items-center gap-1 hover:opacity-80" style={{ color: 'var(--lp-accent)' }}>
                  <RotateCcw size={12} />გასუფთავება
                </button>
              )}
            </div>
            {filterBody}
          </div>
        </aside>

        {/* MAIN COLUMN */}
        <div className="min-w-0 flex flex-col gap-4">
          {/* TOP BAR: count + sort + view toggle */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-[13.5px] m-0 font-medium" style={{ color: 'var(--lp-text-dim)' }}>
              ნაპოვნია <span className="font-bold" style={{ color: 'var(--lp-text)' }}>{loading ? '…' : sorted.length}</span> შედეგი
            </p>
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="tc-input !w-auto !py-2 !pl-3 !pr-8 !text-[13px] font-semibold appearance-none cursor-pointer"
                >
                  {SORT_OPTIONS.map((o) => (<option key={o.key} value={o.key}>{o.label}</option>))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--lp-text-mute)' }} />
              </div>
              {/* View switcher */}
              <div className="hidden sm:flex items-center rounded-lg border overflow-hidden" style={{ borderColor: 'var(--lp-border-strong)' }}>
                <button onClick={() => setView('grid')} title="ბადე"
                  className={`w-9 h-9 grid place-items-center border-none cursor-pointer transition-colors ${view === 'grid' ? 'text-white' : ''}`}
                  style={{ background: view === 'grid' ? 'var(--lp-accent)' : 'var(--lp-surface)', color: view === 'grid' ? '#fff' : 'var(--lp-text-mute)' }}>
                  <LayoutGrid size={16} />
                </button>
                <button onClick={() => setView('list')} title="სია"
                  className="w-9 h-9 grid place-items-center border-none cursor-pointer transition-colors"
                  style={{ background: view === 'list' ? 'var(--lp-accent)' : 'var(--lp-surface)', color: view === 'list' ? '#fff' : 'var(--lp-text-mute)' }}>
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>

          {results}
        </div>
      </div>

      {/* ══════════ MOBILE FILTER DRAWER ══════════ */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-black/40"></div>
          <div className="absolute top-0 left-0 h-full w-[86vw] max-w-sm overflow-y-auto animate-slide-in-left"
            style={{ background: 'var(--lp-surface)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3.5 border-b sticky top-0 z-10" style={{ borderColor: 'var(--lp-border)', background: 'var(--lp-surface)' }}>
              <span className="font-bold text-[15px] flex items-center gap-2" style={{ color: 'var(--lp-text)' }}>
                <SlidersHorizontal size={16} style={{ color: 'var(--lp-accent)' }} />ფილტრები
              </span>
              <button onClick={() => setDrawerOpen(false)} className="w-8 h-8 grid place-items-center rounded-lg bg-transparent border-none cursor-pointer" style={{ color: 'var(--lp-text-mute)' }}>
                <X size={18} />
              </button>
            </div>
            {filterBody}
            <div className="p-4 flex gap-2 sticky bottom-0" style={{ background: 'var(--lp-surface)', borderTop: '1px solid var(--lp-border)' }}>
              {activeCount > 0 && (
                <button onClick={resetFilters} className="lp-btn lp-btn-ghost flex-1">
                  <RotateCcw size={15} />გასუფთავება
                </button>
              )}
              <button onClick={() => setDrawerOpen(false)} className="lp-btn lp-btn-primary flex-1">
                ნახვა ({loading ? '…' : sorted.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Collapsible sidebar filter section (TNET accordion).
function FilterSection({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b last:border-b-0" style={{ borderColor: 'var(--lp-border)' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-transparent border-none cursor-pointer text-left"
      >
        <span className="text-[13px] font-bold" style={{ color: 'var(--lp-text)' }}>{title}</span>
        <ChevronDown size={15} className={`transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--lp-text-mute)' }} />
      </button>
      {open && <div className="px-4 pb-4 pt-0.5">{children}</div>}
    </div>
  );
}

// Shimmer skeleton card shown while the marketplace loads.
function SkeletonCard() {
  return (
    <div className="lp-card p-5 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="skeleton w-11 h-11 rounded-xl shrink-0" />
        <div className="flex-1 flex flex-col gap-2">
          <div className="skeleton h-3.5 w-1/2" />
          <div className="skeleton h-2.5 w-1/3" />
        </div>
      </div>
      <div className="skeleton h-4 w-3/4" />
      <div className="flex flex-col gap-2">
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-4/6" />
      </div>
      <div className="flex gap-2">
        <div className="skeleton h-6 w-16 rounded-lg" />
        <div className="skeleton h-6 w-20 rounded-lg" />
      </div>
      <div className="skeleton h-10 w-full rounded-lg" />
    </div>
  );
}
