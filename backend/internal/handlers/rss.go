package handlers

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/zyyp/backend/internal/database"
	"github.com/zyyp/backend/internal/models"
	"github.com/zyyp/backend/pkg/rss"
)

var rssService = rss.NewService()

// GetRSSSources returns all active RSS sources
func GetRSSSources(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	rows, err := database.Pool.Query(ctx, `
		SELECT id, name, url, favicon_url, active, last_fetched_at, created_at
		FROM rss_sources
		ORDER BY name ASC
	`)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error: "Failed to fetch RSS sources",
		})
	}
	defer rows.Close()

	var sources []models.RSSSource
	for rows.Next() {
		var s models.RSSSource
		if err := rows.Scan(&s.ID, &s.Name, &s.URL, &s.FaviconURL, &s.Active, &s.LastFetchedAt, &s.CreatedAt); err == nil {
			sources = append(sources, s)
		}
	}

	return c.JSON(sources)
}

// CreateRSSSource adds a new RSS source
func CreateRSSSource(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var req models.CreateRSSSourceRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error: "Invalid request body",
		})
	}

	if req.Name == "" || req.URL == "" {
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error: "Name and URL are required",
		})
	}

	var sourceID string
	err := database.Pool.QueryRow(ctx, `
		INSERT INTO rss_sources (name, url, favicon_url)
		VALUES ($1, $2, $3)
		RETURNING id
	`, req.Name, req.URL, req.FaviconURL).Scan(&sourceID)

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error:   "Failed to create RSS source",
			Message: err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(models.SuccessResponse{
		Success: true,
		Data:    map[string]interface{}{"id": sourceID},
		Message: "RSS source created",
	})
}

// TriggerRSSFetch manually triggers fetching from all RSS sources
func TriggerRSSFetch(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	go func() {
		if err := rssService.FetchAllSources(ctx); err != nil {
			// Log error
		}
	}()

	return c.JSON(models.SuccessResponse{
		Success: true,
		Message: "RSS fetch triggered",
	})
}
