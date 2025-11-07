'use client';

import { useState } from 'react';
import { User, Phone, Edit, Trash2, Calendar, MapPin, MessageSquare } from 'lucide-react';
import { Contact } from '../../types';

interface ContactListProps {
  contacts: Contact[];
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
  onSelect?: (contact: Contact) => void;
  onViewDetails?: (contact: Contact) => void;
  onMessage?: (contact: Contact) => void;
  emptyMessage?: string;
}

export function ContactList({ contacts, onEdit, onDelete, onSelect, onViewDetails, onMessage, emptyMessage }: ContactListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const handleDelete = async (contact: Contact) => {
    if (!confirm(`Are you sure you want to delete ${contact.name || contact.phone}?`)) {
      return;
    }

    setDeletingId(contact.id);
    try {
      await onDelete(contact);
    } finally {
      setDeletingId(null);
    }
  };

  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-gray-400">
        <User className="w-12 h-12 sm:w-16 sm:h-16 mb-3" />
        <p className="text-center text-sm sm:text-base">
          {emptyMessage || 'No contacts yet'}
        </p>
        {!emptyMessage && (
          <p className="text-center text-sm sm:text-base">Add your first contact to get started</p>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {contacts.map((contact) => (
        <div
          key={contact.id}
          className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onViewDetails?.(contact)}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 
                  className="text-gray-900 truncate hover:text-blue-600 text-sm sm:text-base"
                  title={contact.name || 'Unnamed Contact'}
                >
                  {contact.name || <span className="text-gray-400">Unnamed</span>}
                </h3>
                <p className="text-gray-600 flex items-center gap-1 text-xs sm:text-sm">
                  <Phone className="w-3 h-3" />
                  <span className="truncate">{formatPhoneNumber(contact.phone)}</span>
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-1 flex-shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(contact);
                }}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Edit contact"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(contact);
                }}
                disabled={deletingId === contact.id}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                title="Delete contact"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-1.5 text-gray-600 text-xs sm:text-sm">
            {contact.timezone && (
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{contact.timezone}</span>
              </div>
            )}
            
            {contact.last_contacted_at && (
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">Last contact: {formatDate(contact.last_contacted_at)}</span>
              </div>
            )}

            {contact.crm_id && (
              <div className="text-gray-500 truncate">
                CRM ID: {contact.crm_id}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
            <p className="text-gray-500 text-xs sm:text-sm">
              Added {formatDate(contact.created_at)}
            </p>
            
            {/* Message Button */}
            {onMessage && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMessage(contact);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-xs sm:text-sm"
                title="Send message"
              >
                <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Message</span>
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
