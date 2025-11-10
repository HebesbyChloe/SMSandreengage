'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Users, Phone, User, LogOut, TestTube } from 'lucide-react';
import ChatPage from '@/components/pages/ChatPage';
import ContactsPage from '@/components/pages/ContactsPage';
import AccountsPage from '@/components/pages/AccountsPage';
import { LoginModal } from '@/components/auth/LoginModal';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SMSPage() {
  const { user, loading, logout, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<'chat' | 'contacts' | 'accounts' | 'api-test'>('chat');
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);

  // Update active tab based on pathname
  useEffect(() => {
    if (pathname === '/api-test') {
      setActiveTab('api-test');
    } else if (pathname?.startsWith('/sms') || pathname === '/') {
      // Keep current tab state for SMS page tabs
    }
  }, [pathname]);

  // Show login modal if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setShowLogin(true);
    }
  }, [loading, isAuthenticated]);

  const handleMessageContact = (phoneNumber: string) => {
    setSelectedPhone(phoneNumber);
    setActiveTab('chat');
  };

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
            <h1 className="text-gray-900 text-sm sm:text-base md:text-lg truncate flex-shrink-0">SMS Chat Manager</h1>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-2 lg:space-x-4 flex-1 justify-center">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'chat'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <MessageSquare className="w-5 h-5" />
                <span className="hidden lg:inline">Messages</span>
              </button>
              <button
                onClick={() => setActiveTab('contacts')}
                className={`flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'contacts'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Users className="w-5 h-5" />
                <span className="hidden lg:inline">Contacts</span>
              </button>
              <button
                onClick={() => setActiveTab('accounts')}
                className={`flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'accounts'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Phone className="w-5 h-5" />
                <span className="hidden lg:inline">Accounts</span>
              </button>
              <Link
                href="/api-test"
                className={`flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'api-test'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <TestTube className="w-5 h-5" />
                <span className="hidden lg:inline">API Test</span>
              </Link>
            </nav>

            {/* User Profile */}
            {user && (
              <div className="flex items-center gap-2 flex-shrink-0">
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

            {/* Mobile Navigation */}
            <nav className="flex md:hidden space-x-1">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors ${
                  activeTab === 'chat'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <MessageSquare className="w-5 h-5" />
              </button>
              <button
                onClick={() => setActiveTab('contacts')}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors ${
                  activeTab === 'contacts'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Users className="w-5 h-5" />
              </button>
              <button
                onClick={() => setActiveTab('accounts')}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors ${
                  activeTab === 'accounts'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Phone className="w-5 h-5" />
              </button>
              <Link
                href="/api-test"
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors ${
                  activeTab === 'api-test'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <TestTube className="w-5 h-5" />
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-2 sm:px-4 lg:px-8 py-2 sm:py-4 md:py-8 overflow-hidden">
        {activeTab === 'chat' && <ChatPage initialSelectedPhone={selectedPhone} />}
        {activeTab === 'contacts' && <ContactsPage onMessageContact={handleMessageContact} />}
        {activeTab === 'accounts' && <AccountsPage />}
      </main>
    </div>
  );
}

