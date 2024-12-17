const api = {
  request: async (endpoint: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token');
    
    console.log('[API] Making request to:', endpoint);
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

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: finalHeaders,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API] Error ${response.status}:`, errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    return response.json();
  }
}; 