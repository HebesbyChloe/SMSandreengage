import { useState, useEffect, useRef, useCallback } from 'react';
import { Conversation } from '../types';
import { hebesGetConversations } from '../lib/hebes-api';
import { useAuth } from '@/contexts/AuthContext';

interface UseConversationsOptions {
  senderPhoneNumber?: string | null;
}

export function useConversations(options: UseConversationsOptions = {}) {
  const { token } = useAuth();
  const { senderPhoneNumber } = options;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isInitialLoadRef = useRef(true);

  const loadConversations = useCallback(async (isPolling = false) => {
    const isInitialLoad = isInitialLoadRef.current;
    
    try {
      const startTime = Date.now();
      const data = await hebesGetConversations(senderPhoneNumber || null, token);
      const duration = Date.now() - startTime;
      
      setConversations(data.conversations || []);
      setError(null);
    } catch (error: any) {
      console.error('❌ Error loading conversations:', error);
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      });
      // Only set error on initial load, not during polling to avoid flickering
      if (isInitialLoad) {
        const errorMessage = error?.message || 'Unable to load conversations. Server may be starting up.';
        setError(errorMessage);
      }
    } finally {
      // Always set loading to false after initial load attempt
      if (isInitialLoad) {
        setLoading(false);
        isInitialLoadRef.current = false;
      }
    }
  }, [senderPhoneNumber, token]);

  useEffect(() => {
    isInitialLoadRef.current = true;
    setLoading(true);
    loadConversations(false);
    
    // Safety timeout: if loading takes more than 10 seconds, set loading to false
    const timeoutId = setTimeout(() => {
      if (isInitialLoadRef.current) {
        console.warn('⚠️ Conversations load timeout after 10s - setting loading to false');
        setLoading(false);
        isInitialLoadRef.current = false;
        setError('Loading conversations is taking longer than expected. Please check your connection and try refreshing.');
      }
    }, 10000);
    
    // Poll for new messages every 2 seconds for faster updates
    // Don't set loading during polling to avoid flickering
    const interval = setInterval(() => loadConversations(true), 2000);
    
    return () => {
      clearInterval(interval);
      clearTimeout(timeoutId);
    };
  }, [loadConversations]);
  
  const reload = useCallback(async () => {
    isInitialLoadRef.current = false; // Don't show loading on manual reload
    try {
      const data = await hebesGetConversations(senderPhoneNumber || null, token);
      setConversations(data.conversations || []);
      setError(null);
    } catch (error) {
      console.error('Error reloading conversations:', error);
      setError('Unable to load conversations. Server may be starting up.');
    }
  }, [senderPhoneNumber, token]);

  return {
    conversations,
    loading,
    error,
    reload,
  };
}
