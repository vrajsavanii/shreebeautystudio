import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#041f24',
        color: '#ffffff',
        fontFamily: 'system-ui, sans-serif',
        padding: 20,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 24,
          background: 'linear-gradient(135deg, #EABA38 0%, #D49B20 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 36,
          marginBottom: 20,
          boxShadow: '0 8px 24px rgba(234, 186, 56, 0.3)',
        }}
      >
        ✨
      </div>
      <h1 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 10px', color: '#EABA38' }}>
        404 — Page Not Found
      </h1>
      <p style={{ fontSize: 15, color: '#94a3b8', maxWidth: 440, margin: '0 0 24px', lineHeight: 1.5 }}>
        આ પેજ ઉપલબ્ધ નથી અથવા કાઢી નાખવામાં આવ્યું છે. તમે મુખ્ય ડેશબોર્ડ પર પાછા જઈ શકો છો.
      </p>
      <Link
        href="/admin"
        style={{
          background: 'linear-gradient(135deg, #EABA38 0%, #D49B20 100%)',
          color: '#041f24',
          fontWeight: 800,
          fontSize: 14,
          padding: '12px 28px',
          borderRadius: 12,
          textDecoration: 'none',
          boxShadow: '0 4px 14px rgba(234, 186, 56, 0.35)',
        }}
      >
        ← Go to Dashboard (મુખ્ય પેજ પર જાઓ)
      </Link>
    </div>
  );
}
