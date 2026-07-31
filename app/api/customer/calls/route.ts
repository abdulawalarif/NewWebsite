import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const BACKEND_URL = process.env.VOICE_AGENT_ORIGIN || 'http://127.0.0.1:8080';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { calls: [], total: 0, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit') || '10';

  try {
    const response = await fetch(
      `${BACKEND_URL}/api/member/calls?user_id=${user.id}&limit=${limit}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!response.ok) throw new Error(`Backend returned ${response.status}`);
    const data = await response.json();
    return NextResponse.json({
      calls: data.calls || [],
      total: data.total || 0,
    });
  } catch (error) {
    console.error('Failed to fetch calls from backend:', error);
    return NextResponse.json(
      { calls: [], total: 0 },
      { status: 200 }
    );
  }
}
