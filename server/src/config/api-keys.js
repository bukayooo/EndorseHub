export const config = {
    GOOGLE_PLACES_API_KEY: process.env.GOOGLE_PLACES_API_KEY || '',
    YELP_API_KEY: process.env.YELP_API_KEY || '',
    TRIPADVISOR_API_KEY: process.env.TRIPADVISOR_API_KEY || ''
};
// Validate required API keys
const missingKeys = Object.entries(config)
    .filter(([_, value]) => !value)
    .map(([key]) => key);
if (missingKeys.length > 0) {
    console.warn(`Warning: Missing API keys: ${missingKeys.join(', ')}`);
}
