import { useQuery } from '@tanstack/react-query';
import { Sidebar } from '../components/Sidebar';
import { Feed } from '../components/Feed';
import { TrendingSection } from '../components/TrendingSection';
import { getTags } from '../lib/api';

export function HomePage() {
  const { data: tags = [], isLoading: tagsLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: getTags,
  });

  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      {/* Sidebar */}
      <Sidebar tags={tags} isLoading={tagsLoading} />

      {/* Main Content */}
      <div className="flex-1 flex">
        <Feed />

        {/* Right Sidebar - Trending (Desktop) */}
        <aside className="hidden xl:block w-80 p-4 border-l" style={{ borderColor: 'var(--color-border)' }}>
          <TrendingSection />
          
          {/* Newsletter CTA */}
          <div 
            className="p-4 border"
            style={{ 
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)'
            }}
          >
            <h3 
              className="font-semibold mb-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Weekly Digest
            </h3>
            <p 
              className="text-sm mb-4"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Get the top 5 articles delivered to your inbox every week.
            </p>
            <input
              type="email"
              placeholder="you@example.com"
              className="input mb-2"
              style={{ borderRadius: 0 }}
            />
            <button 
              className="btn btn-primary w-full"
              style={{ borderRadius: 0 }}
            >
              Subscribe
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
