'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const router = useRouter();
  const { loading, isAuthenticated } = useAuth();
  const [redirected, setRedirected] = useState(false);

  // Redirect to /sms by default
  useEffect(() => {
    if (!loading && !redirected) {
      setRedirected(true);
      router.replace('/sms');
    }
  }, [loading, router, redirected]);

  // Safety timeout - redirect after 3 seconds even if loading
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!redirected) {
        console.warn('⚠️ Home page timeout - forcing redirect to /sms');
        setRedirected(true);
        router.replace('/sms');
      }
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, [router, redirected]);

  // Show loading state
  if (loading && !redirected) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return null;
}

