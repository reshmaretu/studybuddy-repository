'use client';

import React, { useState } from 'react';
import { useStudyStore } from '@studybuddy/api';
import { Button } from './Button';
import { Card } from './Card';

interface FormPactModalProps {
  isOpen: boolean;
  onClose: () => void;
  friendsList?: any[];
}

export const FormPactModal: React.FC<FormPactModalProps> = ({
  isOpen,
  onClose,
  friendsList = [],
}) => {
  const [pactName, setPactName] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { createPact } = useStudyStore();

  const handleToggleFriend = (userId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreatePact = async () => {
    if (!pactName.trim() || selectedFriends.length === 0) {
      alert('Please enter a pact name and select at least one member');
      return;
    }

    setLoading(true);
    try {
      await createPact(pactName, selectedFriends);
      setPactName('');
      setSelectedFriends([]);
      onClose();
    } catch (error) {
      console.error('Failed to create pact:', error);
      alert('Failed to create pact');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">✨ Form a Pact</h2>
          <button
            onClick={onClose}
            className="text-base-content/60 hover:text-base-content transition-colors"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-base-content/70 mb-4">
          Create a constellation of learners. Your lanterns will cluster together on the network!
        </p>

        <div className="space-y-4">
          {/* Pact Name Input */}
          <div>
            <label className="text-sm font-medium block mb-2">Pact Name</label>
            <input
              type="text"
              value={pactName}
              onChange={(e) => setPactName(e.target.value)}
              placeholder="e.g., Study Group, Book Club, Research Team"
              className="w-full px-3 py-2 rounded-lg border border-base-300 focus:outline-none focus:border-primary bg-base-100"
              disabled={loading}
            />
          </div>

          {/* Friends Selection */}
          <div>
            <label className="text-sm font-medium block mb-2">
              Select Members ({selectedFriends.length})
            </label>
            {friendsList.length === 0 ? (
              <p className="text-sm text-base-content/60 p-3 rounded-lg bg-base-100 text-center">
                No friends yet. Add friends to form a pact!
              </p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {friendsList.map((friend) => {
                  // Handle both friendship and user objects
                  const friendData = friend.profiles_2 || friend.profiles_1 || friend;
                  const friendId = friend.user_id_2 || friend.user_id_1 || friend.id;
                  const isSelected = selectedFriends.includes(friendId);

                  return (
                    <label key={friendId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-base-100/50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleFriend(friendId)}
                        className="w-4 h-4 rounded"
                        disabled={loading}
                      />
                      {friendData?.avatar_url && (
                        <img
                          src={friendData.avatar_url}
                          alt={friendData.display_name}
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                        />
                      )}
                      <span className="text-sm flex-1 truncate">
                        {friendData?.display_name || 'Unknown User'}
                      </span>
                      {isSelected && <span className="text-success">✓</span>}
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Info Box */}
          {selectedFriends.length > 0 && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-xs text-base-content/80">
                💫 When the pact forms, all members' lanterns will share a unique constellation color on the network.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button onClick={onClose} variant="secondary" disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleCreatePact}
            disabled={
              loading || !pactName.trim() || selectedFriends.length === 0
            }
          >
            {loading ? 'Creating...' : 'Form Pact'}
          </Button>
        </div>
      </Card>
    </div>
  );
};
