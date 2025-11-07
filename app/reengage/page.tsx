'use client';

import { useEffect, useState } from 'react';
import { User, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { LoginModal } from '@/components/auth/LoginModal';
import ReEngagePage from '@/components/pages/ReEngagePage';

export default function ReEngagePageRoute() {
  const { user, loading, logout, isAuthenticated } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  // Show login modal if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setShowLogin(true);
    }
  }, [loading, isAuthenticated]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Login Modal */}
      <LoginModal isOpen={showLogin && !isAuthenticated} />

      {/* Header */}
      <header className="bg-white shadow-sm border-b flex-shrink-0">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16 gap-4">
            <h1 className="text-gray-900 text-sm sm:text-base md:text-lg truncate flex-shrink-0">Re-Engage CRM</h1>
            
            {/* User Profile */}
            {user && (
              <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg">
                  {user.avatar_url ? (
                    <img 
                      src={user.avatar_url} 
                      alt={user.name}
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-700 hidden sm:inline">
                    {user.name}
                  </span>
                  <span className="text-xs text-gray-500 hidden lg:inline">
                    ({user.role})
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <ReEngagePage />
      </main>
    </div>
  );
}

