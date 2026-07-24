import { useNavigate } from 'react-router-dom';
import CreatePost from '../components/CreatePost';

export default function NewPostPage({ addToast }) {
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0">
          <i className="fas fa-plus-circle text-emerald-400"></i>
        </div>
        <div>
          <h1 className="text-white font-bold text-xl m-0 leading-tight">პოსტის დამატება</h1>
          <p className="text-[12px] text-[#71717a] m-0 mt-0.5">
            გამოაქვეყნეთ განცხადება — ის მაშინვე გამოჩნდება საჯარო კატალოგში
          </p>
        </div>
      </div>

      <CreatePost addToast={addToast} onPostCreated={() => navigate('/')} />
    </div>
  );
}
