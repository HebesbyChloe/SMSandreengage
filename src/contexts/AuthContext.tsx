'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  avatar_url?: string;
  timezone?: string;
  status?: string;
  team?: string;
  location?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for stored session on mount
  useEffect(() => {
    try {
      // Safety timeout - always set loading to false after 2 seconds max
      const timeoutId = setTimeout(() => {
        console.warn('⚠️ Auth initialization timeout - forcing loading to false');
        setLoading(false);
      }, 2000);

      // Check localStorage (only available in browser)
      if (typeof window !== 'undefined') {
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('token');
        
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch (error) {
            console.error('Error parsing stored user:', error);
            localStorage.removeItem('user');
          }
        }
        
        if (storedToken) {
          setToken(storedToken);
        }
      }
      
      clearTimeout(timeoutId);
      setLoading(false);
      console.log('✅ Auth initialization complete');
    } catch (error) {
      console.error('❌ Error during auth initialization:', error);
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      console.log('🔄 Attempting login for:', email);
      const startTime = Date.now();
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const duration = Date.now() - startTime;
      console.log(`⏱️ Login API response received in ${duration}ms, status: ${response.status}`);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          const text = await response.text();
          console.error('Failed to parse error response:', text);
          throw new Error(`Login failed with status ${response.status}`);
        }
        const errorMessage = errorData.error || errorData.details || 'Login failed';
        console.error('❌ Login failed:', errorMessage);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('✅ Login response received:', { 
        hasUser: !!data.user, 
        hasToken: !!data.token,
        responseKeys: Object.keys(data),
        fullResponse: data
      });
      
      const userData = data.user;
      const authToken = data.token;
      
      if (!authToken) {
        console.error('❌ No token in response. Response structure:', {
          hasUser: !!data.user,
          hasToken: !!data.token,
          responseKeys: Object.keys(data),
          fullResponse: data
        });
        const errorDetails = data.details || 'The server response did not include an authentication token.';
        throw new Error(`No token received from login API. ${errorDetails}`);
      }
      
      if (!userData) {
        console.error('❌ No user data in response. Response structure:', {
          hasUser: !!data.user,
          hasToken: !!data.token,
          responseKeys: Object.keys(data),
          fullResponse: data
        });
        throw new Error('No user data received from login API. The server response did not include user information.');
      }
      
      console.log('✅ Setting user and token');
      setUser(userData);
      setToken(authToken);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('token', authToken);
      console.log('✅ Login successful');
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        isAuthenticated: !!user && !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

