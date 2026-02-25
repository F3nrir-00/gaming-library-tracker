import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import JournalEntryCard from '../components/journal/JournalEntryCard';
import JournalEntryForm from '../components/journal/JournalEntryForm';
import { journalService } from '../services/journalService';

export default function JournalPage() {
  const [selectedTag, setSelectedTag] = useState('');
  const [minRating, setMinRating] = useState<number | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<number | null>(null);
  const queryClient = useQueryClient();

  // Fetch all journal entries
  const { data: journalData, isLoading } = useQuery({
    queryKey: ['journal', 'all', selectedTag, minRating],
    queryFn: () =>
      journalService.getMyEntries({
        tags: selectedTag || undefined,
        minRating: minRating || undefined,
      }),
  });

  // Update journal entry
  const updateEntryMutation = useMutation({
    mutationFn: ({ entryId, data }: { entryId: number; data: any }) =>
      journalService.updateEntry(entryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal'] });
      setEditingEntry(null);
      setShowForm(false);
    },
  });

  // Delete journal entry
  const deleteEntryMutation = useMutation({
    mutationFn: (entryId: number) => journalService.deleteEntry(entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal'] });
    },
  });

  const handleUpdateEntry = async (data: any) => {
    if (editingEntry) {
      await updateEntryMutation.mutateAsync({ entryId: editingEntry, data });
    }
  };

  const handleDeleteEntry = async (entryId: number) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      await deleteEntryMutation.mutateAsync(entryId);
    }
  };

  const handleEditEntry = (entryId: number) => {
    setEditingEntry(entryId);
    setShowForm(true);
  };

  // Extract all unique tags from entries
  const allTags = journalData?.entries
    .flatMap((entry) => entry.tags?.split(',').map((tag) => tag.trim()) || [])
    .filter(Boolean)
    .filter((tag, index, self) => self.indexOf(tag) === index)
    .sort() || [];

  return (
    <Layout>
      <div>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Journal Entries</h1>
          {journalData && (
            <p className="text-gray-600 mt-1">
              {journalData.totalEntries} total {journalData.totalEntries === 1 ? 'entry' : 'entries'}
            </p>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tag Filter */}
            <div>
              <label htmlFor="tag-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Tag
              </label>
              <select
                id="tag-filter"
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Tags</option>
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </div>

            {/* Rating Filter */}
            <div>
              <label htmlFor="rating-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Rating
              </label>
              <select
                id="rating-filter"
                value={minRating || ''}
                onChange={(e) => setMinRating(e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Ratings</option>
                {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((rating) => (
                  <option key={rating} value={rating}>
                    {rating}+ Stars
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Filters Display */}
          {(selectedTag || minRating) && (
            <div className="mt-4 flex items-center space-x-2">
              <span className="text-sm text-gray-600">Active filters:</span>
              {selectedTag && (
                <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs flex items-center">
                  Tag: {selectedTag}
                  <button
                    onClick={() => setSelectedTag('')}
                    className="ml-1 hover:text-indigo-900"
                  >
                    ×
                  </button>
                </span>
              )}
              {minRating && (
                <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs flex items-center">
                  Rating: {minRating}+
                  <button
                    onClick={() => setMinRating(undefined)}
                    className="ml-1 hover:text-indigo-900"
                  >
                    ×
                  </button>
                </span>
              )}
              <button
                onClick={() => {
                  setSelectedTag('');
                  setMinRating(undefined);
                }}
                className="text-sm text-gray-600 hover:text-gray-900 underline"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Edit Form (when editing) */}
        {showForm && editingEntry && (
          <div className="mb-6 p-6 bg-white rounded-lg shadow">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Edit Entry</h2>
            <JournalEntryForm
              onSubmit={handleUpdateEntry}
              onCancel={() => {
                setShowForm(false);
                setEditingEntry(null);
              }}
              initialData={journalData?.entries.find((e) => e.entryID === editingEntry)}
              isLoading={updateEntryMutation.isPending}
            />
          </div>
        )}

        {/* Entries List */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : journalData && journalData.entries.length > 0 ? (
          <div className="space-y-4">
            {journalData.entries.map((entry) => (
              <div key={entry.entryID}>
                <div className="mb-2">
                  <h3 className="text-sm font-medium text-gray-900">{entry.gameTitle}</h3>
                </div>
                <JournalEntryCard
                  entry={entry}
                  onEdit={() => handleEditEntry(entry.entryID)}
                  onDelete={() => handleDeleteEntry(entry.entryID)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No journal entries found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {selectedTag || minRating
                ? 'Try adjusting your filters or start writing journal entries from the game detail modal.'
                : 'Start writing journal entries from the game detail modal.'}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}