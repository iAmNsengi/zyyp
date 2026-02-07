# zyyp - Developer Content Aggregator

A modern, cozy content aggregation platform for developers. Quality over quantity - discover genuinely valuable content without the noise.

![zyyp Preview](./preview.png)

## Features

- **Content Feed** - Card-based layout with articles from RSS feeds
- **Tag Filtering** - Filter by topics (JavaScript, Go, DevOps, AI/ML, etc.)
- **Bookmarking** - Save articles to read later
- **Voting System** - Upvote/downvote articles
- **Reading Streaks** - Track your reading habits
- **Dark Mode** - Respects system preference, togglable
- **Personalized Feed** - Based on your interests
- **Search** - Full-text search with keyboard shortcuts (Cmd+K)

## Tech Stack

### Backend (Go)
- **Framework**: [Fiber](https://gofiber.io/) - Fast, Express-inspired web framework
- **Database**: PostgreSQL via Supabase
- **Driver**: [pgx](https://github.com/jackc/pgx) - PostgreSQL driver
- **RSS**: [gofeed](https://github.com/mmcdole/gofeed) - RSS/Atom parser
- **Cron**: [robfig/cron](https://github.com/robfig/cron) - Scheduled RSS fetching

### Frontend (React + TypeScript)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **State**: [Zustand](https://zustand-demo.pmnd.rs/) + [TanStack Query](https://tanstack.com/query)
- **Routing**: [React Router v6](https://reactrouter.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Auth**: [Supabase Auth](https://supabase.com/auth)

### Database (Supabase)
- PostgreSQL with Row Level Security
- Real-time subscriptions ready
- Built-in authentication

## Getting Started

### Prerequisites

- Go 1.22+
- Node.js 20+
- Supabase account (or local Supabase)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/zyyp.git
   cd zyyp
   ```

2. **Set up Supabase**
   - Create a new Supabase project
   - Run the schema migration:
     ```bash
     # Via Supabase Dashboard SQL Editor
     # Copy contents of supabase/schema.sql
     ```

3. **Configure Backend**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

4. **Configure Frontend**
   ```bash
   cd frontend
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

5. **Start Backend**
   ```bash
   cd backend
   go mod download
   go run cmd/api/main.go
   ```

6. **Start Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

7. **Open in browser**
   ```
   http://localhost:5173
   ```

## Project Structure

```
zyyp/
├── backend/
│   ├── cmd/
│   │   └── api/
│   │       └── main.go           # Entry point
│   ├── internal/
│   │   ├── config/               # Configuration loading
│   │   ├── database/             # Database connection
│   │   ├── handlers/             # HTTP handlers
│   │   ├── middleware/           # Auth middleware
│   │   └── models/               # Data models
│   ├── pkg/
│   │   └── rss/                  # RSS feed service
│   ├── go.mod
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/           # React components
│   │   ├── hooks/                # Custom hooks
│   │   ├── lib/                  # API client, Supabase
│   │   ├── pages/                # Page components
│   │   ├── stores/               # Zustand stores
│   │   ├── types/                # TypeScript types
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css             # Global styles
│   ├── index.html
│   ├── vite.config.ts
│   └── .env.example
└── supabase/
    └── schema.sql                # Database schema
```

## API Endpoints

### Public
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/articles` | List articles (with filters) |
| GET | `/api/articles/:id` | Get single article |
| GET | `/api/articles/trending` | Get trending articles |
| GET | `/api/tags` | List all tags |
| GET | `/api/tags/popular` | Get popular tags |

### Authenticated
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profile` | Get current user profile |
| PATCH | `/api/profile` | Update profile |
| GET | `/api/profile/stats` | Get reading statistics |
| GET | `/api/bookmarks` | List bookmarks |
| POST | `/api/bookmarks` | Create bookmark |
| DELETE | `/api/bookmarks/:articleId` | Remove bookmark |
| POST | `/api/votes` | Vote on article |
| DELETE | `/api/votes/:articleId` | Remove vote |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/articles` | Create article |
| GET | `/api/admin/rss/sources` | List RSS sources |
| POST | `/api/admin/rss/sources` | Add RSS source |
| POST | `/api/admin/rss/fetch` | Trigger RSS fetch |

## Environment Variables

### Backend
```env
PORT=8080
ENV=development
DATABASE_URL=postgresql://...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_KEY=xxx
JWT_SECRET=your-supabase-jwt-secret
CORS_ORIGINS=http://localhost:5173
RSS_FETCH_INTERVAL=30
```

### Frontend
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

## Design Philosophy

- **Clean, minimal aesthetic** with generous whitespace
- **Soft shadows** and subtle borders (not harsh blacks)
- **Warm color palette** - Off-white backgrounds, indigo accents
- **Typography** - Inter for UI, Fira Code for code
- **No rounded corners** - Sharp, deliberate edges
- **Accessibility first** - ARIA labels, keyboard navigation, focus indicators
- **Dark mode** - Full dark theme, not just inverted colors

## Performance Targets

- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Lighthouse score: 95+

## Roadmap

- [ ] AI-powered content recommendations
- [ ] User-generated content submissions
- [ ] Newsletter integration
- [ ] Reading progress tracking
- [ ] Comment system
- [ ] Weekly digest emails

## License

MIT License - see [LICENSE](LICENSE) for details.
