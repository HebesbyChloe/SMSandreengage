'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { MessageSquare, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function TopNavigation() {
  const pathname = usePathname();
  const { isAuthenticated, loading } = useAuth();

  // Don't show navigation while loading or if not authenticated
  if (loading || !isAuthenticated) {
    return null;
  }

  const isSMS = pathname?.startsWith('/sms') || pathname === '/';
  const isReEngage = pathname?.startsWith('/reengage');

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex space-x-1">
          <Link
            href="/sms"
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              isSMS
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span>SMS</span>
          </Link>
          <Link
            href="/reengage"
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              isReEngage
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <RefreshCw className="w-5 h-5" />
            <span>Re-Engage</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}

