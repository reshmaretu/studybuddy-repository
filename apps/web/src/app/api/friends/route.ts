import { NextRequest, NextResponse } from 'next/server';
import { getRouteSupabase } from '@/lib/supabase-route';

// POST /api/friends/request - Send friend request
export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await getRouteSupabase(req);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { targetUserId } = await req.json();

    if (!targetUserId) {
      return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 });
    }

    if (targetUserId === user.id) {
      return NextResponse.json({ error: 'Cannot friend yourself' }, { status: 400 });
    }

    // Check if already friends or request exists
    const { data: existing } = await supabase
      .from('user_friendships')
      .select()
      .or(`and(user_id_1.eq.${user.id},user_id_2.eq.${targetUserId}),and(user_id_1.eq.${targetUserId},user_id_2.eq.${user.id})`)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Friend request already exists or you are already friends' },
        { status: 409 }
      );
    }

    // Create friend request (pending)
    const { data, error } = await supabase
      .from('user_friendships')
      .insert([{
        user_id_1: user.id,
        user_id_2: targetUserId,
        status: 'pending',
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) throw error;

    // Add notification
    await supabase.from('notifications').insert([{
      user_id: targetUserId,
      title: 'New Friend Request',
      message: 'You have a new friend request',
      type: 'friend_request',
      related_user_id: user.id,
    }]);

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Friend request error:', error);
    return NextResponse.json(
      { error: 'Failed to send friend request' },
      { status: 500 }
    );
  }
}

// GET /api/friends - Get user's friends and friend requests
export async function GET(req: NextRequest) {
  try {
    const { supabase, user } = await getRouteSupabase(req);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'friends'; // 'friends', 'pending', 'requested'

    let query = supabase
      .from('user_friendships')
      .select(`
        id,
        user_id_1,
        user_id_2,
        status,
        created_at
      `);

    if (type === 'friends') {
      query = query.eq('status', 'accepted');
    } else if (type === 'pending') {
      query = query.eq('status', 'pending').eq('user_id_2', user.id);
    } else if (type === 'requested') {
      query = query.eq('status', 'pending').eq('user_id_1', user.id);
    }

    query = query.or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);

    const { data, error } = await query;

    if (error) throw error;

    const friendships = data || [];
    const userIds = Array.from(new Set(friendships.flatMap((f) => [f.user_id_1, f.user_id_2])));

    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name, full_name, avatar_url, status')
      .in('id', userIds);

    if (profileError) throw profileError;

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
    const merged = friendships.map((f) => ({
      ...f,
      profiles_1: profileMap.get(f.user_id_1) || null,
      profiles_2: profileMap.get(f.user_id_2) || null,
    }));

    return NextResponse.json(merged, { status: 200 });
  } catch (error) {
    console.error('Get friends error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch friends' },
      { status: 500 }
    );
  }
}
