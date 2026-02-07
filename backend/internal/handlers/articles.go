package handlers

import (
	"context"
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/zyyp/backend/internal/database"
	"github.com/zyyp/backend/internal/middleware"
	"github.com/zyyp/backend/internal/models"
)

// GetArticles returns paginated articles with optional filters
func GetArticles(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Parse query parameters
	page, _ := strconv.Atoi(c.Query("page", "1"))
	if page < 1 {
		page = 1
	}
	pageSize, _ := strconv.Atoi(c.Query("page_size", "20"))
	if pageSize < 1 || pageSize > 50 {
		pageSize = 20
	}
	offset := (page - 1) * pageSize

	sortBy := c.Query("sort_by", "newest")
	search := c.Query("search", "")
	tagsParam := c.Query("tags", "")

	var tags []string
	if tagsParam != "" {
		tags = strings.Split(tagsParam, ",")
	}

	// Build query
	baseQuery := `
		SELECT DISTINCT a.id, a.title, a.url, a.description, a.author, 
			a.published_at, a.source_id, a.source_name, a.image_url, 
			a.reading_time_minutes, a.upvotes, a.downvotes, a.created_at, a.updated_at
		FROM articles a
	`

	countQuery := `SELECT COUNT(DISTINCT a.id) FROM articles a`
	
	var whereConditions []string
	var args []interface{}
	argIndex := 1

	// Join for tag filtering
	if len(tags) > 0 {
		baseQuery += ` JOIN article_tags at ON a.id = at.article_id JOIN tags t ON at.tag_id = t.id`
		countQuery += ` JOIN article_tags at ON a.id = at.article_id JOIN tags t ON at.tag_id = t.id`
		
		placeholders := make([]string, len(tags))
		for i, tag := range tags {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, tag)
			argIndex++
		}
		whereConditions = append(whereConditions, fmt.Sprintf("t.slug IN (%s)", strings.Join(placeholders, ",")))
	}

	// Search filter
	if search != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("(a.title ILIKE $%d OR a.description ILIKE $%d)", argIndex, argIndex))
		args = append(args, "%"+search+"%")
		argIndex++
	}

	// Build WHERE clause
	if len(whereConditions) > 0 {
		whereClause := " WHERE " + strings.Join(whereConditions, " AND ")
		baseQuery += whereClause
		countQuery += whereClause
	}

	// Order by
	switch sortBy {
	case "popular":
		baseQuery += " ORDER BY a.upvotes DESC, a.created_at DESC"
	case "trending":
		// Trending = recent + popular (weighted by recency)
		baseQuery += " ORDER BY (a.upvotes * 1.0 / (EXTRACT(EPOCH FROM NOW() - a.created_at) / 3600 + 1)) DESC, a.created_at DESC"
	default: // newest
		baseQuery += " ORDER BY a.published_at DESC NULLS LAST, a.created_at DESC"
	}

	// Pagination
	baseQuery += fmt.Sprintf(" LIMIT $%d OFFSET $%d", argIndex, argIndex+1)
	args = append(args, pageSize, offset)

	// Get total count
	var totalCount int
	countArgs := args[:len(args)-2] // Remove pagination args
	err := database.Pool.QueryRow(ctx, countQuery, countArgs...).Scan(&totalCount)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error: "Failed to count articles",
		})
	}

	// Get articles
	rows, err := database.Pool.Query(ctx, baseQuery, args...)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error:   "Failed to fetch articles",
			Message: err.Error(),
		})
	}
	defer rows.Close()

	var articles []models.Article
	for rows.Next() {
		var a models.Article
		err := rows.Scan(
			&a.ID, &a.Title, &a.URL, &a.Description, &a.Author,
			&a.PublishedAt, &a.SourceID, &a.SourceName, &a.ImageURL,
			&a.ReadingTimeMinutes, &a.Upvotes, &a.Downvotes, &a.CreatedAt, &a.UpdatedAt,
		)
		if err != nil {
			continue
		}
		a.Tags = getArticleTags(ctx, a.ID)
		articles = append(articles, a)
	}

	// Get user-specific data if authenticated
	if userID, ok := middleware.GetUserID(c); ok {
		articles = enrichArticlesWithUserData(ctx, articles, userID)
	}

	hasMore := totalCount > (page * pageSize)

	return c.JSON(models.ArticlesResponse{
		Articles:   articles,
		TotalCount: totalCount,
		Page:       page,
		PageSize:   pageSize,
		HasMore:    hasMore,
	})
}

// GetArticle returns a single article by ID
func GetArticle(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	articleID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error: "Invalid article ID",
		})
	}

	var a models.Article
	err = database.Pool.QueryRow(ctx, `
		SELECT id, title, url, description, content, author, published_at, 
			source_id, source_name, image_url, reading_time_minutes, 
			upvotes, downvotes, created_at, updated_at
		FROM articles WHERE id = $1
	`, articleID).Scan(
		&a.ID, &a.Title, &a.URL, &a.Description, &a.Content, &a.Author,
		&a.PublishedAt, &a.SourceID, &a.SourceName, &a.ImageURL,
		&a.ReadingTimeMinutes, &a.Upvotes, &a.Downvotes, &a.CreatedAt, &a.UpdatedAt,
	)

	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(models.ErrorResponse{
			Error: "Article not found",
		})
	}

	a.Tags = getArticleTags(ctx, a.ID)

	// Get user-specific data
	if userID, ok := middleware.GetUserID(c); ok {
		articles := enrichArticlesWithUserData(ctx, []models.Article{a}, userID)
		if len(articles) > 0 {
			a = articles[0]
		}
	}

	return c.JSON(a)
}

// GetTrendingArticles returns trending articles
func GetTrendingArticles(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	if limit < 1 || limit > 50 {
		limit = 10
	}

	// Trending = upvotes weighted by recency (articles from last 7 days)
	rows, err := database.Pool.Query(ctx, `
		SELECT id, title, url, description, author, published_at, 
			source_id, source_name, image_url, reading_time_minutes, 
			upvotes, downvotes, created_at, updated_at
		FROM articles
		WHERE created_at > NOW() - INTERVAL '7 days'
		ORDER BY (upvotes * 1.0 / (EXTRACT(EPOCH FROM NOW() - created_at) / 3600 + 1)) DESC
		LIMIT $1
	`, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error: "Failed to fetch trending articles",
		})
	}
	defer rows.Close()

	var articles []models.Article
	for rows.Next() {
		var a models.Article
		err := rows.Scan(
			&a.ID, &a.Title, &a.URL, &a.Description, &a.Author,
			&a.PublishedAt, &a.SourceID, &a.SourceName, &a.ImageURL,
			&a.ReadingTimeMinutes, &a.Upvotes, &a.Downvotes, &a.CreatedAt, &a.UpdatedAt,
		)
		if err != nil {
			continue
		}
		a.Tags = getArticleTags(ctx, a.ID)
		articles = append(articles, a)
	}

	if userID, ok := middleware.GetUserID(c); ok {
		articles = enrichArticlesWithUserData(ctx, articles, userID)
	}

	return c.JSON(articles)
}

// CreateArticle creates a new article (admin only for now)
func CreateArticle(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var req models.CreateArticleRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error: "Invalid request body",
		})
	}

	if req.Title == "" || req.URL == "" || req.SourceName == "" {
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error: "Title, URL, and source name are required",
		})
	}

	// Estimate reading time (rough: 200 words per minute)
	readingTime := 5
	if req.Description != nil {
		wordCount := len(strings.Fields(*req.Description))
		readingTime = int(math.Max(1, float64(wordCount)/200))
	}

	var articleID uuid.UUID
	err := database.Pool.QueryRow(ctx, `
		INSERT INTO articles (title, url, description, author, source_name, image_url, reading_time_minutes, published_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
		RETURNING id
	`, req.Title, req.URL, req.Description, req.Author, req.SourceName, req.ImageURL, readingTime).Scan(&articleID)

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error:   "Failed to create article",
			Message: err.Error(),
		})
	}

	// Add tags
	for _, tagID := range req.TagIDs {
		_, _ = database.Pool.Exec(ctx, `
			INSERT INTO article_tags (article_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING
		`, articleID, tagID)
	}

	return c.Status(fiber.StatusCreated).JSON(models.SuccessResponse{
		Success: true,
		Data:    map[string]interface{}{"id": articleID},
		Message: "Article created successfully",
	})
}

// Helper functions

func getArticleTags(ctx context.Context, articleID uuid.UUID) []models.Tag {
	rows, err := database.Pool.Query(ctx, `
		SELECT t.id, t.name, t.slug, t.color, t.created_at
		FROM tags t
		JOIN article_tags at ON t.id = at.tag_id
		WHERE at.article_id = $1
	`, articleID)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var tags []models.Tag
	for rows.Next() {
		var t models.Tag
		if err := rows.Scan(&t.ID, &t.Name, &t.Slug, &t.Color, &t.CreatedAt); err == nil {
			tags = append(tags, t)
		}
	}
	return tags
}

func enrichArticlesWithUserData(ctx context.Context, articles []models.Article, userID uuid.UUID) []models.Article {
	if len(articles) == 0 {
		return articles
	}

	// Get article IDs
	articleIDs := make([]uuid.UUID, len(articles))
	articleMap := make(map[uuid.UUID]int)
	for i, a := range articles {
		articleIDs[i] = a.ID
		articleMap[a.ID] = i
	}

	// Get bookmarks
	rows, err := database.Pool.Query(ctx, `
		SELECT article_id FROM bookmarks WHERE user_id = $1 AND article_id = ANY($2)
	`, userID, articleIDs)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var articleID uuid.UUID
			if err := rows.Scan(&articleID); err == nil {
				if idx, ok := articleMap[articleID]; ok {
					articles[idx].IsBookmarked = true
				}
			}
		}
	}

	// Get votes
	rows, err = database.Pool.Query(ctx, `
		SELECT article_id, vote_type FROM votes WHERE user_id = $1 AND article_id = ANY($2)
	`, userID, articleIDs)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var articleID uuid.UUID
			var voteType string
			if err := rows.Scan(&articleID, &voteType); err == nil {
				if idx, ok := articleMap[articleID]; ok {
					articles[idx].UserVote = &voteType
				}
			}
		}
	}

	return articles
}
