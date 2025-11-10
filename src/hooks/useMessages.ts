import { useState, useEffect } from 'react';
import { Message } from '../types';
import { sendSMSViaHebesPHP, getStoredToken } from '../lib/api';
import { hebesSenderPhoneNumbers, hebesSmsMessages } from '../lib/hebes-api';
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

      // Call PHP API directly
      let messages: any[] = [];
      
      if (conversationId) {
        // Fetch by conversation_id using PHP API
        messages = await hebesSmsMessages.getByConversation(conversationId, token);
      } else if (phoneNumber) {
        // Legacy: Fetch all messages and filter by phone number
        const allMessages = await hebesSmsMessages.getAll(token);
        const messagesArray = Array.isArray(allMessages) ? allMessages : [];
        
        // Filter messages for this phone number
        messages = messagesArray.filter((msg: any) => {
          const isInbound = msg.direction === 'inbound' && msg.from_number === phoneNumber;
          const isOutbound = msg.direction === 'outbound' && msg.to_number === phoneNumber;
          return isInbound || isOutbound;
        });

        // Filter by sender phone if specified
        if (senderPhone) {
          messages = messages.filter((msg: any) => {
            if (msg.direction === 'outbound') {
              return msg.from_number === senderPhone;
            } else {
              return msg.to_number === senderPhone;
            }
          });
        }
      }

      // Ensure messages is an array
      if (!Array.isArray(messages)) {
        messages = [];
      }

      // Sort by timestamp (oldest first)
      messages.sort((a: any, b: any) => {
        const timeA = new Date(a.received_at || a.sent_at || a.created_at || 0).getTime();
        const timeB = new Date(b.received_at || b.sent_at || b.created_at || 0).getTime();
        return timeA - timeB;
      });

      // Map to expected format
      const formattedMessages: Message[] = messages.map((msg: any) => ({
        id: msg.id,
        direction: msg.direction,
        from: msg.from_number,
        to: msg.to_number,
        body: msg.body,
        status: msg.status,
        timestamp: msg.received_at || msg.sent_at || msg.created_at,
        mediaCount: msg.media_count || 0,
        providerMessageSid: msg.provider_message_sid,
      }));

      setMessages(formattedMessages);
      setError(null);
    } catch (error) {
      console.error('Error loading messages:', error);
      setError(error instanceof Error ? error.message : 'Failed to load messages');
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

      // Format phone numbers
      const cleanPhoneNumber = (phone: string) => {
        const cleaned = phone.replace(/\D/g, '');
        return `+${cleaned}`;
      };

      const formattedTo = cleanPhoneNumber(toNumber);
      const formattedFrom = cleanPhoneNumber(fromNumber);

      // Get account_id from sender phone number (required)
      let accountId: string | null = null;
      try {
        const allPhones = await hebesSenderPhoneNumbers.getAll(token);
        const phoneNumbersArray = Array.isArray(allPhones) ? allPhones : [];
        const matchingPhone = phoneNumbersArray.find((p: any) => {
          const dbPhone = cleanPhoneNumber(p.phone_number || '');
          return dbPhone === formattedFrom;
        });
        
        if (matchingPhone && matchingPhone.account_id) {
          accountId = matchingPhone.account_id;
        }
      } catch (err) {
        console.error('Error fetching phone numbers:', err);
      }
      
      if (!accountId) {
        throw new Error('Account ID not found for sender phone number');
      }

      // Call the PHP API directly
      const payload = {
        to_number: formattedTo,
        from_number: formattedFrom,
        body: messageText.trim(),
        account_id: accountId,
      };
      
      const response = await sendSMSViaHebesPHP(payload, token);

      // Add a small delay to ensure the message is saved in the database
      await new Promise(resolve => setTimeout(resolve, 500));
      
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
