import { Link, useLocation } from 'react-router-dom';
import { Home, Compass, Bookmark, TrendingUp, Settings } from 'lucide-react';
import { useAuthStore, useFilterStore } from '../stores';
import type { Tag } from '../types';

interface SidebarProps {
    tags: Tag[];
    isLoading?: boolean;
}

export function Sidebar({ tags, isLoading }: SidebarProps) {
    const location = useLocation();
    const { isAuthenticated } = useAuthStore();
    const { selectedTags, toggleTag } = useFilterStore();

    const navItems = [
        { path: '/', label: 'My Feed', icon: Home, requiresAuth: true },
        { path: '/discover', label: 'Discover', icon: Compass, requiresAuth: false },
        { path: '/bookmarks', label: 'Bookmarks', icon: Bookmark, requiresAuth: true },
        { path: '/popular', label: 'Popular', icon: TrendingUp, requiresAuth: false },
    ];

    const filteredNavItems = navItems.filter(item => !item.requiresAuth || isAuthenticated);

    return (
        <aside
            className="hidden lg:flex flex-col w-60 h-[calc(100vh-64px)] sticky top-16 border-r overflow-y-auto no-scrollbar"
            style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)'
            }}
        >
            <div className="p-4">
                {/* Navigation */}
                <nav className="space-y-1">
                    {filteredNavItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className="flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors"
                                style={{
                                    color: isActive ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
                                    backgroundColor: isActive ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                                }}
                            >
                                <Icon size={18} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Divider */}
                <div
                    className="my-4 h-px"
                    style={{ backgroundColor: 'var(--color-border)' }}
                />

                {/* Tags Filter */}
                <div>
                    <h3
                        className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider"
                        style={{ color: 'var(--color-text-muted)' }}
                    >
                        Topics
                    </h3>

                    {isLoading ? (
                        <div className="space-y-2 px-3">
                            {[...Array(6)].map((_, i) => (
                                <div
                                    key={i}
                                    className="skeleton h-6 w-full"
                                    style={{ borderRadius: 0 }}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-0.5">
                            {tags.map((tag) => {
                                const isSelected = selectedTags.includes(tag.slug);

                                return (
                                    <button
                                        key={tag.id}
                                        onClick={() => toggleTag(tag.slug)}
                                        className="flex items-center justify-between w-full px-3 py-1.5 text-sm text-left transition-colors"
                                        style={{
                                            color: isSelected ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
                                            backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                                        }}
                                    >
                                        <span className="flex items-center gap-2">
                                            <span
                                                className="w-2 h-2"
                                                style={{ backgroundColor: tag.color }}
                                            />
                                            {tag.name}
                                        </span>
                                        {tag.article_count !== undefined && (
                                            <span
                                                className="text-xs"
                                                style={{ color: 'var(--color-text-muted)' }}
                                            >
                                                {tag.article_count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Customize Feed CTA */}
                {isAuthenticated && (
                    <>
                        <div
                            className="my-4 h-px"
                            style={{ backgroundColor: 'var(--color-border)' }}
                        />
                        <Link
                            to="/settings"
                            className="flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors"
                            style={{ color: 'var(--color-text-tertiary)' }}
                        >
                            <Settings size={18} />
                            Customize feed
                        </Link>
                    </>
                )}
            </div>
        </aside>
    );
}
