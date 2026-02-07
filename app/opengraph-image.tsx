import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'SILIP - Philippine Data Privacy Search Engine'
export const size = {
    width: 1200,
    height: 630,
}

export const contentType = 'image/png'

export default async function Image() {
    return new ImageResponse(
        (
            <div
                style={{
                    background: 'linear-gradient(to bottom right, #0F172A, #1E293B)',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'sans-serif',
                    color: 'white',
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h1 style={{ fontSize: 120, fontWeight: 'bold', margin: 0, letterSpacing: -2 }}>
                        SILIP
                    </h1>
                    <p style={{ fontSize: 40, color: '#94A3B8', marginTop: 20 }}>
                        Philippine Data Privacy Search Engine
                    </p>
                    <div
                        style={{
                            marginTop: 60,
                            background: 'linear-gradient(to right, #3B82F6, #8B5CF6)',
                            height: 8,
                            width: 400,
                            borderRadius: 4,
                        }}
                    />
                </div>
            </div>
        ),
        {
            ...size,
        }
    )
}
