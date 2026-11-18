/** @type {import('next').NextConfig} */
const nextConfig = {
  // SWC transform for styled-components: SSR-safe class names + readable displayNames.
  compiler: { styledComponents: true },
  // Docker builds set NEXT_OUTPUT=standalone: a self-contained server (server.js) with only the
  // node_modules it needs, for a small image. Local `npm run dev` / `npm start` are unaffected.
  ...(process.env.NEXT_OUTPUT === 'standalone' ? { output: 'standalone' } : {}),
};

export default nextConfig;
