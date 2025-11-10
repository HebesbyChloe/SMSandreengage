'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Check, X, Star, Phone } from 'lucide-react';
import { useSenderPhoneNumbers } from '../../hooks/useSenderPhoneNumbers';

interface SenderPhoneNumbersListProps {
  accountId: string;
}

export function SenderPhoneNumbersList({ accountId }: SenderPhoneNumbersListProps) {
  const { phoneNumbers, loading, error, addPhoneNumber, updatePhoneNumber, deletePhoneNumber, setPrimary, refetch } = useSenderPhoneNumbers(accountId);
  
  // Refetch when accountId changes (component remounts)
  // Note: The key prop in parent component will force remount, triggering the hook's useEffect
  // This is just a safety net
  useEffect(() => {
    if (accountId) {
      // Small delay to ensure the component is fully mounted
      const timer = setTimeout(() => {
        refetch();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [accountId]); // Only depend on accountId, not refetch
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  // Form states
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [newFriendlyName, setNewFriendlyName] = useState('');
  const [editPhoneNumber, setEditPhoneNumber] = useState('');
  const [editFriendlyName, setEditFriendlyName] = useState('');

  const handleAdd = async () => {
    if (!newPhoneNumber.trim()) {
      alert('Please enter a phone number');
      return;
    }

    try {
      await addPhoneNumber({
        phone_number: newPhoneNumber.trim(),
        friendly_name: newFriendlyName.trim() || undefined,
      });

      setNewPhoneNumber('');
      setNewFriendlyName('');
      setIsAdding(false);
    } catch (error) {
      alert(`Failed to add phone number: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleStartEdit = (phone: any) => {
    setEditingId(phone.id);
    setEditPhoneNumber(phone.phone_number);
    setEditFriendlyName(phone.friendly_name || '');
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await updatePhoneNumber(id, {
        phone_number: editPhoneNumber.trim(),
        friendly_name: editFriendlyName.trim() || undefined,
      });
      setEditingId(null);
    } catch (error) {
      alert(`Failed to update phone number: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditPhoneNumber('');
    setEditFriendlyName('');
  };

  const handleDelete = async (id: string, phoneNumber: string) => {
    if (!confirm(`Are you sure you want to delete ${phoneNumber}?`)) {
      return;
    }

    try {
      await deletePhoneNumber(id);
    } catch (error) {
      alert(`Failed to delete phone number: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSetPrimary = async (id: string) => {
    // Add to updating set
    setUpdatingIds(prev => new Set(prev).add(id));
    
    try {
      await setPrimary(id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to set primary phone:', error);
      // Refetch to restore the correct state
      await refetch();
      alert(`Failed to set primary phone: ${errorMessage}`);
    } finally {
      // Remove from updating set
      setUpdatingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const handleToggleActive = async (phone: any) => {
    const newActiveStatus = !phone.is_active;
    
    // Add to updating set
    setUpdatingIds(prev => new Set(prev).add(phone.id));
    
    try {
      await updatePhoneNumber(phone.id, { is_active: newActiveStatus });
      // Note: We don't remove from list - inactive numbers should still be visible
      // The update will trigger a refetch which will update the UI
    } catch (error) {
      console.error('❌ Failed to toggle active status:', error);
      // Refetch to restore the correct state
      await refetch();
      alert(`Failed to update phone status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // Remove from updating set
      setUpdatingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(phone.id);
        return newSet;
      });
    }
  };

  if (loading) {
    return <p className="text-gray-500">Loading phone numbers...</p>;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-900">Error: {error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Phone className="w-5 h-5 text-gray-600" />
          <h4 className="text-gray-900">Phone Numbers ({phoneNumbers.length})</h4>
        </div>
        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Phone
          </button>
        )}
      </div>

      {/* Add New Phone Form */}
      {isAdding && (
        <div className="mb-4 p-3 border-2 border-blue-200 rounded-lg bg-blue-50">
          <div className="space-y-3">
            <div>
              <label className="block text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={newPhoneNumber}
                onChange={(e) => setNewPhoneNumber(e.target.value)}
                placeholder="+1234567890"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-1">Friendly Name (Optional)</label>
              <input
                type="text"
                value={newFriendlyName}
                onChange={(e) => setNewFriendlyName(e.target.value)}
                placeholder="e.g., Main Support Line"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAdd}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
              >
                <Check className="w-4 h-4" />
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setNewPhoneNumber('');
                  setNewFriendlyName('');
                }}
                className="flex items-center gap-2 px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phone Numbers List */}
      <div className="space-y-2">
        {phoneNumbers.length === 0 && !isAdding && (
          <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <Phone className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">No phone numbers added yet</p>
            <p className="text-gray-500 mt-1">Click "Add Phone" or "Sync Phones" to add numbers</p>
          </div>
        )}

        {phoneNumbers.map((phone) => (
          <div
            key={phone.id}
            className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors"
          >
            {editingId === phone.id ? (
              // Edit Mode
              <>
                <div className="flex-1 space-y-2">
                  <input
                    type="tel"
                    value={editPhoneNumber}
                    onChange={(e) => setEditPhoneNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    value={editFriendlyName}
                    onChange={(e) => setEditFriendlyName(e.target.value)}
                    placeholder="Friendly name (optional)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => handleSaveEdit(phone.id)}
                    className="p-2 text-green-600 hover:text-green-700"
                    title="Save"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="p-2 text-gray-600 hover:text-gray-700"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              // View Mode
              <>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {phone.is_primary && (
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    )}
                    <span className="text-gray-900">{phone.phone_number}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        phone.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {phone.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {phone.is_primary && (
                      <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                        Primary
                      </span>
                    )}
                  </div>
                  {phone.friendly_name && (
                    <p className="text-gray-600 mt-0.5">{phone.friendly_name}</p>
                  )}
                  {phone.twilio_sid && (
                    <p className="text-gray-500 mt-0.5">Twilio SID: {phone.twilio_sid}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleSetPrimary(phone.id)}
                    disabled={updatingIds.has(phone.id)}
                    className={`p-2 transition-colors ${
                      phone.is_primary
                        ? 'text-yellow-600 hover:text-yellow-700'
                        : 'text-gray-400 hover:text-yellow-600'
                    } ${updatingIds.has(phone.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={phone.is_primary ? 'Primary (click to change)' : 'Set as primary'}
                  >
                    <Star className={`w-4 h-4 ${phone.is_primary ? 'fill-yellow-500' : ''} ${updatingIds.has(phone.id) ? 'animate-pulse' : ''}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(phone)}
                    disabled={updatingIds.has(phone.id)}
                    className={`px-3 py-1.5 rounded-lg transition-colors text-xs ${
                      phone.is_active
                        ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800'
                        : 'bg-green-100 hover:bg-green-200 text-green-800'
                    } ${updatingIds.has(phone.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {updatingIds.has(phone.id) ? 'Updating...' : (phone.is_active ? 'Deactivate' : 'Activate')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStartEdit(phone)}
                    className="p-2 text-blue-600 hover:text-blue-700"
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(phone.id, phone.phone_number)}
                    className="p-2 text-red-600 hover:text-red-700"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
