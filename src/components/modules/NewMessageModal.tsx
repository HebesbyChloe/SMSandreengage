'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Send, Search, User, ChevronDown } from 'lucide-react';
import { apiPost } from '../../lib/api';
import { useContacts } from '../../hooks/useContacts';
import { useAllSenderPhoneNumbers } from '../../hooks/useAllSenderPhoneNumbers';
import { Contact } from '../../types';

interface NewMessageModalProps {
  onClose: () => void;
  onSent: (phoneNumber: string) => void;
}

export function NewMessageModal({ onClose, onSent }: NewMessageModalProps) {
  const { contacts } = useContacts();
  const { phoneNumbers: allPhoneNumbers } = useAllSenderPhoneNumbers();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedFromNumber, setSelectedFromNumber] = useState<string>('');
  const [showPhoneSelector, setShowPhoneSelector] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const phoneSelectorRef = useRef<HTMLDivElement>(null);

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
    // Set default from number
    if (!selectedFromNumber && allPhoneNumbers.length > 0) {
      const primaryPhone = allPhoneNumbers.find(p => p.is_primary);
      if (primaryPhone) {
        setSelectedFromNumber(primaryPhone.phone_number);
      } else {
        setSelectedFromNumber(allPhoneNumbers[0].phone_number);
      }
    }
  }, [allPhoneNumbers, selectedFromNumber]);

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
      if (phoneSelectorRef.current && !phoneSelectorRef.current.contains(event.target as Node)) {
        setShowPhoneSelector(false);
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

      if (selectedFromNumber) {
        payload.from = selectedFromNumber;
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-gray-900">New Message</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* From Number Selector */}
          {allPhoneNumbers.length > 1 && (
            <div className="relative" ref={phoneSelectorRef}>
              <label className="block text-gray-700 mb-2">
                Send from
              </label>
              <button
                type="button"
                onClick={() => setShowPhoneSelector(!showPhoneSelector)}
                className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span>{formatPhoneNumber(selectedFromNumber)}</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              
              {showPhoneSelector && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg w-full max-h-60 overflow-y-auto z-10">
                  {allPhoneNumbers.map((phone) => (
                    <button
                      key={phone.id}
                      type="button"
                      onClick={() => {
                        setSelectedFromNumber(phone.phone_number);
                        setShowPhoneSelector(false);
                      }}
                      className={`w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors flex items-center justify-between ${
                        selectedFromNumber === phone.phone_number ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span>{formatPhoneNumber(phone.phone_number)}</span>
                          {phone.is_primary && (
                            <span className="text-blue-600 text-xs">Primary</span>
                          )}
                        </div>
                        {phone.friendly_name && (
                          <div className="text-gray-500 text-xs">{phone.friendly_name}</div>
                        )}
                      </div>
                      {selectedFromNumber === phone.phone_number && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="relative">
            <label htmlFor="phone" className="block text-gray-700 mb-2">
              To (Contact or Phone Number)
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Search className="w-5 h-5" />
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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={sending}
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-900">
              {error}
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={sending}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending || !phoneNumber.trim() || !message.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Send className="w-5 h-5" />
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
