'use client';

import React, { useEffect } from 'react';
import { useStudyStore } from '@studybuddy/api';
import { Button } from './Button';
import { Card } from './Card';

interface FriendRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FriendRequestModal: React.FC<FriendRequestModalProps> = ({ isOpen, onClose }) => {
  const { friendRequests, fetchFriendRequests, acceptFriendRequest, rejectFriendRequest } = useStudyStore();

  useEffect(() => {
    if (isOpen) {
      fetchFriendRequests();
    }
  }, [isOpen, fetchFriendRequests]);

  if (!isOpen) return null;

  const handleAccept = async (friendshipId: string) => {
    try {
      await acceptFriendRequest(friendshipId);
    } catch (error) {
      console.error('Failed to accept friend request:', error);
    }
  };

  const handleReject = async (friendshipId: string) => {
    try {
      await rejectFriendRequest(friendshipId);
    } catch (error) {
      console.error('Failed to reject friend request:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Friend Requests</h2>
          <button
            onClick={onClose}
            className="text-base-content/60 hover:text-base-content transition-colors"
          >
            ✕
          </button>
        </div>

        {friendRequests.length === 0 ? (
          <p className="text-center py-8 text-base-content/60">
            No pending friend requests
          </p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {friendRequests.map((request) => {
              const requester = request.profiles_1;
              return (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-base-100 border border-base-300"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {requester?.avatar_url && (
                      <img
                        src={requester.avatar_url}
                        alt={requester.display_name}
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {requester?.display_name || requester?.full_name || 'Unknown User'}
                      </p>
                      <p className="text-xs text-base-content/60">
                        Wants to be friends
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-shrink-0 ml-2">
                    <button
                      onClick={() => handleAccept(request.id)}
                      className="px-3 py-1 text-sm rounded-md bg-success text-success-content hover:opacity-90 transition-opacity"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleReject(request.id)}
                      className="px-3 py-1 text-sm rounded-md bg-base-300 text-base-content hover:bg-base-400 transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <Button onClick={onClose} variant="secondary">
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
};
