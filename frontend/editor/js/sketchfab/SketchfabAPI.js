/**
 * Sketchfab API Client
 * Handles all API interactions with Sketchfab v3 API
 */

class SketchfabAPI {

	constructor() {

		this.baseURL = 'https://api.sketchfab.com/v3';
		this.accessToken = null;
		this.isAuthenticated = false;

		// Load stored access token on initialization
		this.loadStoredToken();

	}

	/**
	 * Load access token from localStorage
	 */
	loadStoredToken() {

		const token = localStorage.getItem( 'sketchfab_access_token' );
		const expiry = localStorage.getItem( 'sketchfab_token_expiry' );

		if ( token && expiry && Date.now() < parseInt( expiry ) ) {

			this.accessToken = token;
			this.isAuthenticated = true;

		} else {

			this.clearStoredToken();

		}

	}

	/**
	 * Store access token in localStorage
	 */
	storeToken( token, expiresIn ) {

		this.accessToken = token;
		this.isAuthenticated = true;

		localStorage.setItem( 'sketchfab_access_token', token );
		localStorage.setItem( 'sketchfab_token_expiry', ( Date.now() + ( expiresIn * 1000 ) ).toString() );

	}

	/**
	 * Clear stored token
	 */
	clearStoredToken() {

		this.accessToken = null;
		this.isAuthenticated = false;

		localStorage.removeItem( 'sketchfab_access_token' );
		localStorage.removeItem( 'sketchfab_token_expiry' );

	}

	/**
	 * Make authenticated API request
	 */
	async makeRequest( endpoint, options = {} ) {

		if ( ! this.isAuthenticated ) {

			throw new Error( 'Not authenticated with Sketchfab' );

		}

		const url = `${this.baseURL}${endpoint}`;
		const headers = {
			'Authorization': `Bearer ${this.accessToken}`,
			'Content-Type': 'application/json',
			...( options.headers || {} )
		};

		const response = await fetch( url, {
			...options,
			headers,
			mode: 'cors'
		} );

		if ( ! response.ok ) {

			if ( response.status === 401 ) {

				this.clearStoredToken();
				throw new Error( 'Authentication expired. Please log in again.' );

			}

			throw new Error( `API request failed: ${response.status} ${response.statusText}` );

		}

		return await response.json();

	}

	/**
	 * Search for models
	 */
	async searchModels( query = '', options = {} ) {

		const params = new URLSearchParams( {
			q: query,
			downloadable: 'true',
			sort_by: options.sortBy || '-likeCount',
			archives_flavours: 'true',
			...options
		} );

		return await this.makeRequest( `/search?type=models&${params.toString()}` );

	}

	/**
	 * Get model details by UID
	 */
	async getModel( uid ) {

		return await this.makeRequest( `/models/${uid}` );

	}

	/**
	 * Request download for a model
	 */
	async requestDownload( uid ) {

		return await this.makeRequest( `/models/${uid}/download`, {
			method: 'GET'
		} );

	}

	/**
	 * Get model categories
	 */
	async getCategories() {

		return await this.makeRequest( '/categories' );

	}

	/**
	 * Get user's favorites
	 */
	async getFavorites() {

		return await this.makeRequest( '/me/likes' );

	}

	/**
	 * Like a model
	 */
	async likeModel( uid ) {

		return await this.makeRequest( `/models/${uid}/likes`, {
			method: 'POST'
		} );

	}

	/**
	 * Unlike a model
	 */
	async unlikeModel( uid ) {

		return await this.makeRequest( `/models/${uid}/likes`, {
			method: 'DELETE'
		} );

	}

	/**
	 * Get current user info
	 */
	async getCurrentUser() {

		return await this.makeRequest( '/me' );

	}

}

export { SketchfabAPI };