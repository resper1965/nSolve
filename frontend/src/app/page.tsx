export default function HomePage() {
  return (
    <html>
      <head>
        <title>Redirecting...</title>
        <meta httpEquiv="refresh" content="0;url=/auth/v2/login/" />
      </head>
      <body style={{ margin: 0, padding: 0, background: '#0B0C0E' }}>
        <script dangerouslySetInnerHTML={{ __html: 'window.location.href="/auth/v2/login/"' }} />
      </body>
    </html>
  );
}
