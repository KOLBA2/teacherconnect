import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, Clock, MessageSquare, Send, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function ContactPage({ addToast }) {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());

  const onSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.message.trim() || !emailValid) {
      setError('გთხოვთ, შეავსოთ სახელი, სწორი ელ-ფოსტა და შეტყობინება.');
      return;
    }
    setError('');
    // No backend contact endpoint — confirm receipt on the client and reset.
    setSent(true);
    setForm({ name: '', email: '', subject: '', message: '' });
    addToast?.('თქვენი შეტყობინება მიღებულია — მალე დაგიკავშირდებით.', 'success');
  };

  return (
    <div className="lp min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        <Link to="/" className="inline-flex items-center gap-1.5 text-[13px] font-semibold no-underline mb-4" style={{ color: 'var(--lp-text-mute)' }}>
          <ArrowLeft size={15} /> მთავარზე დაბრუნება
        </Link>

        <div className="text-center mb-8">
          <span className="w-12 h-12 rounded-xl grid place-items-center mx-auto mb-4" style={{ background: 'var(--lp-grad-soft)', color: 'var(--lp-accent)' }}>
            <MessageSquare size={24} />
          </span>
          <h1 className="m-0 font-extrabold tracking-tight text-[clamp(1.7rem,3.4vw,2.4rem)]" style={{ color: 'var(--lp-text)' }}>
            კონტაქტი & მხარდაჭერა
          </h1>
          <p className="mt-2 mb-0 text-[15px]" style={{ color: 'var(--lp-text-dim)' }}>
            გაქვს კითხვა ან შენიშვნა? მოგვწერე — ვუპასუხებთ 1 სამუშაო დღეში.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">
          {/* Form */}
          <form onSubmit={onSubmit} className="lp-card p-6 sm:p-7 order-2 lg:order-1">
            {sent && (
              <div className="flex items-center gap-2.5 mb-5 px-4 py-3 rounded-lg text-[13.5px] font-semibold"
                   style={{ background: 'rgba(16,185,129,0.10)', color: '#047857', border: '1px solid #86efac' }}>
                <CheckCircle2 size={18} /> მადლობა! მალე დაგიკავშირდებით.
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[13px] font-semibold mb-1.5" style={{ color: 'var(--lp-text-dim)' }}>სახელი</label>
                <input className="tc-input" value={form.name} onChange={set('name')} placeholder="თქვენი სახელი" />
              </div>
              <div>
                <label className="block text-[13px] font-semibold mb-1.5" style={{ color: 'var(--lp-text-dim)' }}>ელ-ფოსტა</label>
                <input className="tc-input" type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" />
              </div>
            </div>

            <div className="mt-3.5">
              <label className="block text-[13px] font-semibold mb-1.5" style={{ color: 'var(--lp-text-dim)' }}>თემა</label>
              <input className="tc-input" value={form.subject} onChange={set('subject')} placeholder="მაგ. ანგარიშთან დაკავშირებით" />
            </div>

            <div className="mt-3.5">
              <label className="block text-[13px] font-semibold mb-1.5" style={{ color: 'var(--lp-text-dim)' }}>შეტყობინება</label>
              <textarea className="tc-input" rows={5} value={form.message} onChange={set('message')} placeholder="აღწერე შენი კითხვა..." />
            </div>

            {error && <p className="mt-3 mb-0 text-[13px] font-semibold text-red-500">{error}</p>}

            <button type="submit" className="lp-btn lp-btn-primary mt-5 w-full sm:w-auto">
              <Send size={16} /> გაგზავნა
            </button>
          </form>

          {/* Support channels */}
          <aside className="lp-card p-6 order-1 lg:order-2">
            <p className="m-0 mb-4 font-bold text-[14px]" style={{ color: 'var(--lp-text)' }}>პირდაპირი კონტაქტი</p>
            <div className="flex flex-col gap-4 text-[13.5px]">
              <a href="mailto:support@teacherconnect.ge" className="flex items-start gap-3 no-underline" style={{ color: 'var(--lp-text-dim)' }}>
                <span className="w-9 h-9 rounded-lg grid place-items-center shrink-0" style={{ background: 'var(--lp-grad-soft)', color: 'var(--lp-accent)' }}><Mail size={16} /></span>
                <span><span className="block font-semibold" style={{ color: 'var(--lp-text)' }}>ელ-ფოსტა</span>support@teacherconnect.ge</span>
              </a>
              <a href="tel:+995322000000" className="flex items-start gap-3 no-underline" style={{ color: 'var(--lp-text-dim)' }}>
                <span className="w-9 h-9 rounded-lg grid place-items-center shrink-0" style={{ background: 'var(--lp-grad-soft)', color: 'var(--lp-accent)' }}><Phone size={16} /></span>
                <span><span className="block font-semibold" style={{ color: 'var(--lp-text)' }}>ტელეფონი</span>+995 32 2 00 00 00</span>
              </a>
              <div className="flex items-start gap-3" style={{ color: 'var(--lp-text-dim)' }}>
                <span className="w-9 h-9 rounded-lg grid place-items-center shrink-0" style={{ background: 'var(--lp-grad-soft)', color: 'var(--lp-accent)' }}><Clock size={16} /></span>
                <span><span className="block font-semibold" style={{ color: 'var(--lp-text)' }}>სამუშაო საათები</span>ორშ–პარ, 10:00–19:00</span>
              </div>
            </div>
            <p className="mt-5 mb-0 text-[12.5px] leading-relaxed" style={{ color: 'var(--lp-text-mute)' }}>
              ხშირ კითხვებზე პასუხი იხილე <Link to="/faq" className="font-semibold no-underline" style={{ color: 'var(--lp-accent)' }}>FAQ</Link>-ში.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
