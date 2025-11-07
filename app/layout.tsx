import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { TopNavigation } from '@/components/layout/TopNavigation';

export const metadata: Metadata = {
  title: 'HEBES CRM Platform',
  description: 'SMS Chat Manager and Re-Engage CRM powered by Twilio',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <TopNavigation />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

