'use client';

import { AccountsManager } from '../components/modules/AccountsManager';

export default function AccountsPage() {
  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-gray-900 mb-2">Twilio Accounts Management</h1>
        <p className="text-gray-600">
          Manage your Twilio sender accounts and phone numbers. You can have multiple accounts, each with multiple phone numbers.
        </p>
      </div>
      
      <AccountsManager />

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-gray-900 mb-2">Getting Started</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>Click "Add Account" to create a new Twilio sender account</li>
          <li>Enter your Account SID and Auth Token from the <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Twilio Console</a></li>
          <li>Click "Sync Phones" to automatically import phone numbers from Twilio, or manually add them</li>
          <li>Set one phone number as "Primary" - this will be used for sending messages</li>
          <li>Configure webhooks for each phone number to receive incoming messages (see Settings tab)</li>
        </ol>
      </div>
    </div>
  );
}
