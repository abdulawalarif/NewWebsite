import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.VOICE_AGENT_ORIGIN || 'http://127.0.0.1:8080';

export async function GET() {
  try {
    const response = await fetch(
      `${BACKEND_URL}/api/member/validation-tests?limit=10`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!response.ok) throw new Error(`Backend returned ${response.status}`);
    const data = await response.json();
    return NextResponse.json(
      { tests: data.tests || [], total: data.total || 0 },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error) {
    console.error('Failed to fetch validation tests from backend:', error);
    return NextResponse.json(
      { tests: [], total: 0 },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=30',
        },
      }
    );
  }
}
