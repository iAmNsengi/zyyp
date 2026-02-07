// API Types matching backend models

export interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string;
  created_at: string;
  article_count?: number;
}

export interface Article {
  id: string;
  title: string;
  url: string;
  description: string | null;
  content?: string | null;
  author: string | null;
  published_at: string | null;
  source_id: string | null;
  source_name: string;
  image_url: string | null;
  reading_time_minutes: number;
  upvotes: number;
  downvotes: number;
  created_at: string;
  updated_at: string;
  tags: Tag[];
  is_bookmarked?: boolean;
  user_vote?: 'up' | 'down' | null;
}

export interface ArticlesResponse {
  articles: Article[];
  total_count: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

export interface UserProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  interests: string[];
  created_at: string;
  updated_at: string;
}

export interface ReadingStats {
  total_articles_read: number;
  total_reading_time_minutes: number;
  current_streak_days: number;
  longest_streak_days: number;
  total_bookmarks: number;
  total_votes: number;
}

export interface RSSSource {
  id: string;
  name: string;
  url: string;
  favicon_url: string | null;
  active: boolean;
  last_fetched_at: string | null;
  created_at: string;
}

export interface ErrorResponse {
  error: string;
  message?: string;
}

export interface SuccessResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface VoteResponse {
  upvotes: number;
  downvotes: number;
  user_vote: 'up' | 'down' | null;
}

// Filter types
export type SortOption = 'newest' | 'popular' | 'trending';

export interface ArticleFilters {
  tags?: string[];
  search?: string;
  sort_by?: SortOption;
  page?: number;
  page_size?: number;
}
