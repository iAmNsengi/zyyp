import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile } from '../types';
import { supabase, type AuthUser } from '../lib/supabase';

interface AuthState {
    user: AuthUser | null;
    profile: UserProfile | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    setUser: (user: AuthUser | null) => void;
    setProfile: (profile: UserProfile | null) => void;
    signInWithGitHub: () => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
    initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    profile: null,
    isLoading: true,
    isAuthenticated: false,

    setUser: (user) => {
        set({ user, isAuthenticated: !!user });
    },

    setProfile: (profile) => {
        set({ profile });
    },

    signInWithGitHub: async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'github',
            options: {
                redirectTo: window.location.origin,
            },
        });
        if (error) throw error;
    },

    signInWithGoogle: async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
            },
        });
        if (error) throw error;
    },

    signOut: async () => {
        await supabase.auth.signOut();
        localStorage.removeItem('access_token');
        set({ user: null, profile: null, isAuthenticated: false });
    },

    initialize: async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (session?.user) {
                localStorage.setItem('access_token', session.access_token);
                set({
                    user: {
                        id: session.user.id,
                        email: session.user.email,
                        user_metadata: session.user.user_metadata,
                    },
                    isAuthenticated: true,
                });
            }
        } catch (error) {
            console.error('Auth initialization error:', error);
        } finally {
            set({ isLoading: false });
        }

        // Listen for auth changes
        supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                localStorage.setItem('access_token', session.access_token);
                set({
                    user: {
                        id: session.user.id,
                        email: session.user.email,
                        user_metadata: session.user.user_metadata,
                    },
                    isAuthenticated: true,
                });
            } else {
                localStorage.removeItem('access_token');
                set({ user: null, profile: null, isAuthenticated: false });
            }
        });
    },
}));

// Theme Store
interface ThemeState {
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    setTheme: (theme: 'light' | 'dark') => void;
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set, get) => ({
            theme: 'light',

            toggleTheme: () => {
                const newTheme = get().theme === 'light' ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', newTheme);
                set({ theme: newTheme });
            },

            setTheme: (theme) => {
                document.documentElement.setAttribute('data-theme', theme);
                set({ theme });
            },
        }),
        {
            name: 'zyyp-theme',
            onRehydrateStorage: () => (state) => {
                if (state) {
                    // Check system preference on first load
                    if (!localStorage.getItem('zyyp-theme')) {
                        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                        state.setTheme(prefersDark ? 'dark' : 'light');
                    } else {
                        document.documentElement.setAttribute('data-theme', state.theme);
                    }
                }
            },
        }
    )
);

// Filter Store
interface FilterState {
    selectedTags: string[];
    searchQuery: string;
    sortBy: 'newest' | 'popular' | 'trending';
    toggleTag: (slug: string) => void;
    setSearchQuery: (query: string) => void;
    setSortBy: (sort: 'newest' | 'popular' | 'trending') => void;
    clearFilters: () => void;
}

export const useFilterStore = create<FilterState>((set, get) => ({
    selectedTags: [],
    searchQuery: '',
    sortBy: 'newest',

    toggleTag: (slug) => {
        const current = get().selectedTags;
        const updated = current.includes(slug)
            ? current.filter((t) => t !== slug)
            : [...current, slug];
        set({ selectedTags: updated });
    },

    setSearchQuery: (query) => {
        set({ searchQuery: query });
    },

    setSortBy: (sortBy) => {
        set({ sortBy });
    },

    clearFilters: () => {
        set({ selectedTags: [], searchQuery: '', sortBy: 'newest' });
    },
}));
