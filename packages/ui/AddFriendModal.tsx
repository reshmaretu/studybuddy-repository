'use client';

import React, { useState, useEffect } from 'react';
import { getAuthHeaders, useStudyStore } from '@studybuddy/api';
import { Button } from './Button';
import { Card } from './Card';

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddFriendModal: React.FC<AddFriendModalProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [requestedUsers, setRequestedUsers] = useState<Set<string>>(new Set());
  const { sendFriendRequest } = useStudyStore();

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const authHeaders = await getAuthHeaders();
      // Search for users by display name
      const response = await fetch(
        `/api/search/users?q=${encodeURIComponent(searchQuery)}`,
        { headers: authHeaders }
      );
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (userId: string) => {
    try {
      await sendFriendRequest(userId);
      setRequestedUsers((prev) => new Set([...prev, userId]));
    } catch (error) {
      console.error('Failed to send friend request:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">👥 Add Friend</h2>
          <button
            onClick={onClose}
            className="text-base-content/60 hover:text-base-content transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by name..."
              className="flex-1 px-3 py-2 rounded-lg border border-base-300 focus:outline-none focus:border-primary bg-base-100"
              disabled={loading}
            />
            <Button
              onClick={handleSearch}
              disabled={!searchQuery.trim() || loading}
              className="flex-shrink-0"
            >
              {loading ? '...' : 'Search'}
            </Button>
          </div>

          {/* Results */}
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {searchResults.length === 0 && searchQuery && !loading && (
              <p className="text-center py-4 text-base-content/60 text-sm">
                No users found
              </p>
            )}

            {searchResults.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 rounded-lg bg-base-100 border border-base-300"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {user.avatar_url && (
                    <img
                      src={user.avatar_url}
                      alt={user.display_name || user.full_name || 'User'}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">
                      {user.display_name || user.full_name || 'Unknown User'}
                    </p>
                    <p className="text-xs text-base-content/60">
                      {user.status || 'offline'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleSendRequest(user.id)}
                  disabled={requestedUsers.has(user.id)}
                  className={`px-3 py-1 text-sm rounded-md transition-colors flex-shrink-0 ml-2 ${
                    requestedUsers.has(user.id)
                      ? 'bg-base-300 text-base-content/60 cursor-not-allowed'
                      : 'bg-primary text-primary-content hover:opacity-90'
                  }`}
                >
                  {requestedUsers.has(user.id) ? '✓ Sent' : 'Add'}
                </button>
              </div>
            ))}
          </div>

          {!searchQuery && (
            <div className="p-3 rounded-lg bg-base-100/50 text-center text-sm text-base-content/60">
              Enter a username to search for friends
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={onClose} variant="secondary">
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
};
