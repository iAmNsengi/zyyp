import type { Article, ArticlesResponse, Tag, ArticleFilters, SuccessResponse, VoteResponse, UserProfile, ReadingStats } from '../types';

const API_BASE = '/api';

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const token = localStorage.getItem('access_token');

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options?.headers,
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.message || error.error || 'Request failed');
    }

    return response.json();
}

// Articles
export async function getArticles(filters: ArticleFilters = {}): Promise<ArticlesResponse> {
    const params = new URLSearchParams();

    if (filters.tags?.length) params.set('tags', filters.tags.join(','));
    if (filters.search) params.set('search', filters.search);
    if (filters.sort_by) params.set('sort_by', filters.sort_by);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.page_size) params.set('page_size', String(filters.page_size));

    const query = params.toString();
    return fetchAPI<ArticlesResponse>(`/articles${query ? `?${query}` : ''}`);
}

export async function getArticle(id: string): Promise<Article> {
    return fetchAPI<Article>(`/articles/${id}`);
}

export async function getTrendingArticles(limit = 10): Promise<Article[]> {
    return fetchAPI<Article[]>(`/articles/trending?limit=${limit}`);
}

// Tags
export async function getTags(): Promise<Tag[]> {
    return fetchAPI<Tag[]>('/tags');
}

export async function getPopularTags(): Promise<Tag[]> {
    return fetchAPI<Tag[]>('/tags/popular');
}

// Bookmarks
export async function getBookmarks(page = 1, pageSize = 20): Promise<ArticlesResponse> {
    return fetchAPI<ArticlesResponse>(`/bookmarks?page=${page}&page_size=${pageSize}`);
}

export async function createBookmark(articleId: string): Promise<SuccessResponse<{ id: string }>> {
    return fetchAPI<SuccessResponse<{ id: string }>>('/bookmarks', {
        method: 'POST',
        body: JSON.stringify({ article_id: articleId }),
    });
}

export async function deleteBookmark(articleId: string): Promise<SuccessResponse> {
    return fetchAPI<SuccessResponse>(`/bookmarks/${articleId}`, {
        method: 'DELETE',
    });
}

// Votes
export async function vote(articleId: string, voteType: 'up' | 'down'): Promise<SuccessResponse<VoteResponse>> {
    return fetchAPI<SuccessResponse<VoteResponse>>('/votes', {
        method: 'POST',
        body: JSON.stringify({ article_id: articleId, vote_type: voteType }),
    });
}

export async function removeVote(articleId: string): Promise<SuccessResponse<VoteResponse>> {
    return fetchAPI<SuccessResponse<VoteResponse>>(`/votes/${articleId}`, {
        method: 'DELETE',
    });
}

// Profile
export async function getProfile(): Promise<UserProfile> {
    return fetchAPI<UserProfile>('/profile');
}

export async function updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    return fetchAPI<UserProfile>('/profile', {
        method: 'PATCH',
        body: JSON.stringify(data),
    });
}

export async function getReadingStats(): Promise<ReadingStats> {
    return fetchAPI<ReadingStats>('/profile/stats');
}
