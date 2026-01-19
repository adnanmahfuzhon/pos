import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
    return (
        <Html lang="id">
            <Head>
                {/* PWA Meta Tags */}
                <link rel="manifest" href="/manifest.json" />
                <meta name="theme-color" content="#f97316" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                <meta name="apple-mobile-web-app-title" content="FlavorPOS" />
                <link rel="apple-touch-icon" href="/icons/icon-192.png" />

                {/* Favicon */}
                <link rel="icon" href="/icons/icon-192.png" />

                {/* Fonts */}
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            </Head>
            <body className="antialiased">
                <Main />
                <NextScript />
            </body>
        </Html>
    );
}
