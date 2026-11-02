import './globals.css';
import { LanguageProvider } from "@/context/LanguageContext";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { Metadata } from 'next';
import { Toaster } from 'sonner';

export const metadata: Metadata = { title: 'Sabash Cargo SaaS', icons: { icon: '/sabash-logo.png' } };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        <CurrencyProvider>
        <LanguageProvider>
          {children}
          {/* Force Bottom Center and ensure high z-index */}
          <Toaster position="bottom-center" richColors closeButton duration={3000} />
        </LanguageProvider>
        </CurrencyProvider>
      </body>
    </html>
  );
}
