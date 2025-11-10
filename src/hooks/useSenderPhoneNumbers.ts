import { useState, useEffect } from 'react';
import { SenderPhoneNumber } from '../types';
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api';
import { useAuth } from '@/contexts/AuthContext';

export function useSenderPhoneNumbers(accountId: string | null) {
  const { token } = useAuth();
  const [phoneNumbers, setPhoneNumbers] = useState<SenderPhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPhoneNumbers = async () => {
    if (!accountId) {
      setPhoneNumbers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await apiGet(`/sender-accounts/${accountId}/phone-numbers`, token);
      const phones = data.phoneNumbers || [];
      setPhoneNumbers(phones);
      console.log(`✅ Fetched ${phones.length} phone numbers for account ${accountId}`);
    } catch (err) {
      console.error('Error fetching phone numbers:', err);
      setError(err instanceof Error ? err.message : 'Failed to load phone numbers');
      // Don't clear the list on error - keep existing data
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhoneNumbers();
  }, [accountId, token]);

  const addPhoneNumber = async (phoneData: {
    phone_number: string;
    friendly_name?: string;
  }) => {
    if (!accountId) throw new Error('Account ID is required');

    try {
      await apiPost(`/sender-accounts/${accountId}/phone-numbers`, phoneData, token);
      await fetchPhoneNumbers();
    } catch (err) {
      console.error('Error adding phone number:', err);
      throw err;
    }
  };

  const updatePhoneNumber = async (id: string, phoneData: Partial<SenderPhoneNumber>) => {
    try {
      // Optimistically update the local state first
      setPhoneNumbers(prev => prev.map(phone => 
        phone.id === id ? { ...phone, ...phoneData } : phone
      ));
      
      // Then make the API call
      await apiPut(`/sender-phone-numbers/${id}`, phoneData, token);
      
      // Refetch to ensure we have the latest data from server
      await fetchPhoneNumbers();
    } catch (err) {
      console.error('Error updating phone number:', err);
      // Revert optimistic update on error by refetching
      await fetchPhoneNumbers();
      throw err;
    }
  };

  const deletePhoneNumber = async (id: string) => {
    try {
      await apiDelete(`/sender-phone-numbers/${id}`, token);
      await fetchPhoneNumbers();
    } catch (err) {
      console.error('Error deleting phone number:', err);
      throw err;
    }
  };

  const setPrimary = async (id: string) => {
    try {
      // First set all others in this account to non-primary
      // Use Promise.allSettled to handle partial failures gracefully
      const phonesToUpdate = phoneNumbers.filter(phone => phone.id !== id && phone.is_primary);
      
      if (phonesToUpdate.length > 0) {
        const updatePromises = phonesToUpdate.map(phone => 
          updatePhoneNumber(phone.id, { is_primary: false }).catch(err => {
            console.warn(`Failed to unset primary for phone ${phone.id}:`, err);
            // Continue even if some updates fail
            return null;
          })
        );
        
        await Promise.all(updatePromises);
      }
      
      // Then set this one as primary (and ensure it's active)
      await updatePhoneNumber(id, { is_primary: true, is_active: true });
      
      // Refetch to ensure UI is in sync
      await fetchPhoneNumbers();
    } catch (err) {
      console.error('Error setting primary phone:', {
        id,
        error: err,
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
        errorStack: err instanceof Error ? err.stack : undefined,
      });
      throw err;
    }
  };

  return {
    phoneNumbers,
    loading,
    error,
    addPhoneNumber,
    updatePhoneNumber,
    deletePhoneNumber,
    setPrimary,
    refetch: fetchPhoneNumbers,
  };
}
