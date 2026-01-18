import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import AppLayout from '../components/AppLayout';
import { ToastProvider } from '../context/ToastContext';
import { AuthProvider } from '../context/AuthContext';
import '../styles/globals.css';

// Pages that don't need the AppLayout
const noLayoutPages = ['/login'];

export default function App({ Component, pageProps }: AppProps) {
    const router = useRouter();
    const isNoLayoutPage = noLayoutPages.includes(router.pathname);

    return (
        <AuthProvider>
            <ToastProvider>
                {isNoLayoutPage ? (
                    <Component {...pageProps} />
                ) : (
                    <AppLayout>
                        <Component {...pageProps} />
                    </AppLayout>
                )}
            </ToastProvider>
        </AuthProvider>
    );
}
