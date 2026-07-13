import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get('title') ?? 'ListenTrueCrime'
  const verdict = searchParams.get('verdict')
  const score = searchParams.get('score')
  const sub = searchParams.get('sub') ?? 'True Crime Podcast Discovery & Reviews'

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0c0c14',
          fontFamily: 'Georgia, serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            left: '-100px',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(190,18,60,0.18) 0%, transparent 70%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-150px',
            right: '-100px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(190,18,60,0.10) 0%, transparent 70%)',
          }}
        />

        {/* Top bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '36px 56px 0',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#be123c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '16px',
              fontWeight: '700',
            }}
          >
            TC
          </div>
          <span style={{ color: '#a0a0b0', fontSize: '18px', fontFamily: 'Georgia, serif' }}>
            ListenTrueCrime
          </span>
        </div>

        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            justifyContent: 'center',
            padding: '0 56px',
          }}
        >
          {verdict && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: verdict === 'Must listen' ? 'rgba(190,18,60,0.2)' : 'rgba(255,255,255,0.08)',
                border: `1px solid ${verdict === 'Must listen' ? 'rgba(190,18,60,0.4)' : 'rgba(255,255,255,0.15)'}`,
                borderRadius: '100px',
                padding: '6px 16px',
                marginBottom: '20px',
                width: 'fit-content',
              }}
            >
              <span
                style={{
                  color: verdict === 'Must listen' ? '#be123c' : '#a0a0b0',
                  fontSize: '14px',
                  fontFamily: 'system-ui, sans-serif',
                  fontWeight: '600',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                {verdict}
              </span>
            </div>
          )}

          <h1
            style={{
              color: '#f2f2f5',
              fontSize: title.length > 40 ? '52px' : '64px',
              fontWeight: '700',
              lineHeight: 1.1,
              margin: '0 0 16px',
              maxWidth: score ? '800px' : '1000px',
            }}
          >
            {title}
          </h1>

          <p
            style={{
              color: '#6b6b80',
              fontSize: '22px',
              margin: '0',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            {sub}
          </p>
        </div>

        {/* Score + bottom bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 56px 36px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#be123c',
              }}
            />
            <span style={{ color: '#4b4b60', fontSize: '15px', fontFamily: 'system-ui, sans-serif' }}>
              listentruecrime.com
            </span>
          </div>
          {score && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                backgroundColor: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '10px 20px',
              }}
            >
              <span style={{ color: '#a0a0b0', fontSize: '14px', fontFamily: 'system-ui, sans-serif' }}>
                Binge factor
              </span>
              <span
                style={{
                  color: '#f2f2f5',
                  fontSize: '22px',
                  fontWeight: '700',
                  fontFamily: 'system-ui, sans-serif',
                }}
              >
                {score}/10
              </span>
            </div>
          )}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
