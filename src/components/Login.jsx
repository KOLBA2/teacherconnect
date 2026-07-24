import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import AuthLayout from './AuthLayout';
import ForgotPasswordModal from './ForgotPasswordModal';

export default function Login({ addToast }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [accessNotice, setAccessNotice] = useState(null); // { type: 'pending' | 'rejected' | 'blocked', message }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAccessNotice(null);

    if (!email.trim() || !password) {
      addToast('გთხოვთ შეავსოთ ყველა ველი', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      addToast('წარმატებით შეხვედით სისტემაში ✓');
    } catch (err) {
      if (err.status === 403) {
        setAccessNotice({
          type: ['rejected', 'blocked'].includes(err.reason) ? err.reason : 'pending',
          message: err.message,
        });
      } else {
        addToast(err.message || 'შესვლა ვერ მოხერხდა', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      {accessNotice && (
        <div
          role="alert"
          className={`mb-5 p-4 rounded-xl border text-sm leading-relaxed flex items-start gap-3 ${
            accessNotice.type === 'pending'
              ? 'bg-[rgba(234,179,8,0.08)] border-[rgba(234,179,8,0.3)] text-[#facc15]'
              : 'bg-[rgba(239,68,68,0.08)] border-[rgba(239,68,68,0.3)] text-[#f87171]'
          }`}
        >
          <i
            className={`fas ${
              accessNotice.type === 'pending'
                ? 'fa-clock'
                : accessNotice.type === 'blocked'
                ? 'fa-ban'
                : 'fa-circle-xmark'
            } text-base mt-0.5`}
          ></i>
          <div>
            <p className="font-semibold mb-0.5">
              {accessNotice.type === 'rejected'
                ? 'რეგისტრაცია უარყოფილია'
                : accessNotice.type === 'blocked'
                ? 'ანგარიში დაბლოკილია'
                : 'ანგარიში მოლოდინის რეჟიმშია'}
            </p>
            <p className="opacity-90">{accessNotice.message}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="email"
          placeholder="ელ-ფოსტა"
          className="tc-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <input
          type="password"
          placeholder="პაროლი"
          className="tc-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        <div className="flex justify-end -mt-1">
          <button
            type="button"
            onClick={() => setForgotOpen(true)}
            className="text-[13px] font-semibold text-indigo-400 hover:text-indigo-300 bg-transparent border-none cursor-pointer p-0 focus-visible:outline-none focus-visible:underline"
          >
            დაგავიწყდა პაროლი?
          </button>
        </div>
        <button type="submit" className="btn-brand" disabled={isSubmitting}>
          {isSubmitting ? 'იტვირთება...' : 'შესვლა'}
        </button>
      </form>

      {forgotOpen && (
        <ForgotPasswordModal onClose={() => setForgotOpen(false)} addToast={addToast} />
      )}
    </AuthLayout>
  );
}
