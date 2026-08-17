import { Link } from 'react-router-dom';
import { Facebook, Instagram, Linkedin, Mail, Phone, Clock, ShieldCheck, Wallet } from 'lucide-react';

// Site-wide TNET-style footer. All internal links use react-router <Link> (no
// page reloads); external social links open in a new tab. Zero `#` dead links.
const NAV_LINKS = [
  { to: '/feed', label: 'რეპეტიტორების ძებნა' },
  { to: '/feed?vip=1', label: 'VIP კატეგორიები' },
  { to: '/#how', label: 'როგორ მუშაობს' },
  { to: '/register', label: 'გახდი რეპეტიტორი' },
];

const SUBJECT_LINKS = [
  { to: '/feed?q=მათემატიკა', label: 'მათემატიკა' },
  { to: '/feed?q=ინგლისური', label: 'ინგლისური' },
  { to: '/feed?lvl=exam_prep', label: 'ეროვნული გამოცდები' },
  { to: '/feed?q=პროგრამირება', label: 'IT & პროგრამირება' },
];

const LEGAL_LINKS = [
  { to: '/terms', label: 'წესები და პირობები' },
  { to: '/privacy', label: 'კონფიდენციალურობის პოლიტიკა' },
  { to: '/faq', label: 'ხშირად დასმული კითხვები' },
  { to: '/contact', label: 'კონტაქტი & მხარდაჭერა' },
];

const SOCIALS = [
  { href: 'https://facebook.com', label: 'Facebook', Icon: Facebook },
  { href: 'https://instagram.com', label: 'Instagram', Icon: Instagram },
  { href: 'https://linkedin.com', label: 'LinkedIn', Icon: Linkedin },
];

function FooterCol({ title, links }) {
  return (
    <div>
      <p className="m-0 mb-4 text-[13px] font-bold text-white tracking-wide">{title}</p>
      <ul className="list-none m-0 p-0 flex flex-col gap-2.5">
        {links.map((l) => (
          <li key={l.to + l.label}>
            <Link to={l.to} className="text-[13.5px] no-underline text-slate-400 hover:text-blue-400 hover:underline transition-colors duration-200">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 lg:py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-10">
          {/* Brand & mission */}
          <div className="col-span-2 lg:col-span-2">
            <Link to="/" className="flex items-center gap-2.5 no-underline">
              <img src="/logo.png" alt="Teacher Connect" className="w-9 h-9 object-contain" />
              <span className="font-bold text-[16px] text-white font-['Noto_Sans_Georgian']">Teacher Connect</span>
            </Link>
            <p className="mt-3.5 mb-0 text-[13.5px] leading-relaxed text-slate-400 max-w-xs">
              TeacherConnect — №1 პლატფორმა რეპეტიტორების მოსაძებნად საქართველოში.
            </p>

            {/* Contact details */}
            <div className="mt-5 flex flex-col gap-2.5 text-[13px] text-slate-400">
              <a href="mailto:support@teacherconnect.ge" className="flex items-center gap-2.5 no-underline text-slate-400 hover:text-blue-400 transition-colors duration-200">
                <Mail size={15} className="text-slate-500 shrink-0" /> support@teacherconnect.ge
              </a>
              <a href="tel:+995322000000" className="flex items-center gap-2.5 no-underline text-slate-400 hover:text-blue-400 transition-colors duration-200">
                <Phone size={15} className="text-slate-500 shrink-0" /> +995 32 2 00 00 00
              </a>
              <span className="flex items-center gap-2.5">
                <Clock size={15} className="text-slate-500 shrink-0" /> ორშ–პარ, 10:00–19:00
              </span>
            </div>

            {/* Socials */}
            <div className="mt-5 flex items-center gap-2.5">
              {SOCIALS.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  title={label}
                  className="w-9 h-9 grid place-items-center rounded-lg bg-slate-800 text-slate-300 hover:bg-blue-600 hover:text-white transition-colors duration-200"
                >
                  <Icon size={17} />
                </a>
              ))}
            </div>
          </div>

          <FooterCol title="ნავიგაცია" links={NAV_LINKS} />
          <FooterCol title="პოპულარული საგნები" links={SUBJECT_LINKS} />
          <FooterCol title="ინფორმაცია & წესები" links={LEGAL_LINKS} />
        </div>

        {/* Trust badges */}
        <div className="mt-10 pt-6 border-t border-slate-800 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-300 bg-slate-800 rounded-md px-3 py-1.5">
            <ShieldCheck size={14} className="text-emerald-400" /> 100% დაცული მონაცემები
          </span>
          <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-300 bg-slate-800 rounded-md px-3 py-1.5">
            <Wallet size={14} className="text-blue-400" /> 0% საკომისიო
          </span>
        </div>
      </div>

      {/* Bottom copyright bar */}
      <div className="border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="m-0 text-[12.5px] text-slate-500">
            © {new Date().getFullYear()} TeacherConnect. ყველა უფლება დაცულია.
          </p>
          <div className="flex items-center gap-5 text-[12.5px]">
            <Link to="/terms" className="no-underline text-slate-500 hover:text-blue-400 transition-colors duration-200">წესები</Link>
            <Link to="/privacy" className="no-underline text-slate-500 hover:text-blue-400 transition-colors duration-200">კონფიდენციალურობა</Link>
            <Link to="/contact" className="no-underline text-slate-500 hover:text-blue-400 transition-colors duration-200">კონტაქტი</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
