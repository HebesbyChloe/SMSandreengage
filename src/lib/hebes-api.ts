/**
 * Hebes Admin API Client
 * Replaces Supabase direct calls with Hebes Admin API endpoints
 */

const HEBES_API_BASE = process.env.NEXT_PUBLIC_HEBES_API_BASE || 
  'https://admin.hebesbychloe.com/wp-content/themes/flatsome-child/backend-dfcflow/twilio';

// Twilio-specific endpoints (located directly in /twilio/ directory)
const HEBES_TWILIO_API_BASE = HEBES_API_BASE;

interface HebesResponse<T> {
  success: boolean;
  data: T | string; // string when success: false (error message)
}

/**
 * Generic API request handler for Hebes Admin API
 */
async function hebesRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const url = `${HEBES_API_BASE}/${endpoint}`;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add JWT token if provided
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Get response text first to handle both JSON and non-JSON responses
  const responseText = await response.text();
  
  let result: HebesResponse<T>;
  try {
    result = JSON.parse(responseText);
  } catch (parseError) {
    console.error(`Hebes API parse error for ${url}:`, {
      status: response.status,
      statusText: response.statusText,
      responseText: responseText.substring(0, 500),
      headers: Object.fromEntries(response.headers.entries()),
    });
    throw new Error(`Invalid JSON response from Hebes API (${response.status}): ${responseText.substring(0, 200)}`);
  }

  // Log the full response for debugging
  console.log(`Hebes API response for ${url}:`, {
    status: response.status,
    success: result.success,
    hasData: !!result.data,
    dataType: typeof result.data,
    dataPreview: typeof result.data === 'object' && result.data !== null 
      ? Object.keys(result.data).slice(0, 10) 
      : result.data,
    fullResult: result,
  });

  // Check HTTP status first
  if (!response.ok && response.status !== 200) {
    const errorMessage = typeof result.data === 'string' 
      ? result.data 
      : (result.data ? JSON.stringify(result.data) : `HTTP ${response.status}: ${response.statusText}`);
    console.error(`Hebes API HTTP error for ${url}:`, {
      status: response.status,
      statusText: response.statusText,
      errorMessage,
      fullResponse: result,
    });
    throw new Error(errorMessage);
  }

  // Check success flag
  if (!result.success) {
    const errorMessage = typeof result.data === 'string' 
      ? result.data 
      : (result.data ? JSON.stringify(result.data) : 'Request failed');
    console.error(`Hebes API error (success=false) for ${url}:`, {
      errorMessage,
      fullResponse: result,
    });
    throw new Error(errorMessage);
  }

  // When success is true, data contains the actual response
  return result.data as T;
}

/**
 * GET request to Hebes API
 */
export async function hebesGet<T>(endpoint: string, token?: string | null): Promise<T> {
  return hebesRequest<T>(endpoint, { method: 'GET' }, token);
}

/**
 * POST request to Hebes API
 */
export async function hebesPost<T>(endpoint: string, data: any, token?: string | null): Promise<T> {
  console.log(`[hebesPost] Calling ${endpoint} with:`, {
    hasToken: !!token,
    tokenLength: token?.length || 0,
    dataKeys: Object.keys(data),
    dataPreview: { ...data, auth_token: data.auth_token ? '***' : undefined },
  });
  
  try {
    const result = await hebesRequest<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    }, token);
    
    console.log(`[hebesPost] Success for ${endpoint}:`, result);
    return result;
  } catch (error: any) {
    console.error(`[hebesPost] Error for ${endpoint}:`, {
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
    });
    throw error;
  }
}

/**
 * PUT request to Hebes API
 */
export async function hebesPut<T>(endpoint: string, data: any, token?: string | null): Promise<T> {
  return hebesRequest<T>(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  }, token);
}

/**
 * DELETE request to Hebes API
 */
export async function hebesDelete<T>(endpoint: string, id?: string, token?: string | null): Promise<T> {
  const url = id ? `${endpoint}?id=${id}` : endpoint;
  return hebesRequest<T>(url, { method: 'DELETE' }, token);
}

/**
 * Sender Accounts API
 */
export const hebesSenderAccounts = {
  getAll: (token?: string | null) => hebesGet<any[]>('sender_accounts.php', token),
  getById: (id: string, token?: string | null) => hebesGet<any>(`sender_accounts.php?id=${id}`, token),
  create: (data: any, token?: string | null) => hebesPost<any>('sender_accounts.php', data, token),
  update: (data: any, token?: string | null) => hebesPut<any>('sender_accounts.php', data, token),
  delete: (id: string, token?: string | null) => hebesDelete<any>('sender_accounts.php', id, token),
};

/**
 * Sender Phone Numbers API
 */
export const hebesSenderPhoneNumbers = {
  getAll: (token?: string | null) => hebesGet<any[]>('sender_phone_numbers.php', token),
  getById: (id: string, token?: string | null) => hebesGet<any>(`sender_phone_numbers.php?id=${id}`, token),
  getByAccountId: (accountId: string, token?: string | null) => 
    hebesGet<any[]>(`sender_phone_numbers.php?account_id=${accountId}`, token),
  create: (data: any, token?: string | null) => hebesPost<any>('sender_phone_numbers.php', data, token),
  update: (data: any, token?: string | null) => hebesPut<any>('sender_phone_numbers.php', data, token),
  delete: (id: string, token?: string | null) => hebesDelete<any>('sender_phone_numbers.php', id, token),
};

/**
 * Contacts API
 */
export const hebesContacts = {
  getAll: (token?: string | null) => hebesGet<any[]>('contacts.php', token),
  getById: (id: string, token?: string | null) => hebesGet<any>(`contacts.php?id=${id}`, token),
  getByPhone: (phone: string, token?: string | null) => 
    hebesGet<any>(`contacts.php?phone=${encodeURIComponent(phone)}`, token),
  create: (data: any, token?: string | null) => hebesPost<any>('contacts.php', data, token),
  update: (data: any, token?: string | null) => hebesPut<any>('contacts.php', data, token),
  delete: (id: string, token?: string | null) => hebesDelete<any>('contacts.php', id, token),
};

/**
 * SMS Messages API
 */
export const hebesSmsMessages = {
  getAll: (token?: string | null) => hebesGet<any[]>('sms_messages.php', token),
  getById: (id: string, token?: string | null) => hebesGet<any>(`sms_messages.php?id=${id}`, token),
  getByConversation: (conversationId: string, token?: string | null) =>
    hebesGet<any[]>(`sms_messages.php?conversation_id=${conversationId}`, token),
  create: (data: any, token?: string | null) => hebesPost<any>('sms_messages.php', data, token),
  update: (data: any, token?: string | null) => hebesPut<any>('sms_messages.php', data, token),
  delete: (id: string, token?: string | null) => hebesDelete<any>('sms_messages.php', id, token),
};

/**
 * Conversation Meta API
 */
export const hebesConversationMeta = {
  getAll: (token?: string | null) => hebesGet<any[]>('conversation_meta.php', token),
  getById: (id: string, token?: string | null) => hebesGet<any>(`conversation_meta.php?id=${id}`, token),
  getByContactId: (contactId: string, token?: string | null) =>
    hebesGet<any[]>(`conversation_meta.php?contact_id=${contactId}`, token),
  create: (data: any, token?: string | null) => hebesPost<any>('conversation_meta.php', data, token),
  update: (data: any, token?: string | null) => hebesPut<any>('conversation_meta.php', data, token),
  delete: (id: string, token?: string | null) => hebesDelete<any>('conversation_meta.php', id, token),
};

/**
 * Users API
 */
export const hebesUsers = {
  getAll: (token?: string | null) => hebesGet<any[]>('users.php', token),
  getById: (id: string, token?: string | null) => hebesGet<any>(`users.php?id=${id}`, token),
  getByEmail: (email: string, token?: string | null) => hebesGet<any>(`users.php?email=${encodeURIComponent(email)}`, token),
  create: (data: any, token?: string | null) => hebesPost<any>('users.php', data, token),
  update: (data: any, token?: string | null) => hebesPut<any>('users.php', data, token),
  delete: (id: string, token?: string | null) => hebesDelete<any>('users.php', id, token),
};

/**
 * Twilio API - Sync Sender Numbers
 * Calls Hebes Backend API to sync phone numbers from Twilio
 */
export async function hebesSyncSenderNumbers(
  accountId: string,
  token?: string | null
): Promise<{
  success: boolean;
  data: {
    summary: {
      fetched_from_twilio: number;
      inserted: number;
      updated: number;
      skipped: number;
      deactivated: number;
    };
    details: {
      inserted: string[];
      updated: string[];
      skipped: string[];
      deactivated: string[];
    };
    list: any[];
  };
}> {
  const url = `${HEBES_TWILIO_API_BASE}/sender_numbers_sync.php`;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ account_id: accountId }),
  });

  const responseText = await response.text();
  let result: any;
  
  try {
    result = JSON.parse(responseText);
  } catch (parseError) {
    throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}`);
  }

  if (!response.ok || !result.success) {
    const errorMessage = typeof result.data === 'string' 
      ? result.data 
      : (result.data ? JSON.stringify(result.data) : `HTTP ${response.status}`);
    throw new Error(errorMessage);
  }

  return result;
}

/**
 * Twilio API - Send SMS
 * Calls Hebes Backend API to send SMS via Twilio
 */
export async function hebesSendSMS(
  data: {
    account_id: string;
    to_number: string;
    from_number?: string;
    body: string;
    media_urls?: string[];
    messaging_service_sid?: string;
    conversation_sid?: string;
    sender_phone_number_id?: string;
    metadata?: Record<string, any>;
  },
  token?: string | null
): Promise<{
  success: boolean;
  data: {
    request: {
      endpoint: string;
      fields: Record<string, any>;
    };
    twilio_response: {
      http_code: number;
      parsed: {
        sid: string;
        status: string;
        date_created: string;
      };
    };
    local_message: any;
  };
}> {
  const url = `${HEBES_TWILIO_API_BASE}/send_sms.php`;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  const responseText = await response.text();
  let result: any;
  
  try {
    result = JSON.parse(responseText);
  } catch (parseError) {
    throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}`);
  }

  if (!response.ok || !result.success) {
    const errorMessage = typeof result.data === 'string' 
      ? result.data 
      : (result.data ? JSON.stringify(result.data) : `HTTP ${response.status}`);
    throw new Error(errorMessage);
  }

  return result;
}

