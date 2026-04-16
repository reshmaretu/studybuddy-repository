"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import ChumRenderer from "@/components/ChumRenderer";
import { useStudyStore } from "@/store/useStudyStore";
import type { WardrobeAccessory } from "@/store/useStudyStore";

interface PresenceUser {
  id: string;
  name: string;
  avatarUrl?: string | null;
  chumBaseColor?: string | null;
  chumAccessories?: WardrobeAccessory[] | null;
}

interface CanvasPresenceSidebarProps {
  roomId: string;
  userId: string;
  userName: string;
}

export const CanvasPresenceSidebar: React.FC<CanvasPresenceSidebarProps> = ({
  roomId,
  userId,
  userName,
}) => {
  const { activeAccessories, activeBaseColor } = useStudyStore();
  const [participants, setParticipants] = useState<PresenceUser[]>([]);

  const channelName = useMemo(() => `canvas-presence:${roomId}`, [roomId]);

  useEffect(() => {
    let isActive = true;

    const channel = supabase.channel(channelName, {
      config: { presence: { key: userId } },
    });

    channel.on("presence", { event: "sync" }, async () => {
      if (!isActive) return;
      const state = channel.presenceState();
      const users: PresenceUser[] = [];

      let avatarLookup: Record<string, string | null> = {};

      const ids = Object.keys(state);
      if (ids.length > 0) {
        const { data } = await supabase
          .from('profiles')
          .select('id, avatar_url, display_name, full_name')
          .in('id', ids);
        if (data) {
          data.forEach((profile) => {
            avatarLookup[profile.id] = profile.avatar_url ?? null;
          });
        }
      }

      Object.entries(state).forEach(([key, metas]) => {
        const meta = Array.isArray(metas) ? metas[metas.length - 1] : undefined;
        users.push({
          id: key,
          name: meta?.name || "Anonymous",
          avatarUrl: avatarLookup[key] ?? meta?.avatarUrl || null,
          chumBaseColor: meta?.chumBaseColor || null,
          chumAccessories: meta?.chumAccessories || null,
        });
      });

      setParticipants(users);
    });

    channel.subscribe(async (status) => {
      if (status !== "SUBSCRIBED") return;
      await channel.track({
        name: userName,
        chumBaseColor: activeBaseColor || "base14",
        chumAccessories: activeAccessories || [],
      });
    });

    return () => {
      isActive = false;
      supabase.removeChannel(channel);
    };
  }, [channelName, userId, userName, activeAccessories, activeBaseColor]);

  return (
    <div className="fixed right-6 top-24 z-[450] w-64 rounded-3xl border border-white/10 bg-[#0b1211]/95 p-4 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/60 mb-3">
        <Users size={14} /> Presence ({participants.length})
      </div>
      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
        {participants.map((user) => (
          <div
            key={user.id}
            className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70"
          >
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="h-7 w-7 rounded-full object-cover border border-white/10"
              />
            ) : user.chumBaseColor ? (
              <div className="h-7 w-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                <ChumRenderer
                  size="w-7 h-7"
                  baseColorIdOverride={user.chumBaseColor}
                  activeAccessoriesOverride={user.chumAccessories || undefined}
                />
              </div>
            ) : (
              <div className="h-7 w-7 rounded-full bg-white/10 flex items-center justify-center text-[10px]">
                {user.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="truncate">{user.name}</span>
          </div>
        ))}
        {participants.length === 0 && (
          <div className="text-xs text-white/40">No one here yet.</div>
        )}
      </div>
    </div>
  );
};
