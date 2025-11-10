// Use Next.js API routes instead of Supabase Edge Function
const BASE_URL = '/api';

interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
  token?: string | null;
}

// Get token from localStorage (client-side only)
export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export async function apiRequest(
  endpoint: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { params, token, ...fetchOptions } = options;
  
  let url = `${BASE_URL}${endpoint}`;
  
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  // Get token from options or localStorage
  const authToken = token !== undefined ? token : getStoredToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  // Add Authorization header if token exists
  if (authToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    return response;
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error);
    throw error;
  }
}

export async function apiGet(endpoint: string, token?: string | null): Promise<any> {
  const response = await apiRequest(endpoint, { method: 'GET', token });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.details || errorData.error || `Request failed with status ${response.status}`;
    console.error(`API GET ${endpoint} failed:`, errorMessage, errorData);
    throw new Error(errorMessage);
  }
  
  return response.json();
}

export async function apiPost(endpoint: string, data: any, token?: string | null): Promise<any> {
  const response = await apiRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
    token,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    // Combine error and details if both exist, otherwise use whichever is available
    let errorMessage = errorData.error || `Request failed with status ${response.status}`;
    if (errorData.details && errorData.details !== errorData.error) {
      errorMessage = `${errorMessage}: ${errorData.details}`;
    }
    console.error(`API POST ${endpoint} failed:`, errorMessage, errorData);
    throw new Error(errorMessage);
  }
  
  return response.json();
}

export async function apiPut(endpoint: string, data: any, token?: string | null): Promise<any> {
  const response = await apiRequest(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
    token,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    // Combine error and details if both exist, otherwise use whichever is available
    let errorMessage = errorData.error || errorData.details || `Request failed with status ${response.status}`;
    if (errorData.details && errorData.details !== errorData.error) {
      errorMessage = `${errorMessage}: ${errorData.details}`;
    }
    if (errorData.hebesApiError && errorData.hebesApiError !== errorData.details) {
      errorMessage = `${errorMessage} (Hebes API: ${errorData.hebesApiError})`;
    }
    console.error(`API PUT ${endpoint} failed:`, errorMessage, errorData);
    throw new Error(errorMessage);
  }
  
  return response.json();
}

export async function apiDelete(endpoint: string, token?: string | null): Promise<any> {
  const response = await apiRequest(endpoint, {
    method: 'DELETE',
    token,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.details || 'Request failed');
  }
  
  return response.json();
}

// Check if the server is healthy
export async function checkServerHealth(): Promise<boolean> {
  try {
    const response = await apiRequest('/health', { method: 'GET' });
    return response.ok;
  } catch (error) {
    console.error('Server health check failed:', error);
    return false;
  }
}

// Send SMS using Next.js Twilio API route (new method with Twilio SDK)
export async function sendSMSWithTwilioSDK(data: {
  to: string;
  from: string;
  message: string;
  senderPhoneNumberId: string;
}): Promise<any> {
  const response = await fetch('/api/twilio/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.details || 'Failed to send SMS');
  }

  return response.json();
}

// Send SMS using Hebes PHP API (send_sms.php)
export async function sendSMSViaHebesPHP(data: {
  to_number: string;
  from_number: string;
  body: string;
  account_id: string;
  media_urls?: string[];
  messaging_service_sid?: string;
  metadata?: Record<string, any>;
}, token?: string | null): Promise<any> {
  const HEBES_API_BASE = process.env.NEXT_PUBLIC_HEBES_API_BASE || 
    'https://admin.hebesbychloe.com/wp-content/themes/flatsome-child/backend-dfcflow/twilio';
  
  const url = `${HEBES_API_BASE}/send_sms.php`;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  // Send account_id in body
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