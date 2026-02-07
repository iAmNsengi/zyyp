package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/zyyp/backend/internal/config"
)

type AuthClaims struct {
	jwt.RegisteredClaims
	Sub   string `json:"sub"`
	Email string `json:"email"`
	Role  string `json:"role"`
}

// AuthRequired middleware checks for valid JWT token
func AuthRequired() fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Missing authorization header",
			})
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid authorization header format",
			})
		}

		claims := &AuthClaims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return []byte(config.AppConfig.JWTSecret), nil
		})

		if err != nil || !token.Valid {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid or expired token",
			})
		}

		// Parse user ID and store in context
		userID, err := uuid.Parse(claims.Sub)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid user ID in token",
			})
		}

		c.Locals("userID", userID)
		c.Locals("userEmail", claims.Email)
		c.Locals("claims", claims)

		return c.Next()
	}
}

// OptionalAuth middleware parses JWT if present but doesn't require it
func OptionalAuth() fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Next()
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			return c.Next()
		}

		claims := &AuthClaims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return []byte(config.AppConfig.JWTSecret), nil
		})

		if err == nil && token.Valid {
			userID, err := uuid.Parse(claims.Sub)
			if err == nil {
				c.Locals("userID", userID)
				c.Locals("userEmail", claims.Email)
				c.Locals("claims", claims)
			}
		}

		return c.Next()
	}
}

// GetUserID helper to extract user ID from context
func GetUserID(c *fiber.Ctx) (uuid.UUID, bool) {
	userID, ok := c.Locals("userID").(uuid.UUID)
	return userID, ok
}
