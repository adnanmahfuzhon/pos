import type { AppProps } from 'next/app';
import AppLayout from '../components/AppLayout';
import { ToastProvider } from '../context/ToastContext';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
    return (
        <ToastProvider>
            <AppLayout>
                <Component {...pageProps} />
            </AppLayout>
        </ToastProvider>
    );
}
