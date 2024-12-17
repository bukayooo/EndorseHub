const fetchTestimonials = async () => {
  try {
    console.log('[Dashboard] Fetching testimonials...');
    const response = await api.get('/testimonials');
    
    // Handle wrapped responses
    if (response.data?.success === false) {
      console.error('[Dashboard] Testimonials fetch failed:', response.data.error);
      throw new Error(response.data.error || 'Failed to fetch testimonials');
    }
    
    // Unwrap success response
    const testimonials = response.data?.success === true ? response.data.data : response.data;
    console.log('[Dashboard] Testimonials fetched successfully:', {
      count: testimonials.length,
      sampleIds: testimonials.slice(0, 2).map((t: any) => t.id)
    });
    
    return testimonials;
  } catch (error) {
    console.error('[Dashboard] Testimonials fetch error:', error);
    throw error;
  }
};

const fetchStats = async () => {
  try {
    console.log('[Dashboard] Fetching stats...');
    const response = await api.get('/stats');
    
    // Handle wrapped responses
    if (response.data?.success === false) {
      console.error('[Dashboard] Stats fetch failed:', response.data.error);
      throw new Error(response.data.error || 'Failed to fetch stats');
    }
    
    // Unwrap success response
    const stats = response.data?.success === true ? response.data.data : response.data;
    console.log('[Dashboard] Stats fetched successfully:', stats);
    
    return stats;
  } catch (error) {
    console.error('[Dashboard] Stats fetch error:', error);
    throw error;
  }
}; 