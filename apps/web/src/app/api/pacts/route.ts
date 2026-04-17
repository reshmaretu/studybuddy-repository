import { NextRequest, NextResponse } from 'next/server';
import { getRouteSupabase } from '@/lib/supabase-route';

// POST /api/pacts - Create a new pact
export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await getRouteSupabase(req);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pactName, memberIds } = await req.json();

    if (!pactName || !Array.isArray(memberIds) || memberIds.length === 0) {
      return NextResponse.json(
        { error: 'pactName and memberIds array are required' },
        { status: 400 }
      );
    }

    // Ensure creator is included
    if (!memberIds.includes(user.id)) {
      memberIds.push(user.id);
    }

    // Remove duplicates
    const uniqueMembers = [...new Set(memberIds)];

    if (uniqueMembers.length < 2) {
      return NextResponse.json(
        { error: 'Pact must have at least 2 members' },
        { status: 400 }
      );
    }

    // Generate random constellation color (hex)
    const constellationColor = '#' + Math.floor(Math.random()*16777215).toString(16);

    // Create pact
    const { data: pact, error: pactError } = await supabase
      .from('pacts')
      .insert([{
        pact_name: pactName,
        created_by: user.id,
        constellation_color: constellationColor,
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (pactError) throw pactError;

    // Add members to pact
    const memberRecords = uniqueMembers.map(userId => ({
      pact_id: pact.id,
      user_id: userId,
      joined_at: new Date().toISOString(),
    }));

    const { error: membersError } = await supabase
      .from('pact_members')
      .insert(memberRecords);

    if (membersError) throw membersError;

    // Notify members
    for (const memberId of uniqueMembers) {
      if (memberId !== user.id) {
        await supabase.from('notifications').insert([{
          user_id: memberId,
          title: 'Pact Invitation',
          message: `You've been invited to join a pact: ${pactName}`,
          type: 'pact_invitation',
          related_user_id: user.id,
          related_pact_id: pact.id,
        }]);
      }
    }

    return NextResponse.json({
      ...pact,
      members: uniqueMembers,
    }, { status: 201 });
  } catch (error) {
    console.error('Create pact error:', error);
    return NextResponse.json(
      { error: 'Failed to create pact' },
      { status: 500 }
    );
  }
}

// GET /api/pacts - Get user's pacts
export async function GET(req: NextRequest) {
  try {
    const { supabase, user } = await getRouteSupabase(req);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('pact_members')
      .select(`
        pact_id,
        pacts(
          id,
          pact_name,
          created_by,
          constellation_color,
          created_at
        )
      `)
      .eq('user_id', user.id);

    if (error) throw error;

    // Extract unique pacts and get member details for each
    const pactIds = [...new Set((data || []).map(pm => pm.pact_id))];
    
    const pacts = await Promise.all(
      pactIds.map(async (pactId) => {
        const { data: members } = await supabase
          .from('pact_members')
          .select(`
            user_id,
            profiles(id, display_name, avatar_url, status)
          `)
          .eq('pact_id', pactId);

        const pactData = data?.find(pm => pm.pact_id === pactId)?.pacts;
        return {
          ...pactData,
          members: members?.map(m => m.profiles) || [],
        };
      })
    );

    return NextResponse.json(pacts, { status: 200 });
  } catch (error) {
    console.error('Get pacts error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pacts' },
      { status: 500 }
    );
  }
}
