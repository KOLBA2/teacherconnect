import { NavLink } from 'react-router-dom';

export default function AuthLayout({ children }) {
  const tabClass = ({ isActive }) => `auth-tab no-underline ${isActive ? 'active' : 'inactive'}`;

  return (
    <section id="auth-section">
      <div
        className="glass-panel w-full max-w-4xl rounded-2xl overflow-hidden flex flex-col md:flex-row"
        style={{ border: '1px solid #27272a' }}
      >
        {/* Left Panel */}
        <div
          className="hidden md:flex flex-col justify-center p-10 auth-left-gradient"
          style={{ width: '45%', position: 'relative' }}
        >
          <h1 className="text-3xl font-extrabold text-white mb-2 font-['Noto_Sans_Georgian']">
            TeacherConnect
          </h1>
          <p className="text-[#71717a] mb-8 text-[15px]">პლატფორმა ხარისხიანი განათლებისთვის</p>
          <div className="flex flex-col gap-5 text-[15px] text-[#d4d4d8]">
            <div className="flex items-start gap-3">
              <span className="text-lg leading-none">🎓</span>
              <span>ვერიფიცირებული და გამოცდილი მასწავლებლები</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-lg leading-none">🗓️</span>
              <span>მოქნილი გრაფიკი და მარტივი დაჯავშნა</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-lg leading-none">📞</span>
              <span>პირდაპირი კონტაქტი მასწავლებელთან (WhatsApp / Phone)</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-lg leading-none">⚡</span>
              <span>სწრაფი და მოსახერხებელი ძებნა საგნების მიხედვით</span>
            </div>
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: '-60px',
              right: '-60px',
              width: '220px',
              height: '220px',
              borderRadius: '50%',
              background: 'rgba(99,102,241,0.06)',
              pointerEvents: 'none',
            }}
          ></div>
        </div>

        {/* Right Panel */}
        <div className="flex-1 p-6 md:p-10 bg-[#0f0f11] relative">
          <div className="flex gap-6 border-b border-[#27272a] mb-7">
            <NavLink to="/login" className={tabClass}>
              შესვლა
            </NavLink>
            <NavLink to="/register" className={tabClass}>
              რეგისტრაცია
            </NavLink>
          </div>

          {children}
        </div>
      </div>
    </section>
  );
}
