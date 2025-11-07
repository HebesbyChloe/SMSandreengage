import { useState, useEffect } from 'react';
import { Message } from '../types';
import { apiGet, apiPost } from '../lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface UseMessagesOptions {
  conversationId?: string; // Primary: use conversation_id
  phoneNumber?: string; // Fallback: use phone number (backward compatibility)
  senderPhone?: string | null;
}

export function useMessages(options: UseMessagesOptions | string) {
  const { token } = useAuth();
  // Support both old string signature and new options object
  let conversationId: string | undefined;
  let phoneNumber: string | undefined;
  let senderPhone: string | null = null;

  if (typeof options === 'string') {
    // Legacy: treat string as phone number
    phoneNumber = options;
  } else {
    conversationId = options.conversationId;
    phoneNumber = options.phoneNumber;
    senderPhone = options.senderPhone || null;
  }
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMessages = async () => {
    try {
      // Use conversation_id if available, otherwise fall back to phone number
      const identifier = conversationId || phoneNumber;
      if (!identifier) {
        setMessages([]);
        setLoading(false);
        return;
      }

      let url = `/messages/${encodeURIComponent(identifier)}`;
      const params = new URLSearchParams();
      
      if (conversationId) {
        params.append('useConversationId', 'true');
      }
      if (senderPhone) {
        params.append('senderPhone', senderPhone);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const data = await apiGet(url, token);
      setMessages(data.messages || []);
      setError(null);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
    
    // Poll for new messages every 3 seconds
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [conversationId, phoneNumber, senderPhone, token]);

  const sendMessage = async (messageText: string, onSuccess?: () => void, fromPhoneNumber?: string) => {
    if (!messageText.trim() || sending) return;

    setSending(true);
    setError(null);

    try {
      // Get primary phone number if fromPhoneNumber is not provided
      let fromNumber = fromPhoneNumber;
      if (!fromNumber && senderPhone) {
        fromNumber = senderPhone;
      }

      if (!fromNumber) {
        throw new Error('No sender phone number available. Please select a sender phone number first.');
      }

      // When using conversationId to load messages, we still need phoneNumber to send
      // Try to get phoneNumber from messages if not provided
      let toNumber = phoneNumber;
      if (!toNumber && messages.length > 0) {
        // Get phone number from first message (inbound: from_number, outbound: to_number)
        const firstMessage = messages[0];
        if (firstMessage.direction === 'inbound') {
          toNumber = firstMessage.from;
        } else {
          toNumber = firstMessage.to;
        }
      }

      if (!toNumber) {
        throw new Error('Recipient phone number is required. Please select a conversation or enter a phone number.');
      }

      const payload: any = {
        to: toNumber,
        from: fromNumber,
        message: messageText.trim(),
      };

      await apiPost('/send-sms', payload, token);

      await loadMessages();
      onSuccess?.();
    } catch (error) {
      console.error('Error sending message:', error);
      setError(error instanceof Error ? error.message : 'Failed to send message');
      throw error;
    } finally {
      setSending(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return {
    messages,
    loading,
    sending,
    error,
    sendMessage,
    reload: loadMessages,
    clearError,
  };
}
