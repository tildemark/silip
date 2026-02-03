import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Check database connection
    const response = await fetch('http://localhost:3000/api/section/1', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        api: response.ok ? 'ok' : 'degraded',
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    )
  }
}
