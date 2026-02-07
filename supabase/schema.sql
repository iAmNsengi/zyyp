-- Zyyp Database Schema
-- A Developer-Focused Content Aggregator & Blog Platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Profile (extends Supabase auth.users)
CREATE TABLE user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    interests TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tags
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    color TEXT NOT NULL DEFAULT '#6366f1',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RSS Sources
CREATE TABLE rss_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    url TEXT UNIQUE NOT NULL,
    favicon_url TEXT,
    active BOOLEAN DEFAULT TRUE,
    last_fetched_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Articles
CREATE TABLE articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    url TEXT UNIQUE NOT NULL,
    description TEXT,
    content TEXT,
    author TEXT,
    published_at TIMESTAMP WITH TIME ZONE,
    source_id UUID REFERENCES rss_sources(id) ON DELETE SET NULL,
    source_name TEXT NOT NULL,
    image_url TEXT,
    reading_time_minutes INTEGER DEFAULT 5,
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Article Tags (junction table)
CREATE TABLE article_tags (
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (article_id, tag_id)
);

-- Bookmarks
CREATE TABLE bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, article_id)
);

-- Votes
CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
    vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, article_id)
);

-- Reading History (for personalization and streaks)
CREATE TABLE reading_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, article_id)
);

-- Indexes for better performance
CREATE INDEX idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX idx_articles_upvotes ON articles(upvotes DESC);
CREATE INDEX idx_articles_source_id ON articles(source_id);
CREATE INDEX idx_article_tags_article_id ON article_tags(article_id);
CREATE INDEX idx_article_tags_tag_id ON article_tags(tag_id);
CREATE INDEX idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX idx_votes_user_id ON votes(user_id);
CREATE INDEX idx_votes_article_id ON votes(article_id);
CREATE INDEX idx_reading_history_user_id ON reading_history(user_id);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE rss_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_history ENABLE ROW LEVEL SECURITY;

-- Policies

-- User Profiles: Public read, owners can update their own
CREATE POLICY "Profiles are viewable by everyone"
ON user_profiles FOR SELECT
TO PUBLIC
USING (TRUE);

CREATE POLICY "Users can update their own profile"
ON user_profiles FOR UPDATE
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
ON user_profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- Articles: Public read
CREATE POLICY "Articles are viewable by everyone"
ON articles FOR SELECT
TO PUBLIC
USING (TRUE);

-- Tags: Public read
CREATE POLICY "Tags are viewable by everyone"
ON tags FOR SELECT
TO PUBLIC
USING (TRUE);

-- RSS Sources: Public read (active only)
CREATE POLICY "Active RSS sources are viewable by everyone"
ON rss_sources FOR SELECT
TO PUBLIC
USING (active = TRUE);

-- Article Tags: Public read
CREATE POLICY "Article tags are viewable by everyone"
ON article_tags FOR SELECT
TO PUBLIC
USING (TRUE);

-- Bookmarks: Users can manage their own
CREATE POLICY "Users can view their own bookmarks"
ON bookmarks FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own bookmarks"
ON bookmarks FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own bookmarks"
ON bookmarks FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Votes: Users can manage their own
CREATE POLICY "Users can view all votes"
ON votes FOR SELECT
TO PUBLIC
USING (TRUE);

CREATE POLICY "Users can create their own votes"
ON votes FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own votes"
ON votes FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own votes"
ON votes FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Reading History: Users can manage their own
CREATE POLICY "Users can view their own reading history"
ON reading_history FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own reading history"
ON reading_history FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Functions

-- Function to update article vote counts
CREATE OR REPLACE FUNCTION update_article_votes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.vote_type = 'up' THEN
            UPDATE articles SET upvotes = upvotes + 1 WHERE id = NEW.article_id;
        ELSE
            UPDATE articles SET downvotes = downvotes + 1 WHERE id = NEW.article_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.vote_type = 'up' THEN
            UPDATE articles SET upvotes = upvotes - 1 WHERE id = OLD.article_id;
        ELSE
            UPDATE articles SET downvotes = downvotes - 1 WHERE id = OLD.article_id;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.vote_type = 'up' AND NEW.vote_type = 'down' THEN
            UPDATE articles SET upvotes = upvotes - 1, downvotes = downvotes + 1 WHERE id = NEW.article_id;
        ELSIF OLD.vote_type = 'down' AND NEW.vote_type = 'up' THEN
            UPDATE articles SET upvotes = upvotes + 1, downvotes = downvotes - 1 WHERE id = NEW.article_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for vote count updates
CREATE TRIGGER on_vote_change
AFTER INSERT OR UPDATE OR DELETE ON votes
FOR EACH ROW EXECUTE FUNCTION update_article_votes();

-- Function to handle new user signup (create profile)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (id, username, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Insert default tags
INSERT INTO tags (name, slug, color) VALUES
    ('JavaScript', 'javascript', '#f7df1e'),
    ('TypeScript', 'typescript', '#3178c6'),
    ('Go', 'go', '#00add8'),
    ('Rust', 'rust', '#dea584'),
    ('Python', 'python', '#3776ab'),
    ('React', 'react', '#61dafb'),
    ('Vue', 'vue', '#42b883'),
    ('Node.js', 'nodejs', '#339933'),
    ('DevOps', 'devops', '#ff6f61'),
    ('AI/ML', 'ai-ml', '#9333ea'),
    ('Web Dev', 'web-dev', '#6366f1'),
    ('Backend', 'backend', '#10b981'),
    ('Frontend', 'frontend', '#f43f5e'),
    ('Database', 'database', '#0ea5e9'),
    ('Security', 'security', '#ef4444'),
    ('Cloud', 'cloud', '#06b6d4'),
    ('Mobile', 'mobile', '#8b5cf6'),
    ('Career', 'career', '#f59e0b'),
    ('Open Source', 'open-source', '#22c55e'),
    ('System Design', 'system-design', '#ec4899');
