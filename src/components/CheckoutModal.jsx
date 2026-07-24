import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { PAYMENTS_ENABLED } from '../utils/premium';

// Package catalogue (prices in ₾, matching the backend). Mock checkout — no
// real charge is made.
const PACKAGES = [
  {
    type: 'standard',
    label: 'Standard',
    price: 0,
    tagline: 'ჩვეულებრივი გამოქვეყნება',
    icon: 'fa-file-lines',
    perks: ['კატალოგში ჩვეულებრივი ხილვადობა', '30 დღიანი აქტიური ვადა'],
    ring: 'border-[#3f3f46]',
    ringActive: 'border-zinc-400 bg-zinc-400/10',
    dot: 'text-zinc-300',
  },
  {
    type: 'vip',
    label: 'VIP',
    price: 15,
    tagline: 'გამორჩეული ხილვადობა',
    icon: 'fa-star',
    perks: ['ლენტის ზედა ნაწილში', 'ნეონის მბზინავი ბორდერი', 'VIP ბეჯი'],
    ring: 'border-indigo-500/30',
    ringActive: 'border-indigo-500 bg-indigo-500/10',
    dot: 'text-indigo-400',
  },
  {
    type: 'vip_plus',
    label: 'VIP+',
    price: 30,
    tagline: 'მაქსიმალური ხილვადობა',
    icon: 'fa-crown',
    perks: ['ლენტის ყველაზე ზემოთ', 'პრემიუმ მბზინავი ბორდერი', 'VIP+ ბეჯი', 'პრიორიტეტული განთავსება'],
    ring: 'border-fuchsia-500/30',
    ringActive: 'border-fuchsia-500 bg-fuchsia-500/10',
    dot: 'text-fuchsia-400',
  },
];

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('ka-GE', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function CheckoutModal({ post, initialPackage, onClose, onUpgraded, addToast }) {
  const { token } = useAuth();
  const [selected, setSelected] = useState(initialPackage || post?.packageType || 'vip');
  const [phase, setPhase] = useState('select'); // 'select' | 'processing' | 'success'
  const [result, setResult] = useState(null);

  // Escape closes the modal while choosing (not mid-payment).
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && phase !== 'processing') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, onClose]);

  const selectedPkg = PACKAGES.find((p) => p.type === selected) || PACKAGES[1];

  const handleConfirm = async () => {
    setPhase('processing');
    try {
      const data = await apiFetch('/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ postId: post.id, packageType: selected }),
      });
      setResult(data.post);
      setPhase('success');
      onUpgraded?.(post.id, {
        packageType: data.post.packageType,
        activeUntil: data.post.activeUntil,
        effectivePackage: data.post.effectivePackage,
      });
      addToast?.(data.message);
    } catch (err) {
      addToast?.(err.message, 'error');
      setPhase('select');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}
      onClick={() => phase !== 'processing' && onClose?.()}
    >
      <div
        className="w-full max-w-lg bg-[#111113] border border-[#27272a] rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {phase === 'success' ? (
          <SuccessView result={result} onClose={onClose} />
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start gap-3 p-5 border-b border-[#27272a]">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/25 to-fuchsia-500/25 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <i className="fas fa-bolt text-indigo-300"></i>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-white font-bold text-lg m-0 leading-tight">აირჩიეთ პაკეტი</h2>
                <p className="text-[12px] text-[#71717a] m-0 mt-0.5 truncate">
                  პოსტი: <span className="text-[#a1a1aa]">{post?.title}</span>
                </p>
              </div>
              <button
                onClick={onClose}
                disabled={phase === 'processing'}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#71717a] hover:text-white hover:bg-white/5 border-none bg-transparent cursor-pointer disabled:opacity-40"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Package options */}
            <div className="p-5 flex flex-col gap-3 max-h-[52vh] overflow-y-auto">
              {PACKAGES.map((pkg) => {
                const active = selected === pkg.type;
                return (
                  <button
                    key={pkg.type}
                    onClick={() => setSelected(pkg.type)}
                    disabled={phase === 'processing'}
                    className={`text-left w-full rounded-xl border p-4 transition-all cursor-pointer bg-[#18181b] disabled:cursor-not-allowed ${
                      active ? pkg.ringActive : `${pkg.ring} hover:border-[#52525b]`
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <i className={`fas ${pkg.icon} ${pkg.dot} text-[15px]`}></i>
                      <span className="text-white font-bold text-[15px]">{pkg.label}</span>
                      <span className="ml-auto text-white font-bold text-[15px]">
                        {pkg.price === 0 ? 'უფასო' : `₾${pkg.price}`}
                        {pkg.price !== 0 && <span className="text-[11px] text-[#71717a] font-medium">/თვე</span>}
                      </span>
                      <span
                        className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                          active ? 'border-current ' + pkg.dot : 'border-[#3f3f46]'
                        }`}
                      >
                        {active && <span className="w-2 h-2 rounded-full bg-current"></span>}
                      </span>
                    </div>
                    <p className="text-[12px] text-[#71717a] m-0 mt-1 ml-[26px]">{pkg.tagline}</p>
                    <ul className="mt-2 ml-[26px] flex flex-col gap-1">
                      {pkg.perks.map((perk) => (
                        <li key={perk} className="text-[12px] text-[#a1a1aa] flex items-center gap-2">
                          <i className={`fas fa-check text-[10px] ${pkg.dot}`}></i>
                          {perk}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>

            {/* Footer / pay */}
            <div className="p-5 border-t border-[#27272a] flex items-center gap-3">
              <div className="text-[12px] text-[#71717a]">
                გადასახდელი:
                <span className="ml-1.5 text-white font-bold text-[15px]">
                  {selectedPkg.price === 0 ? 'უფასო' : `₾${selectedPkg.price}`}
                </span>
              </div>
              {PAYMENTS_ENABLED ? (
                <button
                  onClick={handleConfirm}
                  disabled={phase === 'processing'}
                  className="ml-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:from-indigo-600 hover:to-fuchsia-600 text-white text-[13px] font-bold border-none cursor-pointer transition-all disabled:opacity-60 flex items-center gap-2"
                >
                  {phase === 'processing' ? (
                    <>
                      <i className="fas fa-circle-notch fa-spin"></i>
                      მუშავდება...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-lock text-[11px]"></i>
                      გადახდის დადასტურება
                    </>
                  )}
                </button>
              ) : (
                <button
                  disabled
                  title="ონლაინ გადახდები მალე ჩაირთვება"
                  className="ml-auto px-6 py-2.5 rounded-xl bg-amber-500/15 text-amber-300 text-[13px] font-bold border border-amber-500/30 cursor-not-allowed"
                >
                  ⏳ მალე დაემატება
                </button>
              )}
            </div>
            <p className="text-[10px] text-[#3f3f46] text-center pb-3 m-0">
              {PAYMENTS_ENABLED ? (
                <>
                  <i className="fas fa-shield-halved mr-1"></i>
                  სატესტო გადახდა — რეალური თანხა არ ჩამოიჭრება
                </>
              ) : (
                <>
                  <i className="fas fa-gift mr-1"></i>
                  VIP-ის უფასოდ მისაღებად გამოიყენეთ რეფერალური სისტემა
                </>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function SuccessView({ result, onClose }) {
  const label =
    result?.packageType === 'vip_plus' ? 'VIP+' : result?.packageType === 'vip' ? 'VIP' : 'Standard';
  return (
    <div className="p-8 flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center mb-4 shadow-[0_0_30px_-4px_rgba(16,185,129,0.6)]">
        <i className="fas fa-check text-emerald-400 text-2xl"></i>
      </div>
      <h2 className="text-white font-bold text-xl m-0">გადახდა წარმატდა! 🎉</h2>
      <p className="text-[13px] text-[#a1a1aa] m-0 mt-2 leading-relaxed">
        თქვენი პოსტი ახლა{' '}
        <span
          className={`vip-badge ${
            result?.packageType === 'vip_plus' ? 'vip-badge-vip-plus' : 'vip-badge-vip'
          }`}
        >
          <i className={`fas ${result?.packageType === 'vip_plus' ? 'fa-crown' : 'fa-star'}`}></i>
          {label}
        </span>{' '}
        პაკეტზეა და გამორჩეულად გამოჩნდება კატალოგში.
      </p>
      {result?.activeUntil && (
        <p className="text-[12px] text-[#71717a] m-0 mt-3">
          <i className="far fa-calendar-check mr-1.5"></i>
          აქტიურია {formatDate(result.activeUntil)}-მდე
        </p>
      )}
      <button
        onClick={onClose}
        className="mt-6 w-full py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-[13px] font-bold border-none cursor-pointer transition-colors"
      >
        მშვენიერია, დასრულება
      </button>
    </div>
  );
}
