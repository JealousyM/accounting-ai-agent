import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'How to get KSeF tokens — eKsięgowy AI';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px',
        }}
      >
        <div style={{ fontSize: '36px', color: 'rgba(255,255,255,0.85)', marginBottom: '16px' }}>
          eKsięgowy AI · Guide
        </div>
        <div
          style={{
            fontSize: '64px',
            fontWeight: 700,
            color: 'white',
            textAlign: 'center',
            lineHeight: 1.15,
            letterSpacing: '-1.5px',
          }}
        >
          How to get KSeF tokens
        </div>
        <div
          style={{
            marginTop: '40px',
            fontSize: '26px',
            color: 'rgba(255,255,255,0.85)',
            textAlign: 'center',
            maxWidth: '900px',
          }}
        >
          Step-by-step guide to generate an authentication token in the KSeF portal.
        </div>
      </div>
    ),
    { ...size },
  );
}
