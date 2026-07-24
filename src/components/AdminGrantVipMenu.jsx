import { useState, useRef, useEffect } from 'react';
import { MoreVertical, X, Crown, Star } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../utils/api';

const PRESETS = [
  { label: '1 კვირა', days: 7 },
  { label: '1 თვე', days: 30 },
  { label: '3 თვე', days: 90 },
];

// Admin-only 3-dots menu → Grant VIP / VIP+ with a custom duration picker.
// Renders nothing for non-admins.
export default function AdminGrantVipMenu({ teacherId, addToast, onGranted }) {
  const { user, token } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [tier, setTier] = useState(null); // null | 'vip' | 'vip_plus'
  const [days, setDays] = useState(7);
  const [submitting, setSubmitting] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDown = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenuOpen(false);
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  if (user?.role !== 'admin') return null;

  const openModal = (t) => {
    setTier(t);
    setDays(7);
    setMenuOpen(false);
  };

  const grant = async () => {
    const d = Math.floor(Number(days));
    if (!Number.isFinite(d) || d < 1 || d > 365) {
      addToast?.('ხანგრძლივობა უნდა იყოს 1-დან 365 დღემდე', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const data = await apiFetch(`/admin/teachers/${teacherId}/grant-vip`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tier, days: d }),
      });
      addToast?.(data.message || 'მინიჭებულია ✓');
      onGranted?.(data);
      setTier(null);
    } catch (err) {
      addToast?.(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const tierLabel = tier === 'vip_plus' ? 'VIP+' : 'VIP';

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          title="ადმინის მოქმედებები"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#27272a] bg-white/[0.03] text-[#a1a1aa] hover:text-white hover:bg-white/[0.08] cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <MoreVertical size={18} />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-full mt-2 min-w-[190px] p-1.5 rounded-xl bg-[#111113] border border-[#27272a] shadow-xl shadow-black/40 flex flex-col gap-0.5 z-40 animate-fade-in"
          >
            <p className="text-[10px] uppercase tracking-widest text-[#52525b] font-semibold px-2.5 pt-1 pb-1.5">
              ადმინი
            </p>
            <button
              onClick={() => openModal('vip')}
              role="menuitem"
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-semibold text-[#d4d4d8] hover:text-white hover:bg-white/5 bg-transparent border-none cursor-pointer text-left"
            >
              <Star size={15} className="text-indigo-400" />
              VIP-ის მინიჭება
            </button>
            <button
              onClick={() => openModal('vip_plus')}
              role="menuitem"
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-semibold text-[#d4d4d8] hover:text-white hover:bg-white/5 bg-transparent border-none cursor-pointer text-left"
            >
              <Crown size={15} className="text-fuchsia-400" />
              VIP+-ის მინიჭება
            </button>
          </div>
        )}
      </div>

      {/* Duration picker modal */}
      {tier && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => !submitting && setTier(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
          <div
            className="relative w-full max-w-sm rounded-2xl bg-[#111113] border border-[#27272a] p-6 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setTier(null)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-[#71717a] hover:text-white hover:bg-white/5 border-none bg-transparent cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-2 mb-1">
              {tier === 'vip_plus' ? (
                <Crown size={20} className="text-fuchsia-400" />
              ) : (
                <Star size={20} className="text-indigo-400" />
              )}
              <h2 className="text-lg font-bold text-white m-0">{tierLabel}-ის მინიჭება</h2>
            </div>
            <p className="text-[13px] text-[#a1a1aa] m-0 mb-5">აირჩიეთ ხანგრძლივობა</p>

            <div className="grid grid-cols-3 gap-2 mb-3">
              {PRESETS.map((p) => (
                <button
                  key={p.days}
                  onClick={() => setDays(p.days)}
                  className={`py-2.5 rounded-xl border text-[13px] font-bold cursor-pointer transition-all ${
                    Number(days) === p.days
                      ? 'border-indigo-500 bg-indigo-500/15 text-indigo-300'
                      : 'border-[#27272a] bg-black/20 text-[#a1a1aa] hover:border-[#3f3f46]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <label className="block text-[12px] text-[#71717a] font-semibold mb-1.5">
              ან მიუთითეთ დღეების რაოდენობა
            </label>
            <input
              type="number"
              min={1}
              max={365}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className="tc-input mb-5"
            />

            <button onClick={grant} disabled={submitting} className="btn-brand">
              {submitting ? 'ინახება...' : `${tierLabel}-ის მინიჭება (${Math.floor(Number(days)) || 0} დღე)`}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
