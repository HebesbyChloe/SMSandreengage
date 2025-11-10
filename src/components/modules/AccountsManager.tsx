'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, Eye, EyeOff, ChevronDown, ChevronRight, RefreshCw, Phone, Settings } from 'lucide-react';
import { SenderAccount } from '../../types';
import { useSenderAccounts } from '../../hooks/useSenderAccounts';
import { useSenderPhoneNumbers } from '../../hooks/useSenderPhoneNumbers';
import { SenderPhoneNumbersList } from './SenderPhoneNumbersList';

export function AccountsManager() {
  const { accounts, loading, error, createAccount, updateAccount, deleteAccount, syncPhoneNumbers } = useSenderAccounts();
  const [expandedAccountId, setExpandedAccountId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null);

  // Form states
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountSid, setNewAccountSid] = useState('');
  const [newAuthToken, setNewAuthToken] = useState('');
  const [newConversationServiceSid, setNewConversationServiceSid] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newPreWebhookUrl, setNewPreWebhookUrl] = useState('');
  const [editAccountName, setEditAccountName] = useState('');
  const [editAccountSid, setEditAccountSid] = useState('');
  const [editAuthToken, setEditAuthToken] = useState('');
  const [editConversationServiceSid, setEditConversationServiceSid] = useState('');
  const [editWebhookUrl, setEditWebhookUrl] = useState('');
  const [editPreWebhookUrl, setEditPreWebhookUrl] = useState('');
  const [showNewToken, setShowNewToken] = useState(false);
  const [showEditToken, setShowEditToken] = useState(false);

  const handleAdd = async () => {
    if (!newAccountName.trim() || !newAccountSid.trim() || !newAuthToken.trim()) {
      alert('Please fill in all fields');
      return;
    }

    try {
      await createAccount({
        account_name: newAccountName.trim(),
        account_sid: newAccountSid.trim(),
        auth_token: newAuthToken.trim(),
        conversation_service_sid: newConversationServiceSid.trim() || undefined,
        webhook_url: newWebhookUrl.trim() || undefined,
        pre_webhook_url: newPreWebhookUrl.trim() || undefined,
      });

      setNewAccountName('');
      setNewAccountSid('');
      setNewAuthToken('');
      setNewConversationServiceSid('');
      setNewWebhookUrl('');
      setNewPreWebhookUrl('');
      setIsAdding(false);
      setShowNewToken(false);
    } catch (error) {
      console.error('❌ Error creating account in UI:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error message:', errorMessage);
      
      if (errorMessage.includes('already exists')) {
        alert(`This Twilio Account SID already exists in the system. If you need to update the credentials, please edit the existing account instead.`);
      } else {
        // Show more detailed error message
        const detailedError = errorMessage.includes(':') 
          ? errorMessage.split(':').pop()?.trim() || errorMessage
          : errorMessage;
        alert(`Failed to add account: ${detailedError}\n\nCheck the browser console for more details.`);
      }
    }
  };

  const handleStartEdit = (account: SenderAccount) => {
    setEditingId(account.id);
    setEditAccountName(account.account_name);
    setEditAccountSid(account.account_sid);
    setEditAuthToken(account.auth_token);
    // Parse settings to get conversation_service_sid
    let settings: any = account.settings;
    if (typeof settings === 'string') {
      try {
        settings = JSON.parse(settings);
      } catch (e) {
        settings = {};
      }
    }
    if (!settings) {
      settings = {};
    }
    setEditConversationServiceSid(settings?.conversation_service_sid || '');
    setEditWebhookUrl(account.webhook_url || '');
    setEditPreWebhookUrl(account.pre_webhook_url || '');
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await updateAccount(id, {
        account_name: editAccountName.trim(),
        account_sid: editAccountSid.trim(),
        auth_token: editAuthToken.trim(),
        conversation_service_sid: editConversationServiceSid.trim() || undefined,
        webhook_url: editWebhookUrl.trim() || undefined,
        pre_webhook_url: editPreWebhookUrl.trim() || undefined,
      });
      setEditingId(null);
      setShowEditToken(false);
    } catch (error) {
      alert(`Failed to update account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditAccountName('');
    setEditAccountSid('');
    setEditAuthToken('');
    setEditConversationServiceSid('');
    setEditWebhookUrl('');
    setEditPreWebhookUrl('');
    setShowEditToken(false);
  };

  const handleDelete = async (id: string, accountName: string) => {
    if (!confirm(`Are you sure you want to delete "${accountName}"? This will also remove all associated phone numbers.`)) {
      return;
    }

    try {
      await deleteAccount(id);
    } catch (error) {
      alert(`Failed to delete account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSyncPhones = async (accountId: string) => {
    setSyncingAccountId(accountId);
    try {
      const phones = await syncPhoneNumbers(accountId);
      const message = phones.length > 0 
        ? `Successfully synced ${phones.length} phone number(s) from Twilio!`
        : `Sync completed. ${phones.length === 0 ? 'No new phone numbers found in Twilio account.' : ''}`;
      alert(message);
      // Force refresh by toggling the expanded state to reload phone numbers
      if (expandedAccountId === accountId) {
        setExpandedAccountId(null);
        setTimeout(() => setExpandedAccountId(accountId), 100);
      } else {
        // If not expanded, expand it to show the synced numbers
        setExpandedAccountId(accountId);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Sync error:', error);
      alert(`Failed to sync phone numbers: ${errorMessage}`);
    } finally {
      setSyncingAccountId(null);
    }
  };

  const toggleExpanded = (accountId: string) => {
    setExpandedAccountId(expandedAccountId === accountId ? null : accountId);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">Loading accounts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-900">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-gray-900">Twilio Sender Accounts</h2>
            <p className="text-gray-600 mt-1">Manage multiple Twilio accounts and their phone numbers</p>
          </div>
          {!isAdding && (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Account
            </button>
          )}
        </div>

        {/* Add New Account Form */}
        {isAdding && (
          <div className="mb-6 p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
            <h3 className="text-gray-900 mb-4">Add New Twilio Account</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-gray-700 mb-1">Account Name</label>
                <input
                  type="text"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  placeholder="e.g., Production Account"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Account SID</label>
                <input
                  type="text"
                  value={newAccountSid}
                  onChange={(e) => setNewAccountSid(e.target.value)}
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Auth Token</label>
                <div className="relative">
                  <input
                    type={showNewToken ? 'text' : 'password'}
                    value={newAuthToken}
                    onChange={(e) => setNewAuthToken(e.target.value)}
                    placeholder="Enter your Twilio Auth Token"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewToken(!showNewToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showNewToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Conversation Service SID <span className="text-gray-500">(optional)</span></label>
                <input
                  type="text"
                  value={newConversationServiceSid}
                  onChange={(e) => setNewConversationServiceSid(e.target.value)}
                  placeholder="ISxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">Twilio Conversation Service SID for this account</p>
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Webhook URL <span className="text-gray-500">(optional)</span></label>
                <input
                  type="url"
                  value={newWebhookUrl}
                  onChange={(e) => setNewWebhookUrl(e.target.value)}
                  placeholder="https://your-server.com/webhook/sms"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">URL for incoming SMS messages</p>
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Pre-Webhook URL <span className="text-gray-500">(optional)</span></label>
                <input
                  type="url"
                  value={newPreWebhookUrl}
                  onChange={(e) => setNewPreWebhookUrl(e.target.value)}
                  placeholder="https://your-server.com/pre-webhook"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">URL called before webhook processing</p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleAdd}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Save Account
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setNewAccountName('');
                    setNewAccountSid('');
                    setNewAuthToken('');
                    setNewConversationServiceSid('');
                    setNewWebhookUrl('');
                    setNewPreWebhookUrl('');
                    setShowNewToken(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Accounts List */}
        <div className="space-y-3">
          {accounts.length === 0 && !isAdding && (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <Settings className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-2">No Twilio accounts configured yet</p>
              <p className="text-gray-500">Click "Add Account" to get started</p>
            </div>
          )}

          {accounts.map((account) => (
            <div
              key={account.id}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              {editingId === account.id ? (
                // Edit Mode
                <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400">
                  <h3 className="text-gray-900 mb-4">Edit Account</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-gray-700 mb-1">Account Name</label>
                      <input
                        type="text"
                        value={editAccountName}
                        onChange={(e) => setEditAccountName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 mb-1">Account SID</label>
                      <input
                        type="text"
                        value={editAccountSid}
                        onChange={(e) => setEditAccountSid(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 mb-1">Auth Token</label>
                      <div className="relative">
                        <input
                          type={showEditToken ? 'text' : 'password'}
                          value={editAuthToken}
                          onChange={(e) => setEditAuthToken(e.target.value)}
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          type="button"
                          onClick={() => setShowEditToken(!showEditToken)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showEditToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-700 mb-1">Conversation Service SID <span className="text-gray-500">(optional)</span></label>
                      <input
                        type="text"
                        value={editConversationServiceSid}
                        onChange={(e) => setEditConversationServiceSid(e.target.value)}
                        placeholder="ISxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="mt-1 text-xs text-gray-500">Twilio Conversation Service SID for this account</p>
                    </div>
                    <div>
                      <label className="block text-gray-700 mb-1">Webhook URL <span className="text-gray-500">(optional)</span></label>
                      <input
                        type="url"
                        value={editWebhookUrl}
                        onChange={(e) => setEditWebhookUrl(e.target.value)}
                        placeholder="https://your-server.com/webhook/sms"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="mt-1 text-xs text-gray-500">URL for incoming SMS messages</p>
                    </div>
                    <div>
                      <label className="block text-gray-700 mb-1">Pre-Webhook URL <span className="text-gray-500">(optional)</span></label>
                      <input
                        type="url"
                        value={editPreWebhookUrl}
                        onChange={(e) => setEditPreWebhookUrl(e.target.value)}
                        placeholder="https://your-server.com/pre-webhook"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="mt-1 text-xs text-gray-500">URL called before webhook processing</p>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(account.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                // View Mode
                <>
                  <div className="p-4 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <button
                          type="button"
                          onClick={() => toggleExpanded(account.id)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          {expandedAccountId === account.id ? (
                            <ChevronDown className="w-5 h-5" />
                          ) : (
                            <ChevronRight className="w-5 h-5" />
                          )}
                        </button>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-gray-900">{account.account_name}</h3>
                            <span
                              className={`px-2 py-0.5 rounded text-xs ${
                                account.is_active
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-200 text-gray-700'
                              }`}
                            >
                              {account.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <p className="text-gray-600 mt-0.5">
                            SID: {account.account_sid}
                          </p>
                          {account.webhook_url && (
                            <p className="text-gray-600 mt-0.5 text-sm">
                              Webhook: <code className="bg-gray-100 px-1 rounded text-xs">{account.webhook_url}</code>
                            </p>
                          )}
                          {account.pre_webhook_url && (
                            <p className="text-gray-600 mt-0.5 text-sm">
                              Pre-Webhook: <code className="bg-gray-100 px-1 rounded text-xs">{account.pre_webhook_url}</code>
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSyncPhones(account.id)}
                          disabled={syncingAccountId === account.id}
                          className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg transition-colors text-sm"
                          title="Sync phone numbers from Twilio API"
                        >
                          <RefreshCw className={`w-4 h-4 ${syncingAccountId === account.id ? 'animate-spin' : ''}`} />
                          Sync Phones
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(account)}
                          className="p-1.5 text-blue-600 hover:text-blue-700"
                          title="Edit account"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(account.id, account.account_name)}
                          className="p-1.5 text-red-600 hover:text-red-700"
                          title="Delete account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Phone Numbers Section */}
                  {expandedAccountId === account.id && (
                    <div className="p-4 bg-white border-t border-gray-200">
                      <SenderPhoneNumbersList 
                        key={`phones-${account.id}-${syncingAccountId === account.id ? 'syncing' : 'idle'}`} 
                        accountId={account.id} 
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
