export interface Message {
  id: string;
  to: string;
  from: string;
  body: string;
  direction: 'inbound' | 'outbound';
  status: string;
  sid: string;
  timestamp: string;
}

export interface Conversation {
  conversationId: string; // Primary identifier - conversation_id from messages table
  phoneNumber: string; // Customer phone number for display/contact lookup
  lastMessage?: Message;
  contact?: Contact;
  senderPhones?: string[]; // Which sender phone numbers are involved in this conversation
}

export interface TwilioSettings {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
}

export interface Contact {
  id: string;
  name: string | null;
  phone: string;
  country_code: string | null;
  area_code: string | null;
  timezone: string | null;
  crm_id: string | null;
  last_contacted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PhoneNumber {
  id: string;
  contact_id: string;
  phone_number: string;
  type: 'primary' | 'secondary' | 'work' | 'home' | 'mobile';
  is_verified: boolean;
  created_at: string;
}

export interface SenderAccount {
  id: string;
  account_name: string;
  provider: 'twilio';
  account_sid: string;
  auth_token: string;
  webhook_url?: string;
  pre_webhook_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SenderPhoneNumber {
  id: string;
  account_id: string;
  phone_number: string;
  friendly_name?: string;
  twilio_sid?: string;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
