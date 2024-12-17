import React, { useEffect } from 'react';

const useUser = () => {
  useEffect(() => {
    const token = localStorage.getItem('token');
    console.log('[Auth] Current token:', token ? 'exists' : 'missing');
  }, []);

  // Rest of your hook code...
};

export default useUser; 