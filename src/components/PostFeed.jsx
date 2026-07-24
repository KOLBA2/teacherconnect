import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { TARGET_AUDIENCES, SUBJECT_GROUPS, FORMATS } from '../utils/premium';
import PostCard from './PostCard';
import LocationSelector from './LocationSelector';
import { DAYS_SHORT, HOURS } from './AvailabilityMatrix';

const EMPTY_FILTERS = {
  subject: '', location: '', grades: [], formats: [], priceMin: '', priceMax: '',
  days: [], hourStart: '', hourEnd: '',
};

function Pill({ active, onClick, icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] font-semibold cursor-pointer transition-all ${
        active
          ? 'border-indigo-500 bg-indigo-500/15 text-indigo-300'
          : 'border-[#27272a] bg-black/20 text-[#71717a] hover:border-[#3f3f46]'
      }`}
    >
      {icon && <i className={`fas ${icon} text-[11px]`}></i>}
      {children}
    </button>
  );
}

export default function PostFeed({ refreshKey, addToast, highlightId }) {
  const { token } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [panelOpen, setPanelOpen] = useState(false);
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
    (filters.hourStart !== '' || filters.hourEnd !== '' ? 1 : 0);

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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <i className="fas fa-circle-notch fa-spin text-indigo-400 text-2xl mb-3"></i>
        <p className="text-[13px] text-[#71717a] m-0">იტვირთება...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-6">
        <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-3">
          <i className="fas fa-exclamation-triangle text-red-400 text-xl"></i>
        </div>
        <p className="text-[13px] text-[#f87171] font-semibold m-0">{error}</p>
        <button
          onClick={loadPosts}
          className="mt-4 px-4 py-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 text-indigo-400 text-[12px] font-semibold cursor-pointer transition-all"
        >
          <i className="fas fa-redo mr-1.5 text-[10px]"></i>ხელახლა ცდა
        </button>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-white/[0.03] border border-[#27272a] flex items-center justify-center mb-3">
          <i className="fas fa-file-alt text-[#3f3f46] text-xl"></i>
        </div>
        <p className="text-[13px] text-[#71717a] m-0">პოსტები ჯერჯერობით არ არის</p>
      </div>
    );
  }

  // Client-side matching engine. Posts arrive already tier-sorted from the
  // server (VIP+ → VIP → standard), so filter() preserves that ordering and
  // premium listings stay anchored to the top of the matched results.
  const min = filters.priceMin === '' ? null : Number(filters.priceMin);
  const max = filters.priceMax === '' ? null : Number(filters.priceMax);
  const filtered = posts.filter((p) => {
    if (filters.subject && p.subject !== filters.subject) return false;
    // Location: "online" matches online/both posts (city ignored); a city
    // matches posts tagged with that city.
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
    // Search by availability: keep teachers whose weekly schedule has a free slot
    // on the selected day(s) within the selected time range.
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

  return (
    <div className="flex flex-col gap-4">
      {/* Search / filter panel */}
      <div className="bg-[#18181b] border border-[#27272a] rounded-2xl overflow-hidden">
        <button
          onClick={() => setPanelOpen((v) => !v)}
          className="w-full flex items-center gap-2 px-4 py-3 bg-transparent border-none cursor-pointer text-left"
        >
          <i className="fas fa-sliders text-indigo-400"></i>
          <span className="text-[13px] font-bold text-white">ძებნა და ფილტრი</span>
          {activeCount > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
              {activeCount}
            </span>
          )}
          <i className={`fas fa-chevron-${panelOpen ? 'up' : 'down'} text-[11px] text-[#71717a] ml-auto`}></i>
        </button>

        {panelOpen && (
          <div className="px-4 pb-4 flex flex-col gap-4 border-t border-[#27272a] pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-widest text-[#52525b] font-semibold m-0 mb-2">საგანი</p>
                <select
                  className="tc-input"
                  value={filters.subject}
                  onChange={(e) => setFilters((f) => ({ ...f, subject: e.target.value }))}
                >
                  <option value="">ყველა საგანი</option>
                  {SUBJECT_GROUPS.map((g) => (
                    <optgroup key={g.label} label={g.label}>
                      {g.subjects.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-widest text-[#52525b] font-semibold m-0 mb-2">ლოკაცია</p>
                <LocationSelector
                  value={filters.location}
                  onChange={(v) => setFilters((f) => ({ ...f, location: v }))}
                  allowAll
                />
              </div>
            </div>

            <FilterGroup label="მოსწავლის დონე">
              {TARGET_AUDIENCES.map((a) => (
                <Pill key={a.key} icon={a.icon} active={filters.grades.includes(a.key)} onClick={() => toggleIn('grades', a.key)}>
                  {a.label}
                </Pill>
              ))}
            </FilterGroup>

            <FilterGroup label="ფორმატი">
              {FORMATS.filter((f) => f.key !== 'both').map((f) => (
                <Pill key={f.key} icon={f.icon} active={filters.formats.includes(f.key)} onClick={() => toggleIn('formats', f.key)}>
                  {f.label}
                </Pill>
              ))}
            </FilterGroup>

            <div>
              <p className="text-[11px] uppercase tracking-widest text-[#52525b] font-semibold m-0 mb-2">
                ფასი (₾/სთ)
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  placeholder="დან"
                  className="tc-input w-24"
                  value={filters.priceMin}
                  onChange={(e) => setFilters((f) => ({ ...f, priceMin: e.target.value }))}
                />
                <span className="text-[#52525b]">—</span>
                <input
                  type="number"
                  min={0}
                  placeholder="მდე"
                  className="tc-input w-24"
                  value={filters.priceMax}
                  onChange={(e) => setFilters((f) => ({ ...f, priceMax: e.target.value }))}
                />
              </div>
            </div>

            {/* Search by availability — day(s) + time range */}
            <div className="border-t border-[#27272a] pt-4">
              <p className="text-[11px] uppercase tracking-widest text-[#52525b] font-semibold m-0 mb-2">
                <i className="fas fa-calendar-week text-emerald-400 mr-1.5"></i>თავისუფალი დროით ძებნა
              </p>
              <div className="flex flex-wrap gap-2 mb-3">
                {DAYS_SHORT.map((d, i) => (
                  <Pill key={d} active={filters.days.includes(i)} onClick={() => toggleIn('days', i)}>
                    {d}
                  </Pill>
                ))}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  className="tc-input w-28"
                  value={filters.hourStart}
                  onChange={(e) => setFilters((f) => ({ ...f, hourStart: e.target.value }))}
                >
                  <option value="">დან</option>
                  {HOURS.map((h) => (
                    <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                  ))}
                </select>
                <span className="text-[#52525b]">—</span>
                <select
                  className="tc-input w-28"
                  value={filters.hourEnd}
                  onChange={(e) => setFilters((f) => ({ ...f, hourEnd: e.target.value }))}
                >
                  <option value="">მდე</option>
                  {[...HOURS, 22].map((h) => (
                    <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                  ))}
                </select>
              </div>
            </div>

            {activeCount > 0 && (
              <button
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="self-start text-[12px] px-3 py-1.5 rounded-lg border border-[#3f3f46] hover:border-[#52525b] text-[#a1a1aa] bg-transparent cursor-pointer"
              >
                <i className="fas fa-xmark mr-1.5"></i>ფილტრის გასუფთავება
              </button>
            )}
          </div>
        )}
      </div>

      {activeCount > 0 && (
        <p className="text-[12px] text-[#71717a] m-0 -mt-1 px-1">
          ნაპოვნია {filtered.length} შედეგი
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-white/[0.03] border border-[#27272a] flex items-center justify-center mb-3">
            <i className="fas fa-filter text-[#3f3f46]"></i>
          </div>
          <p className="text-[13px] text-[#71717a] m-0">ამ ფილტრით პოსტები ვერ მოიძებნა</p>
          <button
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="mt-3 px-4 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 text-[12px] font-semibold cursor-pointer"
          >
            ფილტრის გასუფთავება
          </button>
        </div>
      ) : (
        filtered.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            addToast={addToast}
            onPostUpdated={handlePostUpdated}
            onPostRemoved={handlePostRemoved}
          />
        ))
      )}
    </div>
  );
}

function FilterGroup({ label, children }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-widest text-[#52525b] font-semibold m-0 mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
