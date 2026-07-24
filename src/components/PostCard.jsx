import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiFetch, mediaUrl } from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import CheckoutModal from './CheckoutModal';
import PromoModal from './PromoModal';
import LessonCostEstimator from './LessonCostEstimator';
import {
  CONTACT_CHANNELS,
  CONTACT_ORDER,
  AUDIENCE_META,
  FORMAT_META,
  SUBJECT_LABEL,
  LOCATION_LABEL,
  getSessionId,
} from '../utils/premium';

function formatTimestamp(iso) {
  return new Date(iso).toLocaleString('ka-GE', { dateStyle: 'medium', timeStyle: 'short' });
}

function getInitials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

// Pretty Georgian phone display: +995 5XX XX XX XX (falls back to the raw value).
function formatGeoPhone(raw) {
  let d = (raw || '').toString().replace(/\D/g, '');
  if (d.startsWith('995')) d = d.slice(3);
  if (d.length === 9) {
    return `+995 ${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 7)} ${d.slice(7, 9)}`;
  }
  return raw;
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers / denied clipboard permission.
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  }
}

export default function PostCard({ post, addToast, onPostUpdated, onPostRemoved }) {
  const { user, token, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [hoverStar, setHoverStar] = useState(0);

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState(null); // null = not loaded yet
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [promoOpen, setPromoOpen] = useState(false);
  const [estimatorOpen, setEstimatorOpen] = useState(false);

  const isOwnPost = user?.id === post.teacherId;
  const canRate = isAuthenticated && !isOwnPost;
  const canReport = isAuthenticated && !isOwnPost;
  const isAdminViewer = user?.role === 'admin';

  // Premium presentation is driven by effectivePackage (which already folds in
  // the teacher's earned VIP status), falling back to the raw package_type.
  const effectivePackage = post.effectivePackage || post.packageType || 'standard';
  const isVipPlus = effectivePackage === 'vip_plus';
  const isVip = effectivePackage === 'vip';
  const isPremium = isVip || isVipPlus;
  const premiumCardClass = isVipPlus ? 'post-card-vip-plus' : isVip ? 'post-card-vip' : '';

  const promo = post.promo || null; // { tag, expiresAt } — already filtered to active
  const audiences = post.targetAudience || [];
  const contact = post.contact || {};
  const contactChannels = CONTACT_ORDER.filter((k) => contact[k]);
  // WhatsApp / Telegram / Messenger action buttons are a VIP / VIP+ perk. Basic
  // (standard) accounts show only the phone number + a direct Call button.
  const contactButtonKeys = isPremium ? contactChannels : contactChannels.filter((k) => k === 'phone');
  const formatMeta = post.format ? FORMAT_META[post.format] : null;
  const subjectLabel = post.subject ? SUBJECT_LABEL[post.subject] || post.subject : null;

  // Feature 3: WhatsApp lead trigger — a pre-filled inquiry targeting the teacher.
  const contactHref = (k) => {
    if (k === 'whatsapp') {
      const msg = `გამარჯობა! დაინტერესებული ვარ თქვენი გაკვეთილით: "${post.title}"`;
      return `https://wa.me/${String(contact.whatsapp).replace(/[^\d]/g, '')}?text=${encodeURIComponent(msg)}`;
    }
    return CONTACT_CHANNELS[k].href(contact[k]);
  };

  // Log one view per browser session per post (analytics, best-effort).
  useEffect(() => {
    if (!post.id) return;
    const key = `tc_viewed_${post.id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      /* private mode — just log the view */
    }
    apiFetch(`/posts/${post.id}/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: getSessionId() }),
    }).catch(() => {});
  }, [post.id]);

  const handleContactClick = (channel) => {
    // Fire-and-forget conversion log; navigation to the external link proceeds.
    apiFetch(`/posts/${post.id}/contact-click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: getSessionId(), channel }),
    }).catch(() => {});
  };

  // Feature 4: bump-up. Payments are off for the demo → the API returns a
  // friendly "coming soon" which we surface as-is.
  const handleBump = async () => {
    try {
      const data = await apiFetch(`/posts/${post.id}/bump`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      addToast?.(data.message);
      onPostUpdated?.(post.id, { lastBumpedAt: new Date().toISOString() });
    } catch (err) {
      addToast?.(err.message);
    }
  };

  const authJsonHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // ── Rating ──

  const handleRate = async (stars) => {
    if (!canRate) return;
    try {
      const data = await apiFetch(`/posts/${post.id}/rate`, {
        method: 'POST',
        headers: authJsonHeaders,
        body: JSON.stringify({ stars }),
      });
      onPostUpdated?.(post.id, {
        avgRating: data.avgRating,
        ratingCount: data.ratingCount,
        myRating: data.myRating,
      });
      addToast?.(data.message);
    } catch (err) {
      addToast?.(err.message, 'error');
    }
  };

  const displayedStars = hoverStar || Math.round(post.avgRating || 0);

  // ── Share ──

  const handleShare = async () => {
    const link = `${window.location.origin}/?post=${post.id}`;
    const ok = await copyToClipboard(link);
    addToast?.(ok ? 'პოსტის ბმული დაკოპირდა ✓' : 'ბმულის კოპირება ვერ მოხერხდა', ok ? 'success' : 'error');
  };

  // ── Save / bookmark ──

  const handleToggleSave = async () => {
    try {
      const data = await apiFetch(`/posts/${post.id}/save`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      onPostUpdated?.(post.id, { isSaved: data.saved });
      addToast?.(data.message);
    } catch (err) {
      addToast?.(err.message, 'error');
    }
  };

  // ── Report ──

  const handleReportSubmit = async () => {
    if (!reportReason.trim()) {
      addToast?.('გთხოვთ მიუთითოთ მიზეზი', 'error');
      return;
    }
    setSubmittingReport(true);
    try {
      const data = await apiFetch(`/posts/${post.id}/report`, {
        method: 'POST',
        headers: authJsonHeaders,
        body: JSON.stringify({ reason: reportReason.trim() }),
      });
      addToast?.(data.message || 'შეტყობინება გაიგზავნა ✓');
      setReportOpen(false);
      setReportReason('');
    } catch (err) {
      addToast?.(err.message, 'error');
    } finally {
      setSubmittingReport(false);
    }
  };

  // ── Admin delete ──

  const handleAdminDelete = async () => {
    if (!window.confirm('დარწმუნებული ხართ, რომ გსურთ ამ პოსტის წაშლა?')) return;
    setDeleting(true);
    try {
      const data = await apiFetch(`/admin/posts/${post.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      addToast?.(data.message || 'პოსტი წაიშალა');
      onPostRemoved?.(post.id);
    } catch (err) {
      addToast?.(err.message, 'error');
      setDeleting(false);
    }
  };

  // ── Comments ──

  const loadComments = async () => {
    setCommentsLoading(true);
    try {
      const data = await apiFetch(`/posts/${post.id}/comments`);
      setComments(data.comments || []);
    } catch (err) {
      addToast?.(err.message, 'error');
    } finally {
      setCommentsLoading(false);
    }
  };

  const toggleComments = () => {
    const opening = !commentsOpen;
    setCommentsOpen(opening);
    if (opening && comments === null) {
      loadComments();
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      addToast?.('კომენტარი ცარიელია', 'error');
      return;
    }
    setPostingComment(true);
    try {
      const data = await apiFetch(`/posts/${post.id}/comments`, {
        method: 'POST',
        headers: authJsonHeaders,
        body: JSON.stringify({ content: newComment.trim() }),
      });
      setComments((prev) => [...(prev || []), data.comment]);
      setNewComment('');
      onPostUpdated?.(post.id, { commentCount: (post.commentCount || 0) + 1 });
      addToast?.(data.message);
    } catch (err) {
      addToast?.(err.message, 'error');
    } finally {
      setPostingComment(false);
    }
  };

  const handleEditSave = async (commentId) => {
    if (!editText.trim()) {
      addToast?.('კომენტარი ცარიელია', 'error');
      return;
    }
    try {
      const data = await apiFetch(`/comments/${commentId}`, {
        method: 'PUT',
        headers: authJsonHeaders,
        body: JSON.stringify({ content: editText.trim() }),
      });
      setComments((prev) => prev.map((c) => (c.id === commentId ? data.comment : c)));
      setEditingId(null);
      addToast?.(data.message);
    } catch (err) {
      addToast?.(err.message, 'error');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('წაიშალოს კომენტარი?')) return;
    try {
      const data = await apiFetch(`/comments/${commentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      onPostUpdated?.(post.id, { commentCount: Math.max(0, (post.commentCount || 1) - 1) });
      addToast?.(data.message);
    } catch (err) {
      addToast?.(err.message, 'error');
    }
  };

  const canDeleteComment = (comment) =>
    isAuthenticated && (comment.userId === user?.id || isOwnPost || isAdminViewer);

  // A VIP post owner may pin one 5★ reviewer's comment to the top.
  const canFeature = isOwnPost && isPremium;
  const handleFeatureComment = async (commentId) => {
    try {
      const data = await apiFetch(`/posts/${post.id}/comments/${commentId}/feature`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setComments((prev) => {
        const updated = prev.map((c) => ({
          ...c,
          isFeatured: c.id === commentId ? data.featured : false,
        }));
        return [...updated].sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
      });
      addToast?.(data.message);
    } catch (err) {
      addToast?.(err.message, 'error');
    }
  };

  return (
    <>
    <article
      id={`post-${post.id}`}
      className={`post-card bg-[#18181b] border border-[#27272a] rounded-2xl p-5 sm:p-6 shadow-lg transition-all ${premiumCardClass}`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link
          to={`/teachers/${post.teacherId}`}
          className="w-10 h-10 rounded-full overflow-hidden bg-indigo-500/15 text-indigo-400 flex items-center justify-center font-bold text-[13px] shrink-0 no-underline"
          title="პროფილის ნახვა"
        >
          {post.teacherAvatar ? (
            <img src={mediaUrl(post.teacherAvatar)} alt="" className="w-full h-full object-cover" />
          ) : (
            getInitials(post.teacherName) || '?'
          )}
        </Link>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white m-0 truncate flex items-center gap-2 flex-wrap">
            <Link to={`/teachers/${post.teacherId}`} className="text-white no-underline hover:text-indigo-400 transition-colors">
              {post.teacherName}
            </Link>
            {isPremium && (
              <span className={`vip-badge ${isVipPlus ? 'vip-badge-vip-plus' : 'vip-badge-vip'}`}>
                <i className={`fas ${isVipPlus ? 'fa-crown' : 'fa-star'}`}></i>
                {isVipPlus ? 'VIP+' : 'VIP'}
              </span>
            )}
            {post.isVerified && (
              <span className="verified-badge" title="Verified Expert">
                <i className="fas fa-circle-check"></i>Verified Expert
              </span>
            )}
          </p>
          <p className="text-[11px] text-[#71717a] m-0">{formatTimestamp(post.createdAt)}</p>
        </div>

        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          {isOwnPost && user?.role === 'teacher' && isPremium && (
            <button
              onClick={() => setPromoOpen(true)}
              title="პრომოს მართვა"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-colors cursor-pointer"
            >
              <i className="fas fa-tags text-[12px]"></i>
            </button>
          )}
          {isOwnPost && user?.role === 'teacher' && (
            <button
              onClick={handleBump}
              title="პოსტის ამოწევა (2₾ - მალე)"
              className="h-8 px-2.5 flex items-center gap-1.5 rounded-lg text-sky-300 hover:text-sky-200 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 transition-colors cursor-pointer text-[11px] font-bold"
            >
              <i className="fas fa-rocket text-[12px]"></i>
              ამოწევა
            </button>
          )}
          {isOwnPost && user?.role === 'teacher' && (
            <button
              onClick={() => setCheckoutOpen(true)}
              title="პაკეტის განახლება / Boost"
              className="h-8 px-2.5 flex items-center gap-1.5 rounded-lg text-fuchsia-300 hover:text-fuchsia-200 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 border border-fuchsia-500/30 transition-colors cursor-pointer text-[11px] font-bold"
            >
              <i className="fas fa-bolt text-[12px]"></i>
              {isPremium ? 'პაკეტი' : 'Boost'}
            </button>
          )}
          {isAuthenticated && user?.role === 'student' && !isOwnPost && (
            <button
              onClick={() => navigate(`/book/${post.teacherId}`)}
              title="გაკვეთილის დაჯავშნა"
              className="h-8 px-2.5 flex items-center gap-1.5 rounded-lg text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 transition-colors cursor-pointer text-[11px] font-bold"
            >
              <i className="fas fa-calendar-plus text-[12px]"></i>
              დაჯავშნა
            </button>
          )}
          {isAuthenticated && (
            <button
              onClick={handleToggleSave}
              title={post.isSaved ? 'შენახვის გაუქმება' : 'პოსტის შენახვა'}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors border-none bg-transparent cursor-pointer ${
                post.isSaved
                  ? 'text-indigo-400 hover:text-indigo-300 bg-indigo-500/10'
                  : 'text-[#71717a] hover:text-indigo-400 hover:bg-indigo-500/10'
              }`}
            >
              <i className={`${post.isSaved ? 'fas' : 'far'} fa-bookmark text-[13px]`}></i>
            </button>
          )}
          <button
            onClick={handleShare}
            title="ბმულის კოპირება"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#71717a] hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors border-none bg-transparent cursor-pointer"
          >
            <i className="fas fa-share-alt text-[13px]"></i>
          </button>
          {canReport && (
            <button
              onClick={() => setReportOpen((v) => !v)}
              title="პოსტის დარეპორტება"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[#71717a] hover:text-amber-400 hover:bg-amber-500/10 transition-colors border-none bg-transparent cursor-pointer"
            >
              <i className="fas fa-flag text-[13px]"></i>
            </button>
          )}
          {isAdminViewer && (
            <button
              onClick={handleAdminDelete}
              disabled={deleting}
              title="პოსტის წაშლა (ადმინი)"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[#71717a] hover:text-red-400 hover:bg-red-500/10 transition-colors border-none bg-transparent cursor-pointer disabled:opacity-50"
            >
              <i className={`fas ${deleting ? 'fa-circle-notch fa-spin' : 'fa-trash'} text-[13px]`}></i>
            </button>
          )}
        </div>
      </div>

      {/* Promo banner */}
      {promo && (
        <div className="mb-3">
          <span className="promo-badge">
            <i className="fas fa-fire"></i>
            {promo.tag}
          </span>
        </div>
      )}

      {/* Body */}
      <h3 className="text-lg font-bold text-white mb-2 mt-0">{post.title}</h3>
      <p className="text-[#a1a1aa] text-[14px] leading-relaxed whitespace-pre-wrap m-0">{post.content}</p>

      {/* Post image (VIP/VIP+) */}
      {post.imageUrl && (
        <img
          src={mediaUrl(post.imageUrl)}
          alt=""
          loading="lazy"
          className="w-full max-h-80 object-cover rounded-xl border border-[#27272a] mt-3"
        />
      )}

      {/* Meta row: price · format · subject · grade levels */}
      {(post.price != null || formatMeta || subjectLabel || audiences.length > 0) && (
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          {post.price != null && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-[11px] font-bold text-emerald-400">
              <i className="fas fa-tag text-[10px]"></i>₾{post.price}/სთ
            </span>
          )}
          {subjectLabel && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/25 text-[11px] font-semibold text-indigo-300">
              <i className="fas fa-book text-[10px]"></i>
              {subjectLabel}
            </span>
          )}
          {formatMeta && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-[#27272a] text-[11px] font-semibold text-[#a1a1aa]">
              <i className={`fas ${formatMeta.icon} text-[10px] text-sky-400`}></i>
              {formatMeta.label}
            </span>
          )}
          {post.city && LOCATION_LABEL[post.city] && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-[#27272a] text-[11px] font-semibold text-[#a1a1aa]">
              <i className={`fas ${post.city === 'online' ? 'fa-wifi' : 'fa-location-dot'} text-[10px] text-emerald-400`}></i>
              {post.city === 'online' ? 'ონლაინ' : LOCATION_LABEL[post.city]}
            </span>
          )}
          {audiences.map((key) => {
            const meta = AUDIENCE_META[key];
            if (!meta) return null;
            return (
              <span
                key={key}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-[#27272a] text-[11px] font-semibold text-[#a1a1aa]"
              >
                <i className={`fas ${meta.icon} text-[10px] text-violet-400`}></i>
                {meta.label}
              </span>
            );
          })}
        </div>
      )}

      {/* Syllabus (Feature 1) + cost estimator toggle (Feature 2) */}
      {(post.syllabusUrl || post.price != null) && (
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {post.syllabusUrl && (
            <a
              href={post.syllabusUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-300 text-[12px] font-semibold no-underline hover:bg-red-500/20 transition-colors"
            >
              <i className="fas fa-file-pdf"></i>სილაბუსის ნახვა
            </a>
          )}
          {post.price != null && (
            <button
              onClick={() => setEstimatorOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[12px] font-semibold cursor-pointer hover:bg-emerald-500/20 transition-colors"
            >
              <i className="fas fa-calculator"></i>ღირებულების კალკულატორი
              <i className={`fas fa-chevron-${estimatorOpen ? 'up' : 'down'} text-[10px]`}></i>
            </button>
          )}
        </div>
      )}
      {estimatorOpen && post.price != null && (
        <div className="mt-2">
          <LessonCostEstimator basePrice={post.price} />
        </div>
      )}

      {/* Contact zone — the phone number + Call button are visible for EVERY
          teacher (all tiers). WhatsApp / Telegram quick actions are VIP-only. */}
      {contactButtonKeys.length > 0 ? (
        <div className="mt-4 flex flex-col gap-2.5">
          {contact.phone && (
            <a
              href={CONTACT_CHANNELS.phone.href(contact.phone)}
              onClick={() => handleContactClick('phone')}
              className="inline-flex items-center gap-2 no-underline w-fit"
            >
              <span className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                <i className="fas fa-phone text-emerald-400 text-[12px]"></i>
              </span>
              <span className="text-[15px] font-bold text-white tracking-wide">{formatGeoPhone(contact.phone)}</span>
            </a>
          )}
          <div className="flex flex-wrap gap-2">
            {contactButtonKeys.map((k) => {
              const ch = CONTACT_CHANNELS[k];
              return (
                <a
                  key={k}
                  href={contactHref(k)}
                  target={k === 'phone' ? undefined : '_blank'}
                  rel="noopener noreferrer"
                  onClick={() => handleContactClick(k)}
                  className="contact-btn"
                  style={{ background: ch.brand }}
                >
                  <i className={`${ch.faStyle} ${ch.icon} text-[15px]`}></i>
                  {ch.cta}
                </a>
              );
            })}
          </div>
        </div>
      ) : isOwnPost ? (
        <p className="mt-4 text-[12px] text-[#71717a] flex items-center gap-1.5">
          <i className="fas fa-circle-info text-[11px]"></i>
          დაამატეთ საკონტაქტო არხები „სტუდიაში“
        </p>
      ) : null}

      {/* Rating + comments toggle row */}
      <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-[#27272a] flex-wrap">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center"
            onMouseLeave={() => setHoverStar(0)}
            title={canRate ? 'შეაფასეთ პოსტი' : undefined}
          >
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                onClick={() => handleRate(s)}
                onMouseEnter={() => canRate && setHoverStar(s)}
                disabled={!canRate}
                className={`star-rating-btn text-[15px] ${
                  s <= displayedStars ? 'text-amber-400' : 'text-[#3f3f46]'
                } ${canRate ? '' : 'cursor-default'}`}
              >
                <i className={`${s <= displayedStars ? 'fas' : 'far'} fa-star`}></i>
              </button>
            ))}
          </div>
          <span className="text-[12px] text-[#71717a]">
            {post.ratingCount > 0 ? (
              <>
                <span className="text-amber-400 font-bold">{(post.avgRating || 0).toFixed(1)}</span>
                {' '}({post.ratingCount})
              </>
            ) : (
              'შეფასება არ არის'
            )}
            {post.myRating && <span className="ml-1.5 text-indigo-400">· თქვენი: {post.myRating}★</span>}
          </span>
        </div>

        <button
          onClick={toggleComments}
          className="flex items-center gap-1.5 text-[12px] font-semibold text-[#a1a1aa] hover:text-white bg-transparent border-none cursor-pointer transition-colors"
        >
          <i className="far fa-comment text-[13px]"></i>
          კომენტარები ({post.commentCount || 0})
          <i className={`fas fa-chevron-${commentsOpen ? 'up' : 'down'} text-[10px]`}></i>
        </button>
      </div>

      {/* Report box */}
      {reportOpen && (
        <div className="mt-4 pt-4 border-t border-[#27272a] flex flex-col gap-2">
          <p className="text-[12px] font-semibold text-amber-400 m-0">
            <i className="fas fa-flag mr-1.5"></i>რატომ არეპორტებთ ამ პოსტს?
          </p>
          <textarea
            className="tc-input resize-none"
            rows={2}
            placeholder="მიზეზი..."
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={() => setReportOpen(false)}
              className="flex-1 py-2 rounded-xl border border-[#3f3f46] hover:border-[#52525b] bg-transparent text-[#a1a1aa] text-[12px] font-semibold cursor-pointer transition-all"
            >
              გაუქმება
            </button>
            <button
              onClick={handleReportSubmit}
              disabled={submittingReport}
              className="flex-1 py-2 rounded-xl border border-amber-500/30 hover:border-amber-500/50 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 text-[12px] font-semibold cursor-pointer transition-all disabled:opacity-50"
            >
              {submittingReport ? 'იგზავნება...' : 'გაგზავნა'}
            </button>
          </div>
        </div>
      )}

      {/* Comments section */}
      {commentsOpen && (
        <div className="mt-4 pt-4 border-t border-[#27272a] flex flex-col gap-3">
          {commentsLoading ? (
            <p className="text-[12px] text-[#71717a] m-0 text-center py-2">
              <i className="fas fa-circle-notch fa-spin mr-1.5"></i>იტვირთება...
            </p>
          ) : (
            <>
              {(comments || []).length === 0 && (
                <p className="text-[12px] text-[#52525b] m-0 text-center py-2">
                  კომენტარები ჯერ არ არის — იყავით პირველი!
                </p>
              )}
              {(comments || []).map((comment) => (
                <div
                  key={comment.id}
                  className={`rounded-xl px-3.5 py-2.5 ${
                    comment.isFeatured ? 'featured-review' : 'bg-black/25 border border-[#ffffff08]'
                  }`}
                >
                  {comment.isFeatured && (
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400 m-0 mb-1.5 flex items-center gap-1.5">
                      <i className="fas fa-thumbtack"></i>რჩეული მიმოხილვა
                    </p>
                  )}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[12px] font-bold text-white">{comment.userName}</span>
                    {comment.authorStars === 5 && (
                      <span className="text-[10px] text-amber-400 font-bold">★★★★★</span>
                    )}
                    <span className="text-[10px] text-[#52525b]">
                      {formatTimestamp(comment.createdAt)}
                      {comment.updatedAt && ' · რედაქტირებულია'}
                    </span>
                    <span className="ml-auto flex items-center gap-1">
                      {canFeature && (comment.authorStars === 5 || comment.isFeatured) && (
                        <button
                          onClick={() => handleFeatureComment(comment.id)}
                          title={comment.isFeatured ? 'დამაგრების მოხსნა' : 'მიმოხილვის დამაგრება'}
                          className={`w-6 h-6 flex items-center justify-center rounded bg-transparent border-none cursor-pointer text-[11px] ${
                            comment.isFeatured
                              ? 'text-amber-400 hover:text-amber-300'
                              : 'text-[#52525b] hover:text-amber-400'
                          }`}
                        >
                          <i className="fas fa-thumbtack"></i>
                        </button>
                      )}
                      {isAuthenticated && comment.userId === user?.id && editingId !== comment.id && (
                        <button
                          onClick={() => {
                            setEditingId(comment.id);
                            setEditText(comment.content);
                          }}
                          title="რედაქტირება"
                          className="w-6 h-6 flex items-center justify-center rounded text-[#52525b] hover:text-indigo-400 bg-transparent border-none cursor-pointer text-[11px]"
                        >
                          <i className="fas fa-pen"></i>
                        </button>
                      )}
                      {canDeleteComment(comment) && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          title="წაშლა"
                          className="w-6 h-6 flex items-center justify-center rounded text-[#52525b] hover:text-red-400 bg-transparent border-none cursor-pointer text-[11px]"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      )}
                    </span>
                  </div>

                  {editingId === comment.id ? (
                    <div className="flex flex-col gap-2">
                      <textarea
                        className="tc-input resize-none text-[13px]"
                        rows={2}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1.5 rounded-lg border border-[#3f3f46] bg-transparent text-[#a1a1aa] text-[11px] font-semibold cursor-pointer"
                        >
                          გაუქმება
                        </button>
                        <button
                          onClick={() => handleEditSave(comment.id)}
                          className="px-3 py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/15 text-indigo-400 text-[11px] font-semibold cursor-pointer"
                        >
                          შენახვა
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[13px] text-[#a1a1aa] m-0 leading-relaxed whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  )}
                </div>
              ))}

              {isAuthenticated ? (
                <div className="flex gap-2 items-start">
                  <textarea
                    className="tc-input resize-none flex-1 text-[13px]"
                    rows={1}
                    placeholder="დაწერეთ კომენტარი..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={postingComment}
                    title="კომენტარის გაგზავნა"
                    className="w-9 h-9 shrink-0 flex items-center justify-center rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white border-none cursor-pointer transition-colors disabled:opacity-50"
                  >
                    <i className={`fas ${postingComment ? 'fa-circle-notch fa-spin' : 'fa-paper-plane'} text-[12px]`}></i>
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-[#52525b] m-0 text-center">
                  კომენტარის დასაწერად გაიარეთ ავტორიზაცია
                </p>
              )}
            </>
          )}
        </div>
      )}
    </article>

    {checkoutOpen && (
      <CheckoutModal
        post={post}
        initialPackage={isPremium ? effectivePackage : 'vip'}
        onClose={() => setCheckoutOpen(false)}
        onUpgraded={(postId, fields) => onPostUpdated?.(postId, fields)}
        addToast={addToast}
      />
    )}

    {promoOpen && (
      <PromoModal
        post={post}
        onClose={() => setPromoOpen(false)}
        onSaved={(promo) => onPostUpdated?.(post.id, { promo })}
        addToast={addToast}
      />
    )}
    </>
  );
}
