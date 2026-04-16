'use client';

import { Suspense } from 'react';
import { useUser } from '@/hooks/useAuth';
import InfiniteCanvas from '@/components/InfiniteCanvas';
import { Loader } from 'lucide-react';

export default function CanvasPage() {
  const { user, isLoading } = useUser();

  if (isLoading) {
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
        userName={user.name || 'Anonymous'}
        realtimeProvider="supabase"
      />
    </Suspense>
  );
}