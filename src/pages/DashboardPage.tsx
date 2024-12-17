const fetchTestimonials = async () => {
  try {
    // Add error handling and logging
    const response = await api.request('/api/testimonials');
    if (!response) {
      throw new Error('No response from testimonials endpoint');
    }
    return response;
  } catch (error) {
    console.error('[Dashboard] Testimonials fetch error:', error);
    throw error;
  }
};

const fetchStats = async () => {
  try {
    // Add error handling and logging
    const response = await api.request('/api/stats');
    if (!response) {
      throw new Error('No response from stats endpoint');
    }
    return response;
  } catch (error) {
    console.error('[Dashboard] Stats fetch error:', error);
    throw error;
  }
}; 