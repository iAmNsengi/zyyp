package models

import (
	"time"

	"github.com/google/uuid"
)

// UserProfile represents a user profile
type UserProfile struct {
	ID        uuid.UUID  `json:"id"`
	Username  string     `json:"username"`
	AvatarURL *string    `json:"avatar_url"`
	Bio       *string    `json:"bio"`
	Interests []string   `json:"interests"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}

// Tag represents an article tag
type Tag struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	Color     string    `json:"color"`
	CreatedAt time.Time `json:"created_at"`
}

// RSSSource represents an RSS feed source
type RSSSource struct {
	ID            uuid.UUID  `json:"id"`
	Name          string     `json:"name"`
	URL           string     `json:"url"`
	FaviconURL    *string    `json:"favicon_url"`
	Active        bool       `json:"active"`
	LastFetchedAt *time.Time `json:"last_fetched_at"`
	CreatedAt     time.Time  `json:"created_at"`
}

// Article represents a content article
type Article struct {
	ID                 uuid.UUID  `json:"id"`
	Title              string     `json:"title"`
	URL                string     `json:"url"`
	Description        *string    `json:"description"`
	Content            *string    `json:"content,omitempty"`
	Author             *string    `json:"author"`
	PublishedAt        *time.Time `json:"published_at"`
	SourceID           *uuid.UUID `json:"source_id"`
	SourceName         string     `json:"source_name"`
	ImageURL           *string    `json:"image_url"`
	ReadingTimeMinutes int        `json:"reading_time_minutes"`
	Upvotes            int        `json:"upvotes"`
	Downvotes          int        `json:"downvotes"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
	Tags               []Tag      `json:"tags,omitempty"`
	IsBookmarked       bool       `json:"is_bookmarked,omitempty"`
	UserVote           *string    `json:"user_vote,omitempty"` // "up", "down", or nil
}

// Bookmark represents a user's bookmark
type Bookmark struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	ArticleID uuid.UUID `json:"article_id"`
	CreatedAt time.Time `json:"created_at"`
	Article   *Article  `json:"article,omitempty"`
}

// Vote represents a user's vote on an article
type Vote struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	ArticleID uuid.UUID `json:"article_id"`
	VoteType  string    `json:"vote_type"` // "up" or "down"
	CreatedAt time.Time `json:"created_at"`
}

// ReadingHistory represents a user's reading history
type ReadingHistory struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	ArticleID uuid.UUID `json:"article_id"`
	ReadAt    time.Time `json:"read_at"`
}

// API Request/Response types

type ArticlesResponse struct {
	Articles   []Article `json:"articles"`
	TotalCount int       `json:"total_count"`
	Page       int       `json:"page"`
	PageSize   int       `json:"page_size"`
	HasMore    bool      `json:"has_more"`
}

type ArticleFilters struct {
	Tags     []string `query:"tags"`
	Search   string   `query:"search"`
	SortBy   string   `query:"sort_by"`   // "newest", "popular", "trending"
	Page     int      `query:"page"`
	PageSize int      `query:"page_size"`
}

type CreateBookmarkRequest struct {
	ArticleID uuid.UUID `json:"article_id"`
}

type VoteRequest struct {
	ArticleID uuid.UUID `json:"article_id"`
	VoteType  string    `json:"vote_type"` // "up" or "down"
}

type UpdateProfileRequest struct {
	Username  *string  `json:"username"`
	Bio       *string  `json:"bio"`
	AvatarURL *string  `json:"avatar_url"`
	Interests []string `json:"interests"`
}

type CreateArticleRequest struct {
	Title       string    `json:"title"`
	URL         string    `json:"url"`
	Description *string   `json:"description"`
	Author      *string   `json:"author"`
	SourceName  string    `json:"source_name"`
	ImageURL    *string   `json:"image_url"`
	TagIDs      []uuid.UUID `json:"tag_ids"`
}

type CreateRSSSourceRequest struct {
	Name       string  `json:"name"`
	URL        string  `json:"url"`
	FaviconURL *string `json:"favicon_url"`
}

type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
}

type SuccessResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Message string      `json:"message,omitempty"`
}
