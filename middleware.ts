import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Simple in-memory fallback
const cache = new Map()

export async function middleware(request: NextRequest) {
    // Only rate limit API routes
    if (!request.nextUrl.pathname.startsWith('/api')) {
        return NextResponse.next()
    }

    // Get IP from headers (x-forwarded-for) or fallback
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1'

    // 1. Basic In-Memory Rate Limiting (Fallback)
    // Allow 20 requests per 10 seconds per IP
    const now = Date.now()
    const windowSize = 10000
    const limit = 20

    const record = cache.get(ip) || { count: 0, startTime: now }

    if (now - record.startTime > windowSize) {
        // Reset window
        record.count = 1
        record.startTime = now
    } else {
        record.count++
    }

    cache.set(ip, record)

    if (record.count > limit) {
        return new NextResponse(
            JSON.stringify({ error: 'Too Many Requests', message: 'Please slow down.' }),
            { status: 429, headers: { 'Content-Type': 'application/json' } }
        )
    }

    return NextResponse.next()
}

export const config = {
    matcher: '/api/:path*',
}
