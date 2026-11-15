'use client';

export default function Error({ error, reset }) {
  return (
    <div role="alert" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 30, gap: 10 }}>
      <p>Something went wrong... Sorry</p>
      <pre style={{ color: 'red', whiteSpace: 'pre-wrap' }}>{error.message}</pre>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}
