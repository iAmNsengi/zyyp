import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Moon, Sun, Menu, X, LogOut, User, Bookmark } from 'lucide-react';
import { useAuthStore, useThemeStore, useFilterStore } from '../stores';

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { user, isAuthenticated, signOut } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { searchQuery, setSearchQuery } = useFilterStore();

  // Keyboard shortcut for search (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') {
        searchRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <nav className="navbar-blur sticky top-0 z-50 border-b" style={{
      backgroundColor: 'rgba(var(--color-bg-secondary-rgb, 255, 255, 255), 0.8)',
      borderColor: 'var(--color-border)'
    }}>
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 text-xl font-bold">
          <div className="flex h-8 w-8 items-center justify-center" style={{ background: 'var(--color-accent-gradient)' }}>
            <span className="text-white font-bold text-sm">Z</span>
          </div>
          <span style={{ color: 'var(--color-text-primary)' }}>zyyp</span>
        </Link>

        {/* Search Bar - Desktop */}
        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--color-text-muted)' }}
            />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10 pr-16"
              style={{
                borderRadius: 0,
                height: '40px'
              }}
            />
            <kbd
              className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-muted)',
              }}
            >
              <span className="text-xs">Cmd</span>K
            </kbd>
          </div>
        </form>

        {/* Right Side Actions */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="btn btn-ghost p-2"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            style={{ borderRadius: 0 }}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          {/* Auth Section */}
          {isAuthenticated ? (
            <div ref={userMenuRef} className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1"
                style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
              >
                {user?.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt={user.email || 'User'}
                    className="h-8 w-8 object-cover"
                  />
                ) : (
                  <div
                    className="h-8 w-8 flex items-center justify-center text-white font-medium"
                    style={{ background: 'var(--color-accent-gradient)' }}
                  >
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
              </button>

              {/* User Dropdown */}
              {isUserMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-48 py-1 shadow-lg border fade-in"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    borderColor: 'var(--color-border)'
                  }}
                >
                  <div className="px-4 py-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {user?.email}
                    </p>
                  </div>
                  <Link
                    to="/profile"
                    className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--color-bg-tertiary)]"
                    style={{ color: 'var(--color-text-secondary)' }}
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <User size={16} />
                    Profile
                  </Link>
                  <Link
                    to="/bookmarks"
                    className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--color-bg-tertiary)]"
                    style={{ color: 'var(--color-text-secondary)' }}
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <Bookmark size={16} />
                    Bookmarks
                  </Link>
                  <button
                    onClick={() => {
                      signOut();
                      setIsUserMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--color-bg-tertiary)]"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    <LogOut size={16} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="btn btn-primary"
              style={{ borderRadius: 0 }}
            >
              Sign in
            </Link>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="btn btn-ghost p-2 md:hidden"
            aria-label="Toggle menu"
            style={{ borderRadius: 0 }}
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div
          className="md:hidden border-t fade-in"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            borderColor: 'var(--color-border)'
          }}
        >
          <div className="container py-4">
            {/* Mobile Search */}
            <form onSubmit={handleSearch} className="mb-4">
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--color-text-muted)' }}
                />
                <input
                  type="text"
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input pl-10"
                  style={{ borderRadius: 0 }}
                />
              </div>
            </form>

            {/* Mobile Nav Links */}
            <div className="flex flex-col gap-2">
              <Link
                to="/"
                className="px-4 py-2 text-sm hover:bg-[var(--color-bg-tertiary)]"
                style={{ color: 'var(--color-text-secondary)' }}
                onClick={() => setIsMenuOpen(false)}
              >
                Discover
              </Link>
              <Link
                to="/popular"
                className="px-4 py-2 text-sm hover:bg-[var(--color-bg-tertiary)]"
                style={{ color: 'var(--color-text-secondary)' }}
                onClick={() => setIsMenuOpen(false)}
              >
                Popular
              </Link>
              {isAuthenticated && (
                <Link
                  to="/bookmarks"
                  className="px-4 py-2 text-sm hover:bg-[var(--color-bg-tertiary)]"
                  style={{ color: 'var(--color-text-secondary)' }}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Bookmarks
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
