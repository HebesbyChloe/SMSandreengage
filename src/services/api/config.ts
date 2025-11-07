export const API_BASE_URL = 'https://admin.hebesbychloe.com/wp-content/themes/flatsome-child/backend-dfcflow/customer';

export const API_ENDPOINTS = {
  BATCHES: '/batches',
  EMPLOYEES: '/employees',
} as const;

export const fetchWithConfig = async (url: string, options?: RequestInit) => {
  const config: RequestInit = {
    mode: 'cors',
    method: options?.method || 'GET',
    ...options,
    headers: {
      'Accept': 'application/json',
      ...options?.headers,
    }
  };
  
  const response = await fetch(url, config);
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

