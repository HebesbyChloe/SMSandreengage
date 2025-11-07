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
      setPhoneNumbers(data.phoneNumbers || []);
    } catch (err) {
      console.error('Error fetching phone numbers:', err);
      setError(err instanceof Error ? err.message : 'Failed to load phone numbers');
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
      await apiPut(`/sender-phone-numbers/${id}`, phoneData, token);
      await fetchPhoneNumbers();
    } catch (err) {
      console.error('Error updating phone number:', err);
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
      for (const phone of phoneNumbers) {
        if (phone.id !== id && phone.is_primary) {
          await updatePhoneNumber(phone.id, { is_primary: false });
        }
      }
      // Then set this one as primary and active
      await updatePhoneNumber(id, { is_primary: true, is_active: true });
    } catch (err) {
      console.error('Error setting primary phone:', err);
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
