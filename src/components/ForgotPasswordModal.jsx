import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NOT_FOUND_MSG =
  'მითითებული ელ-ფოსტით ანგარიში ვერ მოიძებნა. გთხოვთ გადაამოწმოთ მისამართი ან გაიაროთ რეგისტრაცია.';

export default function ForgotPasswordModal({ onClose, addToast }) {
  const { forgotPassword } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'sending' | 'sent'
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!EMAIL_REGEX.test(email.trim())) {
      setError('გთხოვთ მიუთითოთ სწორი ელ-ფოსტა');
      return;
    }
    setStatus('sending');
    try {
      const res = await forgotPassword(email.trim());
      // Only advance to the code-entry step when the account exists (success: true).
      if (res?.success) {
        setStatus('sent');
      } else {
        setStatus('idle');
        setError(res?.message || 'მოთხოვნა ვერ გაიგზავნა. სცადეთ თავიდან.');
      }
    } catch (err) {
      setStatus('idle');
      // 404 = email not registered → stay on the form with a clear inline error.
      setError(err.status === 404 ? NOT_FOUND_MSG : err.message || 'მოთხოვნა ვერ გაიგზავნა. სცადეთ თავიდან.');
    }
  };

  const goToReset = () => {
    onClose?.();
    navigate(`/reset-password?email=${encodeURIComponent(email.trim())}`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
      <div
        className="relative w-full max-w-md rounded-2xl bg-[#111113] border border-[#27272a] p-6 md:p-7 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          title="დახურვა"
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-lg text-[#71717a] hover:text-white hover:bg-white/5 border-none bg-transparent cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <X size={18} />
        </button>

        {status === 'sent' ? (
          <div className="text-center pt-2">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <CheckCircle2 size={30} className="text-emerald-400" />
            </div>
            <p className="text-[#e4e4e7] text-[15px] leading-relaxed mb-6">
              კოდი გაიგზავნა! შეამოწმეთ თქვენი ელ-ფოსტა.
            </p>

            <button onClick={goToReset} className="btn-brand">
              კოდის შეყვანა
            </button>
          </div>
        ) : (
          <>
            <div className="w-12 h-12 mb-4 rounded-xl bg-indigo-500/15 flex items-center justify-center">
              <Mail size={24} className="text-indigo-400" />
            </div>
            <h2 className="text-xl font-bold text-white m-0 mb-2 font-['Noto_Sans_Georgian']">
              პაროლის აღდგენა
            </h2>
            <p className="text-[#a1a1aa] text-sm leading-relaxed mb-5">
              შეიყვანეთ თქვენი ელ-ფოსტა და ჩვენ გამოგიგზავნით ერთჯერად კოდს პაროლის აღსადგენად.
            </p>

            {error && (
              <div
                role="alert"
                className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-[13px] leading-relaxed flex items-start gap-2"
              >
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input
                type="email"
                placeholder="ელ-ფოსტა"
                className={`tc-input ${error ? 'border-red-500/50' : ''}`}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                autoComplete="email"
                autoFocus
              />
              <button type="submit" className="btn-brand" disabled={status === 'sending'}>
                {status === 'sending' ? 'იგზავნება...' : 'კოდის გაგზავნა'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
