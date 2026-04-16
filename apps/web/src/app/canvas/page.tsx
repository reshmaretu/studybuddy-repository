'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useUser } from '@/hooks/useAuth';
import InfiniteCanvas from '@/components/InfiniteCanvas';
import { CanvasPresenceSidebar } from '@/components/CanvasPresenceSidebar';
import { Loader } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';

export default function CanvasPage() {
  const { user, isLoading } = useUser();
  const searchParams = useSearchParams();
  const [profileName, setProfileName] = useState('Anonymous');
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [roomTitle, setRoomTitle] = useState<string | null>(null);
  const [roomDescription, setRoomDescription] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('display_name, full_name')
        .eq('id', user.id)
        .single();

      const resolvedName =
        data?.display_name?.trim() ||
        data?.full_name?.trim() ||
        (user.user_metadata?.full_name as string | undefined) ||
        (user.user_metadata?.name as string | undefined) ||
        'Anonymous';

      setProfileName(resolvedName);
      setIsProfileLoading(false);
    };

    loadProfile();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const loadRoomMetadata = async () => {
      const param = searchParams.get('room');
      if (!param) return;
      const { data } = await supabase
        .from('rooms')
        .select('name, description')
        .eq('room_code', param)
        .single();

      if (data) {
        setRoomTitle(data.name || null);
        setRoomDescription(data.description || null);
      }
    };

    loadRoomMetadata();
  }, [user, searchParams]);

  const roomKey = useMemo(() => {
    const param = searchParams.get('room');
    return param && param.trim() !== '' ? param.trim() : user?.id || 'demo';
  }, [searchParams, user?.id]);

  const roomId = 'canvas-' + roomKey;

  if (isLoading || isProfileLoading) {
    return (
      <div className="flex items-center justify-center w-full h-screen">
        <Loader className="animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <div>Not authenticated</div>;
  }

  return (
    <div className="relative h-screen w-full bg-[#0b1211]">
      <Suspense fallback={<Loader />}>
        <InfiniteCanvas
          roomId={roomId}
          userId={user.id}
          userName={profileName}
          realtimeProvider="supabase"
          roomTitle={roomTitle}
          roomDescription={roomDescription}
        />
      </Suspense>
      <CanvasPresenceSidebar
        roomId={roomId}
        userId={user.id}
        userName={profileName}
      />
    </div>
  );
}