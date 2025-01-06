export const API_KEYS = {
  GOOGLE_PLACES_API_KEY: process.env.GOOGLE_PLACES_API_KEY,
  YELP_API_KEY: process.env.YELP_API_KEY,
  TRIPADVISOR_API_KEY: process.env.TRIPADVISOR_API_KEY,
} as const;

// Validate required API keys
const missingKeys = Object.entries(API_KEYS)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingKeys.length > 0) {
  console.warn(
    'Warning: Some API keys are missing. Review import functionality may be limited:',
    missingKeys.join(', ')
  );
} 