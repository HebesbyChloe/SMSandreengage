'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, Phone, AlertCircle, UserPlus, Info, Sparkles, X } from 'lucide-react';
import { useMessages } from '../../hooks/useMessages';
import { useContacts } from '../../hooks/useContacts';
import { useAllSenderPhoneNumbers } from '../../hooks/useAllSenderPhoneNumbers';
import { Conversation } from '../../types';
import { EmojiPicker } from './EmojiPicker';
import { AddToContactModal } from './AddToContactModal';
import { CustomerPanel } from './CustomerPanel';

interface MessageThreadProps {
  phoneNumber: string | Conversation; // Accept either phone number (legacy) or Conversation object
  onMessageSent?: () => void;
  onShowDetails?: () => void;
  defaultSenderPhone?: string;
}

export function MessageThread({ phoneNumber, onMessageSent, onShowDetails, defaultSenderPhone }: MessageThreadProps) {
  // Extract conversationId and phoneNumber from props
  const conversation = typeof phoneNumber === 'object' ? phoneNumber : null;
  const conversationId = conversation?.conversationId;
  const actualPhoneNumber = conversation?.phoneNumber || (typeof phoneNumber === 'string' ? phoneNumber : '');

  const { messages, sending, error, sendMessage, clearError } = useMessages({ 
    conversationId: conversationId || undefined,
    phoneNumber: actualPhoneNumber, // Always pass phoneNumber for sending messages (even when using conversationId to load)
    senderPhone: defaultSenderPhone 
  });
  const { getContactByPhone, createContact } = useContacts();
  const { phoneNumbers: allPhoneNumbers, loading: loadingPhoneNumbers } = useAllSenderPhoneNumbers();
  const [newMessage, setNewMessage] = useState('');
  const [showAddContact, setShowAddContact] = useState(false);
  const [showCustomerPanel, setShowCustomerPanel] = useState(false);
  const [contact, setContact] = useState<any>(null);
  const [checkingContact, setCheckingContact] = useState(true);
  const [senderPhoneNumber, setSenderPhoneNumber] = useState<string | null>(null);
  const [selectedFromNumber, setSelectedFromNumber] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Extract sender phone number from outbound messages
    const outboundMessage = messages.find(msg => msg.direction === 'outbound');
    if (outboundMessage && outboundMessage.from) {
      setSenderPhoneNumber(outboundMessage.from);
      // Set as default selected number if not already selected
      if (!selectedFromNumber) {
        setSelectedFromNumber(outboundMessage.from);
      }
    }
  }, [messages]);

  useEffect(() => {
    // Set default sender phone from prop or fallback to primary
    if (!selectedFromNumber && allPhoneNumbers.length > 0) {
      if (defaultSenderPhone && allPhoneNumbers.some(p => p.phone_number === defaultSenderPhone)) {
        setSelectedFromNumber(defaultSenderPhone);
      } else {
        const primaryPhone = allPhoneNumbers.find(p => p.is_primary);
        if (primaryPhone) {
          setSelectedFromNumber(primaryPhone.phone_number);
        } else {
          setSelectedFromNumber(allPhoneNumbers[0].phone_number);
        }
      }
    }
  }, [allPhoneNumbers, selectedFromNumber, defaultSenderPhone]);

  useEffect(() => {
    // Check if contact exists for this phone number
    const checkContact = async () => {
      setCheckingContact(true);
      const existingContact = await getContactByPhone(actualPhoneNumber);
      setContact(existingContact);
      setCheckingContact(false);
    };
    
    if (actualPhoneNumber) {
      checkContact();
    }
  }, [actualPhoneNumber]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || sending) return;

    try {
      await sendMessage(newMessage, onMessageSent, selectedFromNumber || undefined);
      setNewMessage('');
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    inputRef.current?.focus();
  };

  const handleAddToContacts = async (data: { name: string; phone: string }) => {
    await createContact(data);
    const updatedContact = await getContactByPhone(actualPhoneNumber);
    setContact(updatedContact);
    setShowAddContact(false);
  };

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Main Thread */}
      <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-gray-200 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-600 flex items-center justify-center text-white flex-shrink-0">
            <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-gray-900 truncate">
              {contact ? contact.name : formatPhoneNumber(actualPhoneNumber)}
            </h3>
            <p className="text-gray-500 truncate">
              {contact ? formatPhoneNumber(actualPhoneNumber) : 'SMS Conversation'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          {!checkingContact && contact && onShowDetails && (
            <>
              <button
                onClick={onShowDetails}
                className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="View contact details"
              >
                <Info className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Details</span>
              </button>
              <button
                onClick={() => setShowCustomerPanel(true)}
                className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors relative group"
                title="View customer journey"
              >
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Journey</span>
                {/* AI badge */}
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
              </button>
            </>
          )}
          
          {!checkingContact && !contact && (
            <button
              onClick={() => setShowAddContact(true)}
              className="flex items-center gap-2 px-2 sm:px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Add to contacts"
            >
              <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Add to Contacts</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 px-4">
            <p className="text-center text-sm sm:text-base">No messages yet. Send the first message!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3 sm:px-4 py-2 ${
                  message.direction === 'outbound'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-900 border border-gray-200'
                }`}
              >
                <p className="break-words whitespace-pre-wrap text-sm sm:text-base">{message.body}</p>
                <p
                  className={`mt-1 text-xs ${
                    message.direction === 'outbound' ? 'text-blue-100' : 'text-gray-500'
                  }`}
                >
                  {formatTime(message.timestamp)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 py-3 bg-red-50 border-t border-red-200">
          <div className="flex items-start gap-2 text-red-900">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-medium">Failed to send message</p>
                  <p className="mt-1 text-sm text-red-800">{error}</p>
                </div>
                <button
                  onClick={clearError}
                  className="text-red-700 hover:text-red-900 p-1 hover:bg-red-100 rounded transition-colors"
                  aria-label="Dismiss error"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {(error.includes('No phone numbers') || error.includes('No primary phone') || error.includes('No active primary')) && (
                <p className="mt-2 text-sm text-red-800">
                  <strong>Quick fix:</strong> Go to{' '}
                  <a href="#" onClick={(e) => { e.preventDefault(); window.location.hash = 'accounts'; }} className="underline hover:text-red-900">
                    Accounts
                  </a>
                  {' '}page to manage your Twilio accounts.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 sm:p-4 border-t border-gray-200 bg-white">
        {/* Display sending from number */}
        {selectedFromNumber && (
          <div className="mb-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
            <span className="text-gray-600 text-sm">Sending from: </span>
            <span className="text-gray-900 text-sm">{formatPhoneNumber(selectedFromNumber)}</span>
          </div>
        )}
        
        <div className="flex gap-1.5 sm:gap-2 items-end">
          <EmojiPicker onEmojiSelect={handleEmojiSelect} />
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base min-w-0"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="px-3 sm:px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-full transition-colors flex items-center gap-1 sm:gap-2 flex-shrink-0"
          >
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">{sending ? 'Sending...' : 'Send'}</span>
          </button>
        </div>
      </form>

      {/* Add to Contacts Modal */}
      {showAddContact && (
        <AddToContactModal
          phoneNumber={actualPhoneNumber}
          onSave={handleAddToContacts}
          onCancel={() => setShowAddContact(false)}
        />
      )}
      </div>

      {/* Customer Panel */}
      {showCustomerPanel && (
        <>
          {/* Mobile Overlay */}
          <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowCustomerPanel(false)} />
          
          {/* Panel */}
          <div className={`
            lg:relative lg:w-96
            fixed lg:static inset-0 lg:inset-auto z-50 lg:z-auto
            lg:flex-shrink-0
          `}>
            <CustomerPanel
              phoneNumber={actualPhoneNumber}
              onClose={() => setShowCustomerPanel(false)}
            />
          </div>
        </>
      )}
    </div>
  );
}
