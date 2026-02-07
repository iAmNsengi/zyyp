package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/robfig/cron/v3"
	"github.com/zyyp/backend/internal/config"
	"github.com/zyyp/backend/internal/database"
	"github.com/zyyp/backend/internal/handlers"
	"github.com/zyyp/backend/internal/middleware"
	"github.com/zyyp/backend/pkg/rss"
)

func main() {
	// Load configuration
	if err := config.Load(); err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Connect to database
	if err := database.Connect(); err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()

	// Create Fiber app
	app := fiber.New(fiber.Config{
		AppName:       "Zyyp API",
		CaseSensitive: true,
		StrictRouting: true,
		ServerHeader:  "Zyyp",
		ReadTimeout:   10 * time.Second,
		WriteTimeout:  10 * time.Second,
	})

	// Middleware
	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format: "${time} | ${status} | ${latency} | ${method} ${path}\n",
	}))
	app.Use(cors.New(cors.Config{
		AllowOrigins:     config.AppConfig.CORSOrigins,
		AllowMethods:     "GET,POST,PUT,DELETE,PATCH,OPTIONS",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization",
		AllowCredentials: true,
	}))

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok", "timestamp": time.Now()})
	})

	// API routes
	api := app.Group("/api")

	// Public routes (with optional auth for user-specific data)
	api.Get("/articles", middleware.OptionalAuth(), handlers.GetArticles)
	api.Get("/articles/trending", middleware.OptionalAuth(), handlers.GetTrendingArticles)
	api.Get("/articles/:id", middleware.OptionalAuth(), handlers.GetArticle)
	api.Get("/tags", handlers.GetTags)
	api.Get("/tags/popular", handlers.GetPopularTags)
	api.Get("/profiles/:id", handlers.GetProfileByID)

	// Authenticated routes
	auth := api.Group("", middleware.AuthRequired())
	
	// Profile
	auth.Get("/profile", handlers.GetProfile)
	auth.Patch("/profile", handlers.UpdateProfile)
	auth.Get("/profile/stats", handlers.GetReadingStats)

	// Bookmarks
	auth.Get("/bookmarks", handlers.GetBookmarks)
	auth.Post("/bookmarks", handlers.CreateBookmark)
	auth.Delete("/bookmarks/:articleId", handlers.DeleteBookmark)

	// Votes
	auth.Post("/votes", handlers.Vote)
	auth.Delete("/votes/:articleId", handlers.RemoveVote)

	// Personalized feed
	auth.Get("/feed/personalized", middleware.OptionalAuth(), handlers.GetArticles) // Same as articles but filtered by user interests

	// Admin routes (TODO: Add admin middleware)
	admin := api.Group("/admin", middleware.AuthRequired())
	admin.Post("/articles", handlers.CreateArticle)
	admin.Get("/rss/sources", handlers.GetRSSSources)
	admin.Post("/rss/sources", handlers.CreateRSSSource)
	admin.Post("/rss/fetch", handlers.TriggerRSSFetch)

	// Start RSS cron job
	rssService := rss.NewService()
	c := cron.New()
	c.AddFunc("@every 30m", func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
		defer cancel()
		if err := rssService.FetchAllSources(ctx); err != nil {
			log.Printf("RSS fetch error: %v", err)
		}
	})
	c.Start()
	defer c.Stop()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-quit
		log.Println("Shutting down server...")
		app.Shutdown()
	}()

	// Start server
	addr := ":" + config.AppConfig.Port
	log.Printf("Server starting on %s", addr)
	if err := app.Listen(addr); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}
