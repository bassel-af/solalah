import Link from 'next/link';
import { getAllFamilySlugs } from '@/config/families';

export default function NotFound() {
  const familySlugs = getAllFamilySlugs();

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
      <p style={{ color: '#888', marginBottom: '2rem' }}>
        الرجاء استخدام رابط العائلة الصحيح
      </p>
      {familySlugs.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <p style={{ color: '#666', marginBottom: '1rem' }}>العائلات المتاحة:</p>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {familySlugs.map((slug) => (
              <li key={slug} style={{ marginBottom: '0.5rem' }}>
                <Link
                  href={`/${slug}`}
                  style={{
                    color: '#0070f3',
                    textDecoration: 'none',
                  }}
                >
                  /{slug}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
