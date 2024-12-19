const getBaseUrl = () => {
  const hostname = window.location.hostname;
  
  if (hostname.includes('replit')) {
    return 'https://endorsehub.replit.app';
  }
  
  if (hostname === 'endorsehub.com') {
    return 'https://api.endorsehub.com';  // or whatever your production API domain will be
  }
  
  // Local development
  return process.env.REACT_APP_API_URL || 'http://localhost:3001';
};

export const API_BASE_URL = getBaseUrl();