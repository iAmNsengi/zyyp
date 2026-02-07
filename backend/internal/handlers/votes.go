package handlers

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/zyyp/backend/internal/database"
	"github.com/zyyp/backend/internal/middleware"
	"github.com/zyyp/backend/internal/models"
)

// Vote handles upvote/downvote on articles
func Vote(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	userID, ok := middleware.GetUserID(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(models.ErrorResponse{
			Error: "Unauthorized",
		})
	}

	var req models.VoteRequest
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

	if req.VoteType != "up" && req.VoteType != "down" {
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error: "Vote type must be 'up' or 'down'",
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

	// Upsert vote (trigger will handle count updates)
	_, err = database.Pool.Exec(ctx, `
		INSERT INTO votes (user_id, article_id, vote_type)
		VALUES ($1, $2, $3)
		ON CONFLICT (user_id, article_id) 
		DO UPDATE SET vote_type = $3, created_at = NOW()
	`, userID, req.ArticleID, req.VoteType)

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error:   "Failed to record vote",
			Message: err.Error(),
		})
	}

	// Get updated vote counts
	var upvotes, downvotes int
	err = database.Pool.QueryRow(ctx, `
		SELECT upvotes, downvotes FROM articles WHERE id = $1
	`, req.ArticleID).Scan(&upvotes, &downvotes)

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error: "Failed to get updated vote counts",
		})
	}

	return c.JSON(models.SuccessResponse{
		Success: true,
		Data: map[string]interface{}{
			"upvotes":   upvotes,
			"downvotes": downvotes,
			"user_vote": req.VoteType,
		},
		Message: "Vote recorded",
	})
}

// RemoveVote removes a user's vote from an article
func RemoveVote(c *fiber.Ctx) error {
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
		DELETE FROM votes WHERE user_id = $1 AND article_id = $2
	`, userID, articleID)

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error: "Failed to remove vote",
		})
	}

	if result.RowsAffected() == 0 {
		return c.Status(fiber.StatusNotFound).JSON(models.ErrorResponse{
			Error: "Vote not found",
		})
	}

	// Get updated vote counts
	var upvotes, downvotes int
	err = database.Pool.QueryRow(ctx, `
		SELECT upvotes, downvotes FROM articles WHERE id = $1
	`, articleID).Scan(&upvotes, &downvotes)

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error: "Failed to get updated vote counts",
		})
	}

	return c.JSON(models.SuccessResponse{
		Success: true,
		Data: map[string]interface{}{
			"upvotes":   upvotes,
			"downvotes": downvotes,
			"user_vote": nil,
		},
		Message: "Vote removed",
	})
}
