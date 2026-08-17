import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../utils/api';
import { useAuth } from '../hooks/useAuth';

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  }
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('ka-GE', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Precise remaining-time label (e.g. "9 დღე და 14 საათი"), computed against the
// server-issued expiry timestamp. Display only — VIP ACCESS is validated on the
// server (stats.vipActive derives from vip_until > server NOW()); this never
// grants access on its own.
function formatRemaining(iso) {
  if (!iso) return '';
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'ვადა ამოიწურა';
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days} დღე და ${hours} საათი`;
  if (hours > 0) return `${hours} საათი და ${minutes} წუთი`;
  return `${minutes} წუთი`;
}

export default function ReferralPage({ addToast }) {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch('/referrals/me', { headers: { Authorization: `Bearer ${token}` } });
      setStats(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  // Re-render every minute so the live VIP countdown stays accurate.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const referralLink = stats ? `${window.location.origin}/register?ref=${stats.referralCode}` : '';

  const copy = async (text, label) => {
    const ok = await copyToClipboard(text);
    addToast?.(ok ? `${label} დაკოპირდა ✓` : 'კოპირება ვერ მოხერხდა', ok ? 'success' : 'error');
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 flex flex-col items-center text-center">
        <i className="fas fa-circle-notch fa-spin text-indigo-400 text-2xl mb-3"></i>
        <p className="text-[13px] text-[#71717a] m-0">იტვირთება...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 flex flex-col items-center text-center">
        <p className="text-[13px] text-[#f87171] font-semibold m-0">{error}</p>
        <button
          onClick={load}
          className="mt-4 px-4 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 text-[12px] font-semibold cursor-pointer"
        >
          ხელახლა ცდა
        </button>
      </div>
    );
  }

  const { referralCode, invitedCount, threshold, rewardDays, towardNext, remaining, rewardsEarned, vipUntil, vipActive } =
    stats;
  const progressPct = Math.round((towardNext / threshold) * 100);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center shrink-0">
          <i className="fas fa-gift text-indigo-400"></i>
        </div>
        <div>
          <h1 className="text-white font-bold text-xl m-0 leading-tight">რეფერალები & ჯილდოები</h1>
          <p className="text-[12px] text-[#71717a] m-0 mt-0.5">
            მოიწვიე {threshold} მასწავლებელი და მიიღე {rewardDays} დღიანი უფასო VIP
          </p>
        </div>
      </div>

      {/* VIP status banner */}
      <div
        className={`rounded-2xl p-4 flex items-center gap-3 border ${
          vipActive
            ? 'border-fuchsia-500/40 bg-gradient-to-r from-fuchsia-500/10 to-indigo-500/10 shadow-[0_0_24px_-6px_rgba(59,130,246,0.5)]'
            : 'border-[#27272a] bg-[#18181b]'
        }`}
      >
        <i className={`fas fa-crown text-xl ${vipActive ? 'text-fuchsia-400' : 'text-[#3f3f46]'}`}></i>
        <div className="min-w-0">
          {vipActive ? (
            <>
              <p className="text-[13px] font-bold text-white m-0">
                VIP აქტიურია: {formatRemaining(vipUntil)} 🎉
              </p>
              <p className="text-[12px] text-[#a1a1aa] m-0 mt-0.5">
                მოქმედებს {formatDate(vipUntil)}-მდე — თქვენი პოსტები გამორჩეულად ჩანს კატალოგში
              </p>
            </>
          ) : (
            <>
              <p className="text-[13px] font-bold text-[#a1a1aa] m-0">VIP სტატუსი არააქტიურია</p>
              <p className="text-[12px] text-[#71717a] m-0 mt-0.5">
                მოიწვიე კიდევ {remaining} მასწავლებელი უფასო VIP-ის გასახსნელად
              </p>
            </>
          )}
        </div>
      </div>

      {/* Referral code + link */}
      <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-5 flex flex-col gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-[#52525b] font-semibold m-0 mb-2">
            თქვენი რეფერალური კოდი
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-black/40 border border-indigo-500/30 rounded-xl px-4 py-3 text-indigo-300 font-mono text-lg tracking-[0.3em] font-bold text-center">
              {referralCode}
            </code>
            <button
              onClick={() => copy(referralCode, 'კოდი')}
              title="კოდის კოპირება"
              className="w-11 h-11 shrink-0 flex items-center justify-center rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 cursor-pointer transition-colors"
            >
              <i className="fas fa-copy"></i>
            </button>
          </div>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-widest text-[#52525b] font-semibold m-0 mb-2">
            რეფერალური ბმული
          </p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={referralLink}
              onFocus={(e) => e.target.select()}
              className="tc-input flex-1 text-[12px] text-[#a1a1aa]"
            />
            <button
              onClick={() => copy(referralLink, 'ბმული')}
              title="ბმულის კოპირება"
              className="w-11 h-11 shrink-0 flex items-center justify-center rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 cursor-pointer transition-colors"
            >
              <i className="fas fa-link"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Progress toward reward */}
      <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-bold text-white m-0">
            <i className="fas fa-user-plus text-emerald-400 mr-2"></i>
            მოწვეული მასწავლებლები
          </p>
          <span className="text-[13px] font-bold text-white">
            {towardNext} <span className="text-[#52525b]">/ {threshold}</span>
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-3 rounded-full bg-black/40 border border-[#27272a] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          ></div>
        </div>

        <div className="flex items-center justify-between text-[12px]">
          <span className="text-[#71717a]">
            სულ მოწვეული: <span className="text-white font-semibold">{invitedCount}</span>
          </span>
          <span className="text-[#71717a]">
            {remaining === threshold
              ? `კიდევ ${threshold} შემდეგ ჯილდომდე`
              : `კიდევ ${remaining} ჯილდომდე`}
          </span>
        </div>

        {rewardsEarned > 0 && (
          <div className="mt-1 flex items-center gap-2 text-[12px] text-fuchsia-300 bg-fuchsia-500/10 border border-fuchsia-500/25 rounded-xl px-3 py-2">
            <i className="fas fa-award"></i>
            მოპოვებული ჯილდო: {rewardsEarned} × {rewardDays} დღიანი VIP
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="text-[12px] text-[#71717a] bg-white/[0.02] border border-[#27272a] rounded-2xl p-4 leading-relaxed">
        <p className="font-semibold text-[#a1a1aa] m-0 mb-2">
          <i className="fas fa-circle-info text-indigo-400 mr-1.5"></i>როგორ მუშაობს
        </p>
        <ol className="m-0 pl-5 flex flex-col gap-1">
          <li>გაუზიარეთ თქვენი კოდი ან ბმული სხვა მასწავლებლებს</li>
          <li>ისინი რეგისტრირდებიან თქვენი კოდით მასწავლებლად</li>
          <li>ყოველ {threshold} მოწვეულ მასწავლებელზე იღებთ {rewardDays} დღიან უფასო VIP სტატუსს</li>
        </ol>
      </div>
    </div>
  );
}
