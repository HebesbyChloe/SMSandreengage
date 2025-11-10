'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, AlertCircle, ArrowLeft, X, Phone, Inbox } from 'lucide-react';
import { useConversations } from '@/hooks/useConversations';
import { useContacts } from '@/hooks/useContacts';
import { useAllSenderPhoneNumbers } from '@/hooks/useAllSenderPhoneNumbers';
import { ConversationList } from '@/components/modules/ConversationList';
import { MessageThread } from '@/components/modules/MessageThread';
import { NewMessagePanel } from '@/components/modules/NewMessagePanel';
import { ContactPanel } from '@/components/modules/ContactPanel';
import { Contact, Conversation } from '@/types';

interface ChatPageProps {
  initialSelectedPhone?: string | null;
}

export default function ChatPage({ initialSelectedPhone }: ChatPageProps) {
  const { phoneNumbers: senderPhones, loading: loadingSenderPhones } = useAllSenderPhoneNumbers();
  const [selectedSenderPhone, setSelectedSenderPhone] = useState<string | null>(null);
  const [unifiedInboxMode, setUnifiedInboxMode] = useState(false);
  // Filter conversations by selected sender phone (unless in unified inbox mode)
  const { conversations, loading, error, reload } = useConversations({ 
    senderPhoneNumber: unifiedInboxMode ? null : selectedSenderPhone 
  });
  const { getContactByPhone, updateContact } = useContacts();
  // Store selected conversation as Conversation object to access both conversationId and phoneNumber
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [showMobileThread, setShowMobileThread] = useState(false);
  const [showContactDetails, setShowContactDetails] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactPanelMode, setContactPanelMode] = useState<'view' | 'edit'>('view');

  // Initialize selected conversation from initialSelectedPhone if provided
  useEffect(() => {
    if (initialSelectedPhone && conversations.length > 0) {
      const found = conversations.find(c => c.phoneNumber === initialSelectedPhone);
      if (found) {
        setSelectedConversation(found);
      }
    }
  }, [initialSelectedPhone, conversations]);

  // Set default sender phone when phones are loaded
  useEffect(() => {
    if (senderPhones.length > 0 && !selectedSenderPhone) {
      const primaryPhone = senderPhones.find(p => p.is_primary) || senderPhones[0];
      setSelectedSenderPhone(primaryPhone.phone_number);
    }
  }, [senderPhones]);

  // Auto-show thread on mobile when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      setShowMobileThread(true);
    }
  }, [selectedConversation]);

  // Log conversations changes for debugging
  useEffect(() => {
  }, [conversations]);

  const handleNewConversation = async (phoneNumber: string, conversationId?: string) => {
    setShowNewMessage(false);
    // Find or create conversation for this phone number
    const existingConv = conversations.find(c => c.phoneNumber === phoneNumber);
    if (existingConv) {
      // Update conversation with new conversationId if provided
      if (conversationId && conversationId !== existingConv.conversationId) {
        setSelectedConversation({
          ...existingConv,
          conversationId,
        });
      } else {
        setSelectedConversation(existingConv);
      }
    } else {
      // Create a conversation object with the conversation_id from API response
      setSelectedConversation({
        conversationId: conversationId || '', // Use conversation_id from API response
        phoneNumber,
        senderPhones: selectedSenderPhone ? [selectedSenderPhone] : [],
      });
    }
    setShowMobileThread(true);
    // Add a small delay to ensure the message is saved in the database before reloading
    await new Promise(resolve => setTimeout(resolve, 500));
    await reload();
  };

  const handleBackToList = () => {
    setShowMobileThread(false);
    setSelectedConversation(null);
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setShowMobileThread(true);
  };

  const handleShowDetails = async () => {
    if (selectedConversation) {
      const contact = await getContactByPhone(selectedConversation.phoneNumber);
      if (contact) {
        setSelectedContact(contact);
        setContactPanelMode('view');
        setShowContactDetails(true);
      }
    }
  };

  const handleSwitchToEdit = () => {
    setContactPanelMode('edit');
  };

  const handleCloseDetails = () => {
    setShowContactDetails(false);
    setSelectedContact(null);
  };

  const handleSaveContact = async (data: Partial<Contact>) => {
    if (selectedContact && selectedConversation) {
      await updateContact(selectedContact.id, data);
      const updatedContact = await getContactByPhone(selectedConversation.phoneNumber);
      setSelectedContact(updatedContact);
      setContactPanelMode('view');
    }
  };

  const handleDeleteConversation = async (phoneNumber: string) => {
    try {
      const response = await fetch(
        `/api/conversations/${encodeURIComponent(phoneNumber)}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete conversation');
      }

      // Clear selection if deleting current conversation
      if (selectedConversation && selectedConversation.phoneNumber === phoneNumber) {
        setSelectedConversation(null);
        setShowMobileThread(false);
      }

      // Reload conversations
      await reload();
    } catch (error) {
      console.error('Error deleting conversation:', error);
      alert('Failed to delete conversation. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-gray-500">Loading conversations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertCircle className="w-16 h-16 text-red-500" />
        <div className="text-center">
          <p className="text-gray-900 mb-2">Server Connection Issue</p>
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

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  if (loadingSenderPhones) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (senderPhones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Phone className="w-16 h-16 text-gray-400" />
        <div className="text-center">
          <p className="text-gray-900 mb-2">No Phone Numbers Configured</p>
          <p className="text-gray-600">Please add a sender phone number in the Accounts page first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow h-[calc(100vh-120px)] sm:h-[calc(100vh-140px)] md:h-[calc(100vh-180px)] flex flex-col overflow-hidden">
      {/* Sender Phone Number Selector */}
      <div className="border-b border-gray-200 bg-gray-50 p-3 sm:p-4 space-y-3">
        {/* Unified Inbox Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-gray-600" />
            <label className="text-gray-700 text-sm">Unified Inbox</label>
          </div>
          <button
            onClick={() => {
              setUnifiedInboxMode(!unifiedInboxMode);
              setSelectedConversation(null);
              setShowMobileThread(false);
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              unifiedInboxMode ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                unifiedInboxMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Sender Phone Selector - disabled in unified inbox mode */}
        {!unifiedInboxMode && (
          <div>
            <label className="block text-gray-700 mb-2 text-sm">Send messages from:</label>
            <select
              value={selectedSenderPhone || ''}
              onChange={(e) => {
                setSelectedSenderPhone(e.target.value);
                setSelectedConversation(null);
                setShowMobileThread(false);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              {senderPhones.map((phone) => (
                <option key={phone.id} value={phone.phone_number}>
                  {formatPhoneNumber(phone.phone_number)}
                  {phone.friendly_name && ` - ${phone.friendly_name}`}
                  {phone.is_primary && ' (Primary)'}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Unified Inbox Info */}
        {unifiedInboxMode && (
          <div className="flex items-start gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-blue-800 text-sm">
              Showing all conversations from all phone numbers
            </p>
          </div>
        )}
      </div>

      {/* Main Chat Area Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Conversations List */}
        <div className={`${
          showMobileThread ? 'hidden md:flex' : 'flex'
        } w-full md:w-80 border-r border-gray-200 flex-col`}>
          <ConversationList
            conversations={conversations}
            selectedConversation={selectedConversation}
            onSelectConversation={handleSelectConversation}
            onNewMessage={() => setShowNewMessage(true)}
            onDeleteConversation={handleDeleteConversation}
            onRefresh={reload}
          />
        </div>

        {/* Main Chat Area */}
        <div className={`${
          !showMobileThread ? 'hidden md:flex' : 'flex'
        } flex-1 flex-col`}>
        {/* Mobile Back Button */}
        {selectedConversation && (
          <div className="md:hidden border-b border-gray-200 bg-gray-50 px-4 py-3 flex items-center gap-3">
            <button
              onClick={handleBackToList}
              className="text-blue-600 hover:text-blue-700 transition-colors"
              aria-label="Back to conversations"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <span className="text-gray-700">Back to Conversations</span>
          </div>
        )}

        {/* New Message Panel */}
        {showNewMessage && (
          <NewMessagePanel
            onClose={() => setShowNewMessage(false)}
            onSent={handleNewConversation}
            defaultSenderPhone={selectedSenderPhone || undefined}
          />
        )}

        {selectedConversation ? (
          <MessageThread
            phoneNumber={selectedConversation}
            onMessageSent={() => {
              reload();
              // Force reload messages by updating the conversation reference
              setSelectedConversation({ ...selectedConversation });
            }}
            onShowDetails={handleShowDetails}
            defaultSenderPhone={selectedSenderPhone || undefined}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-4">
            <MessageSquare className="w-16 h-16 sm:w-24 sm:h-24 mb-4" />
            <p className="text-center text-sm sm:text-base">Select a conversation or start a new message</p>
          </div>
        )}
        </div>

        {/* Right Panel - Contact Details (Desktop Only) */}
        {showContactDetails && selectedContact && (
          <>
            {/* Mobile Overlay */}
            <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40" onClick={handleCloseDetails} />
            
            {/* Panel */}
            <div className={`
              lg:relative lg:w-96
              fixed lg:static inset-0 lg:inset-auto z-50 lg:z-auto
              lg:flex-shrink-0
            `}>
              <ContactPanel
                contact={selectedContact}
                onSave={handleSaveContact}
                onClose={handleCloseDetails}
                mode={contactPanelMode}
                onEdit={handleSwitchToEdit}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
