import { useState, useEffect } from 'react';
import { Contact } from '../types';
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api';
import { useAuth } from '@/contexts/AuthContext';

export function useContacts() {
  const { token } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const data = await apiGet('/contacts', token);
      setContacts(data.contacts || []);
      setError(null);
    } catch (error) {
      console.error('Error loading contacts:', error);
      setError('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, [token]);

  const createContact = async (contactData: Partial<Contact>) => {
    try {
      const data = await apiPost('/contacts', contactData, token);
      await loadContacts();
      return data.contact;
    } catch (error: any) {
      console.error('❌ Error creating contact:', error);
      
      // Extract error message from API response
      let errorMessage = error?.message || 'Failed to create contact';
      if (error?.error) {
        errorMessage = error.error;
      } else if (error?.details) {
        errorMessage = error.details;
      }
      
      // Create a new error with the proper message
      const contactError = new Error(errorMessage);
      throw contactError;
    }
  };

  const updateContact = async (id: string, contactData: Partial<Contact>) => {
    try {
      const data = await apiPut(`/contacts/${id}`, contactData, token);
      await loadContacts();
      return data.contact;
    } catch (error) {
      console.error('Error updating contact:', error);
      throw error;
    }
  };

  const deleteContact = async (id: string) => {
    try {
      await apiDelete(`/contacts/${id}`, token);
      await loadContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
      throw error;
    }
  };

  const getContactByPhone = async (phoneNumber: string) => {
    try {
      const data = await apiGet(`/contacts/phone/${encodeURIComponent(phoneNumber)}`, token);
      return data.contact;
    } catch (error) {
      console.error('Error getting contact by phone:', error);
      return null;
    }
  };

  return {
    contacts,
    loading,
    error,
    createContact,
    updateContact,
    deleteContact,
    getContactByPhone,
    reload: loadContacts,
  };
}
