import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Check, Compass, Star, Crown, Sparkles } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { PAYMENTS_ENABLED } from '../utils/premium';

const TIERS = [
  {
    key: 'standard',
    name: 'Standard',
    icon: Compass,
    accent: 'zinc',
    monthly: 0,
    tagline: 'დაიწყე უფასოდ',
    features: [
      { t: '1 აქტიური პოსტი', ok: true },
      { t: 'კატალოგში ჩვეულებრივი ხილვადობა', ok: true },
      { t: 'პირდაპირი კონტაქტი (ტელეფონი/WhatsApp)', ok: true },
      { t: 'ხელმისაწვდომობის განრიგი', ok: false },
      { t: 'პრიორიტეტი ძებნაში', ok: false },
    ],
  },
  {
    key: 'vip',
    name: 'VIP',
    icon: Star,
    accent: 'indigo',
    monthly: 15,
    tagline: 'გამორჩეული ხილვადობა',
    features: [
      { t: '5 აქტიური პოსტი', ok: true },
      { t: 'პირდაპირი Phone & WhatsApp ღილაკები', ok: true },
      { t: 'ხელმისაწვდომობის განრიგის მართვა', ok: true },
      { t: 'პრიორიტეტული ranking ძებნაში', ok: true },
      { t: 'VIP ბეჯი + ნეონის ბორდერი', ok: true },
    ],
  },
  {
    key: 'vip_plus',
    name: 'VIP+',
    icon: Crown,
    accent: 'fuchsia',
    monthly: 30,
    tagline: 'Ultimate — მაქსიმალური დომინაცია',
    popular: true,
    features: [
      { t: 'ულიმიტო აქტიური პოსტები', ok: true },
      { t: 'აბსოლუტური ტოპ პრიორიტეტი ძებნაში', ok: true },
      { t: 'ინტერაქტიული booking scheduler', ok: true },
      { t: 'მბზინავი ნეონი + ანიმირებული ბეჯი', ok: true },
      { t: 'ვიდეო-პრეზენტაცია (YouTube/Vimeo)', ok: true },
      { t: 'პრომო ბეჯები ("პირველი გაკვეთილი უფასოდ")', ok: true },
    ],
  },
];

const ACCENT = {
  zinc: { ring: 'border-[#3f3f46]', text: 'text-zinc-300', btn: 'bg-zinc-700 hover:bg-zinc-600 text-white', chip: 'bg-zinc-500/15 text-zinc-300' },
  indigo: { ring: 'border-indigo-500/50', text: 'text-indigo-400', btn: 'bg-indigo-500 hover:bg-indigo-600 text-white', chip: 'bg-indigo-500/15 text-indigo-300' },
  fuchsia: { ring: 'border-fuchsia-500/60', text: 'text-fuchsia-400', btn: 'bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:from-indigo-600 hover:to-fuchsia-600 text-white', chip: 'bg-fuchsia-500/15 text-fuchsia-300' },
};

const RANK = { standard: 0, vip: 1, vip_plus: 2 };

export default function PricingPage({ addToast }) {
  const { user, token, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [billing, setBilling] = useState('monthly');
  const [buying, setBuying] = useState(null);
  const [purchased, setPurchased] = useState(null);

  const isTeacher = user?.role === 'teacher';
  const currentTier = isTeacher ? user?.tier || 'standard' : null;

  const buy = async (tierKey) => {
    if (!isTeacher) {
      navigate(user ? '/' : '/register');
      return;
    }
    setBuying(tierKey);
    try {
      const data = await apiFetch('/payments/mock-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tier: tierKey, billing }),
      });
      addToast?.(data.message);
      await refreshUser();
      setPurchased(tierKey);
    } catch (err) {
      addToast?.(err.message, 'error');
    } finally {
      setBuying(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="text-center flex flex-col items-center gap-3 mb-8">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-bold px-3 py-1 rounded-full bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/25">
          <Sparkles size={13} />
          Tier Economy
        </span>
        <h1 className="text-white font-bold text-3xl m-0">აირჩიე შენი პაკეტი</h1>
        <p className="text-[14px] text-[#a1a1aa] m-0 max-w-lg">
          გახდი გამორჩეული კატალოგში — მეტი პოსტი, პირდაპირი კონტაქტი, განრიგი და მაქსიმალური ხილვადობა.
        </p>

        {/* Billing toggle */}
        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#18181b] border border-[#27272a] mt-2">
          <button
            onClick={() => setBilling('monthly')}
            className={`px-4 py-1.5 rounded-lg text-[13px] font-semibold cursor-pointer border-none transition-colors ${
              billing === 'monthly' ? 'bg-indigo-500 text-white' : 'bg-transparent text-[#a1a1aa]'
            }`}
          >
            თვიური
          </button>
          <button
            onClick={() => setBilling('yearly')}
            className={`px-4 py-1.5 rounded-lg text-[13px] font-semibold cursor-pointer border-none transition-colors inline-flex items-center gap-1.5 ${
              billing === 'yearly' ? 'bg-indigo-500 text-white' : 'bg-transparent text-[#a1a1aa]'
            }`}
          >
            წლიური
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">−17%</span>
          </button>
        </div>
      </div>

      {/* Demo-mode note */}
      {!PAYMENTS_ENABLED && (
        <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex items-start gap-3">
          <i className="fas fa-circle-info text-amber-400 mt-0.5"></i>
          <p className="text-[13px] text-amber-100 m-0 leading-relaxed">
            ონლაინ გადახდები მალე ჩაირთვება! VIP სტატუსის უფასოდ მისაღებად გამოიყენეთ{' '}
            <Link to="/referrals" className="font-bold text-amber-300 underline">
              რეფერალური სისტემა
            </Link>{' '}
            — 10 მოწვეული მასწავლებელი = 1 კვირა უფასო VIP.
          </p>
        </div>
      )}

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TIERS.map((tier) => {
          const a = ACCENT[tier.accent];
          const isCurrent = currentTier === tier.key;
          const canBuy = isTeacher && RANK[tier.key] > RANK[currentTier || 'standard'];
          const Icon = tier.icon;
          return (
            <div
              key={tier.key}
              className={`relative bg-[#18181b] border rounded-2xl p-6 flex flex-col ${a.ring} ${
                tier.popular ? 'post-card-vip-plus' : ''
              }`}
            >
              {tier.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 vip-badge vip-badge-vip-plus">
                  <i className="fas fa-crown"></i>ყველაზე პოპულარული
                </span>
              )}

              <div className="flex items-center gap-2.5 mb-1">
                <Icon size={22} className={a.text} />
                <span className="text-white font-bold text-xl">{tier.name}</span>
                {isCurrent && (
                  <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                    შენი პაკეტი
                  </span>
                )}
              </div>
              <p className="text-[12px] text-[#71717a] m-0 mb-4">{tier.tagline}</p>

              <div className="flex items-end gap-1 mb-5">
                {tier.monthly === 0 ? (
                  // Standard is clearly free.
                  <span className="text-3xl font-bold text-emerald-400">უფასო</span>
                ) : (
                  // Mystery pricing for VIP / VIP+ while online payments are pending.
                  <>
                    <span className="text-3xl font-bold text-white">? ₾</span>
                    <span className="text-[12px] text-[#71717a] mb-1">/{billing === 'yearly' ? 'წელი' : 'თვე'}</span>
                  </>
                )}
              </div>

              <ul className="flex flex-col gap-2.5 mb-6 flex-1">
                {tier.features.map((f) => (
                  <li key={f.t} className={`flex items-start gap-2 text-[13px] ${f.ok ? 'text-[#e4e4e7]' : 'text-[#52525b]'}`}>
                    {f.ok ? (
                      <Check size={16} className={`${a.text} shrink-0 mt-0.5`} strokeWidth={2.5} />
                    ) : (
                      <i className="fas fa-xmark text-[#3f3f46] text-[13px] mt-0.5 w-4 text-center shrink-0"></i>
                    )}
                    {f.t}
                  </li>
                ))}
              </ul>

              {tier.key === 'standard' ? (
                <button
                  disabled
                  className="w-full py-2.5 rounded-xl bg-[#27272a] text-[#71717a] text-[13px] font-bold border-none cursor-default"
                >
                  {isCurrent ? 'მიმდინარე პაკეტი' : 'ბაზისური'}
                </button>
              ) : isCurrent ? (
                <button
                  disabled
                  className="w-full py-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 text-[13px] font-bold border border-emerald-500/25 cursor-default"
                >
                  <i className="fas fa-check mr-1.5"></i>აქტიურია
                </button>
              ) : !PAYMENTS_ENABLED ? (
                <button
                  disabled
                  title="ონლაინ გადახდები მალე ჩაირთვება"
                  className="w-full py-2.5 rounded-xl bg-amber-500/15 text-amber-300 text-[13px] font-bold border border-amber-500/30 cursor-not-allowed"
                >
                  ⏳ მალე დაემატება
                </button>
              ) : (
                <button
                  onClick={() => buy(tier.key)}
                  disabled={buying === tier.key || (isTeacher && !canBuy)}
                  className={`w-full py-2.5 rounded-xl text-[13px] font-bold border-none cursor-pointer transition-all disabled:opacity-50 ${a.btn}`}
                >
                  {buying === tier.key ? (
                    <>
                      <i className="fas fa-circle-notch fa-spin mr-1.5"></i>მუშავდება...
                    </>
                  ) : !isTeacher ? (
                    'გახდი მასწავლებელი'
                  ) : !canBuy ? (
                    'უკვე გაქვთ'
                  ) : (
                    `${tier.name}-ზე გადასვლა`
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {!isTeacher && (
        <p className="text-center text-[12px] text-[#71717a] mt-6">
          <i className="fas fa-circle-info mr-1.5"></i>
          პაკეტების შესაძენად საჭიროა მასწავლებლის ანგარიში.
        </p>
      )}

      {/* Success overlay */}
      {purchased && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}
          onClick={() => setPurchased(null)}
        >
          <div
            className="w-full max-w-sm bg-[#111113] border border-[#27272a] rounded-2xl p-8 text-center flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center mb-4 shadow-[0_0_30px_-4px_rgba(16,185,129,0.6)]">
              <Check size={30} className="text-emerald-400" strokeWidth={3} />
            </div>
            <h2 className="text-white font-bold text-xl m-0">გილოცავთ! 🎉</h2>
            <p className="text-[13px] text-[#a1a1aa] mt-2 mb-6">
              თქვენი პაკეტი{' '}
              <span className="vip-badge vip-badge-vip-plus">
                <i className="fas fa-crown"></i>
                {TIERS.find((t) => t.key === purchased)?.name}
              </span>{' '}
              გააქტიურდა და ყველა ფუნქცია განიბლოკა.
            </p>
            <div className="flex gap-2 w-full">
              <button
                onClick={() => navigate('/profile')}
                className="flex-1 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-[13px] font-bold border-none cursor-pointer"
              >
                სტუდიაში გადასვლა
              </button>
              <button
                onClick={() => setPurchased(null)}
                className="px-4 py-2.5 rounded-xl border border-[#3f3f46] text-[#a1a1aa] bg-transparent text-[13px] font-semibold cursor-pointer"
              >
                დახურვა
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
