'use client';

import { useState, useRef } from 'react';
import { X, Save, UserPlus } from 'lucide-react';

interface AddToContactModalProps {
  phoneNumber: string;
  onSave: (data: { name: string; phone: string }) => Promise<void>;
  onCancel: () => void;
}

export function AddToContactModal({ phoneNumber, onSave, onCancel }: AddToContactModalProps) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setSaving(true);
    setError(null);

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Safety timeout - prevent infinite loading
    timeoutRef.current = setTimeout(() => {
      console.warn('⚠️ Contact creation timeout - resetting saving state');
      setSaving(false);
      setError('Request timed out. Please try again.');
      timeoutRef.current = null;
    }, 15000); // 15 second timeout

    try {
      const savePromise = onSave({ name: name.trim(), phone: phoneNumber });
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timed out. Please try again.')), 15000)
      );
      
      await Promise.race([savePromise, timeoutPromise]);
      
      // Clear timeout on success
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      // Success - reset state and let parent close modal
      setSaving(false);
      // Modal will be closed by parent component
    } catch (error: any) {
      // Clear timeout on error
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      console.error('Error saving contact:', error);
      let errorMessage = 'Failed to save contact';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      // Extract error from API response if available
      if (error?.error) {
        errorMessage = error.error;
      } else if (error?.details) {
        errorMessage = error.details;
      }
      
      setError(errorMessage);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-600" />
            <h2 className="text-gray-900">Add to Contacts</h2>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label htmlFor="phone" className="block text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              value={phoneNumber}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>

          <div>
            <label htmlFor="name" className="block text-gray-700 mb-2">
              Contact Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter contact name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={saving}
              autoFocus
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
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
