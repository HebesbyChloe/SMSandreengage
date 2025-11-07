// Use Next.js API routes instead of Supabase Edge Function
const BASE_URL = '/api';

interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
  token?: string | null;
}

// Get token from localStorage (client-side only)
function getStoredToken(): string | null {
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
    throw new Error(errorData.error || errorData.details || 'Request failed');
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
