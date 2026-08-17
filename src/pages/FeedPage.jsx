import { useSearchParams } from 'react-router-dom';
import PostFeed from '../components/PostFeed';

// Discover / catalog — TNET-style marketplace (sidebar filters + dense grid).
// Rendered inside `.lp` so it inherits the flat marketplace tokens.
export default function FeedPage({ addToast }) {
  const [searchParams] = useSearchParams();

  return (
    <div className="lp min-h-screen">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-5 md:py-7">
        <PostFeed
          addToast={addToast}
          highlightId={searchParams.get('post')}
          initial={{
            search: searchParams.get('q') || '',
            location: searchParams.get('loc') || '',
            subject: searchParams.get('subject') || '',
            grades: searchParams.get('lvl') ? [searchParams.get('lvl')] : [],
            vipOnly: searchParams.get('vip') === '1',
          }}
        />
      </div>
    </div>
  );
}
