/**
 * Twilio Conversations API Functions
 * These functions call PHP backend endpoints
 */

import { hebesGet, hebesPost, hebesRequest } from './hebes-api';

/**
 * Twilio Conversations API - Create Conversation
 */
export async function hebesCreateConversation(
  data: {
    account_id: string;
    friendly_name?: string;
    conversation_service_sid?: string;
  },
  token?: string | null
): Promise<any> {
  return hebesPost<any>('create_conversation.php', data, token);
}

/**
 * Twilio Conversations API - List Conversations
 */
export async function hebesListConversations(
  params: {
    account_id: string;
    conversation_service_sid?: string;
    limit?: number;
  },
  token?: string | null
): Promise<any> {
  const queryParams = new URLSearchParams();
  queryParams.append('account_id', params.account_id);
  if (params.conversation_service_sid) {
    queryParams.append('conversation_service_sid', params.conversation_service_sid);
  }
  if (params.limit) {
    queryParams.append('limit', params.limit.toString());
  }
  return hebesGet<any>(`list_conversations.php?${queryParams.toString()}`, token);
}

/**
 * Twilio Conversations API - Find Conversation by Phone
 */
export async function hebesFindConversationByPhone(
  params: {
    account_id: string;
    phone_number: string;
    conversation_service_sid?: string;
    limit?: number;
  },
  token?: string | null
): Promise<any> {
  const queryParams = new URLSearchParams();
  queryParams.append('account_id', params.account_id);
  queryParams.append('phone_number', params.phone_number);
  if (params.conversation_service_sid) {
    queryParams.append('conversation_service_sid', params.conversation_service_sid);
  }
  if (params.limit) {
    queryParams.append('limit', params.limit.toString());
  }
  return hebesGet<any>(`find_conversation_by_phone.php?${queryParams.toString()}`, token);
}

/**
 * Twilio Conversations API - Get Conversation
 */
export async function hebesGetConversation(
  params: {
    account_id: string;
    conversation_sid: string;
    conversation_service_sid?: string;
  },
  token?: string | null
): Promise<any> {
  const queryParams = new URLSearchParams();
  queryParams.append('account_id', params.account_id);
  queryParams.append('conversation_sid', params.conversation_sid);
  if (params.conversation_service_sid) {
    queryParams.append('conversation_service_sid', params.conversation_service_sid);
  }
  return hebesGet<any>(`get_conversation.php?${queryParams.toString()}`, token);
}

/**
 * Twilio Conversations API - Add Participant
 */
export async function hebesAddParticipant(
  data: {
    account_id: string;
    conversation_sid: string;
    address: string;
    proxy_address: string;
    conversation_service_sid?: string;
  },
  token?: string | null
): Promise<any> {
  return hebesPost<any>('add_participant.php', data, token);
}

/**
 * Twilio Conversations API - List Participants
 */
export async function hebesListParticipants(
  params: {
    account_id: string;
    conversation_sid: string;
    conversation_service_sid?: string;
  },
  token?: string | null
): Promise<any> {
  const queryParams = new URLSearchParams();
  queryParams.append('account_id', params.account_id);
  queryParams.append('conversation_sid', params.conversation_sid);
  if (params.conversation_service_sid) {
    queryParams.append('conversation_service_sid', params.conversation_service_sid);
  }
  return hebesGet<any>(`list_participants.php?${queryParams.toString()}`, token);
}

/**
 * Twilio Conversations API - Send Message
 */
export async function hebesSendMessage(
  data: {
    account_id: string;
    conversation_sid: string;
    body: string;
    author?: string;
    conversation_service_sid?: string;
  },
  token?: string | null
): Promise<any> {
  return hebesPost<any>('send_message.php', data, token);
}

/**
 * Twilio Conversations API - List Messages
 */
export async function hebesListMessages(
  params: {
    account_id: string;
    conversation_sid: string;
    limit?: number;
    conversation_service_sid?: string;
  },
  token?: string | null
): Promise<any> {
  const queryParams = new URLSearchParams();
  queryParams.append('account_id', params.account_id);
  queryParams.append('conversation_sid', params.conversation_sid);
  if (params.limit) {
    queryParams.append('limit', params.limit.toString());
  }
  if (params.conversation_service_sid) {
    queryParams.append('conversation_service_sid', params.conversation_service_sid);
  }
  return hebesGet<any>(`list_messages.php?${queryParams.toString()}`, token);
}

/**
 * Twilio Conversations API - List Services
 */
export async function hebesListServices(
  account_id: string,
  token?: string | null
): Promise<any> {
  return hebesGet<any>(`list_services.php?account_id=${account_id}`, token);
}

/**
 * Twilio Conversations API - Remove Participant
 */
export async function hebesRemoveParticipant(
  data: {
    account_id: string;
    conversation_sid: string;
    participant_sid: string;
    conversation_service_sid?: string;
  },
  token?: string | null
): Promise<any> {
  return hebesRequest<any>('remove_participant.php', {
    method: 'DELETE',
    body: JSON.stringify(data),
  }, token);
}

/**
 * Twilio Conversations API - Delete Message
 */
export async function hebesDeleteMessage(
  data: {
    account_id: string;
    conversation_sid: string;
    message_sid: string;
    conversation_service_sid?: string;
  },
  token?: string | null
): Promise<any> {
  return hebesRequest<any>('delete_message.php', {
    method: 'DELETE',
    body: JSON.stringify(data),
  }, token);
}

/**
 * Twilio Conversations API - Delete Conversation
 */
export async function hebesDeleteConversation(
  data: {
    account_id: string;
    conversation_sid: string;
    conversation_service_sid?: string;
  },
  token?: string | null
): Promise<any> {
  return hebesRequest<any>('delete_conversation.php', {
    method: 'DELETE',
    body: JSON.stringify(data),
  }, token);
}

