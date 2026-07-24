import { useSearchParams } from 'react-router-dom';
import { Compass } from 'lucide-react';
import PostFeed from '../components/PostFeed';

export default function FeedPage({ addToast }) {
  const [searchParams] = useSearchParams();

  return (
    <div id="feed-container" className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center shrink-0">
          <Compass size={20} className="text-indigo-400" strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="text-white font-bold text-xl m-0 leading-tight">კატალოგი</h1>
          <p className="text-[12px] text-[#71717a] m-0 mt-0.5">აღმოაჩინე მასწავლებლები და გაკვეთილები</p>
        </div>
      </div>

      <PostFeed addToast={addToast} highlightId={searchParams.get('post')} />
    </div>
  );
}
