import { NextRequest, NextResponse } from 'next/server';
import { getRouteSupabase } from '@/lib/supabase-route';

// DELETE /api/pacts/[id] - Leave pact
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supabase, user } = await getRouteSupabase(req);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'delete') {
      const { data: pact, error: pactError } = await supabase
        .from('pacts')
        .select('id, created_by')
        .eq('id', id)
        .single();

      if (pactError || !pact) {
        return NextResponse.json({ error: 'Pact not found' }, { status: 404 });
      }

      if (pact.created_by !== user.id) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
      }

      const { error: deleteError } = await supabase
        .from('pacts')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Check if user is member
    const { data: member, error: memberError } = await supabase
      .from('pact_members')
      .select()
      .eq('pact_id', id)
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'Not a member of this pact' }, { status: 403 });
    }

    // Remove user from pact
    const { error } = await supabase
      .from('pact_members')
      .delete()
      .eq('pact_id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    // Check if pact is now empty
    const { data: remainingMembers } = await supabase
      .from('pact_members')
      .select()
      .eq('pact_id', id);

    // If no members left, delete the pact
    if (!remainingMembers || remainingMembers.length === 0) {
      await supabase.from('pacts').delete().eq('id', id);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Leave pact error:', error);
    return NextResponse.json(
      { error: 'Failed to leave pact' },
      { status: 500 }
    );
  }
}
