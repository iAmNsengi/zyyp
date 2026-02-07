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

// GetProfile returns the current user's profile
func GetProfile(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	userID, ok := middleware.GetUserID(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(models.ErrorResponse{
			Error: "Unauthorized",
		})
	}

	var profile models.UserProfile
	err := database.Pool.QueryRow(ctx, `
		SELECT id, username, avatar_url, bio, interests, created_at, updated_at
		FROM user_profiles WHERE id = $1
	`, userID).Scan(&profile.ID, &profile.Username, &profile.AvatarURL, &profile.Bio, &profile.Interests, &profile.CreatedAt, &profile.UpdatedAt)

	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(models.ErrorResponse{
			Error: "Profile not found",
		})
	}

	return c.JSON(profile)
}

// GetProfileByID returns a user's public profile
func GetProfileByID(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	profileID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error: "Invalid profile ID",
		})
	}

	var profile models.UserProfile
	err = database.Pool.QueryRow(ctx, `
		SELECT id, username, avatar_url, bio, interests, created_at, updated_at
		FROM user_profiles WHERE id = $1
	`, profileID).Scan(&profile.ID, &profile.Username, &profile.AvatarURL, &profile.Bio, &profile.Interests, &profile.CreatedAt, &profile.UpdatedAt)

	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(models.ErrorResponse{
			Error: "Profile not found",
		})
	}

	return c.JSON(profile)
}

// UpdateProfile updates the current user's profile
func UpdateProfile(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	userID, ok := middleware.GetUserID(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(models.ErrorResponse{
			Error: "Unauthorized",
		})
	}

	var req models.UpdateProfileRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error: "Invalid request body",
		})
	}

	// Build dynamic update query
	updates := []string{}
	args := []interface{}{}
	argIndex := 1

	if req.Username != nil {
		updates = append(updates, "username = $"+string(rune('0'+argIndex)))
		args = append(args, *req.Username)
		argIndex++
	}
	if req.Bio != nil {
		updates = append(updates, "bio = $"+string(rune('0'+argIndex)))
		args = append(args, *req.Bio)
		argIndex++
	}
	if req.AvatarURL != nil {
		updates = append(updates, "avatar_url = $"+string(rune('0'+argIndex)))
		args = append(args, *req.AvatarURL)
		argIndex++
	}
	if req.Interests != nil {
		updates = append(updates, "interests = $"+string(rune('0'+argIndex)))
		args = append(args, req.Interests)
		argIndex++
	}

	if len(updates) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error: "No fields to update",
		})
	}

	updates = append(updates, "updated_at = NOW()")
	args = append(args, userID)

	query := "UPDATE user_profiles SET "
	for i, update := range updates {
		if i > 0 {
			query += ", "
		}
		query += update
	}
	query += " WHERE id = $" + string(rune('0'+argIndex))

	result, err := database.Pool.Exec(ctx, query, args...)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error:   "Failed to update profile",
			Message: err.Error(),
		})
	}

	if result.RowsAffected() == 0 {
		return c.Status(fiber.StatusNotFound).JSON(models.ErrorResponse{
			Error: "Profile not found",
		})
	}

	// Return updated profile
	return GetProfile(c)
}

// GetReadingStats returns the user's reading statistics
func GetReadingStats(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	userID, ok := middleware.GetUserID(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(models.ErrorResponse{
			Error: "Unauthorized",
		})
	}

	type Stats struct {
		TotalArticlesRead int `json:"total_articles_read"`
		TotalReadingTime  int `json:"total_reading_time_minutes"`
		CurrentStreak     int `json:"current_streak_days"`
		LongestStreak     int `json:"longest_streak_days"`
		TotalBookmarks    int `json:"total_bookmarks"`
		TotalVotes        int `json:"total_votes"`
	}

	var stats Stats

	// Total articles read
	database.Pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM reading_history WHERE user_id = $1
	`, userID).Scan(&stats.TotalArticlesRead)

	// Total reading time
	database.Pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(a.reading_time_minutes), 0)
		FROM reading_history rh
		JOIN articles a ON rh.article_id = a.id
		WHERE rh.user_id = $1
	`, userID).Scan(&stats.TotalReadingTime)

	// Total bookmarks
	database.Pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM bookmarks WHERE user_id = $1
	`, userID).Scan(&stats.TotalBookmarks)

	// Total votes
	database.Pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM votes WHERE user_id = $1
	`, userID).Scan(&stats.TotalVotes)

	// Calculate reading streak (simplified - just counts consecutive days)
	rows, err := database.Pool.Query(ctx, `
		SELECT DISTINCT DATE(read_at) as read_date
		FROM reading_history
		WHERE user_id = $1
		ORDER BY read_date DESC
	`, userID)
	if err == nil {
		defer rows.Close()
		var dates []time.Time
		for rows.Next() {
			var date time.Time
			if rows.Scan(&date) == nil {
				dates = append(dates, date)
			}
		}

		if len(dates) > 0 {
			today := time.Now().Truncate(24 * time.Hour)
			streak := 0
			for i, date := range dates {
				expected := today.AddDate(0, 0, -i)
				if date.Truncate(24*time.Hour).Equal(expected) {
					streak++
				} else {
					break
				}
			}
			stats.CurrentStreak = streak
			stats.LongestStreak = streak // Simplified, would need more logic for actual longest
		}
	}

	return c.JSON(stats)
}
