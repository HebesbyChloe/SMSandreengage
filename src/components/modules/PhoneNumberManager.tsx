'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Check, Star, X } from 'lucide-react';
import { PhoneNumber } from '../../types';

interface PhoneNumberManagerProps {
  contactId: string;
  phoneNumbers: PhoneNumber[];
  onAdd: (data: Partial<PhoneNumber>) => Promise<void>;
  onUpdate: (id: string, data: Partial<PhoneNumber>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  disabled?: boolean;
}

type PhoneType = 'primary' | 'secondary' | 'work' | 'home' | 'mobile';

export function PhoneNumberManager({
  contactId,
  phoneNumbers,
  onAdd,
  onUpdate,
  onDelete,
  disabled
}: PhoneNumberManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newPhone, setNewPhone] = useState('');
  const [newType, setNewType] = useState<PhoneType>('mobile');
  const [editPhone, setEditPhone] = useState('');
  const [editType, setEditType] = useState<PhoneType>('mobile');

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  const getTypeIcon = (type: PhoneType, isPrimary: boolean) => {
    if (isPrimary) {
      return <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />;
    }
    return null;
  };

  const getTypeLabel = (type: PhoneType) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const handleAdd = async () => {
    if (!newPhone.trim()) {
      alert('Please enter a phone number');
      return;
    }
    
    try {
      
      await onAdd({
        phone_number: newPhone.trim(),
        type: newType,
        is_verified: false
      });
      
      setNewPhone('');
      setNewType('mobile');
      setIsAdding(false);
    } catch (error) {
      console.error('Error adding phone number:', error);
      alert(`Failed to add phone number: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleStartEdit = (phoneNumber: PhoneNumber) => {
    setEditingId(phoneNumber.id);
    setEditPhone(phoneNumber.phone_number);
    setEditType(phoneNumber.type);
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await onUpdate(id, {
        phone_number: editPhone.trim(),
        type: editType
      });
      setEditingId(null);
    } catch (error) {
      console.error('Error updating phone number:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditPhone('');
    setEditType('mobile');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this phone number?')) return;
    
    try {
      await onDelete(id);
    } catch (error) {
      console.error('Error deleting phone number:', error);
    }
  };

  const handleSetPrimary = async (phoneNumber: PhoneNumber) => {
    try {
      // First, update all other numbers to not be primary
      for (const pn of phoneNumbers) {
        if (pn.id !== phoneNumber.id && pn.type === 'primary') {
          await onUpdate(pn.id, { type: 'secondary' });
        }
      }
      // Then set this one as primary
      await onUpdate(phoneNumber.id, { type: 'primary' });
    } catch (error) {
      console.error('Error setting primary phone:', error);
    }
  };

  return (
    <div className="space-y-2 sm:space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-gray-700 text-sm sm:text-base">Phone Numbers</label>
        {!isAdding && !disabled && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="text-blue-600 hover:text-blue-700 text-xs sm:text-sm flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Add Phone</span>
            <span className="xs:hidden">Add</span>
          </button>
        )}
      </div>

      {/* Existing Phone Numbers */}
      <div className="space-y-1.5 sm:space-y-2">
        {phoneNumbers.length === 0 && disabled && (
          <p className="text-gray-500 text-xs sm:text-sm py-2">No additional phone numbers</p>
        )}
        {phoneNumbers.map((phoneNumber) => (
          <div
            key={phoneNumber.id}
            className="flex items-center gap-1.5 sm:gap-2 p-2 border border-gray-200 rounded-lg bg-gray-50"
          >
            {editingId === phoneNumber.id ? (
              // Edit Mode
              <>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="flex-1 px-2 py-1 text-xs sm:text-sm border border-gray-300 rounded min-w-0"
                  placeholder="+1234567890"
                />
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as PhoneType)}
                  className="px-1.5 sm:px-2 py-1 text-xs sm:text-sm border border-gray-300 rounded"
                >
                  <option value="primary">Primary</option>
                  <option value="secondary">Secondary</option>
                  <option value="work">Work</option>
                  <option value="home">Home</option>
                  <option value="mobile">Mobile</option>
                </select>
                <button
                  type="button"
                  onClick={() => handleSaveEdit(phoneNumber.id)}
                  className="p-1 text-green-600 hover:text-green-700 flex-shrink-0"
                  title="Save"
                >
                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="p-1 text-gray-600 hover:text-gray-700 flex-shrink-0"
                  title="Cancel"
                >
                  <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </>
            ) : (
              // View Mode
              <>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {getTypeIcon(phoneNumber.type, phoneNumber.type === 'primary')}
                    <span className="text-xs sm:text-sm text-gray-900 truncate">
                      {formatPhoneNumber(phoneNumber.phone_number)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {getTypeLabel(phoneNumber.type)}
                  </span>
                </div>
                {!disabled && (
                  <div className="flex gap-0.5 sm:gap-1 flex-shrink-0">
                    {phoneNumber.type !== 'primary' && (
                      <button
                        type="button"
                        onClick={() => handleSetPrimary(phoneNumber)}
                        className="p-1 text-yellow-600 hover:text-yellow-700"
                        title="Set as primary"
                      >
                        <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleStartEdit(phoneNumber)}
                      className="p-1 text-blue-600 hover:text-blue-700"
                      title="Edit"
                    >
                      <Pencil className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(phoneNumber.id)}
                      className="p-1 text-red-600 hover:text-red-700"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Add New Phone Form */}
      {isAdding && (
        <div className="flex items-center gap-1.5 sm:gap-2 p-2 border-2 border-blue-200 rounded-lg bg-blue-50">
          <input
            type="tel"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            placeholder="+1234567890"
            className="flex-1 px-2 py-1 text-xs sm:text-sm border border-gray-300 rounded min-w-0"
            autoFocus
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as PhoneType)}
            className="px-1.5 sm:px-2 py-1 text-xs sm:text-sm border border-gray-300 rounded"
          >
            <option value="primary">Primary</option>
            <option value="secondary">Secondary</option>
            <option value="work">Work</option>
            <option value="home">Home</option>
            <option value="mobile">Mobile</option>
          </select>
          <button
            type="button"
            onClick={handleAdd}
            className="p-1 text-green-600 hover:text-green-700 flex-shrink-0"
            title="Add"
          >
            <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setIsAdding(false);
              setNewPhone('');
              setNewType('mobile');
            }}
            className="p-1 text-gray-600 hover:text-gray-700 flex-shrink-0"
            title="Cancel"
          >
            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      )}

      {phoneNumbers.length === 0 && !isAdding && (
        <p className="text-xs sm:text-sm text-gray-500 text-center py-3 sm:py-4">
          No phone numbers added yet
        </p>
      )}
    </div>
  );
}
