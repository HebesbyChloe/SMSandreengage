'use client';

import { useState } from 'react';
import { X, Save, Pencil, MessageSquare } from 'lucide-react';
import { Contact } from '../../types';
import { PhoneNumberManager } from './PhoneNumberManager';
import { usePhoneNumbers } from '../../hooks/usePhoneNumbers';

interface ContactPanelProps {
  contact?: Contact;
  onSave: (data: Partial<Contact>) => Promise<void>;
  onClose: () => void;
  mode?: 'view' | 'edit' | 'create';
  onEdit?: () => void;
  onMessage?: (phone: string) => void;
}

export function ContactPanel({ contact, onSave, onClose, mode = 'edit', onEdit, onMessage }: ContactPanelProps) {
  const isViewMode = mode === 'view';
  const isCreateMode = mode === 'create' || !contact;
  const [name, setName] = useState(contact?.name || '');
  const [phone, setPhone] = useState(contact?.phone || '');
  const [countryCode, setCountryCode] = useState(contact?.country_code || '');
  const [areaCode, setAreaCode] = useState(contact?.area_code || '');
  const [timezone, setTimezone] = useState(contact?.timezone || '');
  const [crmId, setCrmId] = useState(contact?.crm_id || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Phone numbers management - only for existing contacts
  const { 
    phoneNumbers, 
    addPhoneNumber, 
    updatePhoneNumber, 
    deletePhoneNumber 
  } = usePhoneNumbers(contact?.id || null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phone.trim()) {
      setError('Phone number is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Clean country_code and area_code - only send if they have valid values
      const cleanCountryCode = countryCode.trim();
      const cleanAreaCode = areaCode.trim();
      
      await onSave({
        name: name.trim() || null,
        phone: phone.trim(),
        country_code: cleanCountryCode && cleanCountryCode.length > 0 && cleanCountryCode.length <= 10 
          ? cleanCountryCode 
          : null,
        area_code: cleanAreaCode && cleanAreaCode.length > 0 && cleanAreaCode.length <= 10 
          ? cleanAreaCode 
          : null,
        timezone: timezone.trim() || null,
        crm_id: crmId.trim() || null,
      });
    } catch (error) {
      console.error('Error saving contact:', error);
      setError(error instanceof Error ? error.message : 'Failed to save contact');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="md:w-96 w-full md:border-l border-gray-200 bg-white flex flex-col h-full">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <h2 className="text-gray-900">
          {isViewMode ? 'Contact Details' : contact ? 'Edit Contact' : 'New Contact'}
        </h2>
        <div className="flex items-center gap-2">
          {isViewMode && onEdit && (
            <button
              onClick={onEdit}
              className="text-blue-600 hover:text-blue-700 transition-colors p-1"
              aria-label="Edit contact"
              title="Edit contact"
            >
              <Pencil className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
        <div>
          <label htmlFor="name" className="block text-gray-700 mb-2">
            Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base disabled:bg-gray-50 disabled:text-gray-700"
            disabled={saving || isViewMode}
            readOnly={isViewMode}
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-gray-700 mb-2">
            Phone Number {!isViewMode && <span className="text-red-500">*</span>}
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1234567890"
            className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base disabled:bg-gray-50 disabled:text-gray-700"
            disabled={saving || !!contact || isViewMode}
            required={!isViewMode}
            readOnly={isViewMode}
          />
          {!isViewMode && <p className="mt-1 text-gray-500 text-xs sm:text-sm">Include country code (e.g., +1 for US)</p>}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label htmlFor="countryCode" className="block text-gray-700 mb-2">
              Country Code
            </label>
            <input
              id="countryCode"
              type="text"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              placeholder="US"
              className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base disabled:bg-gray-50 disabled:text-gray-700"
              disabled={saving || isViewMode}
              readOnly={isViewMode}
            />
          </div>

          <div>
            <label htmlFor="areaCode" className="block text-gray-700 mb-2">
              Area Code
            </label>
            <input
              id="areaCode"
              type="text"
              value={areaCode}
              onChange={(e) => setAreaCode(e.target.value)}
              placeholder="714"
              className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base disabled:bg-gray-50 disabled:text-gray-700"
              disabled={saving || isViewMode}
              readOnly={isViewMode}
            />
          </div>
        </div>

        <div>
          <label htmlFor="timezone" className="block text-gray-700 mb-2">
            Timezone
          </label>
          <input
            id="timezone"
            type="text"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            placeholder="America/Los_Angeles"
            className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base disabled:bg-gray-50 disabled:text-gray-700"
            disabled={saving || isViewMode}
            readOnly={isViewMode}
          />
        </div>

        <div>
          <label htmlFor="crmId" className="block text-gray-700 mb-2">
            CRM ID
          </label>
          <input
            id="crmId"
            type="text"
            value={crmId}
            onChange={(e) => setCrmId(e.target.value)}
            placeholder="Optional CRM identifier"
            className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base disabled:bg-gray-50 disabled:text-gray-700"
            disabled={saving || isViewMode}
            readOnly={isViewMode}
          />
        </div>

        {/* Phone Numbers Manager - Only shown for existing contacts */}
        {contact && (
          <div className="pt-4 border-t border-gray-200">
            <PhoneNumberManager
              contactId={contact.id}
              phoneNumbers={phoneNumbers}
              onAdd={addPhoneNumber}
              onUpdate={updatePhoneNumber}
              onDelete={deletePhoneNumber}
              disabled={saving || isViewMode}
            />
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-900">
            {error}
          </div>
        )}
      </form>

      {/* Footer */}
      <div className="p-3 sm:p-4 border-t border-gray-200 flex gap-2 sm:gap-3 justify-end flex-shrink-0">
        {isViewMode ? (
          <>
            <button
              type="button"
              onClick={onClose}
              className="px-3 sm:px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm sm:text-base"
            >
              Close
            </button>
            {onMessage && contact && (
              <button
                type="button"
                onClick={() => onMessage(contact.phone)}
                className="px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm sm:text-base"
              >
                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Send Message</span>
              </button>
            )}
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onClose}
              className="px-3 sm:px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm sm:text-base"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={saving || !phone.trim()}
              className="px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg transition-colors flex items-center gap-2 text-sm sm:text-base"
            >
              <Save className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden xs:inline">{saving ? 'Saving...' : 'Save Contact'}</span>
              <span className="xs:hidden">{saving ? 'Saving...' : 'Save'}</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
