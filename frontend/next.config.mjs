/** @type {import('next').NextConfig} */
const nextConfig = {
  // SWC transform for styled-components: SSR-safe class names + readable displayNames.
  compiler: { styledComponents: true },
};

export default nextConfig;
