// Direct-contact card: prominent phone number + call / WhatsApp / Telegram
// quick actions. Used on the public teacher profile and the booking page.

function digits(v) {
  return (v || '').toString().replace(/\D/g, '');
}

// Normalize any Georgian number to the 995XXXXXXXXX form used by tel:/wa.me/t.me.
function to995(v) {
  let d = digits(v);
  if (!d) return '';
  if (d.startsWith('995')) return d;
  if (d.startsWith('0')) d = d.slice(1);
  return `995${d}`;
}

// Pretty local display: +995 5XX XX XX XX
function formatGeoPhone(raw) {
  let d = digits(raw);
  if (d.startsWith('995')) d = d.slice(3);
  if (d.length === 9) {
    return `+995 ${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 7)} ${d.slice(7, 9)}`;
  }
  return raw;
}

// `premium` (VIP / VIP+) unlocks the WhatsApp + Telegram quick actions. Basic /
// standard accounts show only the raw phone number + a direct Call button.
export default function ContactButtons({ phone, whatsapp, telegram, premium = false, className = '' }) {
  const callNum = to995(phone || whatsapp);
  const waNum = premium ? to995(whatsapp || phone) : '';
  const tgHref = !premium
    ? null
    : telegram
    ? `https://t.me/${String(telegram).replace(/^@+/, '')}`
    : phone || whatsapp
    ? `https://t.me/+${to995(phone || whatsapp)}`
    : null;

  if (!callNum && !waNum && !tgHref) return null;

  const btn =
    'flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-[13px] font-bold no-underline border-none cursor-pointer transition-transform hover:-translate-y-0.5';

  return (
    <div className={`bg-[#18181b] border border-[#27272a] rounded-2xl p-4 flex flex-col gap-3 ${className}`}>
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
          <i className="fas fa-phone text-emerald-400 text-[13px]"></i>
        </span>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-[#71717a] font-semibold m-0">პირდაპირი კონტაქტი</p>
          {phone ? (
            <a href={`tel:+${callNum}`} className="text-[16px] font-bold text-white no-underline tracking-wide">
              {formatGeoPhone(phone)}
            </a>
          ) : (
            <p className="text-[13px] text-[#a1a1aa] m-0">დაუკავშირდით ღილაკებით</p>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        {callNum && (
          <a href={`tel:+${callNum}`} className={`${btn} bg-indigo-500 text-white hover:bg-indigo-600`}>
            <i className="fas fa-phone text-[12px]"></i>დარეკვა
          </a>
        )}
        {waNum && (
          <a
            href={`https://wa.me/${waNum}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`${btn} text-white`}
            style={{ background: '#25D366' }}
          >
            <i className="fab fa-whatsapp text-[14px]"></i>WhatsApp
          </a>
        )}
        {tgHref && (
          <a
            href={tgHref}
            target="_blank"
            rel="noopener noreferrer"
            className={`${btn} text-white`}
            style={{ background: '#229ED9' }}
          >
            <i className="fab fa-telegram text-[14px]"></i>Telegram
          </a>
        )}
      </div>
    </div>
  );
}
