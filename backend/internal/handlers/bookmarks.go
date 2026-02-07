package handlers

import (
	"context"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/zyyp/backend/internal/database"
	"github.com/zyyp/backend/internal/middleware"
	"github.com/zyyp/backend/internal/models"
)

// GetBookmarks returns the current user's bookmarks
func GetBookmarks(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	userID, ok := middleware.GetUserID(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(models.ErrorResponse{
			Error: "Unauthorized",
		})
	}

	page, _ := strconv.Atoi(c.Query("page", "1"))
	if page < 1 {
		page = 1
	}
	pageSize, _ := strconv.Atoi(c.Query("page_size", "20"))
	if pageSize < 1 || pageSize > 50 {
		pageSize = 20
	}
	offset := (page - 1) * pageSize

	// Get total count
	var totalCount int
	err := database.Pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM bookmarks WHERE user_id = $1
	`, userID).Scan(&totalCount)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error: "Failed to count bookmarks",
		})
	}

	// Get bookmarked articles
	rows, err := database.Pool.Query(ctx, `
		SELECT a.id, a.title, a.url, a.description, a.author, a.published_at, 
			a.source_id, a.source_name, a.image_url, a.reading_time_minutes, 
			a.upvotes, a.downvotes, a.created_at, a.updated_at, b.created_at as bookmarked_at
		FROM articles a
		JOIN bookmarks b ON a.id = b.article_id
		WHERE b.user_id = $1
		ORDER BY b.created_at DESC
		LIMIT $2 OFFSET $3
	`, userID, pageSize, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error: "Failed to fetch bookmarks",
		})
	}
	defer rows.Close()

	var articles []models.Article
	for rows.Next() {
		var a models.Article
		var bookmarkedAt time.Time
		err := rows.Scan(
			&a.ID, &a.Title, &a.URL, &a.Description, &a.Author,
			&a.PublishedAt, &a.SourceID, &a.SourceName, &a.ImageURL,
			&a.ReadingTimeMinutes, &a.Upvotes, &a.Downvotes, &a.CreatedAt, &a.UpdatedAt, &bookmarkedAt,
		)
		if err != nil {
			continue
		}
		a.IsBookmarked = true
		a.Tags = getArticleTags(ctx, a.ID)
		articles = append(articles, a)
	}

	// Get user votes for these articles
	articles = enrichArticlesWithUserData(ctx, articles, userID)

	hasMore := totalCount > (page * pageSize)

	return c.JSON(models.ArticlesResponse{
		Articles:   articles,
		TotalCount: totalCount,
		Page:       page,
		PageSize:   pageSize,
		HasMore:    hasMore,
	})
}

// CreateBookmark adds an article to user's bookmarks
func CreateBookmark(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	userID, ok := middleware.GetUserID(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(models.ErrorResponse{
			Error: "Unauthorized",
		})
	}

	var req models.CreateBookmarkRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error: "Invalid request body",
		})
	}

	if req.ArticleID == uuid.Nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error: "Article ID is required",
		})
	}

	// Check if article exists
	var exists bool
	err := database.Pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM articles WHERE id = $1)`, req.ArticleID).Scan(&exists)
	if err != nil || !exists {
		return c.Status(fiber.StatusNotFound).JSON(models.ErrorResponse{
			Error: "Article not found",
		})
	}

	// Create bookmark (upsert)
	var bookmarkID uuid.UUID
	err = database.Pool.QueryRow(ctx, `
		INSERT INTO bookmarks (user_id, article_id)
		VALUES ($1, $2)
		ON CONFLICT (user_id, article_id) DO UPDATE SET created_at = NOW()
		RETURNING id
	`, userID, req.ArticleID).Scan(&bookmarkID)

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error:   "Failed to create bookmark",
			Message: err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(models.SuccessResponse{
		Success: true,
		Data:    map[string]interface{}{"id": bookmarkID},
		Message: "Bookmark created",
	})
}

// DeleteBookmark removes an article from user's bookmarks
func DeleteBookmark(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	userID, ok := middleware.GetUserID(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(models.ErrorResponse{
			Error: "Unauthorized",
		})
	}

	articleID, err := uuid.Parse(c.Params("articleId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error: "Invalid article ID",
		})
	}

	result, err := database.Pool.Exec(ctx, `
		DELETE FROM bookmarks WHERE user_id = $1 AND article_id = $2
	`, userID, articleID)

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error: "Failed to delete bookmark",
		})
	}

	if result.RowsAffected() == 0 {
		return c.Status(fiber.StatusNotFound).JSON(models.ErrorResponse{
			Error: "Bookmark not found",
		})
	}

	return c.JSON(models.SuccessResponse{
		Success: true,
		Message: "Bookmark removed",
	})
}
