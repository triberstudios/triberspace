/**
 * Centralized API URL configuration
 * Automatically detects environment and uses correct API endpoint
 */

// Detect environment and set API URL accordingly
const getApiUrl = () => {
	// Check if we're on production domains
	const hostname = window.location.hostname;

	if (hostname === 'engine.triber.space' || hostname.includes('pages.dev')) {
		return 'https://api.triber.space';
	}

	// Default to localhost for development
	return 'http://localhost:3001';
};

export const API_URL = getApiUrl();

// Helper function to build API endpoints
export const getApiEndpoint = (path) => {
	// Ensure path starts with /
	const normalizedPath = path.startsWith('/') ? path : `/${path}`;
	return `${API_URL}${normalizedPath}`;
};
