import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiFetch, API_ORIGIN } from '../utils/api';

export default function AdminPanel({ addToast }) {
  const { token } = useAuth();

  const [activeTab, setActiveTab] = useState('teachers'); // 'teachers' | 'reports'

  // ── Pending teachers ──
  const [pendingTeachers, setPendingTeachers] = useState([]);
  const [teachersLoading, setTeachersLoading] = useState(true);
  const [teachersError, setTeachersError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // ── Reports ──
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsError, setReportsError] = useState(null);
  const [reportActionId, setReportActionId] = useState(null);

  // ── Lightbox ──
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [zoom, setZoom] = useState(1);

  const authHeaders = { Authorization: `Bearer ${token}` };

  const loadPendingTeachers = async () => {
    setTeachersLoading(true);
    setTeachersError(null);
    try {
      const data = await apiFetch('/admin/pending-teachers', { headers: authHeaders });
      setPendingTeachers(data.teachers || []);
    } catch (err) {
      setTeachersError(err.message);
    } finally {
      setTeachersLoading(false);
    }
  };

  const loadReports = async () => {
    setReportsLoading(true);
    setReportsError(null);
    try {
      const data = await apiFetch('/admin/reports', { headers: authHeaders });
      setReports(data.reports || []);
    } catch (err) {
      setReportsError(err.message);
    } finally {
      setReportsLoading(false);
    }
  };

  useEffect(() => {
    loadPendingTeachers();
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Escape closes the lightbox.
  useEffect(() => {
    if (!lightboxSrc) return undefined;
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        setLightboxSrc(null);
        setZoom(1);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxSrc]);

  // ── Teacher verification actions ──

  const verifyTeacher = async (id, payload) => {
    setActionLoadingId(id);
    try {
      const data = await apiFetch(`/admin/verify-teacher/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(payload),
      });
      setPendingTeachers((prev) => prev.filter((t) => t.id !== id));
      addToast?.(data.message || 'წარმატებით განახლდა ✓');
      return true;
    } catch (err) {
      addToast?.(err.message, 'error');
      return false;
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleApprove = (id) => {
    verifyTeacher(id, { status: 'approved' });
  };

  const handleRejectSubmit = async (id) => {
    if (!rejectReason.trim()) {
      addToast?.('გთხოვთ მიუთითოთ უარყოფის მიზეზი', 'error');
      return;
    }
    const success = await verifyTeacher(id, {
      status: 'rejected',
      reject_reason: rejectReason.trim(),
    });
    if (success) {
      setRejectingId(null);
      setRejectReason('');
    }
  };

  const openLightbox = (photoPath) => {
    setZoom(1);
    setLightboxSrc(`${API_ORIGIN}${photoPath}`);
  };

  // ── Report actions ──

  const handleResolveReport = async (reportId) => {
    setReportActionId(reportId);
    try {
      const data = await apiFetch(`/admin/reports/${reportId}/resolve`, {
        method: 'PUT',
        headers: authHeaders,
      });
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      addToast?.(data.message || 'შეტყობინება მოგვარებულია ✓');
    } catch (err) {
      addToast?.(err.message, 'error');
    } finally {
      setReportActionId(null);
    }
  };

  const handleDeleteReportedPost = async (report) => {
    if (!window.confirm('წაიშალოს დარეპორტებული პოსტი? ამ პოსტის ყველა შეტყობინებაც გაქრება.')) return;
    setReportActionId(report.id);
    try {
      const data = await apiFetch(`/admin/posts/${report.postId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      // All reports on the deleted post vanish via DB cascade — mirror that.
      setReports((prev) => prev.filter((r) => r.postId !== report.postId));
      addToast?.(data.message || 'პოსტი წაიშალა');
    } catch (err) {
      addToast?.(err.message, 'error');
    } finally {
      setReportActionId(null);
    }
  };

  const handleToggleBlockAuthor = async (report) => {
    const blocking = !report.authorBlocked;
    const confirmText = blocking
      ? `დაიბლოკოს ავტორი "${report.authorName}"? ის ვეღარ შევა სისტემაში.`
      : `განიბლოკოს ავტორი "${report.authorName}"?`;
    if (!window.confirm(confirmText)) return;

    setReportActionId(report.id);
    try {
      const data = await apiFetch(`/admin/users/${report.authorId}/block`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ blocked: blocking }),
      });
      setReports((prev) =>
        prev.map((r) => (r.authorId === report.authorId ? { ...r, authorBlocked: blocking } : r)),
      );
      addToast?.(data.message);
    } catch (err) {
      addToast?.(err.message, 'error');
    } finally {
      setReportActionId(null);
    }
  };

  const tabClass = (tab, color) =>
    `text-[13px] font-semibold cursor-pointer bg-transparent border-none pb-1.5 transition-colors ${
      activeTab === tab ? `${color} border-b-2 border-current` : 'text-[#71717a] hover:text-[#a1a1aa]'
    }`;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
          <i className="fas fa-shield-alt text-red-400"></i>
        </div>
        <div>
          <h1 className="text-white font-bold text-xl m-0 leading-tight">ადმინ პანელი</h1>
          <p className="text-[12px] text-[#71717a] m-0 mt-0.5">მოდერაცია და ვერიფიკაცია</p>
        </div>
      </div>

      <div className="flex items-center gap-5 border-b border-[#27272a] mb-6">
        <button onClick={() => setActiveTab('teachers')} className={tabClass('teachers', 'text-indigo-400')}>
          მასწავლებლების ვერიფიკაცია
          {pendingTeachers.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/20 text-indigo-400">
              {pendingTeachers.length}
            </span>
          )}
        </button>
        <button onClick={() => setActiveTab('reports')} className={tabClass('reports', 'text-red-400')}>
          შეტყობინებები
          {reports.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-red-500/20 text-red-400">
              {reports.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'teachers' ? (
        teachersLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <i className="fas fa-circle-notch fa-spin text-indigo-400 text-2xl mb-3"></i>
            <p className="text-[13px] text-[#71717a] m-0">იტვირთება...</p>
          </div>
        ) : teachersError ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-3">
              <i className="fas fa-exclamation-triangle text-red-400 text-xl"></i>
            </div>
            <p className="text-[13px] text-[#f87171] font-semibold m-0">{teachersError}</p>
            <button
              onClick={loadPendingTeachers}
              className="mt-4 px-4 py-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 text-indigo-400 text-[12px] font-semibold cursor-pointer transition-all"
            >
              <i className="fas fa-redo mr-1.5 text-[10px]"></i>ხელახლა ცდა
            </button>
          </div>
        ) : pendingTeachers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
              <i className="fas fa-check-double text-emerald-400 text-xl"></i>
            </div>
            <p className="text-[13px] text-[#71717a] m-0">მოლოდინში მყოფი მასწავლებელი არ არის</p>
            <p className="text-[11px] text-[#3f3f46] m-0 mt-1">ყველაფერი განხილულია ✓</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingTeachers.map((teacher) => (
              <div
                key={teacher.id}
                className="relative bg-black/25 border border-[#ffffff08] rounded-2xl p-4 flex flex-col gap-3"
              >
                {rejectingId === teacher.id && (
                  <div className="absolute inset-0 z-10 bg-[#0f0f11]/97 backdrop-blur-sm rounded-2xl flex flex-col p-4 gap-3">
                    <p className="text-[13px] font-semibold text-white m-0">უარყოფის მიზეზი</p>
                    <textarea
                      className="tc-input flex-1 resize-none"
                      placeholder="მიუთითეთ უარყოფის მიზეზი, რომელსაც მასწავლებელი დაინახავს..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setRejectingId(null);
                          setRejectReason('');
                        }}
                        className="flex-1 py-2 rounded-xl border border-[#3f3f46] hover:border-[#52525b] bg-transparent text-[#a1a1aa] text-[12px] font-semibold cursor-pointer transition-all"
                      >
                        გაუქმება
                      </button>
                      <button
                        onClick={() => handleRejectSubmit(teacher.id)}
                        disabled={actionLoadingId === teacher.id}
                        className="flex-1 py-2 rounded-xl border border-red-500/30 hover:border-red-500/50 bg-red-500/15 hover:bg-red-500/25 text-red-400 text-[12px] font-semibold cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {actionLoadingId === teacher.id ? 'იგზავნება...' : 'უარყოფის დადასტურება'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold text-white m-0 truncate">{teacher.name}</p>
                    <p className="text-[12px] text-[#22d3ee] m-0 mt-0.5 truncate">{teacher.email}</p>
                  </div>
                  <span className="shrink-0 text-[10px] text-[#52525b] whitespace-nowrap">
                    {teacher.profileCreatedAt
                      ? new Date(teacher.profileCreatedAt).toLocaleDateString('ka-GE')
                      : '—'}
                  </span>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-widest text-[#52525b] font-semibold m-0 mb-1.5">
                    დოკუმენტები ({teacher.verificationPhotos?.length || 0})
                  </p>
                  {teacher.verificationPhotos?.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {teacher.verificationPhotos.map((photoPath, photoIdx) => (
                        <button
                          key={`${teacher.id}-${photoIdx}`}
                          onClick={() => openLightbox(photoPath)}
                          className="aspect-square rounded-lg overflow-hidden border border-[#27272a] hover:border-indigo-500/50 cursor-pointer p-0 bg-black/40 transition-all"
                          title="დოკუმენტის გასადიდებლად დააჭირეთ"
                        >
                          <img
                            src={`${API_ORIGIN}${photoPath}`}
                            alt="ვერიფიკაციის დოკუმენტის მინიატურა"
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#52525b] m-0">დოკუმენტი არ არის ატვირთული</p>
                  )}
                </div>

                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => handleApprove(teacher.id)}
                    disabled={actionLoadingId === teacher.id}
                    className="flex-1 py-2.5 rounded-xl border border-emerald-500/25 hover:border-emerald-500/45 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[13px] font-semibold cursor-pointer transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <i className="fas fa-check text-[11px]"></i>
                    {actionLoadingId === teacher.id ? 'იტვირთება...' : 'დამტკიცება'}
                  </button>
                  <button
                    onClick={() => {
                      setRejectingId(teacher.id);
                      setRejectReason('');
                    }}
                    disabled={actionLoadingId === teacher.id}
                    className="flex-1 py-2.5 rounded-xl border border-red-500/20 hover:border-red-500/40 bg-red-500/8 hover:bg-red-500/15 text-red-400 text-[13px] font-semibold cursor-pointer transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <i className="fas fa-times text-[11px]"></i> უარყოფა
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : /* ── Reports tab ── */ reportsLoading ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <i className="fas fa-circle-notch fa-spin text-red-400 text-2xl mb-3"></i>
          <p className="text-[13px] text-[#71717a] m-0">იტვირთება...</p>
        </div>
      ) : reportsError ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-6">
          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-3">
            <i className="fas fa-exclamation-triangle text-red-400 text-xl"></i>
          </div>
          <p className="text-[13px] text-[#f87171] font-semibold m-0">{reportsError}</p>
          <button
            onClick={loadReports}
            className="mt-4 px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400 text-[12px] font-semibold cursor-pointer transition-all"
          >
            <i className="fas fa-redo mr-1.5 text-[10px]"></i>ხელახლა ცდა
          </button>
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
            <i className="fas fa-check-double text-emerald-400 text-xl"></i>
          </div>
          <p className="text-[13px] text-[#71717a] m-0">შეტყობინება არ არის</p>
          <p className="text-[11px] text-[#3f3f46] m-0 mt-1">ყველაფერი წესრიგშია ✓</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="bg-black/25 border border-[#ffffff08] rounded-2xl p-4 flex flex-col gap-3"
            >
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
                <p className="text-[10px] uppercase tracking-widest text-red-400/70 font-semibold m-0 mb-0.5">
                  მიზეზი
                </p>
                <p className="text-[13px] text-red-300 font-bold m-0">{report.reason}</p>
              </div>

              <div className="bg-black/25 border border-[#ffffff08] rounded-xl px-4 py-2.5">
                <p className="text-[13px] font-bold text-white m-0">{report.postTitle}</p>
                <p className="text-[12px] text-[#a1a1aa] m-0 mt-1 leading-relaxed line-clamp-3 whitespace-pre-wrap">
                  {report.postContent}
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 flex-wrap text-[11px]">
                <span className="text-[#a1a1aa]">
                  ავტორი: <span className="text-white font-semibold">{report.authorName}</span>
                  {report.authorBlocked && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold text-[10px]">
                      დაბლოკილია
                    </span>
                  )}
                </span>
                <span className="text-[#71717a]">
                  შემატყობინებელი: <span className="text-[#22d3ee]">{report.reporterName}</span>
                  {' · '}
                  {new Date(report.createdAt).toLocaleString('ka-GE')}
                </span>
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => handleResolveReport(report.id)}
                  disabled={reportActionId === report.id}
                  className="flex-1 min-w-[140px] py-2 rounded-xl border border-emerald-500/25 hover:border-emerald-500/45 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[12px] font-semibold cursor-pointer transition-all disabled:opacity-50"
                >
                  <i className="fas fa-check mr-1.5 text-[10px]"></i>მოგვარებულია
                </button>
                <button
                  onClick={() => handleDeleteReportedPost(report)}
                  disabled={reportActionId === report.id}
                  className="flex-1 min-w-[140px] py-2 rounded-xl border border-red-500/20 hover:border-red-500/40 bg-red-500/8 hover:bg-red-500/15 text-red-400 text-[12px] font-semibold cursor-pointer transition-all disabled:opacity-50"
                >
                  <i className="fas fa-trash mr-1.5 text-[10px]"></i>პოსტის წაშლა
                </button>
                <button
                  onClick={() => handleToggleBlockAuthor(report)}
                  disabled={reportActionId === report.id}
                  className="flex-1 min-w-[140px] py-2 rounded-xl border border-amber-500/25 hover:border-amber-500/45 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[12px] font-semibold cursor-pointer transition-all disabled:opacity-50"
                >
                  <i className={`fas ${report.authorBlocked ? 'fa-unlock' : 'fa-ban'} mr-1.5 text-[10px]`}></i>
                  {report.authorBlocked ? 'ავტორის განბლოკვა' : 'ავტორის დაბლოკვა'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Document Lightbox ── */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/95 p-4"
          onClick={() => {
            setLightboxSrc(null);
            setZoom(1);
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightboxSrc(null);
              setZoom(1);
            }}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer border-none z-10"
            title="დახურვა (Esc)"
          >
            <i className="fas fa-times"></i>
          </button>

          <div
            className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white/10 backdrop-blur-md rounded-full px-2 py-1.5 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
              className="w-8 h-8 rounded-full hover:bg-white/15 text-white flex items-center justify-center cursor-pointer border-none bg-transparent"
              title="დაპატარავება"
            >
              <i className="fas fa-search-minus text-[13px]"></i>
            </button>
            <span className="text-white text-[12px] w-12 text-center select-none">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))}
              className="w-8 h-8 rounded-full hover:bg-white/15 text-white flex items-center justify-center cursor-pointer border-none bg-transparent"
              title="გადიდება"
            >
              <i className="fas fa-search-plus text-[13px]"></i>
            </button>
            <button
              onClick={() => setZoom(1)}
              className="w-8 h-8 rounded-full hover:bg-white/15 text-white flex items-center justify-center cursor-pointer border-none bg-transparent"
              title="საწყისი ზომა"
            >
              <i className="fas fa-compress text-[13px]"></i>
            </button>
          </div>

          <div
            className="w-full h-full overflow-auto flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxSrc}
              alt="ვერიფიკაციის დოკუმენტი (გადიდებული ხედი)"
              draggable={false}
              style={{
                transform: `scale(${zoom})`,
                transition: 'transform 0.15s ease',
                maxWidth: zoom <= 1 ? '100%' : 'none',
                maxHeight: zoom <= 1 ? '100%' : 'none',
              }}
              className="select-none rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}
