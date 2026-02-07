package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Port             string
	Env              string
	DatabaseURL      string
	SupabaseURL      string
	SupabaseAnonKey  string
	SupabaseServiceKey string
	JWTSecret        string
	CORSOrigins      string
	RSSFetchInterval int
}

var AppConfig *Config

func Load() error {
	// Load .env file in development
	_ = godotenv.Load()

	corsOrigins := getEnv("CORS_ORIGINS", "http://localhost:5173")
	rssFetchInterval, _ := strconv.Atoi(getEnv("RSS_FETCH_INTERVAL", "30"))

	AppConfig = &Config{
		Port:             getEnv("PORT", "8080"),
		Env:              getEnv("ENV", "development"),
		DatabaseURL:      getEnv("DATABASE_URL", ""),
		SupabaseURL:      getEnv("SUPABASE_URL", ""),
		SupabaseAnonKey:  getEnv("SUPABASE_ANON_KEY", ""),
		SupabaseServiceKey: getEnv("SUPABASE_SERVICE_KEY", ""),
		JWTSecret:        getEnv("JWT_SECRET", ""),
		CORSOrigins:      corsOrigins,
		RSSFetchInterval: rssFetchInterval,
	}

	return nil
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
