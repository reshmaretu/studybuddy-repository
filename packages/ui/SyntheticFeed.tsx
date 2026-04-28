'use client';

import React, { useEffect, useRef, useState } from 'react';
import { supabase, useStudyStore } from '@studybuddy/api';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, Radio, Sparkles, Target, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const SyntheticFeed = () => {
  const { broadcasts, fetchBroadcasts, triggerChumToast, sparkBroadcast } = useStudyStore();
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [sparkBurst, setSparkBurst] = useState<{ id: string; name: string } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [sparkedIds, setSparkedIds] = useState<Set<string>>(new Set());
  const [cooldownUntil, setCooldownUntil] = useState(0);

  useEffect(() => {
    const loadBroadcasts = async () => {
      try {
        await fetchBroadcasts(5, 0);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load broadcasts:', error);
        setLoading(false);
      }
    };

    loadBroadcasts();
  }, [fetchBroadcasts]);

  useEffect(() => {
    const syncUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);
    };
    syncUser();
  }, []);

  // 📡 REALTIME SPARKS
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel('public:broadcasts')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'broadcasts' 
      }, (payload) => {
        const updated = payload.new as any;
        const old = payload.old as any;
        
        if (updated.user_id === currentUserId && (updated.reactions_count || 0) > (old.reactions_count || 0)) {
            // Someone sparked me!
            setSparkBurst({ id: updated.id, name: 'Someone' });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const loadMore = async () => {
    try {
      await fetchBroadcasts(20, broadcasts.length);
    } catch (error) {
      console.error('Failed to load more broadcasts:', error);
    }
  };

  const handleSpark = (name: string, id: string, e: React.MouseEvent) => {
    const now = Date.now();
    if (now < cooldownUntil) return;
    if (sparkedIds.has(id)) return;

    setSparkedIds((prev) => new Set(prev).add(id));
    setCooldownUntil(now + 2000);
    
    sparkBroadcast(id); // Persist to network!
    const safeName = name?.trim() || 'that user';
    triggerChumToast?.(`You sparked ${safeName}'s feed`, 'success');
  };

  // Legacy Three.js effect removed for Framer Motion replacement
  useEffect(() => {
    if (!sparkBurst) return;
    const timer = setTimeout(() => setSparkBurst(null), 2500);
    return () => clearTimeout(timer);
  }, [sparkBurst]);

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
      <AnimatePresence>
        {sparkBurst && (
        <div className="fixed inset-0 z-[200000] pointer-events-none flex items-center justify-center overflow-hidden">
          {/* Subtle Golden Glow */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.4, 0] }}
            transition={{ duration: 2.5 }}
            className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(250,204,21,0.15),transparent_70%)]" 
          />
          
          <div className="relative">
            {/* Spark Text / Announcement */}
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.8 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -20, opacity: 0, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="bg-[var(--bg-card)]/80 backdrop-blur-2xl border-2 border-[var(--accent-yellow)] px-8 py-4 rounded-full shadow-[0_0_50px_rgba(250,204,21,0.2)] flex items-center gap-3 z-10"
            >
              <div className="w-8 h-8 bg-[var(--accent-yellow)] rounded-full flex items-center justify-center text-black">
                <Sparkles size={18} fill="currentColor" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-[var(--accent-yellow)]">Spark Received!</p>
                <p className="text-[10px] font-bold text-[var(--text-main)]">Someone ignited your feed</p>
              </div>
            </motion.div>

            {/* Yellow Premium Particles */}
            {Array.from({ length: 8 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                animate={{ 
                  x: (Math.random() - 0.5) * 400, 
                  y: (Math.random() - 0.5) * 400,
                  opacity: [0, 1, 0],
                  scale: [0, 1.2, 0.5],
                  rotate: Math.random() * 360
                }}
                transition={{ 
                  duration: 2, 
                  delay: i * 0.1,
                  ease: "easeOut"
                }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              >
                <Sparkles size={24} className="text-[var(--accent-yellow)]" fill="currentColor" />
              </motion.div>
            ))}
          </div>
        </div>
      )}
      </AnimatePresence>
      <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
        <Radio size={14} className="text-[var(--accent-yellow)]" /> Network Updates
      </h3>

      {broadcasts.length === 0 ? (
        <div className="p-4 text-center text-sm text-[var(--text-muted)] rounded-xl bg-[var(--bg-dark)]/60 border border-[var(--border-color)]">
          <p>No broadcasts yet. Be the first to share!</p>
        </div>
      ) : (
        <>
          <div className="space-y-3 max-h-[500px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {broadcasts
              .filter(b => ['milestone', 'study-room', 'canvas-room'].includes(b.broadcast_type))
              .slice(0, 5)
              .map((broadcast) => {
                const displayName = broadcast.profiles?.display_name || 'Anonymous';
                const isSelf = currentUserId ? broadcast.user_id === currentUserId : false;
                const isSparked = sparkedIds.has(broadcast.id);
                const isCoolingDown = Date.now() < cooldownUntil;
                const sparkDisabled = isSelf || isSparked || isCoolingDown;
                
                const isRoom = broadcast.broadcast_type === 'study-room' || broadcast.broadcast_type === 'canvas-room';
                const roomCode = broadcast.profiles?.joined_room_code || (broadcast.profiles?.status === 'hosting' ? 'ACTIVE' : null);
                // Note: We'd ideally need the actual room code from the broadcast metadata, 
                // but we'll fall back to the host's current status for now.
                
                return (
              <div
                key={broadcast.id}
                className="p-4 rounded-xl bg-[var(--bg-dark)]/60 border border-[var(--border-color)] hover:border-[var(--accent-teal)]/40 transition-colors relative"
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
                        {displayName}
                      </span>
                      <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                        {formatDistanceToNow(new Date(broadcast.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text-main)]/80 break-words">
                      {broadcast.content}
                    </p>
                    {broadcast.broadcast_type !== 'custom-status' && (
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-muted)]">
                          {broadcast.broadcast_type === 'milestone' ? (
                            <Sparkles size={12} className="text-[var(--accent-yellow)]" />
                          ) : broadcast.broadcast_type === 'study-room' ? (
                            <Radio size={12} className="text-[var(--accent-teal)]" />
                          ) : broadcast.broadcast_type === 'canvas-room' ? (
                            <Radio size={12} className="text-[var(--accent-cyan)]" />
                          ) : (
                            <MessageCircle size={12} className="text-[var(--text-muted)]" />
                          )}
                          {broadcast.broadcast_type === 'milestone'
                            ? 'Milestone'
                            : broadcast.broadcast_type === 'study-room'
                            ? 'Study Room'
                            : broadcast.broadcast_type === 'canvas-room'
                            ? 'Canvas Room'
                            : 'Update'}
                        </span>

                        {isRoom && (
                          <button
                            onClick={() => {
                              const code = broadcast.profiles?.joined_room_code;
                              if (code) {
                                window.location.href = broadcast.broadcast_type === 'canvas-room' 
                                  ? `/canvas?room=${code}` 
                                  : `/room/${code}`;
                              }
                            }}
                            disabled={!broadcast.profiles?.status || (broadcast.profiles.status !== 'hosting' && broadcast.profiles.status !== 'cafe')}
                            className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border transition-all ${
                              (broadcast.profiles?.status === 'hosting' || broadcast.profiles?.status === 'cafe')
                                ? 'bg-[var(--accent-teal)] border-[var(--accent-teal)] text-black hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(20,184,166,0.3)]'
                                : 'bg-[var(--bg-dark)] border-[var(--border-color)] text-[var(--text-muted)] cursor-not-allowed'
                            }`}
                          >
                            {(broadcast.profiles?.status === 'hosting' || broadcast.profiles?.status === 'cafe') ? 'Join Now' : 'Expired'}
                          </button>
                        )}
                      </div>
                    )}
                    {broadcast.reactions_count > 0 && (
                      <div className="mt-3 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-1">
                        <Heart size={12} className="text-[var(--accent-teal)]" />
                        {broadcast.reactions_count} reactions
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={sparkDisabled}
                  onClick={(e) => handleSpark(displayName, broadcast.id, e)}
                  className={`absolute right-4 bottom-4 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border transition-colors ${
                    sparkDisabled
                      ? 'border-[var(--border-color)] text-[var(--text-muted)]/60 cursor-not-allowed'
                      : 'border-[var(--accent-teal)]/30 text-[var(--accent-teal)] hover:bg-[var(--accent-teal)] hover:text-[#0b1211]'
                  }`}
                  title={isSelf ? "You can't spark your own feed." : isSparked ? 'Already sparked.' : isCoolingDown ? 'Cooling down...' : 'Spark this broadcast'}
                >
                  <Sparkles size={12} /> Spark
                </button>
              </div>
            );
            })}
          </div>

        </>
      )}
    </div>
  );
};
