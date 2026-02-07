package rss

import (
	"context"
	"log"
	"math"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/mmcdole/gofeed"
	"github.com/zyyp/backend/internal/database"
)

type Service struct {
	parser *gofeed.Parser
}

func NewService() *Service {
	return &Service{
		parser: gofeed.NewParser(),
	}
}

// FetchAllSources fetches articles from all active RSS sources
func (s *Service) FetchAllSources(ctx context.Context) error {
	rows, err := database.Pool.Query(ctx, `
		SELECT id, name, url, favicon_url FROM rss_sources WHERE active = TRUE
	`)
	if err != nil {
		return err
	}
	defer rows.Close()

	type Source struct {
		ID         uuid.UUID
		Name       string
		URL        string
		FaviconURL *string
	}

	var sources []Source
	for rows.Next() {
		var src Source
		if err := rows.Scan(&src.ID, &src.Name, &src.URL, &src.FaviconURL); err == nil {
			sources = append(sources, src)
		}
	}

	for _, src := range sources {
		if err := s.FetchSource(ctx, src.ID, src.Name, src.URL, src.FaviconURL); err != nil {
			log.Printf("Error fetching source %s: %v", src.Name, err)
		}
	}

	return nil
}

// FetchSource fetches articles from a single RSS source
func (s *Service) FetchSource(ctx context.Context, sourceID uuid.UUID, sourceName, sourceURL string, faviconURL *string) error {
	feed, err := s.parser.ParseURL(sourceURL)
	if err != nil {
		return err
	}

	for _, item := range feed.Items {
		// Skip if article already exists
		var exists bool
		err := database.Pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM articles WHERE url = $1)`, item.Link).Scan(&exists)
		if err != nil || exists {
			continue
		}

		// Get description
		description := item.Description
		if description == "" && item.Content != "" {
			// Truncate content to first 500 chars for description
			description = item.Content
			if len(description) > 500 {
				description = description[:500] + "..."
			}
		}

		// Clean HTML from description
		description = stripHTML(description)

		// Get image URL
		var imageURL *string
		if item.Image != nil && item.Image.URL != "" {
			imageURL = &item.Image.URL
		}
		// Check for media content
		if imageURL == nil && len(item.Enclosures) > 0 {
			for _, enclosure := range item.Enclosures {
				if strings.HasPrefix(enclosure.Type, "image/") {
					imageURL = &enclosure.URL
					break
				}
			}
		}

		// Get author
		var author *string
		if len(item.Authors) > 0 {
			author = &item.Authors[0].Name
		} else if item.Author != nil {
			author = &item.Author.Name
		}

		// Get published date
		var publishedAt *time.Time
		if item.PublishedParsed != nil {
			publishedAt = item.PublishedParsed
		} else if item.UpdatedParsed != nil {
			publishedAt = item.UpdatedParsed
		}

		// Estimate reading time (rough: 200 words per minute)
		wordCount := len(strings.Fields(item.Content))
		if wordCount == 0 {
			wordCount = len(strings.Fields(description))
		}
		readingTime := int(math.Max(1, float64(wordCount)/200))

		// Insert article
		_, err = database.Pool.Exec(ctx, `
			INSERT INTO articles (title, url, description, content, author, published_at, source_id, source_name, image_url, reading_time_minutes)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
			ON CONFLICT (url) DO NOTHING
		`, item.Title, item.Link, description, item.Content, author, publishedAt, sourceID, sourceName, imageURL, readingTime)

		if err != nil {
			log.Printf("Error inserting article %s: %v", item.Title, err)
		}
	}

	// Update last fetched time
	_, err = database.Pool.Exec(ctx, `
		UPDATE rss_sources SET last_fetched_at = NOW() WHERE id = $1
	`, sourceID)

	return err
}

// stripHTML removes HTML tags from a string (simple version)
func stripHTML(s string) string {
	var result strings.Builder
	inTag := false
	for _, r := range s {
		switch r {
		case '<':
			inTag = true
		case '>':
			inTag = false
		default:
			if !inTag {
				result.WriteRune(r)
			}
		}
	}
	// Collapse whitespace
	text := result.String()
	text = strings.Join(strings.Fields(text), " ")
	return strings.TrimSpace(text)
}
