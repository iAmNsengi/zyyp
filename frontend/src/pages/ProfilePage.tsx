import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Save, X, Flame, BookOpen, Award, ThumbsUp } from 'lucide-react';
import { getProfile, updateProfile, getReadingStats, getTags } from '../lib/api';
import { useAuthStore } from '../stores';

export function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    username: '',
    bio: '',
    interests: [] as string[],
  });

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
    enabled: isAuthenticated,
  });

  const { data: stats } = useQuery({
    queryKey: ['readingStats'],
    queryFn: getReadingStats,
    enabled: isAuthenticated,
  });

  const { data: allTags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: getTags,
  });

  const updateMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setIsEditing(false);
    },
  });

  // Redirect if not authenticated
  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  const handleEdit = () => {
    setEditForm({
      username: profile?.username || '',
      bio: profile?.bio || '',
      interests: profile?.interests || [],
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    updateMutation.mutate({
      username: editForm.username,
      bio: editForm.bio || null,
      interests: editForm.interests,
    });
  };

  const toggleInterest = (tagSlug: string) => {
    setEditForm(prev => ({
      ...prev,
      interests: prev.interests.includes(tagSlug)
        ? prev.interests.filter(i => i !== tagSlug)
        : [...prev.interests, tagSlug],
    }));
  };

  if (profileLoading) {
    return (
      <div className="container py-8">
        <div className="max-w-2xl mx-auto">
          <div className="skeleton h-32 mb-6" style={{ borderRadius: 0 }} />
          <div className="skeleton h-48 mb-6" style={{ borderRadius: 0 }} />
          <div className="skeleton h-32" style={{ borderRadius: 0 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="btn btn-ghost p-2"
            style={{ borderRadius: 0 }}
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 
            className="text-2xl font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Profile
          </h1>
        </div>

        {/* Profile Card */}
        <div 
          className="p-6 mb-6 border"
          style={{ 
            backgroundColor: 'var(--color-bg-secondary)',
            borderColor: 'var(--color-border)'
          }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              {(user?.user_metadata?.avatar_url || profile?.avatar_url) ? (
                <img
                  src={user?.user_metadata?.avatar_url || profile?.avatar_url || ''}
                  alt={profile?.username || 'User'}
                  className="w-16 h-16 object-cover"
                />
              ) : (
                <div 
                  className="w-16 h-16 flex items-center justify-center text-2xl font-bold text-white"
                  style={{ background: 'var(--color-accent-gradient)' }}
                >
                  {profile?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value }))}
                    className="input text-lg font-semibold"
                    style={{ borderRadius: 0, maxWidth: '200px' }}
                    placeholder="Username"
                  />
                ) : (
                  <h2 
                    className="text-xl font-semibold"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {profile?.username}
                  </h2>
                )}
                <p 
                  className="text-sm"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {user?.email}
                </p>
              </div>
            </div>

            {isEditing ? (
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="btn btn-ghost p-2"
                  style={{ borderRadius: 0 }}
                  aria-label="Cancel"
                >
                  <X size={18} />
                </button>
                <button
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="btn btn-primary p-2"
                  style={{ borderRadius: 0 }}
                  aria-label="Save"
                >
                  <Save size={18} />
                </button>
              </div>
            ) : (
              <button
                onClick={handleEdit}
                className="btn btn-secondary"
                style={{ borderRadius: 0 }}
              >
                <Edit2 size={16} />
                Edit
              </button>
            )}
          </div>

          {/* Bio */}
          <div>
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Bio
            </label>
            {isEditing ? (
              <textarea
                value={editForm.bio}
                onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                className="input resize-none"
                style={{ borderRadius: 0, minHeight: '80px' }}
                placeholder="Tell us about yourself..."
              />
            ) : (
              <p 
                className="text-sm"
                style={{ color: profile?.bio ? 'var(--color-text-secondary)' : 'var(--color-text-muted)' }}
              >
                {profile?.bio || 'No bio yet'}
              </p>
            )}
          </div>
        </div>

        {/* Reading Stats */}
        {stats && (
          <div 
            className="p-6 mb-6 border"
            style={{ 
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)'
            }}
          >
            <h3 
              className="font-semibold mb-4"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Reading Stats
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                icon={<BookOpen size={20} />}
                label="Articles Read"
                value={stats.total_articles_read}
              />
              <StatCard
                icon={<Flame size={20} />}
                label="Current Streak"
                value={`${stats.current_streak_days} days`}
              />
              <StatCard
                icon={<Award size={20} />}
                label="Reading Time"
                value={`${Math.round(stats.total_reading_time_minutes / 60)}h`}
              />
              <StatCard
                icon={<ThumbsUp size={20} />}
                label="Total Votes"
                value={stats.total_votes}
              />
            </div>
          </div>
        )}

        {/* Interests */}
        <div 
          className="p-6 border"
          style={{ 
            backgroundColor: 'var(--color-bg-secondary)',
            borderColor: 'var(--color-border)'
          }}
        >
          <h3 
            className="font-semibold mb-4"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Interests
          </h3>
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => {
              const isSelected = isEditing 
                ? editForm.interests.includes(tag.slug)
                : profile?.interests?.includes(tag.slug);
              
              return (
                <button
                  key={tag.id}
                  onClick={() => isEditing && toggleInterest(tag.slug)}
                  disabled={!isEditing}
                  className="tag"
                  style={{
                    backgroundColor: isSelected ? `${tag.color}30` : 'var(--color-bg-tertiary)',
                    color: isSelected ? tag.color : 'var(--color-text-muted)',
                    borderRadius: 0,
                    cursor: isEditing ? 'pointer' : 'default',
                  }}
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
          {!isEditing && (
            <p 
              className="text-xs mt-4"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Click Edit to update your interests
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div 
      className="p-4 border"
      style={{ 
        backgroundColor: 'var(--color-bg-tertiary)',
        borderColor: 'var(--color-border)'
      }}
    >
      <div 
        className="mb-2"
        style={{ color: 'var(--color-accent-primary)' }}
      >
        {icon}
      </div>
      <p 
        className="text-2xl font-bold"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {value}
      </p>
      <p 
        className="text-xs"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {label}
      </p>
    </div>
  );
}
