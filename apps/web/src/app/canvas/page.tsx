'use client';

import { Suspense, useEffect, useState } from 'react';
import { useUser } from '@/hooks/useAuth';
import InfiniteCanvas from '@/components/InfiniteCanvas';
import { Loader } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function CanvasPage() {
  const { user, isLoading } = useUser();
  const [profileName, setProfileName] = useState('Anonymous');
  const [isProfileLoading, setIsProfileLoading] = useState(true);

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

  const roomId = 'canvas-' + (user.id || 'demo');

  return (
    <Suspense fallback={<Loader />}>
      <InfiniteCanvas
        roomId={roomId}
        userId={user.id}
        userName={profileName}
        realtimeProvider="supabase"
      />
    </Suspense>
  );
}