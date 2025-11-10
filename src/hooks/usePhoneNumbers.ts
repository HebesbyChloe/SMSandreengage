import { useState, useEffect } from 'react';
import { PhoneNumber } from '../types';
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api';
import { useAuth } from '@/contexts/AuthContext';

export function usePhoneNumbers(contactId: string | null) {
  const { token } = useAuth();
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPhoneNumbers = async () => {
    if (!contactId) {
      setPhoneNumbers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await apiGet(`/contacts/${contactId}/phone-numbers`, token);
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
  }, [contactId, token]);

  const addPhoneNumber = async (phoneData: Partial<PhoneNumber>) => {
    if (!contactId) throw new Error('Contact ID is required');

    try {

      const data = await apiPost(`/contacts/${contactId}/phone-numbers`, phoneData, token);
      
      // Refresh the list
      await fetchPhoneNumbers();
      
      return data.phoneNumber;
    } catch (err) {
      console.error('Error adding phone number:', err);
      throw err;
    }
  };

  const updatePhoneNumber = async (id: string, phoneData: Partial<PhoneNumber>) => {
    try {
      await apiPut(`/phone-numbers/${id}`, phoneData, token);
      // Refresh the list
      await fetchPhoneNumbers();
    } catch (err) {
      console.error('Error updating phone number:', err);
      throw err;
    }
  };

  const deletePhoneNumber = async (id: string) => {
    try {
      await apiDelete(`/phone-numbers/${id}`, token);
      // Refresh the list
      await fetchPhoneNumbers();
    } catch (err) {
      console.error('Error deleting phone number:', err);
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
    refetch: fetchPhoneNumbers,
  };
}
