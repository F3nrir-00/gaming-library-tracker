import { useState } from 'react';

interface JournalEntryFormProps {
  onSubmit: (data: {
    content: string;
    rating?: number;
    sessionDurationMinutes?: number;
    tags?: string;
  }) => Promise<void>;
  onCancel: () => void;
  initialData?: {
    content: string;
    rating?: number;
    sessionDurationMinutes?: number;
    tags?: string;
  };
  isLoading?: boolean;
}

export default function JournalEntryForm({
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
}: JournalEntryFormProps) {
  const [content, setContent] = useState(initialData?.content || '');
  const [rating, setRating] = useState<number | undefined>(initialData?.rating);
  const [sessionDuration, setSessionDuration] = useState<number | undefined>(
    initialData?.sessionDurationMinutes
  );
  const [tags, setTags] = useState(initialData?.tags || '');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!content.trim()) {
      setError('Content is required');
      return;
    }

    if (rating !== undefined && (rating < 1 || rating > 10)) {
      setError('Rating must be between 1 and 10');
      return;
    }

    try {
      await onSubmit({
        content: content.trim(),
        rating,
        sessionDurationMinutes: sessionDuration,
        tags: tags.trim() || undefined,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save entry');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Content */}
      <div>
        <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
          Journal Entry <span className="text-red-500">*</span>
        </label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Share your thoughts about this gaming session..."
          required
        />
      </div>

      {/* Rating */}
      <div>
        <label htmlFor="rating" className="block text-sm font-medium text-gray-700 mb-1">
          Rating (1-10)
        </label>
        <div className="flex items-center space-x-2">
          <input
            type="number"
            id="rating"
            value={rating || ''}
            onChange={(e) => setRating(e.target.value ? parseInt(e.target.value) : undefined)}
            min="1"
            max="10"
            className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="1-10"
          />
          {rating && (
            <div className="flex items-center">
              <span className="text-yellow-500 text-lg">★</span>
              <span className="text-sm text-gray-600 ml-1">{rating}/10</span>
            </div>
          )}
        </div>
      </div>

      {/* Session Duration */}
      <div>
        <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
          Session Duration (minutes)
        </label>
        <input
          type="number"
          id="duration"
          value={sessionDuration || ''}
          onChange={(e) =>
            setSessionDuration(e.target.value ? parseInt(e.target.value) : undefined)
          }
          min="1"
          className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="e.g. 90"
        />
        {sessionDuration && (
          <span className="text-sm text-gray-600 ml-2">
            ({Math.floor(sessionDuration / 60)}h {sessionDuration % 60}m)
          </span>
        )}
      </div>

      {/* Tags */}
      <div>
        <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
          Tags
        </label>
        <input
          type="text"
          id="tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="boss-fight, multiplayer, story-mission"
        />
        <p className="text-xs text-gray-500 mt-1">
          Separate tags with commas
        </p>
      </div>

      {/* Buttons */}
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-indigo-400"
        >
          {isLoading ? 'Saving...' : initialData ? 'Update Entry' : 'Create Entry'}
        </button>
      </div>
    </form>
  );
}