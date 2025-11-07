import { useState, useEffect } from 'react';
import { SenderPhoneNumber } from '../types';
import { apiGet } from '../lib/api';
import { useAuth } from '@/contexts/AuthContext';

export function useAllSenderPhoneNumbers() {
  const { token } = useAuth();
  const [phoneNumbers, setPhoneNumbers] = useState<SenderPhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllPhoneNumbers = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await apiGet('/sender-phone-numbers', token);
      setPhoneNumbers(data.phoneNumbers || []);
    } catch (err) {
      console.error('Error fetching all phone numbers:', err);
      setError(err instanceof Error ? err.message : 'Failed to load phone numbers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllPhoneNumbers();
  }, [token]);

  return {
    phoneNumbers,
    loading,
    error,
    refetch: fetchAllPhoneNumbers,
  };
}
