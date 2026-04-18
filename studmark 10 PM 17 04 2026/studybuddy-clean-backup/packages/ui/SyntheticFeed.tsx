'use client';

import React, { useEffect, useState } from 'react';
import { useStudyStore } from '@studybuddy/api';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, Radio, Sparkles, Target, Heart } from 'lucide-react';

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
    <div className="w-full space-y-4">
      <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
        <Radio size={14} className="text-[var(--accent-yellow)]" /> Network Updates
      </h3>

      {broadcasts.length === 0 ? (
        <div className="p-4 text-center text-sm text-[var(--text-muted)] rounded-xl bg-[var(--bg-dark)]/60 border border-[var(--border-color)]">
          <p>No broadcasts yet. Be the first to share!</p>
        </div>
      ) : (
        <>
          <div className="space-y-3 max-h-96 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {broadcasts.map((broadcast) => (
              <div
                key={broadcast.id}
                className="p-4 rounded-xl bg-[var(--bg-dark)]/60 border border-[var(--border-color)] hover:border-[var(--accent-teal)]/40 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {broadcast.profiles?.avatar_url && (
                    <img
                      src={broadcast.profiles.avatar_url}
                      alt={broadcast.profiles.display_name}
                      className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm text-[var(--text-main)] truncate">
                        {broadcast.profiles?.display_name || 'Anonymous'}
                      </span>
                      <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                        {formatDistanceToNow(new Date(broadcast.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text-main)]/80 break-words">
                      {broadcast.content}
                    </p>
                    {broadcast.broadcast_type !== 'custom-status' && (
                      <span className="inline-flex items-center gap-1 mt-3 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-muted)]">
                        {broadcast.broadcast_type === 'milestone' ? (
                          <Sparkles size={12} className="text-[var(--accent-yellow)]" />
                        ) : broadcast.broadcast_type === 'quest-progress' ? (
                          <Target size={12} className="text-[var(--accent-teal)]" />
                        ) : (
                          <MessageCircle size={12} className="text-[var(--text-muted)]" />
                        )}
                        {broadcast.broadcast_type === 'milestone'
                          ? 'Milestone'
                          : broadcast.broadcast_type === 'quest-progress'
                          ? 'Quest Progress'
                          : 'Feedback'}
                      </span>
                    )}
                    {broadcast.reactions_count > 0 && (
                      <div className="mt-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-1">
                        <Heart size={12} className="text-[var(--accent-teal)]" />
                        {broadcast.reactions_count} reactions
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
              className="w-full py-2 text-xs font-black uppercase tracking-widest text-[var(--accent-teal)] hover:text-[var(--text-main)] transition-colors"
            >
              Load more updates
            </button>
          )}
        </>
      )}
    </div>
  );
};
