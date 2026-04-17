import { NextRequest, NextResponse } from 'next/server';
import { getRouteSupabase } from '@/lib/supabase-route';

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await getRouteSupabase(req);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content, broadcastType = 'custom-status' } = await req.json();

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('synthetic_logs')
      .insert([{
        user_id: user.id,
        content: content.trim(),
        broadcast_type: broadcastType,
        created_at: new Date().toISOString(),
        reactions_count: 0,
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Broadcast error:', error);
    return NextResponse.json(
      { error: 'Failed to create broadcast' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { supabase, user } = await getRouteSupabase(req);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get recent broadcasts with user info
    const { data, error } = await supabase
      .from('synthetic_logs')
      .select(`
        id,
        user_id,
        content,
        broadcast_type,
        created_at,
        reactions_count,
        profiles(display_name, avatar_url, status)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Fetch broadcasts error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch broadcasts' },
      { status: 500 }
    );
  }
}
