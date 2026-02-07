import { useEffect, useRef, useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ChevronDown, Filter, X } from 'lucide-react';
import { ArticleCard, ArticleCardSkeleton } from './ArticleCard';
import { getArticles, getTags } from '../lib/api';
import { useFilterStore } from '../stores';
import type { SortOption } from '../types';

export function Feed() {
  const [searchParams] = useSearchParams();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const { selectedTags, searchQuery, sortBy, setSortBy, clearFilters } = useFilterStore();
  const [isSortOpen, setIsSortOpen] = useState(false);

  // Get search from URL params
  const urlSearch = searchParams.get('search') || '';
  const effectiveSearch = urlSearch || searchQuery;

  // Fetch tags
  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: getTags,
  });

  // Fetch articles with infinite scroll
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: ['articles', selectedTags, effectiveSearch, sortBy],
    queryFn: ({ pageParam = 1 }) =>
      getArticles({
        tags: selectedTags,
        search: effectiveSearch,
        sort_by: sortBy,
        page: pageParam,
        page_size: 20,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
  });

  // Intersection observer for infinite scroll
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      threshold: 0.1,
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [handleObserver]);

  const articles = data?.pages.flatMap((page) => page.articles) || [];
  const totalCount = data?.pages[0]?.total_count || 0;
  const hasActiveFilters = selectedTags.length > 0 || effectiveSearch;

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'newest', label: 'Newest' },
    { value: 'popular', label: 'Most Popular' },
    { value: 'trending', label: 'Trending' },
  ];

  return (
    <div className="flex-1 py-6 px-4 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {effectiveSearch ? `Search: "${effectiveSearch}"` : 'Discover'}
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            {totalCount > 0 ? `${totalCount} articles` : 'Showing latest articles'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="btn btn-ghost text-sm"
              style={{ borderRadius: 0, color: 'var(--color-text-secondary)' }}
            >
              <X size={16} />
              Clear filters
            </button>
          )}

          {/* Sort Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="btn btn-secondary flex items-center gap-2"
              style={{ borderRadius: 0 }}
            >
              <Filter size={16} />
              {sortOptions.find((o) => o.value === sortBy)?.label}
              <ChevronDown size={16} />
            </button>

            {isSortOpen && (
              <div
                className="absolute right-0 mt-2 w-40 py-1 shadow-lg border z-10 fade-in"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)'
                }}
              >
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSortBy(option.value);
                      setIsSortOpen(false);
                    }}
                    className="w-full px-4 py-2 text-sm text-left hover:bg-[var(--color-bg-tertiary)]"
                    style={{
                      color: sortBy === option.value
                        ? 'var(--color-accent-primary)'
                        : 'var(--color-text-secondary)',
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Tag Filters */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedTags.map((slug) => {
            const tag = tags.find((t) => t.slug === slug);
            return tag ? (
              <span
                key={slug}
                className="tag flex items-center gap-1"
                style={{
                  backgroundColor: `${tag.color}20`,
                  color: tag.color,
                  borderRadius: 0,
                }}
              >
                {tag.name}
                <button
                  onClick={() => useFilterStore.getState().toggleTag(slug)}
                  className="hover:opacity-70"
                  aria-label={`Remove ${tag.name} filter`}
                >
                  <X size={12} />
                </button>
              </span>
            ) : null;
          })}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div
          className="text-center py-12"
          style={{ color: 'var(--color-error)' }}
        >
          <p className="text-lg font-medium">Failed to load articles</p>
          <p className="text-sm mt-1">Please try again later</p>
        </div>
      )}

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
            <Filter size={32} style={{ color: 'var(--color-text-muted)' }} />
          </div>
          <p className="text-lg font-medium">No articles found</p>
          <p className="text-sm mt-1">
            {hasActiveFilters
              ? 'Try adjusting your filters or search query'
              : 'Check back later for new content'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="btn btn-primary mt-4"
              style={{ borderRadius: 0 }}
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Articles Grid */}
      {!isLoading && articles.length > 0 && (
        <div className="space-y-4">
          {articles.map((article, index) => (
            <ArticleCard
              key={`${article.id}-${index}`}
              article={article}
            />
          ))}
        </div>
      )}

      {/* Load More Trigger */}
      <div ref={loadMoreRef} className="py-8">
        {isFetchingNextPage && (
          <div className="flex justify-center">
            <div className="space-y-4 w-full">
              <ArticleCardSkeleton />
              <ArticleCardSkeleton />
            </div>
          </div>
        )}
        {!hasNextPage && articles.length > 0 && (
          <p
            className="text-center text-sm"
            style={{ color: 'var(--color-text-muted)' }}
          >
            You've reached the end
          </p>
        )}
      </div>
    </div>
  );
}
