import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../utils/api';
import CheckoutModal from './CheckoutModal';
import LocationSelector from './LocationSelector';
import { TARGET_AUDIENCES, FORMATS, SUBJECT_GROUPS } from '../utils/premium';

const PACKAGE_CHOICES = [
  { type: 'standard', label: 'Standard', price: 'უფასო', icon: 'fa-file-lines', accent: 'zinc' },
  { type: 'vip', label: 'VIP', price: '₾15/თვე', icon: 'fa-star', accent: 'indigo' },
  { type: 'vip_plus', label: 'VIP+', price: '₾30/თვე', icon: 'fa-crown', accent: 'fuchsia' },
];

const ACCENT = {
  zinc: 'border-zinc-400 bg-zinc-400/10 text-zinc-200',
  indigo: 'border-indigo-500 bg-indigo-500/10 text-indigo-300',
  fuchsia: 'border-fuchsia-500 bg-fuchsia-500/10 text-fuchsia-300',
};

export default function CreatePost({ onPostCreated, addToast }) {
  const { user, token } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [audiences, setAudiences] = useState([]);
  const [subject, setSubject] = useState('');
  const [format, setFormat] = useState('');
  const [price, setPrice] = useState('');
  const [syllabus, setSyllabus] = useState('');
  const [city, setCity] = useState('online');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState('standard');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdPost, setCreatedPost] = useState(null); // set when a premium package needs checkout

  // VIP/VIP+ can attach a post image; Standard sees a lock banner.
  const canAttachImage = user?.tier && user.tier !== 'standard';

  const toggleAudience = (key) =>
    setAudiences((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const pickImage = (file) => {
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  if (user?.role !== 'teacher') {
    return null;
  }

  if (user.teacherStatus !== 'approved') {
    return (
      <div className="bg-[rgba(234,179,8,0.08)] border border-[rgba(234,179,8,0.25)] rounded-2xl px-5 py-4 flex items-start gap-3">
        <i className="fas fa-hourglass-half text-[#ca8a04] text-base mt-0.5"></i>
        <p className="text-[13px] text-[#ca8a04] m-0 leading-relaxed">
          You will be unlocked to post updates once an admin approves your profile.
        </p>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      addToast?.('გთხოვთ შეავსოთ ყველა ველი', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await apiFetch('/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          targetAudience: audiences,
          subject: subject || null,
          format: format || null,
          price: price === '' ? null : Number(price),
          syllabusUrl: syllabus || null,
          city: city || null,
        }),
      });

      // Attach the image (VIP/VIP+ only) to the freshly created post.
      if (imageFile && canAttachImage && data.post?.id) {
        try {
          const fd = new FormData();
          fd.append('image', imageFile);
          await apiFetch(`/posts/${data.post.id}/image`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: fd,
          });
        } catch (imgErr) {
          addToast?.(imgErr.message, 'error');
        }
      }

      setTitle('');
      setContent('');
      setAudiences([]);
      setSubject('');
      setFormat('');
      setPrice('');
      setSyllabus('');
      setCity('online');
      setImageFile(null);
      setImagePreview(null);
      addToast?.(data.message || 'პოსტი წარმატებით გამოქვეყნდა ✓');

      // Premium package chosen → route through the checkout for the new post.
      // Standard → done immediately.
      if (selectedPackage !== 'standard') {
        setCreatedPost(data.post);
      } else {
        onPostCreated?.(data.post);
      }
    } catch (err) {
      addToast?.(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="bg-[#18181b] border border-[#27272a] rounded-2xl p-5 flex flex-col gap-3"
      >
        <p className="text-[13px] font-semibold text-[#a1a1aa] m-0">ახალი პოსტის გამოქვეყნება</p>
        <input
          type="text"
          placeholder="სათაური"
          className="tc-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={255}
        />
        <textarea
          placeholder="შინაარსი"
          className="tc-input"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
        />

        {/* Subject · format · price */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label className="block text-[11px] text-[#52525b] font-semibold mb-1.5">საგანი</label>
            <select className="tc-input" value={subject} onChange={(e) => setSubject(e.target.value)}>
              <option value="">— აირჩიე —</option>
              {SUBJECT_GROUPS.map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {g.subjects.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-[#52525b] font-semibold mb-1.5">ფორმატი</label>
            <select className="tc-input" value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="">— აირჩიე —</option>
              {FORMATS.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-[#52525b] font-semibold mb-1.5">ფასი (₾/სთ)</label>
            <input
              type="number"
              min={0}
              max={100000}
              placeholder="მაგ: 40"
              className="tc-input"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-[11px] text-[#52525b] font-semibold mb-1.5">
            <i className="fas fa-location-dot text-sky-400 mr-1.5"></i>ლოკაცია
          </label>
          <LocationSelector value={city} onChange={setCity} />
        </div>

        {/* Syllabus / program link (any tier) */}
        <div>
          <label className="block text-[11px] text-[#52525b] font-semibold mb-1.5">
            <i className="fas fa-file-pdf text-red-400 mr-1.5"></i>სილაბუსი / პროგრამა (PDF ან დოკუმენტის ბმული)
          </label>
          <input
            type="text"
            className="tc-input"
            placeholder="https://... (არასავალდებულო)"
            value={syllabus}
            onChange={(e) => setSyllabus(e.target.value)}
          />
        </div>

        {/* Post image (VIP/VIP+) — native file upload */}
        <div>
          <label className="block text-[11px] text-[#52525b] font-semibold mb-1.5">
            <i className="fas fa-image text-sky-400 mr-1.5"></i>პოსტის ფოტო
          </label>
          {canAttachImage ? (
            <>
              <label className="file-label">
                <i className="fas fa-cloud-arrow-up text-indigo-400"></i>
                {imageFile ? `არჩეულია: ${imageFile.name}` : 'აირჩიეთ ფოტო თქვენი მოწყობილობიდან'}
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => pickImage(e.target.files?.[0])}
                />
              </label>
              {imagePreview && (
                <div className="mt-2 relative">
                  <img src={imagePreview} alt="preview" className="w-full max-h-48 object-cover rounded-xl border border-[#27272a]" />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/60 text-white border-none cursor-pointer flex items-center justify-center"
                  >
                    <i className="fas fa-times text-[12px]"></i>
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 text-[12px] text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-2.5">
              <i className="fas fa-lock"></i>
              გადადით VIP პაკეტზე პოსტზე ფოტოების დასამატებლად
            </div>
          )}
        </div>

        {/* Student grade level */}
        <div>
          <p className="text-[11px] uppercase tracking-widest text-[#52525b] font-semibold m-0 mb-2">
            მოსწავლის დონე
          </p>
          <div className="flex flex-wrap gap-2">
            {TARGET_AUDIENCES.map((a) => {
              const active = audiences.includes(a.key);
              return (
                <button
                  type="button"
                  key={a.key}
                  onClick={() => toggleAudience(a.key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] font-semibold cursor-pointer transition-all ${
                    active
                      ? 'border-indigo-500 bg-indigo-500/15 text-indigo-300'
                      : 'border-[#27272a] bg-black/20 text-[#71717a] hover:border-[#3f3f46]'
                  }`}
                >
                  <i className={`fas ${a.icon} text-[11px]`}></i>
                  {a.label}
                  {active && <i className="fas fa-check text-[10px]"></i>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Package selector — only Standard is selectable. VIP / VIP+ are disabled,
            visual-only "coming soon" cards (no payment redirect). */}
        <div>
          <p className="text-[11px] uppercase tracking-widest text-[#52525b] font-semibold m-0 mb-2">
            პაკეტი
          </p>
          <div className="grid grid-cols-3 gap-2">
            {PACKAGE_CHOICES.map((pkg) => {
              const comingSoon = pkg.type !== 'standard';
              const active = !comingSoon && selectedPackage === pkg.type;
              return (
                <div
                  key={pkg.type}
                  role="button"
                  aria-disabled={comingSoon}
                  tabIndex={comingSoon ? -1 : 0}
                  onClick={() => !comingSoon && setSelectedPackage(pkg.type)}
                  className={`relative rounded-xl border py-2.5 px-2 flex flex-col items-center gap-1 transition-all ${
                    comingSoon
                      ? 'border-[#27272a] bg-black/20 text-[#52525b] opacity-60 cursor-not-allowed select-none'
                      : active
                      ? `${ACCENT[pkg.accent]} cursor-pointer`
                      : 'border-[#27272a] bg-black/20 text-[#71717a] hover:border-[#3f3f46] cursor-pointer'
                  }`}
                >
                  {comingSoon && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-400 text-black shadow-sm">
                      მალე დაემატება
                    </span>
                  )}
                  <i className={`fas ${pkg.icon} text-[14px]`}></i>
                  <span className="text-[12px] font-bold">{pkg.label}</span>
                  <span className="text-[10px] opacity-80">{comingSoon ? '—' : pkg.price}</span>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-[#71717a] mt-2 ml-1 flex items-center gap-1.5">
            <i className="fas fa-circle-info text-[10px] text-emerald-400"></i>
            ამჟამად ხელმისაწვდომია მხოლოდ სტანდარტული (უფასო) პოსტები.
          </p>
        </div>

        <button type="submit" className="btn-brand" disabled={isSubmitting}>
          {isSubmitting ? 'იტვირთება...' : 'გამოქვეყნება'}
        </button>
      </form>

      {createdPost && (
        <CheckoutModal
          post={createdPost}
          initialPackage={selectedPackage}
          addToast={addToast}
          onUpgraded={() => {}}
          onClose={() => {
            const post = createdPost;
            setCreatedPost(null);
            setSelectedPackage('standard');
            onPostCreated?.(post);
          }}
        />
      )}
    </>
  );
}
