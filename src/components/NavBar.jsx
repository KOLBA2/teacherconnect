import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Compass, Sparkles, Menu, X, Sun, Moon, ChevronDown } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { mediaUrl } from '../utils/api';

const ROLE_LABELS = {
  admin: '👑 ადმინისტრატორი',
  teacher: 'მასწავლებელი',
  student: 'მოსწავლე',
};

function getInitials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

export default function NavBar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);

  const vipActive = user?.vipUntil ? new Date(user.vipUntil).getTime() > Date.now() : false;
  const isApprovedTeacher = user?.role === 'teacher' && user?.teacherStatus === 'approved';

  // Close the "More" dropdown on outside click, Escape, or route change.
  useEffect(() => {
    if (!moreOpen) return undefined;
    const onDown = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setMoreOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [moreOpen]);

  useEffect(() => {
    setMoreOpen(false);
    setDrawerOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    setDrawerOpen(false);
    logout();
    navigate('/login');
  };

  // ── Link model: split into primary (always in the bar ≥1024) and secondary
  // (grouped under the "მეტი ▾" dropdown on desktop, listed in the drawer on mobile). ──
  const primaryItems = [
    { to: '/', end: true, label: 'კატალოგი', icon: <Compass size={15} strokeWidth={2.2} /> },
    { to: '/pricing', label: 'ფასები', icon: <Sparkles size={14} strokeWidth={2.2} className="text-amber-400" /> },
  ];

  const secondaryItems = [
    isAuthenticated && { to: '/saved', label: 'შენახული', icon: <i className="fas fa-bookmark text-amber-400" /> },
    isAuthenticated && user?.role !== 'admin' && {
      to: '/bookings', label: 'ჯავშნები', icon: <i className="fas fa-calendar-check text-indigo-400" />,
    },
    isApprovedTeacher && { to: '/schedule', label: 'განრიგი', icon: <i className="fas fa-calendar-alt text-emerald-400" /> },
    isApprovedTeacher && { to: '/new-post', label: 'პოსტის დამატება', icon: <i className="fas fa-plus-circle text-emerald-400" /> },
    isApprovedTeacher && { to: '/referrals', label: 'რეფერალები', icon: <i className="fas fa-gift text-fuchsia-400" /> },
    isApprovedTeacher && { to: '/profile', label: 'სტუდია', icon: <i className="fas fa-chart-line text-sky-400" /> },
    isAuthenticated && user?.role === 'admin' && {
      to: '/admin', label: 'ადმინ პანელი', icon: <i className="fas fa-shield-alt" />,
    },
  ].filter(Boolean);

  const navLinkClass = ({ isActive }) =>
    `px-3 h-10 rounded-lg text-[13px] font-semibold no-underline transition-colors flex items-center gap-1.5 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
      isActive ? 'bg-indigo-500/15 text-indigo-400' : 'text-[#a1a1aa] hover:text-white'
    }`;

  // Dropdown-item variant.
  const dropdownItemClass = ({ isActive }) =>
    `px-3 py-2.5 rounded-lg text-[13px] font-semibold no-underline transition-colors flex items-center gap-2.5 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
      isActive ? 'bg-indigo-500/15 text-indigo-400' : 'text-[#a1a1aa] hover:text-white hover:bg-white/5'
    }`;

  // Drawer-item variant — larger tap targets (py-3 px-4, text-lg) for senior users.
  const drawerItemClass = ({ isActive }) =>
    `px-4 py-3 rounded-xl text-lg font-semibold no-underline transition-colors flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
      isActive ? 'bg-indigo-500/15 text-indigo-400' : 'text-[#d4d4d8] hover:text-white hover:bg-white/5'
    }`;

  // Shared icon-button styling: 40px touch target + visible focus ring.
  const iconBtn =
    'w-10 h-10 flex items-center justify-center rounded-lg border-none bg-transparent cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500';

  const Avatar = ({ size = 32 }) =>
    user?.avatarUrl ? (
      <img
        src={mediaUrl(user.avatarUrl)}
        alt=""
        className="rounded-full object-cover border border-[#27272a]"
        style={{ width: size, height: size }}
      />
    ) : (
      <div
        className="rounded-full bg-indigo-500/15 text-indigo-400 flex items-center justify-center font-bold text-[12px] shrink-0"
        style={{ width: size, height: size }}
      >
        {getInitials(user?.name) || '?'}
      </div>
    );

  const themeBtn = (
    <button
      onClick={toggle}
      title={theme === 'dark' ? 'ღია რეჟიმზე გადართვა' : 'მუქ რეჟიმზე გადართვა'}
      className={`${iconBtn} text-[#a1a1aa] hover:text-white hover:bg-white/5`}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );

  return (
    <>
      <header
        className="tc-navbar sticky top-0 z-30 border-b border-[#ffffff10] flex items-center justify-between w-full max-w-full gap-4 px-4 md:px-8 py-3"
        style={{ backdropFilter: 'blur(12px)' }}
      >
        {/* ORIGINAL logo — logo.png + "Teacher Connect", clickable → home */}
        <NavLink
          to="/"
          title="მთავარ გვერდზე დაბრუნება"
          className="flex items-center gap-3 no-underline shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain shrink-0" />
          <span className="font-bold text-[17px] text-white tracking-tight font-['Noto_Sans_Georgian'] whitespace-nowrap hidden sm:inline">
            Teacher Connect
          </span>
        </NavLink>

        {/* Desktop nav — primary links + a "მეტი ▾" dropdown (≥1024px only).
            No overflow/scroll: only 2–3 items ever sit in the bar. */}
        <nav className="hidden lg:flex items-center gap-x-1">
          {primaryItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
              {item.icon}
              {item.label}
            </NavLink>
          ))}

          {secondaryItems.length > 0 && (
            <div className="relative" ref={moreRef}>
              <button
                onClick={() => setMoreOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={moreOpen}
                className={`px-3 h-10 rounded-lg text-[13px] font-semibold flex items-center gap-1.5 whitespace-nowrap border-none cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  moreOpen ? 'bg-white/5 text-white' : 'bg-transparent text-[#a1a1aa] hover:text-white'
                }`}
              >
                მეტი
                <ChevronDown size={15} strokeWidth={2.4} className={`transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
              </button>

              {moreOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-2 min-w-[210px] p-1.5 rounded-xl bg-[#111113] border border-[#27272a] shadow-xl shadow-black/40 flex flex-col gap-0.5 animate-fade-in z-40"
                >
                  {secondaryItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={dropdownItemClass}
                      onClick={() => setMoreOpen(false)}
                      role="menuitem"
                    >
                      {item.icon}
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* User controls — always shrink-0 so Theme/Profile/Logout are never cut off. */}
        <div className="flex items-center gap-3 shrink-0">
          {themeBtn}

          {isAuthenticated ? (
            <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-[#27272a] shrink-0">
              {vipActive && (
                <span className="vip-badge vip-badge-vip-plus shrink-0" title="VIP სტატუსი აქტიურია">
                  <i className="fas fa-crown"></i>VIP
                </span>
              )}
              <div className="text-right hidden xl:block shrink-0 max-w-[140px]">
                <p className="text-[13px] font-semibold text-white m-0 leading-tight truncate">{user.name}</p>
                <p className="text-[10px] uppercase tracking-wide text-[#71717a] m-0">
                  {ROLE_LABELS[user.role] || user.role}
                </p>
              </div>
              <NavLink
                to="/profile"
                title="პროფილი"
                className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <Avatar />
              </NavLink>
              <button
                onClick={handleLogout}
                title="გასვლა"
                className={`${iconBtn} shrink-0 text-[#71717a] hover:text-red-400 hover:bg-red-500/10`}
              >
                <i className="fas fa-sign-out-alt"></i>
              </button>
            </div>
          ) : (
            <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-[#27272a] shrink-0">
              <NavLink to="/login" className={navLinkClass}>
                შესვლა
              </NavLink>
              <NavLink
                to="/register"
                className="px-3 h-10 flex items-center rounded-lg text-[13px] font-semibold no-underline bg-indigo-500 text-white hover:bg-indigo-600 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                რეგისტრაცია
              </NavLink>
            </div>
          )}

          {/* Hamburger — below 1024px (laptop + tablet + mobile) */}
          <button
            onClick={() => setDrawerOpen(true)}
            title="მენიუ"
            className={`lg:hidden shrink-0 ${iconBtn} text-[#a1a1aa] hover:text-white hover:bg-white/5`}
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      {/* Slide-over drawer (<1024px). Sibling of <header> so the fixed overlay
          fills the viewport — a filtered/sticky header would otherwise clip it. */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-black/50"></div>
          <div
            className="absolute top-0 left-0 h-full w-80 max-w-[85vw] bg-[#111113] border-r border-[#27272a] p-4 flex flex-col gap-1.5 overflow-y-auto animate-slide-in-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-white text-[16px] font-['Noto_Sans_Georgian']">მენიუ</span>
              <button
                onClick={() => setDrawerOpen(false)}
                title="დახურვა"
                className={`${iconBtn} text-[#71717a] hover:text-white`}
              >
                <X size={20} />
              </button>
            </div>

            {isAuthenticated && (
              <NavLink
                to={isApprovedTeacher ? '/profile' : '/'}
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-3 p-3 mb-1 rounded-xl bg-white/[0.03] border border-[#27272a] no-underline hover:bg-white/[0.06] transition-colors"
              >
                <Avatar size={44} />
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-white m-0 truncate flex items-center gap-1.5">
                    {user.name}
                    {vipActive && (
                      <span className="vip-badge vip-badge-vip-plus">
                        <i className="fas fa-crown"></i>VIP
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] uppercase tracking-wide text-[#71717a] m-0">
                    {ROLE_LABELS[user.role] || user.role}
                  </p>
                </div>
              </NavLink>
            )}

            {/* All links stacked with generous touch padding */}
            {[...primaryItems, ...secondaryItems].map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={drawerItemClass}
                onClick={() => setDrawerOpen(false)}
              >
                {item.icon}
                {item.label}
              </NavLink>
            ))}

            <div className="mt-2 pt-3 border-t border-[#27272a] flex flex-col gap-1.5">
              {isAuthenticated ? (
                <button
                  onClick={handleLogout}
                  className="px-4 py-3 rounded-xl text-lg font-semibold text-red-400 hover:bg-red-500/10 bg-transparent border-none cursor-pointer text-left flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                >
                  <i className="fas fa-sign-out-alt"></i>გასვლა
                </button>
              ) : (
                <>
                  <NavLink to="/login" className={drawerItemClass} onClick={() => setDrawerOpen(false)}>
                    <i className="fas fa-right-to-bracket"></i>შესვლა
                  </NavLink>
                  <NavLink
                    to="/register"
                    onClick={() => setDrawerOpen(false)}
                    className="px-4 py-3 flex items-center justify-center rounded-xl text-lg font-semibold no-underline bg-indigo-500 text-white"
                  >
                    რეგისტრაცია
                  </NavLink>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
