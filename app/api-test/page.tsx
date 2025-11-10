'use client';

import { useState, useEffect } from 'react';
import { Play, Copy, Check, AlertCircle } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  hebesCreateConversation,
  hebesListConversations,
  hebesFindConversationByPhone,
  hebesGetConversation,
  hebesAddParticipant,
  hebesListParticipants,
  hebesSendMessage,
  hebesListMessages,
  hebesListServices,
  hebesRemoveParticipant,
  hebesDeleteMessage,
  hebesDeleteConversation,
} from '@/lib/hebes-api-twilio';

interface TwilioEndpoint {
  id: string;
  name: string;
  description: string;
  method: string;
  endpoint: string;
  inputs: {
    name: string;
    label: string;
    type: string;
    placeholder: string;
    required: boolean;
    description?: string;
  }[];
}

const twilioEndpoints: TwilioEndpoint[] = [
  {
    id: 'create-conversation',
    name: 'Create Conversation',
    description: 'Create a new Twilio conversation',
    method: 'POST',
    endpoint: '/api/twilio/test/create-conversation',
    inputs: [
      { name: 'account_id', label: 'Account ID', type: 'text', placeholder: 'Account ID from database', required: true },
      { name: 'friendly_name', label: 'Friendly Name', type: 'text', placeholder: 'Conversation with +1234567890', required: false },
      { name: 'conversation_service_sid', label: 'Service SID (optional)', type: 'text', placeholder: 'IS...', required: false, description: 'If not provided, uses default service' },
    ],
  },
  {
    id: 'list-conversations',
    name: 'List Conversations',
    description: 'List all conversations (optionally filter by service)',
    method: 'GET',
    endpoint: '/api/twilio/test/list-conversations',
    inputs: [
      { name: 'account_id', label: 'Account ID', type: 'text', placeholder: 'Account ID from database', required: true },
      { name: 'conversation_service_sid', label: 'Service SID (optional)', type: 'text', placeholder: 'IS...', required: false, description: 'Filter by conversation service. If not provided, lists all conversations.' },
      { name: 'limit', label: 'Limit', type: 'number', placeholder: '20', required: false },
    ],
  },
  {
    id: 'find-conversation-by-phone',
    name: 'Find Conversation by Phone',
    description: 'Search for conversations by participant phone number',
    method: 'GET',
    endpoint: '/api/twilio/test/find-conversation-by-phone',
    inputs: [
      { name: 'account_id', label: 'Account ID', type: 'text', placeholder: 'Account ID from database', required: true },
      { name: 'phone_number', label: 'Phone Number', type: 'text', placeholder: '+1234567890', required: true, description: 'Phone number to search for (must include country code, e.g., +1)' },
      { name: 'conversation_service_sid', label: 'Service SID (optional)', type: 'text', placeholder: 'IS...', required: false, description: 'Search within a specific conversation service. If not provided, searches all services.' },
      { name: 'limit', label: 'Search Limit', type: 'number', placeholder: '100', required: false, description: 'Max number of conversations to check (default: 100)' },
    ],
  },
  {
    id: 'get-conversation',
    name: 'Get Conversation',
    description: 'Get details of a specific conversation',
    method: 'GET',
    endpoint: '/api/twilio/test/get-conversation',
    inputs: [
      { name: 'account_id', label: 'Account ID', type: 'text', placeholder: 'Account ID from database', required: true },
      { name: 'conversation_sid', label: 'Conversation SID', type: 'text', placeholder: 'CH...', required: true },
      { name: 'conversation_service_sid', label: 'Service SID (optional)', type: 'text', placeholder: 'IS...', required: false, description: 'Optional: Service SID for reference (not required when conversation SID is provided)' },
    ],
  },
  {
    id: 'add-participant',
    name: 'Add Participant',
    description: 'Add a participant to a conversation',
    method: 'POST',
    endpoint: '/api/twilio/test/add-participant',
    inputs: [
      { name: 'account_id', label: 'Account ID', type: 'text', placeholder: 'Account ID from database', required: true },
      { name: 'conversation_sid', label: 'Conversation SID', type: 'text', placeholder: 'CH...', required: true },
      { name: 'address', label: 'Participant Address (phone)', type: 'text', placeholder: '+1234567890', required: true },
      { name: 'proxy_address', label: 'Proxy Address (sender phone)', type: 'text', placeholder: '+1234567890', required: true },
      { name: 'conversation_service_sid', label: 'Service SID (optional)', type: 'text', placeholder: 'IS...', required: false, description: 'Optional: Service SID for reference (not required when conversation SID is provided)' },
    ],
  },
  {
    id: 'list-participants',
    name: 'List Participants',
    description: 'List all participants in a conversation',
    method: 'GET',
    endpoint: '/api/twilio/test/list-participants',
    inputs: [
      { name: 'account_id', label: 'Account ID', type: 'text', placeholder: 'Account ID from database', required: true },
      { name: 'conversation_sid', label: 'Conversation SID', type: 'text', placeholder: 'CH...', required: true },
      { name: 'conversation_service_sid', label: 'Service SID (optional)', type: 'text', placeholder: 'IS...', required: false, description: 'Optional: Service SID for reference (not required when conversation SID is provided)' },
    ],
  },
  {
    id: 'send-message',
    name: 'Send Message via Conversation',
    description: 'Send a message through a conversation',
    method: 'POST',
    endpoint: '/api/twilio/test/send-message',
    inputs: [
      { name: 'account_id', label: 'Account ID', type: 'text', placeholder: 'Account ID from database', required: true },
      { name: 'conversation_sid', label: 'Conversation SID', type: 'text', placeholder: 'CH...', required: true },
      { name: 'body', label: 'Message Body', type: 'textarea', placeholder: 'Your message text', required: true },
      { name: 'author', label: 'Author (phone)', type: 'text', placeholder: '+1234567890', required: false },
      { name: 'conversation_service_sid', label: 'Service SID (optional)', type: 'text', placeholder: 'IS...', required: false, description: 'Optional: Service SID for reference (not required when conversation SID is provided)' },
    ],
  },
  {
    id: 'list-messages',
    name: 'List Messages',
    description: 'List messages in a conversation',
    method: 'GET',
    endpoint: '/api/twilio/test/list-messages',
    inputs: [
      { name: 'account_id', label: 'Account ID', type: 'text', placeholder: 'Account ID from database', required: true },
      { name: 'conversation_sid', label: 'Conversation SID', type: 'text', placeholder: 'CH...', required: true },
      { name: 'limit', label: 'Limit', type: 'number', placeholder: '20', required: false },
      { name: 'conversation_service_sid', label: 'Service SID (optional)', type: 'text', placeholder: 'IS...', required: false, description: 'Optional: Service SID for reference (not required when conversation SID is provided)' },
    ],
  },
  {
    id: 'list-services',
    name: 'List Conversation Services',
    description: 'List all conversation services',
    method: 'GET',
    endpoint: '/api/twilio/test/list-services',
    inputs: [
      { name: 'account_id', label: 'Account ID', type: 'text', placeholder: 'Account ID from database', required: true },
      { name: 'conversation_service_sid', label: 'Service SID (optional)', type: 'text', placeholder: 'IS...', required: false, description: 'Optional: Not used by this endpoint, but available for reference' },
    ],
  },
  {
    id: 'remove-participant',
    name: 'Remove Participant',
    description: 'Remove a participant from a conversation',
    method: 'DELETE',
    endpoint: '/api/twilio/test/remove-participant',
    inputs: [
      { name: 'account_id', label: 'Account ID', type: 'text', placeholder: 'Account ID from database', required: true },
      { name: 'conversation_sid', label: 'Conversation SID', type: 'text', placeholder: 'CH...', required: true },
      { name: 'participant_sid', label: 'Participant SID', type: 'text', placeholder: 'MB...', required: true, description: 'The SID of the participant to remove (get from List Participants)' },
      { name: 'conversation_service_sid', label: 'Service SID (optional)', type: 'text', placeholder: 'IS...', required: false, description: 'Required if conversation belongs to a specific service' },
    ],
  },
  {
    id: 'delete-message',
    name: 'Delete Message',
    description: 'Delete a specific message from a conversation',
    method: 'DELETE',
    endpoint: '/api/twilio/test/delete-message',
    inputs: [
      { name: 'account_id', label: 'Account ID', type: 'text', placeholder: 'Account ID from database', required: true },
      { name: 'conversation_sid', label: 'Conversation SID', type: 'text', placeholder: 'CH...', required: true },
      { name: 'message_sid', label: 'Message SID', type: 'text', placeholder: 'IM...', required: true, description: 'The SID of the message to delete (get from List Messages)' },
      { name: 'conversation_service_sid', label: 'Service SID (optional)', type: 'text', placeholder: 'IS...', required: false, description: 'Required if conversation belongs to a specific service' },
    ],
  },
  {
    id: 'delete-conversation',
    name: 'Delete Conversation',
    description: 'Delete one or more conversations (permanent - cannot be undone). Separate multiple SIDs with commas.',
    method: 'DELETE',
    endpoint: '/api/twilio/test/delete-conversation',
    inputs: [
      { name: 'account_id', label: 'Account ID', type: 'text', placeholder: 'Account ID from database', required: true },
      { name: 'conversation_sid', label: 'Conversation SID(s)', type: 'text', placeholder: 'CH... or CH1,CH2,CH3', required: true, description: 'Single SID or comma-separated list of SIDs to delete' },
      { name: 'conversation_service_sid', label: 'Service SID (optional)', type: 'text', placeholder: 'IS...', required: false, description: 'Required if conversation(s) belong to a specific service' },
    ],
  },
];

// Conversation Services (can be extended to fetch from API)
const conversationServices = [
  { sid: 'IS69ff63ef0ea9401ca4238e2e74218a13', name: 'Customer Service' },
  { sid: 'IS1986ab6948114ec7b27f259835fa854e', name: 'Default Conversations Service' },
];

export default function ApiTestPage() {
  const { token } = useAuth();
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>(twilioEndpoints[0].id);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [selectedServiceSid, setSelectedServiceSid] = useState<string>('');

  const endpoint = twilioEndpoints.find(e => e.id === selectedEndpoint)!;
  
  // Check if current endpoint supports conversation_service_sid
  const supportsServiceSid = endpoint.inputs.some(input => input.name === 'conversation_service_sid');

  // Fetch sender accounts on mount
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setLoadingAccounts(true);
        const response = await apiGet('/sender-accounts', token || undefined);
        setAccounts(response.accounts || []);
      } catch (err) {
        console.error('Error fetching accounts:', err);
        setAccounts([]);
      } finally {
        setLoadingAccounts(false);
      }
    };

    if (token) {
      fetchAccounts();
    }
  }, [token]);

  // Auto-populate account_id and conversation service SID when account is selected
  useEffect(() => {
    if (selectedAccountId) {
      const account = accounts.find(a => a.id === selectedAccountId);
      if (account) {
        // Parse settings if it's a string
        let settings = account.settings;
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
        
        const serviceSid = settings?.conversation_service_sid || '';
        
        // Update form data
        setFormData(prev => ({
          ...prev,
          account_id: account.id || '',
          conversation_service_sid: serviceSid,
        }));
        
        // Also update service dropdown if service SID exists and matches one of our services
        if (serviceSid && conversationServices.some(s => s.sid === serviceSid)) {
          setSelectedServiceSid(serviceSid);
        }
      }
    }
  }, [selectedAccountId, accounts]);

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    setResult(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      let response: any;

      switch (selectedEndpoint) {
        case 'create-conversation':
          response = await hebesCreateConversation({
            account_id: formData.account_id,
            friendly_name: formData.friendly_name,
            conversation_service_sid: formData.conversation_service_sid,
          }, token);
          break;

        case 'list-conversations':
          response = await hebesListConversations({
            account_id: formData.account_id,
            conversation_service_sid: formData.conversation_service_sid,
            limit: formData.limit ? parseInt(formData.limit) : undefined,
          }, token);
          break;

        case 'find-conversation-by-phone':
          response = await hebesFindConversationByPhone({
            account_id: formData.account_id,
            phone_number: formData.phone_number,
            conversation_service_sid: formData.conversation_service_sid,
            limit: formData.limit ? parseInt(formData.limit) : undefined,
          }, token);
          break;

        case 'get-conversation':
          response = await hebesGetConversation({
            account_id: formData.account_id,
            conversation_sid: formData.conversation_sid,
            conversation_service_sid: formData.conversation_service_sid,
          }, token);
          break;

        case 'add-participant':
          response = await hebesAddParticipant({
            account_id: formData.account_id,
            conversation_sid: formData.conversation_sid,
            address: formData.address,
            proxy_address: formData.proxy_address,
            conversation_service_sid: formData.conversation_service_sid,
          }, token);
          break;

        case 'list-participants':
          response = await hebesListParticipants({
            account_id: formData.account_id,
            conversation_sid: formData.conversation_sid,
            conversation_service_sid: formData.conversation_service_sid,
          }, token);
          break;

        case 'send-message':
          response = await hebesSendMessage({
            account_id: formData.account_id,
            conversation_sid: formData.conversation_sid,
            body: formData.body,
            author: formData.author,
            conversation_service_sid: formData.conversation_service_sid,
          }, token);
          break;

        case 'list-messages':
          response = await hebesListMessages({
            account_id: formData.account_id,
            conversation_sid: formData.conversation_sid,
            limit: formData.limit ? parseInt(formData.limit) : undefined,
            conversation_service_sid: formData.conversation_service_sid,
          }, token);
          break;

        case 'list-services':
          response = await hebesListServices(formData.account_id, token);
          break;

        case 'remove-participant':
          response = await hebesRemoveParticipant({
            account_id: formData.account_id,
            conversation_sid: formData.conversation_sid,
            participant_sid: formData.participant_sid,
            conversation_service_sid: formData.conversation_service_sid,
          }, token);
          break;

        case 'delete-message':
          response = await hebesDeleteMessage({
            account_id: formData.account_id,
            conversation_sid: formData.conversation_sid,
            message_sid: formData.message_sid,
            conversation_service_sid: formData.conversation_service_sid,
          }, token);
          break;

        case 'delete-conversation':
          response = await hebesDeleteConversation({
            account_id: formData.account_id,
            conversation_sid: formData.conversation_sid,
            conversation_service_sid: formData.conversation_service_sid,
          }, token);
          break;

        default:
          throw new Error(`Unknown endpoint: ${selectedEndpoint}`);
      }

      // Wrap response in success format
      setResult({ success: true, data: response });
      setError(null);
    } catch (err: any) {
      const errorMessage = err.message || 'Unknown error';
      setError(errorMessage);
      setResult({ success: false, error: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getRequestPreview = () => {
    const preview: any = {};
    endpoint.inputs.forEach(input => {
      if (formData[input.name]) {
        preview[input.name] = formData[input.name];
      }
    });
    return preview;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Twilio API Test Page</h1>
            <p className="mt-2 text-gray-600">Test Twilio SDK endpoints manually</p>
          </div>

          <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Endpoint List */}
            <div className="lg:col-span-1">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Endpoints</h2>
              <div className="space-y-2">
                {twilioEndpoints.map((ep) => (
                  <button
                    key={ep.id}
                    onClick={() => {
                      setSelectedEndpoint(ep.id);
                      setFormData({});
                      setResult(null);
                      setError(null);
                      setSelectedServiceSid(''); // Reset service selection when switching endpoints
                    }}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedEndpoint === ep.id
                        ? 'bg-blue-50 border-blue-500 text-blue-900'
                        : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <div className="font-medium">{ep.name}</div>
                    <div className="text-xs text-gray-500 mt-1">{ep.description}</div>
                    <div className="text-xs mt-1">
                      <span className="font-mono bg-gray-100 px-1 rounded">{ep.method}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Form and Results */}
            <div className="lg:col-span-2 space-y-6">
              {/* Selected Endpoint Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900">{endpoint.name}</h3>
                <p className="text-sm text-blue-700 mt-1">{endpoint.description}</p>
                <div className="mt-2 text-xs text-blue-600">
                  <span className="font-mono bg-blue-100 px-2 py-1 rounded">{endpoint.method}</span>
                  <span className="ml-2 font-mono">{endpoint.endpoint}</span>
                </div>
              </div>

              {/* Account Selector */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <label className="block text-sm font-semibold text-blue-900 mb-2">
                  Select Sender Account (Optional)
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => {
                    setSelectedAccountId(e.target.value);
                    if (!e.target.value) {
                      // Clear account fields if "None" is selected
                      setFormData(prev => {
                        const newData = { ...prev };
                        delete newData.account_id;
                        return newData;
                      });
                    }
                  }}
                  className="w-full px-3 py-2 border border-blue-300 rounded-md bg-white focus:ring-blue-500 focus:border-blue-500"
                  disabled={loadingAccounts}
                >
                  <option value="">-- Select Account (or enter manually) --</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.account_name} ({account.account_sid?.substring(0, 12)}...)
                    </option>
                  ))}
                </select>
                {selectedAccountId && (
                  <p className="text-xs text-blue-700 mt-2">
                    ✓ Account ID will be auto-filled from selected account
                  </p>
                )}
              </div>

              {/* Conversation Service Selector - Show only if endpoint supports it */}
              {supportsServiceSid && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <label className="block text-sm font-semibold text-green-900 mb-2">
                    Select Conversation Service (Optional)
                  </label>
                  <select
                    value={selectedServiceSid}
                    onChange={(e) => {
                      setSelectedServiceSid(e.target.value);
                      if (e.target.value) {
                        setFormData(prev => ({
                          ...prev,
                          conversation_service_sid: e.target.value,
                        }));
                      } else {
                        setFormData(prev => {
                          const newData = { ...prev };
                          delete newData.conversation_service_sid;
                          return newData;
                        });
                      }
                    }}
                    className="w-full px-3 py-2 border border-green-300 rounded-md bg-white focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">-- Select Service (or enter manually) --</option>
                    {conversationServices.map((service) => (
                      <option key={service.sid} value={service.sid}>
                        {service.name} ({service.sid})
                      </option>
                    ))}
                  </select>
                  {selectedServiceSid && (
                    <p className="text-xs text-green-700 mt-2">
                      ✓ Conversation Service SID will be auto-filled
                    </p>
                  )}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {endpoint.inputs.map((input) => {
                  const isAccountField = input.name === 'account_id';
                  const isAutoFilled = !!(isAccountField && selectedAccountId);
                  const isServiceSidField = input.name === 'conversation_service_sid';
                  const isServiceAutoFilled = !!(isServiceSidField && selectedServiceSid);
                  
                  return (
                    <div key={input.name}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {input.label}
                        {input.required && <span className="text-red-500 ml-1">*</span>}
                        {isAutoFilled && (
                          <span className="ml-2 text-xs text-blue-600">(Auto-filled from account)</span>
                        )}
                        {isServiceAutoFilled && (
                          <span className="ml-2 text-xs text-green-600">(Auto-filled from service dropdown)</span>
                        )}
                      </label>
                      {input.description && (
                        <p className="text-xs text-gray-500 mb-1">{input.description}</p>
                      )}
                      {input.type === 'textarea' ? (
                        <textarea
                          value={formData[input.name] || ''}
                          onChange={(e) => handleInputChange(input.name, e.target.value)}
                          placeholder={input.placeholder}
                          disabled={isAutoFilled || isServiceAutoFilled}
                          required={input.required}
                          rows={3}
                          readOnly={isAutoFilled || isServiceAutoFilled}
                          className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            isAutoFilled || isServiceAutoFilled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                          }`}
                        />
                      ) : (
                        <input
                          type={input.type}
                          value={formData[input.name] || ''}
                          onChange={(e) => handleInputChange(input.name, e.target.value)}
                          placeholder={input.placeholder}
                          required={input.required}
                          readOnly={isAutoFilled || isServiceAutoFilled}
                          disabled={isAutoFilled || isServiceAutoFilled}
                          className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                            isAutoFilled || isServiceAutoFilled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                          }`}
                        />
                      )}
                    </div>
                  );
                })}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  {loading ? 'Sending...' : 'Send Request'}
                </button>
              </form>

              {/* Request Preview */}
              {Object.keys(getRequestPreview()).length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-gray-700">Request Preview</h4>
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(getRequestPreview(), null, 2))}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <pre className="text-xs bg-white p-3 rounded border border-gray-200 overflow-x-auto">
                    {JSON.stringify(getRequestPreview(), null, 2)}
                  </pre>
                </div>
              )}

              {/* Error Display */}
              {(error || (result && result.success === false)) && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-red-900">Error</h4>
                      <p className="text-sm text-red-700 mt-1">{error || result?.error}</p>
                      {result && result.code && (
                        <div className="mt-2 text-xs text-red-600">
                          <p>Code: {result.code}</p>
                          {result.status && <p>Status: {result.status}</p>}
                          {result.moreInfo && <p>More Info: {result.moreInfo}</p>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Result Display */}
              {result && result.success !== false && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-green-900">Response</h4>
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(result, null, 2))}
                      className="text-green-600 hover:text-green-700"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <pre className="text-xs bg-white p-3 rounded border border-green-200 overflow-x-auto max-h-96 overflow-y-auto">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

