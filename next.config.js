const withPWA = require('next-pwa')({
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development',
    fallbacks: {
        document: '/offline'
    }
});

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // Allow webpack config from next-pwa while using Turbopack
    turbopack: {},
}

module.exports = withPWA(nextConfig);
