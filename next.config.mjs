/** @type {import('next').NextConfig} */
const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https://*.googleusercontent.com;
    font-src 'self';
    connect-src 'self' https://*.firebaseio.com wss://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://*.googleapis.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
`;

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  compiler: {
    removeConsole: true,
  },
  async rewrites() {
    return [
      {
        source: '/access-gateway/node-sec-7f9e8a1d4b6c382109abfe43817c5690/session-authenticate',
        destination: '/login',
      },
      {
        source: '/access-gateway/node-sec-7f9e8a1d4b6c382109abfe43817c5690/enrollment-redemption',
        destination: '/register',
      },
      {
        source: '/corp-workspace/ctx-8a19f93c04b862145dae87b290cd419f8a37e1b54c0e62810/system-telemetry-monitor',
        destination: '/dashboard/overview',
      },
      {
        source: '/corp-workspace/ctx-8a19f93c04b862145dae87b290cd419f8a37e1b54c0e62810/encrypted-stream-terminal',
        destination: '/dashboard/messages',
      },
      {
        source: '/corp-workspace/ctx-8a19f93c04b862145dae87b290cd419f8a37e1b54c0e62810/channel-directory-index',
        destination: '/dashboard/conversations',
      },
      {
        source: '/corp-workspace/ctx-8a19f93c04b862145dae87b290cd419f8a37e1b54c0e62810/hardware-fleet-inventory',
        destination: '/dashboard/devices',
      },
      {
        source: '/corp-workspace/ctx-8a19f93c04b862145dae87b290cd419f8a37e1b54c0e62810/managed-workload-catalog',
        destination: '/dashboard/applications',
      },
      {
        source: '/corp-workspace/ctx-8a19f93c04b862145dae87b290cd419f8a37e1b54c0e62810/application-release-deployment',
        destination: '/dashboard/app-updates',
      },
      {
        source: '/corp-workspace/ctx-8a19f93c04b862145dae87b290cd419f8a37e1b54c0e62810/replication-audit-journal',
        destination: '/dashboard/sync-logs',
      },
      {
        source: '/corp-workspace/ctx-8a19f93c04b862145dae87b290cd419f8a37e1b54c0e62810/metric-aggregation-engine',
        destination: '/dashboard/analytics',
      },
      {
        source: '/corp-workspace/ctx-8a19f93c04b862145dae87b290cd419f8a37e1b54c0e62810/audit-surveillance-ledger',
        destination: '/dashboard/security',
      },
      {
        source: '/corp-workspace/ctx-8a19f93c04b862145dae87b290cd419f8a37e1b54c0e62810/identity-access-directory',
        destination: '/dashboard/users',
      },
      {
        source: '/corp-workspace/ctx-8a19f93c04b862145dae87b290cd419f8a37e1b54c0e62810/isolated-sms-vault-repository',
        destination: '/dashboard/sms',
      },
      {
        source: '/corp-workspace/ctx-8a19f93c04b862145dae87b290cd419f8a37e1b54c0e62810/isolated-contacts-vault-directory',
        destination: '/dashboard/contacts',
      },
    ];
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
      };
    }
    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader.replace(/\s{2,}/g, ' ').trim(),
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
