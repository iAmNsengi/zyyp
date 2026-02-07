import { useState } from 'react';
import { ArrowUp, ArrowDown, Bookmark, ExternalLink, Clock, Calendar } from 'lucide-react';
import type { Article } from '../types';
import { useAuthStore } from '../stores';
import { createBookmark, deleteBookmark, vote, removeVote } from '../lib/api';

interface ArticleCardProps {
  article: Article;
}

export function ArticleCard({ article }: ArticleCardProps) {
  const { isAuthenticated } = useAuthStore();
  const [isBookmarked, setIsBookmarked] = useState(article.is_bookmarked || false);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(article.user_vote || null);
  const [upvotes, setUpvotes] = useState(article.upvotes);
  const [downvotes, setDownvotes] = useState(article.downvotes);
  const [isVoteAnimating, setIsVoteAnimating] = useState(false);
  const [isBookmarkAnimating, setIsBookmarkAnimating] = useState(false);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleVote = async (voteType: 'up' | 'down') => {
    if (!isAuthenticated) return;

    setIsVoteAnimating(true);
    setTimeout(() => setIsVoteAnimating(false), 300);

    try {
      if (userVote === voteType) {
        // Remove vote
        const result = await removeVote(article.id);
        if (result.data) {
          setUpvotes(result.data.upvotes);
          setDownvotes(result.data.downvotes);
          setUserVote(null);
        }
      } else {
        // Add or change vote
        const result = await vote(article.id, voteType);
        if (result.data) {
          setUpvotes(result.data.upvotes);
          setDownvotes(result.data.downvotes);
          setUserVote(voteType);
        }
      }
    } catch (error) {
      console.error('Vote error:', error);
    }
  };

  const handleBookmark = async () => {
    if (!isAuthenticated) return;

    setIsBookmarkAnimating(true);
    setTimeout(() => setIsBookmarkAnimating(false), 300);

    try {
      if (isBookmarked) {
        await deleteBookmark(article.id);
        setIsBookmarked(false);
      } else {
        await createBookmark(article.id);
        setIsBookmarked(true);
      }
    } catch (error) {
      console.error('Bookmark error:', error);
    }
  };

  const netVotes = upvotes - downvotes;

  return (
    <article
      className="card group relative overflow-hidden fade-in"
      style={{ borderRadius: 0 }}
    >
      <div className="flex flex-col md:flex-row">
        {/* Thumbnail */}
        {article.image_url && (
          <div className="md:w-48 md:flex-shrink-0">
            <img
              src={article.image_url}
              alt=""
              className="w-full h-40 md:h-full object-cover"
              loading="lazy"
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 p-4">
          {/* Tags */}
          {article.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {article.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag.id}
                  className="tag"
                  style={{
                    backgroundColor: `${tag.color}20`,
                    color: tag.color,
                    borderRadius: 0,
                  }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          {/* Title */}
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group/link"
          >
            <h2
              className="text-lg font-semibold mb-2 line-clamp-2 group-hover/link:underline"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {article.title}
            </h2>
          </a>

          {/* Description */}
          {article.description && (
            <p
              className="text-sm mb-3 line-clamp-2"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {article.description}
            </p>
          )}

          {/* Metadata Row */}
          <div
            className="flex items-center gap-3 text-xs mb-3"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <span className="font-medium">{article.source_name}</span>
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {article.reading_time_minutes} min read
            </span>
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {formatDate(article.published_at)}
            </span>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-2">
            {/* Vote Buttons */}
            <div
              className="flex items-center border"
              style={{ borderColor: 'var(--color-border)', borderRadius: 0 }}
            >
              <button
                onClick={() => handleVote('up')}
                disabled={!isAuthenticated}
                className={`p-2 transition-colors ${isVoteAnimating && userVote === 'up' ? 'vote-animate' : ''}`}
                style={{
                  color: userVote === 'up' ? 'var(--color-success)' : 'var(--color-text-muted)',
                  cursor: isAuthenticated ? 'pointer' : 'not-allowed',
                }}
                aria-label="Upvote"
              >
                <ArrowUp size={16} />
              </button>
              <span
                className="px-2 text-sm font-medium min-w-[2rem] text-center"
                style={{
                  color: netVotes > 0 ? 'var(--color-success)' : netVotes < 0 ? 'var(--color-error)' : 'var(--color-text-muted)'
                }}
              >
                {netVotes}
              </span>
              <button
                onClick={() => handleVote('down')}
                disabled={!isAuthenticated}
                className={`p-2 transition-colors ${isVoteAnimating && userVote === 'down' ? 'vote-animate' : ''}`}
                style={{
                  color: userVote === 'down' ? 'var(--color-error)' : 'var(--color-text-muted)',
                  cursor: isAuthenticated ? 'pointer' : 'not-allowed',
                }}
                aria-label="Downvote"
              >
                <ArrowDown size={16} />
              </button>
            </div>

            {/* Bookmark Button */}
            <button
              onClick={handleBookmark}
              disabled={!isAuthenticated}
              className={`btn btn-ghost p-2 ${isBookmarkAnimating ? 'vote-animate' : ''}`}
              style={{
                color: isBookmarked ? 'var(--color-accent-primary)' : 'var(--color-text-muted)',
                borderRadius: 0,
                cursor: isAuthenticated ? 'pointer' : 'not-allowed',
              }}
              aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
            >
              <Bookmark size={16} fill={isBookmarked ? 'currentColor' : 'none'} />
            </button>

            {/* External Link */}
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost p-2 ml-auto"
              style={{ borderRadius: 0, color: 'var(--color-text-muted)' }}
              aria-label="Open article"
            >
              <ExternalLink size={16} />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

// Skeleton loader
export function ArticleCardSkeleton() {
  return (
    <div
      className="card overflow-hidden"
      style={{ borderRadius: 0 }}
    >
      <div className="flex flex-col md:flex-row">
        <div className="md:w-48 md:flex-shrink-0">
          <div className="skeleton w-full h-40 md:h-full" style={{ borderRadius: 0 }} />
        </div>
        <div className="flex-1 p-4">
          <div className="flex gap-2 mb-2">
            <div className="skeleton h-5 w-16" style={{ borderRadius: 0 }} />
            <div className="skeleton h-5 w-20" style={{ borderRadius: 0 }} />
          </div>
          <div className="skeleton h-6 w-3/4 mb-2" style={{ borderRadius: 0 }} />
          <div className="skeleton h-4 w-full mb-1" style={{ borderRadius: 0 }} />
          <div className="skeleton h-4 w-2/3 mb-3" style={{ borderRadius: 0 }} />
          <div className="flex gap-3 mb-3">
            <div className="skeleton h-3 w-20" style={{ borderRadius: 0 }} />
            <div className="skeleton h-3 w-16" style={{ borderRadius: 0 }} />
            <div className="skeleton h-3 w-24" style={{ borderRadius: 0 }} />
          </div>
          <div className="flex gap-2">
            <div className="skeleton h-8 w-24" style={{ borderRadius: 0 }} />
            <div className="skeleton h-8 w-8" style={{ borderRadius: 0 }} />
          </div>
        </div>
      </div>
    </div>
  );
}
