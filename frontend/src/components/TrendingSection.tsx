import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Clock, Flame } from 'lucide-react';
import { getTrendingArticles } from '../lib/api';
import type { Article } from '../types';

export function TrendingSection() {
    const { data: articles = [], isLoading } = useQuery({
        queryKey: ['trending'],
        queryFn: () => getTrendingArticles(5),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    if (isLoading) {
        return (
            <section
                className="p-4 mb-6 border"
                style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    borderColor: 'var(--color-border)'
                }}
            >
                <div className="flex items-center gap-2 mb-4">
                    <Flame size={18} style={{ color: 'var(--color-warning)' }} />
                    <h2
                        className="font-semibold"
                        style={{ color: 'var(--color-text-primary)' }}
                    >
                        Trending This Week
                    </h2>
                </div>
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex gap-3">
                            <div
                                className="skeleton w-6 h-6 flex-shrink-0"
                                style={{ borderRadius: 0 }}
                            />
                            <div className="flex-1">
                                <div className="skeleton h-4 w-full mb-1" style={{ borderRadius: 0 }} />
                                <div className="skeleton h-3 w-1/3" style={{ borderRadius: 0 }} />
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        );
    }

    if (articles.length === 0) return null;

    return (
        <section
            className="p-4 mb-6 border"
            style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)'
            }}
        >
            <div className="flex items-center gap-2 mb-4">
                <Flame size={18} style={{ color: 'var(--color-warning)' }} />
                <h2
                    className="font-semibold"
                    style={{ color: 'var(--color-text-primary)' }}
                >
                    Trending This Week
                </h2>
            </div>

            <div className="space-y-3">
                {articles.map((article, index) => (
                    <TrendingItem key={article.id} article={article} rank={index + 1} />
                ))}
            </div>
        </section>
    );
}

function TrendingItem({ article, rank }: { article: Article; rank: number }) {
    return (
        <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex gap-3 group"
        >
            <span
                className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-sm font-bold"
                style={{
                    backgroundColor: rank <= 3 ? 'var(--color-warning)' : 'var(--color-bg-tertiary)',
                    color: rank <= 3 ? 'white' : 'var(--color-text-muted)'
                }}
            >
                {rank}
            </span>
            <div className="flex-1 min-w-0">
                <h3
                    className="text-sm font-medium line-clamp-2 group-hover:underline"
                    style={{ color: 'var(--color-text-primary)' }}
                >
                    {article.title}
                </h3>
                <div
                    className="flex items-center gap-2 mt-1 text-xs"
                    style={{ color: 'var(--color-text-muted)' }}
                >
                    <span className="flex items-center gap-1">
                        <TrendingUp size={10} />
                        {article.upvotes}
                    </span>
                    <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {article.reading_time_minutes} min
                    </span>
                </div>
            </div>
        </a>
    );
}
