import { useState, useEffect } from 'react';

// Feature 5: senior-friendly "Call Back" request. Collects the student's name,
// phone, and preferred time, then opens WhatsApp to the teacher with a polite
// pre-filled payload.
export default function CallBackModal({ teacherName, teacherWhatsapp, onClose, addToast }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [time, setTime] = useState('');

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = () => {
    if (!name.trim() || !phone.trim()) {
      addToast?.('შეავსეთ სახელი და ტელეფონი', 'error');
      return;
    }
    if (!teacherWhatsapp) {
      addToast?.('ამ მასწავლებელს WhatsApp არ აქვს მითითებული', 'error');
      return;
    }
    const msg = `გამარჯობა! მოსწავლე ${name.trim()}-ს სურს თქვენთან დაკავშირება ნომერზე: ${phone.trim()}.${
      time.trim() ? ` სასურველი დრო: ${time.trim()}.` : ''
    }`;
    const url = `https://wa.me/${String(teacherWhatsapp).replace(/[^\d]/g, '')}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    addToast?.('მოთხოვნა გაიგზავნა WhatsApp-ით ✓');
    onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#111113] border border-[#27272a] rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 p-5 border-b border-[#27272a]">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <i className="fas fa-phone-volume text-emerald-400"></i>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-white font-bold text-lg m-0 leading-tight">ზარის მოთხოვნა</h2>
            <p className="text-[12px] text-[#71717a] m-0 mt-0.5 truncate">
              {teacherName ? `მასწავლებელი: ${teacherName}` : 'დატოვეთ თქვენი კონტაქტი'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#71717a] hover:text-white hover:bg-white/5 border-none bg-transparent cursor-pointer"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="p-5 flex flex-col gap-3">
          <div>
            <label className="block text-[12px] text-[#71717a] mb-1.5 font-medium">თქვენი სახელი</label>
            <input className="tc-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="სახელი" autoFocus />
          </div>
          <div>
            <label className="block text-[12px] text-[#71717a] mb-1.5 font-medium">ტელეფონის ნომერი</label>
            <input
              className="tc-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+995 5XX XX XX XX"
              inputMode="tel"
            />
          </div>
          <div>
            <label className="block text-[12px] text-[#71717a] mb-1.5 font-medium">სასურველი დრო (არასავალდებულო)</label>
            <input
              className="tc-input"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              placeholder="მაგ: ხვალ 18:00-ის შემდეგ"
            />
          </div>
        </div>

        <div className="p-5 border-t border-[#27272a]">
          <button
            onClick={submit}
            className="w-full py-3 rounded-xl text-white text-[14px] font-bold border-none cursor-pointer flex items-center justify-center gap-2"
            style={{ background: '#25D366' }}
          >
            <i className="fab fa-whatsapp text-[16px]"></i>
            ზარის მოთხოვნის გაგზავნა
          </button>
        </div>
      </div>
    </div>
  );
}
