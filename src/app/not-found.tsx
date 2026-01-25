export default function NotFound() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '2rem',
        textAlign: 'center',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem', color: '#333' }}>
        404
      </h1>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem', color: '#666' }}>
        العائلة غير موجودة
      </h2>
    </div>
  );
}
