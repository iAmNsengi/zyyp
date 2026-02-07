import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bookmark as BookmarkIcon } from 'lucide-react';
import { ArticleCard, ArticleCardSkeleton } from '../components/ArticleCard';
import { getBookmarks } from '../lib/api';
import { useAuthStore } from '../stores';

export function BookmarksPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['bookmarks'],
    queryFn: () => getBookmarks(1, 50),
    enabled: isAuthenticated,
  });

  // Redirect if not authenticated
  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  const articles = data?.articles || [];

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="btn btn-ghost p-2"
          style={{ borderRadius: 0 }}
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 
            className="text-2xl font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Bookmarks
          </h1>
          <p 
            className="text-sm mt-1"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            {articles.length} saved {articles.length === 1 ? 'article' : 'articles'}
          </p>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <ArticleCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && articles.length === 0 && (
        <div 
          className="text-center py-16"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          <div 
            className="w-16 h-16 mx-auto mb-4 flex items-center justify-center"
            style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
          >
            <BookmarkIcon size={32} style={{ color: 'var(--color-text-muted)' }} />
          </div>
          <p className="text-lg font-medium">No bookmarks yet</p>
          <p className="text-sm mt-1">
            Articles you bookmark will appear here
          </p>
          <button
            onClick={() => navigate('/')}
            className="btn btn-primary mt-6"
            style={{ borderRadius: 0 }}
          >
            Explore articles
          </button>
        </div>
      )}

      {/* Bookmarked Articles */}
      {!isLoading && articles.length > 0 && (
        <div className="space-y-4">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
