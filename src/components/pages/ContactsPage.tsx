'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, UserPlus, AlertCircle, Search, Grid, List } from 'lucide-react';
import { useContacts } from '@/hooks/useContacts';
import { ContactList } from '@/components/modules/ContactList';
import { ContactPanel } from '@/components/modules/ContactPanel';
import { Contact } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ContactsPageProps {
  onMessageContact?: (phoneNumber: string) => void;
}

export default function ContactsPage({ onMessageContact }: ContactsPageProps) {
  const { contacts, loading, error, createContact, updateContact, deleteContact, reload } = useContacts();
  const [showPanel, setShowPanel] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | undefined>(undefined);
  const [panelMode, setPanelMode] = useState<'view' | 'edit' | 'create'>('create');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const panelRef = useRef<HTMLDivElement>(null);

  const handleSave = async (contactData: Partial<Contact>) => {
    if (editingContact) {
      await updateContact(editingContact.id, contactData);
    } else {
      await createContact(contactData);
    }
    setShowPanel(false);
    setEditingContact(undefined);
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setPanelMode('edit');
    setShowPanel(true);
  };

  const handleDelete = async (contact: Contact) => {
    await deleteContact(contact.id);
  };

  const handleClose = () => {
    setShowPanel(false);
    setEditingContact(undefined);
  };

  const handleNewContact = () => {
    setEditingContact(undefined);
    setPanelMode('create');
    setShowPanel(true);
  };

  const handleViewDetails = (contact: Contact) => {
    setEditingContact(contact);
    setPanelMode('view');
    setShowPanel(true);
  };

  const handleSwitchToEdit = () => {
    setPanelMode('edit');
  };

  const handleSelectContact = (contact: Contact) => {
    if (onMessageContact) {
      onMessageContact(contact.phone);
    }
  };

  const handleMessageContact = (contact: Contact) => {
    if (onMessageContact) {
      onMessageContact(contact.phone);
    }
  };

  // Click outside to close panel
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showPanel && panelRef.current && !panelRef.current.contains(event.target as Node)) {
        // Only close on desktop (md and up)
        if (window.innerWidth >= 768) {
          handleClose();
        }
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showPanel) {
        handleClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [showPanel]);

  // Filter contacts by search query
  const filteredContacts = contacts.filter(contact => {
    const query = searchQuery.toLowerCase();
    return (
      contact.name?.toLowerCase().includes(query) ||
      contact.phone.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-gray-500">Loading contacts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertCircle className="w-16 h-16 text-red-500" />
        <div className="text-center">
          <p className="text-gray-900 mb-2">Error Loading Contacts</p>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={reload}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-4 md:gap-6 h-[calc(100vh-120px)] sm:h-[calc(100vh-140px)] md:h-[calc(100vh-180px)]">
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 md:mb-6">
        <div>
          <h2 className="text-gray-900">Contacts</h2>
          <p className="text-gray-600 mt-1">
            Manage your contacts and link them to conversations
          </p>
        </div>
        <button
          onClick={handleNewContact}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Add Contact</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {/* Search and View Toggle */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 md:mb-6">
        {/* Search Bar */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or phone number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-2 px-3 py-2 rounded transition-colors ${
              viewMode === 'grid'
                ? 'bg-white text-blue-600 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Grid className="w-4 h-4" />
            <span className="hidden sm:inline">Grid</span>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-2 px-3 py-2 rounded transition-colors ${
              viewMode === 'table'
                ? 'bg-white text-blue-600 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">Table</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-gray-600">Total Contacts</p>
              <p className="text-gray-900">{filteredContacts.length}{searchQuery && ` of ${contacts.length}`}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-gray-600">Named Contacts</p>
              <p className="text-gray-900">
                {filteredContacts.filter(c => c.name).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-gray-600">With Timezone</p>
              <p className="text-gray-900">
                {filteredContacts.filter(c => c.timezone).length}
              </p>
            </div>
          </div>
        </div>
      </div>

        {/* Contact List or Table */}
        <div className="bg-white rounded-lg shadow p-3 sm:p-4 md:p-6">
          {viewMode === 'grid' ? (
            <ContactList
              contacts={filteredContacts}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onSelect={onMessageContact ? handleSelectContact : undefined}
              onViewDetails={handleViewDetails}
              onMessage={onMessageContact ? handleMessageContact : undefined}
              emptyMessage={searchQuery ? 'No contacts found matching your search' : undefined}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="hidden md:table-cell">Timezone</TableHead>
                    <TableHead className="hidden lg:table-cell">Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContacts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        {searchQuery ? 'No contacts found matching your search' : 'No contacts yet'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredContacts.map((contact) => (
                      <TableRow 
                        key={contact.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleViewDetails(contact)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-blue-600">
                                {contact.name ? contact.name.charAt(0).toUpperCase() : contact.phone.charAt(contact.phone.length - 1)}
                              </span>
                            </div>
                            <div>
                              <p className="text-gray-900">
                                {contact.name || 'Unnamed'}
                              </p>
                              {contact.crm_id && (
                                <p className="text-gray-500 text-xs">ID: {contact.crm_id}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-900">
                          {contact.phone}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-gray-600">
                          {contact.timezone || '-'}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-gray-600">
                          {new Date(contact.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {onMessageContact && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMessageContact(contact);
                                }}
                                className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              >
                                Message
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(contact);
                              }}
                              className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Are you sure you want to delete this contact?')) {
                                  handleDelete(contact);
                                }
                              }}
                              className="px-3 py-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Mobile: Full Screen Overlay, Desktop: Side Panel */}
      {showPanel && (
        <>
          {/* Mobile Overlay */}
          <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40" onClick={handleClose} />
          
          {/* Panel */}
          <div 
            ref={panelRef}
            className={`
              md:relative md:w-96
              fixed md:static inset-0 md:inset-auto z-50 md:z-auto
              md:flex-shrink-0
            `}
          >
            <ContactPanel
              contact={editingContact}
              onSave={handleSave}
              onClose={handleClose}
              mode={panelMode}
              onEdit={handleSwitchToEdit}
              onMessage={onMessageContact}
            />
          </div>
        </>
      )}
    </div>
  );
}
