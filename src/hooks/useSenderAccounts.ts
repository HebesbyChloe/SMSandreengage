import { useState, useEffect } from 'react';
import { SenderAccount, SenderPhoneNumber } from '../types';
import { useAuth } from '@/contexts/AuthContext';

// Use Next.js API routes instead of Supabase Edge Function
const API_BASE_URL = '/api';

export function useSenderAccounts() {
  const { token } = useAuth();
  const [accounts, setAccounts] = useState<SenderAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      setError(null);

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/sender-accounts`, {
        headers,
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: Failed to fetch sender accounts`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.details || errorMessage;
          console.error('API Error Response:', errorData);
        } catch (e) {
          const text = await response.text().catch(() => '');
          console.error('API Error (non-JSON):', text);
          errorMessage = text || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setAccounts(data.accounts || []);
    } catch (err) {
      console.error('Error fetching sender accounts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load sender accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [token]); // Re-fetch when token changes

  const createAccount = async (accountData: {
    account_name: string;
    account_sid: string;
    auth_token: string;
    webhook_url?: string;
    pre_webhook_url?: string;
  }) => {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        console.warn('⚠️ No token available for request');
      }


      const response = await fetch(`${API_BASE_URL}/sender-accounts`, {
        method: 'POST',
        headers,
        body: JSON.stringify(accountData),
      });


      if (!response.ok) {
        let errorData: any;
        try {
          errorData = await response.json();
        } catch (e) {
          const text = await response.text().catch(() => '');
          throw new Error(`HTTP ${response.status}: ${text || 'Failed to create account'}`);
        }
        
        // Include details if available
        const errorMessage = errorData.error || errorData.details || 'Failed to create account';
        const fullError = errorData.details ? `${errorMessage}: ${errorData.details}` : errorMessage;
        throw new Error(fullError);
      }

      const data = await response.json();
      await fetchAccounts();
      return data.account;
    } catch (err) {
      console.error('Error creating account:', err);
      throw err;
    }
  };

  const updateAccount = async (id: string, accountData: Partial<SenderAccount>) => {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/sender-accounts/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(accountData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update account');
      }

      await fetchAccounts();
    } catch (err) {
      console.error('Error updating account:', err);
      throw err;
    }
  };

  const deleteAccount = async (id: string) => {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/sender-accounts/${id}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete account');
      }

      await fetchAccounts();
    } catch (err) {
      console.error('Error deleting account:', err);
      throw err;
    }
  };

  const syncPhoneNumbers = async (accountId: string) => {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const url = `${API_BASE_URL}/sender-accounts/${accountId}/sync-phones`;

      const response = await fetch(url, {
        method: 'POST',
        headers,
      });


      if (!response.ok) {
        let errorData: any;
        try {
          errorData = await response.json();
        } catch (e) {
          const text = await response.text().catch(() => '');
          throw new Error(`HTTP ${response.status}: ${text || 'Failed to sync phone numbers'}`);
        }
        
        const errorMessage = errorData.error || errorData.details || `Failed to sync phone numbers (${response.status})`;
        console.error('❌ Sync error:', errorMessage, errorData);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data.phoneNumbers || [];
    } catch (err) {
      console.error('❌ Error syncing phone numbers:', err);
      throw err;
    }
  };

  return {
    accounts,
    loading,
    error,
    createAccount,
    updateAccount,
    deleteAccount,
    syncPhoneNumbers,
    refetch: fetchAccounts,
  };
}
