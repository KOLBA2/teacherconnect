import { useState, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import AuthLayout from './AuthLayout';

const MAX_FILES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg']);

function dataUrlToFile(dataUrl, filename) {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], filename, { type: mime });
}

export default function Register({ addToast }) {
  const { register } = useAuth();
  const [searchParams] = useSearchParams();
  // Invite links look like /register?ref=CODE — prefill the promo code and
  // default to the teacher role so the (teacher-only) field is visible.
  const refParam = (searchParams.get('ref') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [personalId, setPersonalId] = useState('');
  const [role, setRole] = useState(refParam ? 'teacher' : 'student');
  const [referralCode, setReferralCode] = useState(refParam);
  const [verificationFiles, setVerificationFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingNotice, setPendingNotice] = useState(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [selfieDataUrl, setSelfieDataUrl] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setPersonalId('');
    setRole('student');
    setReferralCode('');
    setVerificationFiles([]);
    setSelfieDataUrl('');
  };

  const handleRoleChange = (e) => {
    setRole(e.target.value);
    setReferralCode('');
    setVerificationFiles([]);
    setSelfieDataUrl('');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;

    if (selected.length > MAX_FILES) {
      addToast(`მაქსიმუმ ${MAX_FILES} ფაილის ატვირთვაა შესაძლებელი`, 'error');
      e.target.value = '';
      setVerificationFiles([]);
      return;
    }

    const hasInvalidFile = selected.some(
      (file) => !ALLOWED_TYPES.has(file.type) || file.size > MAX_FILE_SIZE,
    );
    if (hasInvalidFile) {
      addToast('დაშვებულია მხოლოდ PNG/JPG სურათები, თითოეული მაქსიმუმ 5MB', 'error');
      e.target.value = '';
      setVerificationFiles([]);
      return;
    }

    setVerificationFiles(selected);
  };

  const startCamera = async () => {
    try {
      setCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
    } catch {
      addToast('კამერა ვერ ჩაირთო. გთხოვთ შეამოწმოთ ნებართვები.', 'error');
      setCameraActive(false);
    }
  };

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    setSelfieDataUrl(canvas.toDataURL('image/png'));

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    addToast('სელფი წარმატებით გადაღებულია ✓');
  };

  const retakePhoto = () => {
    setSelfieDataUrl('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setPendingNotice(null);

    if (!name.trim() || !email.trim() || !password) {
      addToast('გთხოვთ შეავსოთ ყველა ველი', 'error');
      return;
    }
    if (password.length < 6) {
      addToast('პაროლი უნდა შეიცავდეს მინიმუმ 6 სიმბოლოს', 'error');
      return;
    }
    if (!/^\d{11}$/.test(personalId)) {
      addToast('პირადი ნომერი უნდა შედგებოდეს ზუსტად 11 ციფრისგან', 'error');
      return;
    }
    if (role === 'teacher') {
      if (verificationFiles.length === 0) {
        addToast('მასწავლებლისთვის ID ბარათის ან სხვა დოკუმენტის ატვირთვა სავალდებულოა', 'error');
        return;
      }
      if (!selfieDataUrl) {
        addToast('მასწავლებლისთვის სელფი ვერიფიკაცია სავალდებულოა', 'error');
        return;
      }
      if (verificationFiles.length + 1 > MAX_FILES) {
        addToast(`სულ მაქსიმუმ ${MAX_FILES} ფოტოს ატვირთვაა შესაძლებელი (დოკუმენტები + სელფი)`, 'error');
        return;
      }
    }

    const formData = new FormData();
    formData.append('name', name.trim());
    formData.append('email', email.trim());
    formData.append('password', password);
    formData.append('personalId', personalId);
    formData.append('role', role);
    if (role === 'teacher' && referralCode.trim()) {
      formData.append('referralCode', referralCode.trim());
    }
    verificationFiles.forEach((file) => formData.append('verificationPhotos', file));
    if (role === 'teacher' && selfieDataUrl) {
      formData.append('verificationPhotos', dataUrlToFile(selfieDataUrl, 'selfie.png'));
    }

    setIsSubmitting(true);
    try {
      const data = await register(formData);
      if (data.token) {
        addToast('რეგისტრაცია წარმატებით დასრულდა ✓');
      } else {
        setPendingNotice(data.message);
        resetForm();
      }
    } catch (err) {
      addToast(err.message || 'რეგისტრაცია ვერ მოხერხდა', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      {pendingNotice && (
        <div
          role="status"
          className="mb-5 p-4 rounded-xl border text-sm leading-relaxed flex items-start gap-3 bg-[rgba(6,182,212,0.08)] border-[rgba(6,182,212,0.3)] text-[#a5b4fc]"
        >
          <i className="fas fa-hourglass-half text-base mt-0.5"></i>
          <div>
            <p className="font-semibold mb-0.5 text-white">რეგისტრაცია გაიგზავნა განსახილველად</p>
            <p className="opacity-90">{pendingNotice}</p>
            <Link to="/login" className="mt-2 inline-block text-[#22d3ee] font-semibold hover:underline">
              შესვლის გვერდზე დაბრუნება
            </Link>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} id="register-form" className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="სახელი და გვარი"
          className="tc-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
        />
        <input
          type="email"
          placeholder="ელ-ფოსტა"
          className="tc-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />

        <div>
          <input
            type="text"
            placeholder="პირადი ნომერი (11 ნიშნა)"
            maxLength={11}
            className="tc-input"
            value={personalId}
            onChange={(e) => setPersonalId(e.target.value.replace(/\D/g, ''))}
            style={{
              borderColor: personalId.length === 11 ? '#10b981' : personalId.length > 0 ? '#ef4444' : '',
            }}
          />
          <p className="text-[11px] text-[#52525b] mt-1 ml-1">
            {personalId.length === 11
              ? '✓ 11-ნიშნა პირადი ნომერი სწორია'
              : `საჭიროა ზუსტად 11 ციფრი (შეყვანილია: ${personalId.length}/11)`}
          </p>
        </div>

        <input
          type="password"
          placeholder="პაროლი (მინ. 6 სიმბოლო)"
          className="tc-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />

        <select className="tc-input" value={role} onChange={handleRoleChange}>
          <option value="student">მოსწავლე</option>
          <option value="teacher">მასწავლებელი</option>
        </select>

        {role === 'teacher' && (
          <div className="flex flex-col gap-4 border-t border-[#27272a] pt-4 mt-1">
            <div className="p-3 bg-[rgba(234,179,8,0.08)] border border-[rgba(234,179,8,0.25)] rounded-xl text-[#ca8a04] text-[12px] flex items-center gap-2">
              <i className="fas fa-id-card"></i>
              <span>მასწავლებლებისთვის სავალდებულოა დოკუმენტური ვერიფიკაცია</span>
            </div>

            {/* Optional referral / promo code */}
            <div>
              <label className="block text-[12px] text-[#71717a] mb-2 font-medium">
                <i className="fas fa-gift text-indigo-400 mr-1.5"></i>
                რეფერალური / პრომო კოდი (არასავალდებულო)
              </label>
              <input
                type="text"
                placeholder="მაგ: GM7DKTEM"
                maxLength={12}
                className="tc-input tracking-[0.2em] font-mono uppercase placeholder:tracking-normal placeholder:font-sans placeholder:normal-case"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              />
              <p className="text-[11px] text-[#52525b] mt-1 ml-1">
                თუ მეგობარმა მოგიწვიათ, შეიყვანეთ მისი კოდი — 10 მოწვეულ მასწავლებელზე ის იღებს უფასო VIP-ს
              </p>
            </div>

            {/* Document upload */}
            <div>
              <label className="block text-[12px] text-[#71717a] mb-2 font-medium">
                Upload Professional Verification/ID Photos
              </label>
              <label className="file-label">
                <i className="fas fa-images text-[#06b6d4]"></i>
                {verificationFiles.length > 0
                  ? `არჩეულია ${verificationFiles.length} ფაილი ✓`
                  : 'ფაილების არჩევა (PNG/JPG, მაქს. 5)'}
                <input
                  type="file"
                  key={role}
                  multiple
                  accept="image/png,image/jpeg"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </label>
              {verificationFiles.length > 0 && (
                <ul className="text-[11px] text-[#71717a] flex flex-col gap-1 mt-1">
                  {verificationFiles.map((file) => (
                    <li key={file.name} className="truncate">
                      📎 {file.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Selfie verification */}
            <div>
              <label className="block text-[12px] text-[#71717a] mb-2 font-medium">
                ფოტოს გადაღება აუთენთიფიკაციისას (სელფი ვერიფიკაცია)
              </label>
              <div className="flex gap-2 mb-2">
                {!selfieDataUrl && (
                  <button
                    type="button"
                    onClick={cameraActive ? takePhoto : startCamera}
                    className="bg-[#3f3f46] hover:bg-[#52525b] px-4 py-2 rounded-lg text-xs text-white border-none cursor-pointer transition-colors"
                  >
                    {cameraActive ? 'გადაღება' : 'კამერის ჩართვა'}
                  </button>
                )}
                {selfieDataUrl && (
                  <button
                    type="button"
                    onClick={retakePhoto}
                    className="bg-[#3f3f46] hover:bg-[#52525b] px-4 py-2 rounded-lg text-xs text-white border-none cursor-pointer transition-colors"
                  >
                    თავიდან გადაღება
                  </button>
                )}
              </div>

              {cameraActive && !selfieDataUrl && (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-32 object-cover rounded-lg border border-[#27272a] mb-2"
                />
              )}
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              {selfieDataUrl && (
                <div className="relative">
                  <img
                    src={selfieDataUrl}
                    alt="Selfie verification preview"
                    className="w-full h-32 object-cover rounded-lg border border-[#16a34a]"
                  />
                  <span className="absolute top-2 right-2 bg-[#16a34a] text-white px-2 py-0.5 rounded text-[10px]">
                    სელფი მზადაა ✓
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <button type="submit" className="btn-brand mt-1" disabled={isSubmitting}>
          {isSubmitting ? 'იტვირთება...' : 'რეგისტრაცია'}
        </button>
      </form>
    </AuthLayout>
  );
}
