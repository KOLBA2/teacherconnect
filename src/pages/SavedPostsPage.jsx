import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import PostCard from '../components/PostCard';

export default function SavedPostsPage({ addToast }) {
  const { token } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadSaved = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch('/posts/saved', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPosts(data.posts || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  const handlePostUpdated = (postId, fields) => {
    // Unsaving from this page removes the card entirely — it no longer
    // belongs to the list being viewed.
    if (fields.isSaved === false) {
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      return;
    }
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, ...fields } : p)));
  };

  const handlePostRemoved = (postId) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center shrink-0">
          <i className="fas fa-bookmark text-indigo-400"></i>
        </div>
        <div>
          <h1 className="text-white font-bold text-xl m-0 leading-tight">შენახული პოსტები</h1>
          <p className="text-[12px] text-[#71717a] m-0 mt-0.5">
            {posts.length > 0 ? `${posts.length} შენახული პოსტი` : 'თქვენი შენახული განცხადებები'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <i className="fas fa-circle-notch fa-spin text-indigo-400 text-2xl mb-3"></i>
          <p className="text-[13px] text-[#71717a] m-0">იტვირთება...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-6">
          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-3">
            <i className="fas fa-exclamation-triangle text-red-400 text-xl"></i>
          </div>
          <p className="text-[13px] text-[#f87171] font-semibold m-0">{error}</p>
          <button
            onClick={loadSaved}
            className="mt-4 px-4 py-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 text-indigo-400 text-[12px] font-semibold cursor-pointer transition-all"
          >
            <i className="fas fa-redo mr-1.5 text-[10px]"></i>ხელახლა ცდა
          </button>
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-white/[0.03] border border-[#27272a] flex items-center justify-center mb-3">
            <i className="far fa-bookmark text-[#3f3f46] text-xl"></i>
          </div>
          <p className="text-[13px] text-[#71717a] m-0">შენახული პოსტები არ არის</p>
          <p className="text-[11px] text-[#3f3f46] m-0 mt-1">
            კატალოგში პოსტის შესანახად დააჭირეთ <i className="far fa-bookmark"></i> ღილაკს
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              addToast={addToast}
              onPostUpdated={handlePostUpdated}
              onPostRemoved={handlePostRemoved}
            />
          ))}
        </div>
      )}
    </div>
  );
}
