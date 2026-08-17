import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, ChevronDown, GraduationCap, Users, ArrowLeft } from 'lucide-react';

const STUDENT_FAQ = [
  {
    q: 'უფასოა თუ არა რეპეტიტორთან დაკავშირება?',
    a: 'დიახ. რეპეტიტორების ძებნა, პროფილების დათვალიერება და მათთან დაკავშირება მოსწავლეებისთვის სრულიად უფასოა. თქვენ იხდით მხოლოდ თავად გაკვეთილის საფასურს, რომელზეც პირდაპირ თანხმდებით რეპეტიტორთან.',
  },
  {
    q: 'როგორ ავირჩიო საუკეთესო მასწავლებელი?',
    a: 'გაითვალისწინეთ რეპეტიტორის რეიტინგი და მოსწავლეთა შეფასებები, „Verified Expert“ ნიშანი, გამოცდილება და ფასი. გამოიყენეთ ფილტრები საგნის, ლოკაციის, ფორმატისა (ონლაინ/პირისპირ) და დონის მიხედვით, რათა იპოვოთ ზუსტად თქვენზე მორგებული მასწავლებელი.',
  },
  {
    q: 'შემიძლია გაკვეთილი ონლაინ ჩავიტარო?',
    a: 'დიახ. ბევრი რეპეტიტორი გთავაზობთ ონლაინ, პირისპირ ან ჰიბრიდულ ფორმატს. ფორმატის ფილტრით მარტივად გაფილტრავთ მხოლოდ ონლაინ გაკვეთილების მთავაზობელ მასწავლებლებს.',
  },
  {
    q: 'როგორ დავტოვო შეფასება?',
    a: 'გაკვეთილის შემდეგ შეგიძლიათ რეპეტიტორის პროფილზე დატოვოთ 5-ვარსკვლავიანი შეფასება და კომენტარი. რეალური შეფასებები ეხმარება სხვა მოსწავლეებს სწორი არჩევანის გაკეთებაში.',
  },
];

const TUTOR_FAQ = [
  {
    q: 'მართლა 0%-ია საკომისიო?',
    a: 'დიახ. TeacherConnect არ იღებს საკომისიოს თქვენი გაკვეთილებიდან — გამომუშავებული თანხა 100%-ით თქვენია. ჩვენ შემოსავალს ვიღებთ მხოლოდ ნებაყოფლობითი ხილვადობის პაკეტებიდან (VIP / VIP+).',
  },
  {
    q: 'რა არის VIP+ სტატუსი?',
    a: 'VIP და VIP+ არის დამატებითი ხილვადობის პაკეტები, რომლებიც თქვენს განცხადებას აჩენს კატალოგისა და მთავარი გვერდის თავში, გამორჩეული ნიშნით. ეს ზრდის პროფილის ნახვებს და მოსწავლეთა მოზიდვის შანსს, თუმცა არ ცვლის 0% საკომისიოს პოლიტიკას.',
  },
  {
    q: 'როგორ დავიწყო რეპეტიტორად მუშაობა?',
    a: 'დარეგისტრირდით რეპეტიტორად, შეავსეთ პროფილი (საგნები, ფასი, ხელმისაწვდომობა) და გამოაქვეყნეთ განცხადება. გადამოწმების შემდეგ თქვენი პროფილი გამოჩნდება კატალოგში და მოსწავლეები შეძლებენ თქვენთან დაკავშირებას.',
  },
  {
    q: 'როგორ ხდება ანგარიშსწორება?',
    a: 'ანგარიშსწორება ხდება პირდაპირ თქვენსა და მოსწავლეს შორის, თქვენ მიერ შეთანხმებული პირობებით. პლატფორმა არ არის გადახდის შუამავალი, რაც ნიშნავს, რომ სრული შემოსავალი პირდაპირ თქვენთან მიდის.',
  },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lp-card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 text-left px-5 py-4 bg-transparent border-none cursor-pointer"
      >
        <span className="font-bold text-[14.5px]" style={{ color: 'var(--lp-text)' }}>{q}</span>
        <ChevronDown size={18} className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--lp-accent)' }} />
      </button>
      {open && (
        <div className="px-5 pb-5 -mt-1 text-[14px] leading-relaxed" style={{ color: 'var(--lp-text-dim)' }}>
          {a}
        </div>
      )}
    </div>
  );
}

export default function FaqPage() {
  return (
    <div className="lp min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        <Link to="/" className="inline-flex items-center gap-1.5 text-[13px] font-semibold no-underline mb-4" style={{ color: 'var(--lp-text-mute)' }}>
          <ArrowLeft size={15} /> მთავარზე დაბრუნება
        </Link>

        <div className="text-center mb-8">
          <span className="w-12 h-12 rounded-xl grid place-items-center mx-auto mb-4" style={{ background: 'var(--lp-grad-soft)', color: 'var(--lp-accent)' }}>
            <HelpCircle size={24} />
          </span>
          <h1 className="m-0 font-extrabold tracking-tight text-[clamp(1.7rem,3.4vw,2.4rem)]" style={{ color: 'var(--lp-text)' }}>
            ხშირად დასმული კითხვები
          </h1>
          <p className="mt-2 mb-0 text-[15px]" style={{ color: 'var(--lp-text-dim)' }}>
            პასუხები ყველაზე გავრცელებულ კითხვებზე მოსწავლეებისა და რეპეტიტორებისთვის.
          </p>
        </div>

        {/* Students */}
        <h2 className="flex items-center gap-2 m-0 mb-3 font-bold text-[16px]" style={{ color: 'var(--lp-text)' }}>
          <GraduationCap size={18} style={{ color: 'var(--lp-accent)' }} /> მოსწავლეებისთვის
        </h2>
        <div className="flex flex-col gap-3">
          {STUDENT_FAQ.map((f) => <FaqItem key={f.q} {...f} />)}
        </div>

        {/* Tutors */}
        <h2 className="flex items-center gap-2 m-0 mb-3 mt-8 font-bold text-[16px]" style={{ color: 'var(--lp-text)' }}>
          <Users size={18} style={{ color: 'var(--lp-accent)' }} /> რეპეტიტორებისთვის
        </h2>
        <div className="flex flex-col gap-3">
          {TUTOR_FAQ.map((f) => <FaqItem key={f.q} {...f} />)}
        </div>

        {/* CTA */}
        <div className="lp-card mt-8 p-6 text-center">
          <p className="m-0 font-bold text-[15px]" style={{ color: 'var(--lp-text)' }}>ვერ იპოვე პასუხი?</p>
          <p className="mt-1 mb-4 text-[13.5px]" style={{ color: 'var(--lp-text-dim)' }}>ჩვენი გუნდი მზადაა დაგეხმაროს.</p>
          <Link to="/contact" className="lp-btn lp-btn-primary">დაგვიკავშირდი</Link>
        </div>
      </div>
    </div>
  );
}
