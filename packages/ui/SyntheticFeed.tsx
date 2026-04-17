'use client';

import React, { useEffect, useState } from 'react';
import { useStudyStore } from '@studybuddy/api';
import { formatDistanceToNow } from 'date-fns';

export const SyntheticFeed = () => {
  const { broadcasts, fetchBroadcasts } = useStudyStore();
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const loadBroadcasts = async () => {
      try {
        await fetchBroadcasts(20, 0);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load broadcasts:', error);
        setLoading(false);
      }
    };

    loadBroadcasts();
  }, [fetchBroadcasts]);

  const loadMore = async () => {
    try {
      await fetchBroadcasts(20, broadcasts.length);
    } catch (error) {
      console.error('Failed to load more broadcasts:', error);
    }
  };

  if (loading) {
    return (
      <div className="w-full p-4 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-current"></div>
        <p className="text-sm text-base-content/60 mt-2">Loading network feed...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      <h3 className="text-sm font-semibold text-base-content/80 uppercase tracking-wide">
        🌐 Network Updates
      </h3>

      {broadcasts.length === 0 ? (
        <div className="p-4 text-center text-sm text-base-content/60 rounded-lg bg-base-100/50">
          <p>No broadcasts yet. Be the first to share!</p>
        </div>
      ) : (
        <>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {broadcasts.map((broadcast) => (
              <div
                key={broadcast.id}
                className="p-3 rounded-lg bg-base-100/50 border border-base-300 hover:border-base-400 transition-colors"
              >
                <div className="flex items-start gap-2">
                  {broadcast.profiles?.avatar_url && (
                    <img
                      src={broadcast.profiles.avatar_url}
                      alt={broadcast.profiles.display_name}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-base-content/90">
                        {broadcast.profiles?.display_name || 'Anonymous'}
                      </span>
                      <span className="text-xs text-base-content/50">
                        {formatDistanceToNow(new Date(broadcast.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-base-content/80 break-words">
                      {broadcast.content}
                    </p>
                    {broadcast.broadcast_type !== 'custom-status' && (
                      <span className="inline-block mt-2 text-xs px-2 py-1 rounded-full bg-base-200 text-base-content/60">
                        {broadcast.broadcast_type === 'milestone'
                          ? '🎉 Milestone'
                          : broadcast.broadcast_type === 'quest-progress'
                          ? '⚔️ Quest Progress'
                          : '💬 Feedback'}
                      </span>
                    )}
                    {broadcast.reactions_count > 0 && (
                      <div className="mt-2 text-xs text-base-content/60">
                        ❤️ {broadcast.reactions_count} reactions
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {hasMore && broadcasts.length > 0 && (
            <button
              onClick={loadMore}
              className="w-full py-2 text-sm text-primary hover:text-primary/80 transition-colors"
            >
              Load more updates
            </button>
          )}
        </>
      )}
    </div>
  );
};
