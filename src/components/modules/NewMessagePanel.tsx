'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Send, Search, User, AlertCircle } from 'lucide-react';
import { apiPost } from '../../lib/api';
import { useContacts } from '../../hooks/useContacts';
import { Contact } from '../../types';

interface NewMessagePanelProps {
  onClose: () => void;
  onSent: (phoneNumber: string) => void;
  defaultSenderPhone?: string;
}

export function NewMessagePanel({ onClose, onSent, defaultSenderPhone }: NewMessagePanelProps) {
  const { contacts } = useContacts();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Filter contacts based on search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const filtered = contacts.filter(contact => 
        (contact.name && contact.name.toLowerCase().includes(query)) ||
        contact.phone.includes(query)
      );
      setFilteredContacts(filtered);
      setShowDropdown(filtered.length > 0);
    } else {
      setFilteredContacts([]);
      setShowDropdown(false);
    }
  }, [searchQuery, contacts]);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPhoneNumber(value);
    setSelectedContact(null);
  };

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
    setPhoneNumber(contact.phone);
    setSearchQuery(contact.name || contact.phone);
    setShowDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber.trim() || !message.trim()) return;

    setSending(true);
    setError(null);

    try {
      const payload: any = {
        to: phoneNumber.trim(),
        message: message.trim(),
      };
      
      // Use the selected sender phone if provided
      if (defaultSenderPhone) {
        payload.from = defaultSenderPhone;
      }
      
      await apiPost('/send-sms', payload);

      onSent(phoneNumber.trim());
    } catch (error) {
      console.error('Error sending message:', error);
      setError(error instanceof Error ? error.message : 'Failed to send message');
      setSending(false);
    }
  };

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  return (
    <div className="border-b border-gray-200 bg-white shadow-sm animate-slideDown">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
        <h3 className="text-gray-900">New Message</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-3 sm:p-4 space-y-3 sm:space-y-4">
        <div className="relative">
          <label htmlFor="phone" className="block text-gray-700 mb-2">
            To (Contact or Phone Number)
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <input
              ref={inputRef}
              id="phone"
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => {
                if (filteredContacts.length > 0) {
                  setShowDropdown(true);
                }
              }}
              placeholder="Search contacts or enter phone number"
              className="w-full pl-9 sm:pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              disabled={sending}
              required
              autoComplete="off"
            />
          </div>
          
          {/* Selected Contact Display */}
          {selectedContact && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              <div className="flex-1">
                <p className="text-blue-900">{selectedContact.name}</p>
                <p className="text-blue-700">{formatPhoneNumber(selectedContact.phone)}</p>
              </div>
            </div>
          )}

          {/* Dropdown */}
          {showDropdown && filteredContacts.length > 0 && (
            <div 
              ref={dropdownRef}
              className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
            >
              {filteredContacts.map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => handleSelectContact(contact)}
                  className="w-full px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 truncate">
                        {contact.name || 'Unnamed'}
                      </p>
                      <p className="text-gray-600">
                        {formatPhoneNumber(contact.phone)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="message" className="block text-gray-700 mb-2">
            Message
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            rows={3}
            className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm sm:text-base"
            disabled={sending}
            required
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-medium text-red-900">Failed to send message</p>
                    <p className="mt-1 text-sm text-red-800">{error}</p>
                  </div>
                  <button
                    onClick={() => setError(null)}
                    className="text-red-700 hover:text-red-900 p-1 hover:bg-red-100 rounded transition-colors"
                    aria-label="Dismiss error"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {(error.includes('No phone numbers') || error.includes('No primary phone') || error.includes('not set')) && (
                  <div className="mt-2 text-sm">
                    <p className="text-red-800"><strong>Quick fix:</strong></p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <a 
                        href="#accounts" 
                        className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 hover:bg-red-200 rounded transition-colors text-red-900"
                      >
                        Manage Accounts →
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={sending || !phoneNumber.trim() || !message.trim()}
            className="px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg transition-colors flex items-center gap-2 text-sm sm:text-base"
          >
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden xs:inline">{sending ? 'Sending...' : 'Send Message'}</span>
            <span className="xs:hidden">{sending ? 'Sending...' : 'Send'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
