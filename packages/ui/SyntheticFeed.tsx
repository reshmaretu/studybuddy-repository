'use client';

import React, { useEffect, useRef, useState } from 'react';
import { supabase, useStudyStore } from '@studybuddy/api';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, Radio, Sparkles, Target, Heart } from 'lucide-react';
import * as THREE from 'three';

export const SyntheticFeed = () => {
  const { broadcasts, fetchBroadcasts, triggerChumToast } = useStudyStore();
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [sparkBurst, setSparkBurst] = useState<{ id: string; name: string } | null>(null);
  const sparkCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [sparkedIds, setSparkedIds] = useState<Set<string>>(new Set());
  const [cooldownUntil, setCooldownUntil] = useState(0);

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

  useEffect(() => {
    const syncUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);
    };
    syncUser();
  }, []);

  const loadMore = async () => {
    try {
      await fetchBroadcasts(20, broadcasts.length);
    } catch (error) {
      console.error('Failed to load more broadcasts:', error);
    }
  };

  const handleSpark = (name: string, id: string) => {
    const now = Date.now();
    if (now < cooldownUntil) return;
    if (sparkedIds.has(id)) return;
    setSparkedIds((prev) => new Set(prev).add(id));
    setCooldownUntil(now + 2000);
    setSparkBurst({ id, name });
    const safeName = name?.trim() || 'that user';
    triggerChumToast?.(`You sparked ${safeName}'s feed`, 'success');
  };

  useEffect(() => {
    if (!sparkBurst) return;
    const timer = setTimeout(() => setSparkBurst(null), 1200);
    return () => clearTimeout(timer);
  }, [sparkBurst]);

  useEffect(() => {
    if (!sparkBurst) return;
    const canvas = sparkCanvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight, false);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 140;

    const starCanvas = document.createElement('canvas');
    starCanvas.width = 64;
    starCanvas.height = 64;
    const ctx = starCanvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, 64, 64);
    ctx.translate(32, 32);
    ctx.strokeStyle = 'rgba(255,255,255,1)';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(255,255,255,0.9)';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    const spikes = 4;
    const outer = 18;
    const inner = 6;
    for (let i = 0; i < spikes * 2; i += 1) {
      const radius = i % 2 === 0 ? outer : inner;
      const angle = (Math.PI / spikes) * i;
      ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    ctx.closePath();
    ctx.stroke();

    const starTexture = new THREE.CanvasTexture(starCanvas);
    const particles = 200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particles * 3);
    const velocities = new Float32Array(particles * 3);

    for (let i = 0; i < particles; i += 1) {
      const idx = i * 3;
      positions[idx] = (Math.random() - 0.5) * 220;
      positions[idx + 1] = (Math.random() - 0.5) * 180;
      positions[idx + 2] = (Math.random() - 0.5) * 40;
      velocities[idx] = (Math.random() - 0.5) * 0.6;
      velocities[idx + 1] = Math.random() * 0.9 + 0.2;
      velocities[idx + 2] = (Math.random() - 0.5) * 0.4;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      size: 8,
      map: starTexture,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: 0xffffff,
      opacity: 1
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const start = performance.now();
    let frame = 0;

    const animate = () => {
      const now = performance.now();
      const elapsed = now - start;
      const t = Math.min(1, elapsed / 1100);

      for (let i = 0; i < particles; i += 1) {
        const idx = i * 3;
        positions[idx] += velocities[idx];
        positions[idx + 1] += velocities[idx + 1];
        positions[idx + 2] += velocities[idx + 2];
      }

      geometry.attributes.position.needsUpdate = true;
      material.opacity = 1 - t;
      material.size = 8 + t * 6;

      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);

      if (t >= 1) {
        cancelAnimationFrame(frame);
      }
    };

    frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frame);
      geometry.dispose();
      material.dispose();
      starTexture.dispose();
      renderer.dispose();
    };
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
      <style>{`
        @keyframes spark-burst {
          0% { opacity: 0; transform: scale(0.6); }
          30% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.35); }
        }
      `}</style>
      {sparkBurst && (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(45,212,191,0.28),transparent_55%)]" style={{ animation: 'spark-burst 1.2s ease-out' }} />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(250,204,21,0.45),transparent_50%)]" style={{ animation: 'spark-burst 1.2s ease-out' }} />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,rgba(14,165,233,0.45),transparent_55%)]" style={{ animation: 'spark-burst 1.2s ease-out' }} />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_30%,rgba(251,113,133,0.35),transparent_55%)]" style={{ animation: 'spark-burst 1.2s ease-out' }} />
          <div className="absolute inset-0" style={{ mixBlendMode: 'screen' }}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.25),transparent_60%)]" style={{ animation: 'spark-burst 1.2s ease-out' }} />
          </div>
          <canvas ref={sparkCanvasRef} className="absolute inset-0 w-full h-full" />
        </div>
      )}
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
            {broadcasts.map((broadcast) => {
              const displayName = broadcast.profiles?.display_name || 'Anonymous';
              const isSelf = currentUserId ? broadcast.user_id === currentUserId : false;
              const isSparked = sparkedIds.has(broadcast.id);
              const isCoolingDown = Date.now() < cooldownUntil;
              const sparkDisabled = isSelf || isSparked || isCoolingDown;
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
                  onClick={() => handleSpark(displayName, broadcast.id)}
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
