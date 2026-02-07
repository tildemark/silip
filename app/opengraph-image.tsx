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
                    height: '100%',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: '#0F172A',
                    position: 'relative',
                    overflow: 'hidden',
                    fontFamily: 'sans-serif',
                }}
            >
                {/* Background Gradients */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'radial-gradient(circle at 50% 50%, #020617 0%, #1E293B 100%)',
                        opacity: 0.8,
                    }}
                />

                {/* Blue Orb */}
                <div
                    style={{
                        position: 'absolute',
                        top: -100,
                        right: -100,
                        width: 600,
                        height: 600,
                        borderRadius: '50%',
                        background: '#3B82F6',
                        opacity: 0.2,
                        filter: 'blur(100px)',
                    }}
                />

                {/* Purple Orb */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: -100,
                        left: -100,
                        width: 600,
                        height: 600,
                        borderRadius: '50%',
                        background: '#8B5CF6',
                        opacity: 0.2,
                        filter: 'blur(100px)',
                    }}
                />

                {/* Content Container */}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        height: '100%',
                        paddingLeft: 120,
                        zIndex: 10,
                    }}
                >
                    <div
                        style={{
                            fontSize: 96,
                            fontWeight: 'bold',
                            color: 'white',
                            marginBottom: 20,
                            letterSpacing: '-2px',
                        }}
                    >
                        SILIP
                    </div>

                    <div
                        style={{
                            fontSize: 48,
                            color: '#94A3B8',
                            marginBottom: 10,
                        }}
                    >
                        Philippine Data Privacy
                    </div>

                    <div
                        style={{
                            fontSize: 48,
                            color: '#94A3B8',
                            marginBottom: 40,
                        }}
                    >
                        Search Engine
                    </div>

                    {/* Search Bar Line */}
                    <div
                        style={{
                            width: 600,
                            height: 4,
                            backgroundImage: 'linear-gradient(to right, #3B82F6, #8B5CF6)',
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
