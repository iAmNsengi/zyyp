package handlers

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/zyyp/backend/internal/database"
	"github.com/zyyp/backend/internal/models"
)

// GetTags returns all tags
func GetTags(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	rows, err := database.Pool.Query(ctx, `
		SELECT t.id, t.name, t.slug, t.color, t.created_at,
			(SELECT COUNT(*) FROM article_tags WHERE tag_id = t.id) as article_count
		FROM tags t
		ORDER BY t.name ASC
	`)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error: "Failed to fetch tags",
		})
	}
	defer rows.Close()

	type TagWithCount struct {
		models.Tag
		ArticleCount int `json:"article_count"`
	}

	var tags []TagWithCount
	for rows.Next() {
		var t TagWithCount
		if err := rows.Scan(&t.ID, &t.Name, &t.Slug, &t.Color, &t.CreatedAt, &t.ArticleCount); err == nil {
			tags = append(tags, t)
		}
	}

	return c.JSON(tags)
}

// GetPopularTags returns the most used tags
func GetPopularTags(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	rows, err := database.Pool.Query(ctx, `
		SELECT t.id, t.name, t.slug, t.color, t.created_at, COUNT(at.article_id) as article_count
		FROM tags t
		LEFT JOIN article_tags at ON t.id = at.tag_id
		GROUP BY t.id
		ORDER BY article_count DESC
		LIMIT 10
	`)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error: "Failed to fetch popular tags",
		})
	}
	defer rows.Close()

	type TagWithCount struct {
		models.Tag
		ArticleCount int `json:"article_count"`
	}

	var tags []TagWithCount
	for rows.Next() {
		var t TagWithCount
		if err := rows.Scan(&t.ID, &t.Name, &t.Slug, &t.Color, &t.CreatedAt, &t.ArticleCount); err == nil {
			tags = append(tags, t)
		}
	}

	return c.JSON(tags)
}
