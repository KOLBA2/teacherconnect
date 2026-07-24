// Frontend premium-ecosystem constants — display metadata for grade levels,
// subjects, formats, and contact channels. Keys must match the backend
// (server/utils/premium.js).

// Student grade levels (stored in posts.target_audience).
export const TARGET_AUDIENCES = [
  { key: 'elementary', label: 'დაწყებითი', icon: 'fa-child', color: 'sky' },
  { key: 'high_school', label: 'საშუალო სკოლა', icon: 'fa-school', color: 'violet' },
  { key: 'exam_prep', label: 'გამოცდები / აბიტურიენტი', icon: 'fa-graduation-cap', color: 'amber' },
];

export const AUDIENCE_LABEL = Object.fromEntries(TARGET_AUDIENCES.map((a) => [a.key, a.label]));
export const AUDIENCE_META = Object.fromEntries(TARGET_AUDIENCES.map((a) => [a.key, a]));

// Lesson delivery formats.
export const FORMATS = [
  { key: 'online', label: 'ონლაინ', icon: 'fa-video' },
  { key: 'in_person', label: 'პირისპირ', icon: 'fa-user' },
  { key: 'both', label: 'ორივე', icon: 'fa-arrows-left-right' },
];
export const FORMAT_LABEL = Object.fromEntries(FORMATS.map((f) => [f.key, f.label]));
export const FORMAT_META = Object.fromEntries(FORMATS.map((f) => [f.key, f]));

// Full subject/skill taxonomy, grouped for dropdowns. Keys are stable; labels
// power the UI. Older posts using legacy keys still resolve via SUBJECT_LABEL.
export const SUBJECT_GROUPS = [
  {
    label: 'აკადემიური & სასკოლო',
    subjects: [
      { key: 'math', label: 'მათემატიკა' },
      { key: 'physics', label: 'ფიზიკა' },
      { key: 'chemistry', label: 'ქიმია' },
      { key: 'biology', label: 'ბიოლოგია' },
      { key: 'georgian', label: 'ქართული ენა და ლიტერატურა' },
      { key: 'history', label: 'ისტორია' },
      { key: 'geography', label: 'გეოგრაფია' },
      { key: 'civics', label: 'სამოქალაქო განათლება' },
    ],
  },
  {
    label: 'უცხო ენები',
    subjects: [
      { key: 'english', label: 'ინგლისური' },
      { key: 'german', label: 'გერმანული' },
      { key: 'french', label: 'ფრანგული' },
      { key: 'spanish', label: 'ესპანური' },
      { key: 'italian', label: 'იტალიური' },
      { key: 'russian', label: 'რუსული' },
      { key: 'chinese', label: 'ჩინური' },
      { key: 'japanese', label: 'იაპონური' },
      { key: 'turkish', label: 'თურქული' },
    ],
  },
  {
    label: 'IT & პროგრამირება',
    subjects: [
      { key: 'frontend', label: 'Frontend (HTML/CSS/JS/React)' },
      { key: 'backend', label: 'Backend (Node.js/Python)' },
      { key: 'python', label: 'Python პროგრამირება' },
      { key: 'mobile_dev', label: 'Mobile (Flutter/React Native)' },
      { key: 'ui_ux', label: 'UI/UX Design' },
      { key: 'cyber_security', label: 'Cyber Security' },
      { key: 'data_science', label: 'Data Science & Analytics' },
      { key: 'qa', label: 'QA (Manual/Automation)' },
    ],
  },
  {
    label: 'შემოქმედება & ხელოვნება',
    subjects: [
      { key: 'piano', label: 'ფორტეპიანო' },
      { key: 'guitar', label: 'გიტარა' },
      { key: 'vocal', label: 'ვოკალი / სიმღერა' },
      { key: 'drawing', label: 'ხატვა / ფერწერა' },
      { key: 'digital_illustration', label: 'ციფრული ილუსტრაცია' },
      { key: 'blender_3d', label: '3D გრაფიკა / Blender' },
      { key: 'photography', label: 'ფოტოგრაფია' },
      { key: 'video_editing', label: 'ვიდეო მონტაჟი (Premiere/AE)' },
    ],
  },
  {
    label: 'ბიზნესი, ფინანსები & პროფესიული',
    subjects: [
      { key: 'accounting', label: 'ბუღალტერია (ORIS/RS.ge)' },
      { key: 'digital_marketing', label: 'ციფრული მარკეტინგი / SMM' },
      { key: 'excel_bi', label: 'Excel & Power BI' },
      { key: 'project_management', label: 'პროექტების მართვა (PMI)' },
      { key: 'culinary', label: 'მზარეულობა / კულინარია' },
      { key: 'sewing', label: 'ჭრა-კერვა / მოდის დიზაინი' },
      { key: 'driving', label: 'ავტო-მართვის თეორია/პრაქტიკა' },
    ],
  },
  {
    label: 'გამოცდები & ტესტები',
    subjects: [
      { key: 'exam_cat', label: 'ეროვნული გამოცდები (CAT)' },
      { key: 'exam_masters', label: 'სამაგისტრო გამოცდები' },
      { key: 'ielts', label: 'IELTS' },
      { key: 'toefl', label: 'TOEFL' },
      { key: 'sat', label: 'SAT' },
      { key: 'gmat', label: 'GMAT' },
    ],
  },
];

// Flat list + label map (includes a legacy key for backward compatibility).
export const SUBJECTS = SUBJECT_GROUPS.flatMap((g) => g.subjects);
export const SUBJECT_LABEL = { programming: 'პროგრამირება', other: 'სხვა', ...Object.fromEntries(SUBJECTS.map((s) => [s.key, s.label])) };

// Location selector: Online (default, top) + Georgian cities.
export const LOCATION_ONLINE = { key: 'online', label: '💻 ონლაინ გაკვეთილები' };
export const CITIES = [
  { key: 'tbilisi', label: 'თბილისი' },
  { key: 'batumi', label: 'ბათუმი' },
  { key: 'kutaisi', label: 'ქუთაისი' },
  { key: 'rustavi', label: 'რუსთავი' },
  { key: 'zugdidi', label: 'ზუგდიდი' },
  { key: 'gori', label: 'გორი' },
  { key: 'poti', label: 'ფოთი' },
  { key: 'telavi', label: 'თელავი' },
  { key: 'akhaltsikhe', label: 'ახალციხე' },
  { key: 'mtskheta', label: 'მცხეთა' },
  { key: 'khashuri', label: 'ხაშური' },
  { key: 'samtredia', label: 'სამტრედია' },
  { key: 'kaspi', label: 'კასპი' },
  { key: 'chiatura', label: 'ჭიათურა' },
  { key: 'tskaltubo', label: 'წყალტუბო' },
  { key: 'other', label: 'სხვა რეგიონი' },
];
export const LOCATION_LABEL = {
  [LOCATION_ONLINE.key]: LOCATION_ONLINE.label,
  ...Object.fromEntries(CITIES.map((c) => [c.key, c.label])),
};

// Demo phase: online payments are switched off; VIP is earned via referrals.
export const PAYMENTS_ENABLED = false;

// Branded messaging channels rendered on the post card. `href` builds the deep
// link from the teacher's stored value.
export const CONTACT_CHANNELS = {
  phone: {
    key: 'phone',
    label: 'ტელეფონი',
    cta: 'დარეკვა',
    icon: 'fa-phone',
    faStyle: 'fas',
    brand: '#0EA5E9',
    href: (v) => `tel:${String(v).replace(/[^\d+]/g, '')}`,
  },
  whatsapp: {
    key: 'whatsapp',
    label: 'WhatsApp',
    cta: 'WhatsApp-ზე მიწერა',
    icon: 'fa-whatsapp',
    faStyle: 'fab',
    brand: '#25D366',
    href: (v) => `https://wa.me/${String(v).replace(/[^\d]/g, '')}`,
  },
  telegram: {
    key: 'telegram',
    label: 'Telegram',
    cta: 'Telegram-ის გახსნა',
    icon: 'fa-telegram',
    faStyle: 'fab',
    brand: '#229ED9',
    href: (v) => `https://t.me/${String(v).replace(/^@+/, '')}`,
  },
  messenger: {
    key: 'messenger',
    label: 'Messenger',
    cta: 'Direct Messenger',
    icon: 'fa-facebook-messenger',
    faStyle: 'fab',
    brand: '#A855F7',
    href: (v) => v,
  },
};

// Ordered list for rendering all channels consistently.
export const CONTACT_ORDER = ['phone', 'whatsapp', 'telegram', 'messenger'];

// VIP+ custom profile banner presets (stored as the key in users.profile_banner).
export const BANNER_PRESETS = [
  { key: 'royal', label: 'Royal', css: 'linear-gradient(135deg, #6366f1, #d946ef)' },
  { key: 'sunset', label: 'Sunset', css: 'linear-gradient(135deg, #f59e0b, #ef4444)' },
  { key: 'ocean', label: 'Ocean', css: 'linear-gradient(135deg, #0ea5e9, #22d3ee)' },
  { key: 'forest', label: 'Forest', css: 'linear-gradient(135deg, #10b981, #84cc16)' },
];
export const BANNER_CSS = Object.fromEntries(BANNER_PRESETS.map((b) => [b.key, b.css]));

// Convert a YouTube/Vimeo watch URL into an embeddable iframe src. Returns null
// if it isn't a recognizable video URL.
export function toEmbedUrl(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

// A stable per-browser id so analytics can count unique viewers without login.
const SESSION_KEY = 'tc_session_id';
export function getSessionId() {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = 'sess-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return 'sess-anon';
  }
}
