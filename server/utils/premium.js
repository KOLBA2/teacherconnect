// Shared premium-ecosystem constants used across controllers.

// Grade levels a post can target (stored in posts.target_audience). The frontend
// keeps a matching list with display labels; the backend only validates
// membership, so the two never need to agree on wording — just on these keys.
const TARGET_AUDIENCES = ['elementary', 'high_school', 'exam_prep'];

// Lesson delivery formats.
const FORMATS = ['online', 'in_person', 'both'];

// Full subject/skill taxonomy keys (labels live on the frontend). Legacy keys
// 'programming'/'other' remain accepted for older posts.
const SUBJECTS = [
  // Academic & school
  'math', 'physics', 'chemistry', 'biology', 'georgian', 'history', 'geography', 'civics',
  // Foreign languages
  'english', 'german', 'french', 'spanish', 'italian', 'russian', 'chinese', 'japanese', 'turkish',
  // IT & programming
  'frontend', 'backend', 'python', 'mobile_dev', 'ui_ux', 'cyber_security', 'data_science', 'qa',
  // Creative & arts
  'piano', 'guitar', 'vocal', 'drawing', 'digital_illustration', 'blender_3d', 'photography', 'video_editing',
  // Business, finance & vocational
  'accounting', 'digital_marketing', 'excel_bi', 'project_management', 'culinary', 'sewing', 'driving',
  // Exams & test prep
  'exam_cat', 'exam_masters', 'ielts', 'toefl', 'sat', 'gmat',
  // Legacy
  'programming', 'other',
];

// Location: 'online' or a Georgian city key.
const CITIES = [
  'tbilisi', 'batumi', 'kutaisi', 'rustavi', 'zugdidi', 'gori', 'poti', 'telavi',
  'akhaltsikhe', 'mtskheta', 'khashuri', 'samtredia', 'kaspi', 'chiatura', 'tskaltubo', 'other',
];
const LOCATIONS = new Set(['online', ...CITIES]);

// Contact channels a click can be attributed to (post_views.clicked_contact).
const CONTACT_CHANNELS = ['phone', 'whatsapp', 'telegram', 'messenger'];

// Item 2: max simultaneously-active posts per tier (Infinity = unlimited).
const TIER_POST_LIMITS = { standard: 1, vip: 5, vip_plus: Infinity };

// Demo phase: direct online purchases are disabled; VIP is earned via referrals.
const PAYMENTS_ENABLED = false;

module.exports = {
  TARGET_AUDIENCES,
  FORMATS,
  SUBJECTS,
  CITIES,
  LOCATIONS,
  CONTACT_CHANNELS,
  TIER_POST_LIMITS,
  PAYMENTS_ENABLED,
};
