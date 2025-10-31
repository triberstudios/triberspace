/**
 * AuthChecker
 * Checks if user is authenticated via Better Auth session cookies
 */

const API_URL = 'http://localhost:3001';

class AuthChecker {
	constructor() {
		this.session = null;
		this.isAuthenticated = false;
	}

	/**
	 * Check if user has valid session
	 * @returns {Promise<{authenticated: boolean, session: object|null}>}
	 */
	async checkSession() {
		try {
			const response = await fetch(`${API_URL}/api/auth/get-session`, {
				method: 'GET',
				credentials: 'include', // Include cookies
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (response.ok) {
				const data = await response.json();

				// Better Auth returns session in specific format
				if (data && data.user && data.session) {
					this.session = data;
					this.isAuthenticated = true;

					console.log('✅ Authenticated as:', data.user.email || data.user.username);

					return {
						authenticated: true,
						session: data
					};
				}
			}

			// Not authenticated or session expired
			this.session = null;
			this.isAuthenticated = false;

			console.log('❌ Not authenticated');

			return {
				authenticated: false,
				session: null
			};

		} catch (error) {
			console.error('Auth check failed:', error);
			this.session = null;
			this.isAuthenticated = false;

			return {
				authenticated: false,
				session: null
			};
		}
	}

	/**
	 * Get current session data
	 * @returns {object|null}
	 */
	getSession() {
		return this.session;
	}

	/**
	 * Get current user data
	 * @returns {object|null}
	 */
	getUser() {
		return this.session?.user || null;
	}
}

export { AuthChecker };
