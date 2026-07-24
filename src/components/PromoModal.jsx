import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import { useAuth } from '../hooks/useAuth';

const SUGGESTIONS = ['პირველი გაკვეთილი უფასოდ', '-20% სექტემბრამდე', 'უფასო საკონსულტაციო', '-50% პირველ 5 მოსწავლეს'];

function toDateInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export default function PromoModal({ post, onClose, onSaved, addToast }) {
  const { token } = useAuth();
  const [tag, setTag] = useState(post?.promo?.tag || '');
  const [expiresAt, setExpiresAt] = useState(toDateInput(post?.promo?.expiresAt));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !saving && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [saving, onClose]);

  const save = async (clear = false) => {
    setSaving(true);
    try {
      const data = await apiFetch(`/posts/${post.id}/promo`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          promoTag: clear ? '' : tag.trim(),
          promoExpiresAt: clear ? null : expiresAt || null,
        }),
      });
      onSaved?.(data.promo);
      addToast?.(data.message);
      onClose?.();
    } catch (err) {
      addToast?.(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}
      onClick={() => !saving && onClose?.()}
    >
      <div
        className="w-full max-w-md bg-[#111113] border border-[#27272a] rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-[#27272a]">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
            <i className="fas fa-tags text-amber-400"></i>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-white font-bold text-lg m-0 leading-tight">პრომო ბანერი</h2>
            <p className="text-[12px] text-[#71717a] m-0 mt-0.5 truncate">{post?.title}</p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#71717a] hover:text-white hover:bg-white/5 border-none bg-transparent cursor-pointer disabled:opacity-40"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Live preview */}
          <div className="flex items-center justify-center py-3 rounded-xl bg-black/30 border border-[#27272a] min-h-[52px]">
            {tag.trim() ? (
              <span className="promo-badge">
                <i className="fas fa-fire"></i>
                {tag.trim()}
              </span>
            ) : (
              <span className="text-[12px] text-[#52525b]">ბანერი ცარიელია</span>
            )}
          </div>

          {/* Text */}
          <div>
            <label className="block text-[12px] text-[#71717a] mb-2 font-medium">პრომო ტექსტი</label>
            <input
              type="text"
              maxLength={120}
              className="tc-input"
              placeholder="მაგ: პირველი გაკვეთილი უფასოდ"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              autoFocus
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setTag(s)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-white/[0.03] border border-[#27272a] text-[#a1a1aa] hover:border-amber-500/40 hover:text-amber-300 cursor-pointer transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Expiry */}
          <div>
            <label className="block text-[12px] text-[#71717a] mb-2 font-medium">
              ვადის გასვლა (არასავალდებულო)
            </label>
            <input
              type="date"
              min={today}
              className="tc-input"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
            <p className="text-[11px] text-[#52525b] mt-1 ml-1">ცარიელი = უვადო</p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-[#27272a] flex items-center gap-2">
          {post?.promo && (
            <button
              onClick={() => save(true)}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl border border-[#3f3f46] hover:border-red-500/40 text-[#a1a1aa] hover:text-red-400 bg-transparent text-[13px] font-semibold cursor-pointer transition-colors disabled:opacity-50"
            >
              წაშლა
            </button>
          )}
          <button
            onClick={() => save(false)}
            disabled={saving || !tag.trim()}
            className="ml-auto px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-[#1a1205] text-[13px] font-bold border-none cursor-pointer transition-colors disabled:opacity-50"
          >
            {saving ? 'ინახება...' : 'შენახვა'}
          </button>
        </div>
      </div>
    </div>
  );
}
