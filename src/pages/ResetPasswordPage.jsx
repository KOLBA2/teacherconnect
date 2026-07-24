import { useState } from 'react';
import { useSearchParams, useNavigate, NavLink } from 'react-router-dom';
import { KeyRound, ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ResetPasswordPage({ addToast }) {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [email, setEmail] = useState(params.get('email') || '');
  const [code, setCode] = useState(params.get('code') || '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!EMAIL_REGEX.test(email.trim())) {
      addToast?.('გთხოვთ მიუთითოთ სწორი ელ-ფოსტა', 'error');
      return;
    }
    if (!/^\d{6}$/.test(code.trim())) {
      addToast?.('კოდი უნდა შედგებოდეს 6 ციფრისგან', 'error');
      return;
    }
    if (password.length < 6) {
      addToast?.('პაროლი უნდა შეიცავდეს მინიმუმ 6 სიმბოლოს', 'error');
      return;
    }
    if (password !== confirm) {
      addToast?.('პაროლები არ ემთხვევა', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(email.trim(), code.trim(), password);
      addToast?.('პაროლი წარმატებით შეიცვალა!', 'success');
      navigate('/login');
    } catch (err) {
      addToast?.(err.message || 'პაროლის შეცვლა ვერ მოხერხდა', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="auth-section">
      <div
        className="glass-panel w-full max-w-md rounded-2xl p-6 md:p-8"
        style={{ border: '1px solid #27272a' }}
      >
        <div className="w-12 h-12 mb-4 rounded-xl bg-indigo-500/15 flex items-center justify-center">
          <KeyRound size={24} className="text-indigo-400" />
        </div>
        <h1 className="text-2xl font-extrabold text-white m-0 mb-2 font-['Noto_Sans_Georgian']">
          ახალი პაროლის დაყენება
        </h1>
        <p className="text-[#a1a1aa] text-sm leading-relaxed mb-6">
          შეიყვანეთ ელ-ფოსტაზე მიღებული 6-ნიშნა კოდი და თქვენი ახალი პაროლი.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-[12px] font-semibold text-[#a1a1aa] mb-1.5">ელ-ფოსტა</label>
            <input
              type="email"
              placeholder="ელ-ფოსტა"
              className="tc-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#a1a1aa] mb-1.5">აღდგენის კოდი</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="6-ნიშნა კოდი"
              className="tc-input tracking-[0.4em] font-mono text-center text-lg"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              autoComplete="one-time-code"
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#a1a1aa] mb-1.5">ახალი პაროლი</label>
            <input
              type="password"
              placeholder="მინიმუმ 6 სიმბოლო"
              className="tc-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#a1a1aa] mb-1.5">გაიმეორეთ პაროლი</label>
            <input
              type="password"
              placeholder="გაიმეორეთ ახალი პაროლი"
              className="tc-input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <button type="submit" className="btn-brand mt-1" disabled={isSubmitting}>
            {isSubmitting ? 'ინახება...' : 'პაროლის შეცვლა'}
          </button>
        </form>

        <NavLink
          to="/login"
          className="mt-5 flex items-center justify-center gap-2 text-[13px] font-semibold text-[#a1a1aa] hover:text-white no-underline transition-colors"
        >
          <ArrowLeft size={15} />
          შესვლის გვერდზე დაბრუნება
        </NavLink>
      </div>
    </section>
  );
}
