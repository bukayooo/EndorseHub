// Get the base URL based on the environment
const getBaseUrl = () => {
  const port = 3001;
  const baseURL = typeof window !== 'undefined' && window.location.hostname.includes('replit') 
    ? `https://${window.location.hostname}:${port}/api`
    : `http://0.0.0.0:${port}/api`;
  return baseURL;
};

const api = {
  request: async (endpoint: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token');
    const baseURL = getBaseUrl();
    
    console.log('[API] Making request to:', `${baseURL}${endpoint}`);
    console.log('[API] Token exists:', !!token);
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };

    const finalHeaders = {
      ...defaultHeaders,
      ...(options.headers || {})
    };

    console.log('[API] Final headers:', finalHeaders);

    const response = await fetch(`${baseURL}${endpoint}`, {
      ...options,
      headers: finalHeaders,
      credentials: 'include',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API] Error ${response.status}:`, errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    return response.json();
  }
}; 