import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Pricing — eKsięgowy AI';
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
          padding: '60px',
        }}
      >
        <div
          style={{
            fontSize: '48px',
            fontWeight: 700,
            color: 'white',
            letterSpacing: '-1px',
            marginBottom: '24px',
          }}
        >
          eKsięgowy AI
        </div>
        <div
          style={{
            fontSize: '32px',
            color: 'rgba(255, 255, 255, 0.9)',
            textAlign: 'center',
            marginBottom: '48px',
          }}
        >
          Simple, Transparent Pricing
        </div>
        <div
          style={{
            display: 'flex',
            gap: '32px',
          }}
        >
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              borderRadius: '16px',
              padding: '32px 48px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div style={{ fontSize: '24px', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '8px' }}>
              Free
            </div>
            <div style={{ fontSize: '40px', fontWeight: 700, color: 'white' }}>PLN 0</div>
            <div style={{ fontSize: '16px', color: 'rgba(255, 255, 255, 0.7)', marginTop: '4px' }}>
              Bring your own API key
            </div>
          </div>
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.25)',
              borderRadius: '16px',
              padding: '32px 48px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              border: '2px solid rgba(255, 255, 255, 0.4)',
            }}
          >
            <div style={{ fontSize: '24px', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '8px' }}>
              Pro
            </div>
            <div style={{ fontSize: '40px', fontWeight: 700, color: 'white' }}>PLN 14.99</div>
            <div style={{ fontSize: '16px', color: 'rgba(255, 255, 255, 0.7)', marginTop: '4px' }}>
              Included AI credits
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
