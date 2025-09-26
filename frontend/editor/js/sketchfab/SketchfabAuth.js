/**
 * Sketchfab OAuth 2.0 Authentication Handler
 * Manages OAuth flow for Sketchfab API access
 */

import { SketchfabAPI } from './SketchfabAPI.js';

class SketchfabAuth {

	constructor() {

		this.clientId = 'UgSa28CamwcPrTFJJz9mvkewOvKmVSaQKfvwp6yR';
		// Use exact registered redirect URIs (no trailing slash)
		if (this.isDevelopment()) {
			// NOTE: This URI must be registered with Sketchfab OAuth app settings
			// Using port 3001 as it appears to be the registered redirect URI
			this.redirectUri = 'http://localhost:3001/auth/sketchfab/callback';
		} else {
			this.redirectUri = 'https://api.triber.space/auth/sketchfab/callback';
		}
		this.authBaseUrl = 'https://sketchfab.com/oauth2/authorize';
		// tokenUrl removed since we handle token exchange via backend

		this.api = new SketchfabAPI();
		this.authWindow = null;
		this.authCallbacks = [];

		// Check for OAuth redirect on page load
		this.checkOAuthRedirect();

	}

	/**
	 * Check if the current page load is an OAuth redirect
	 */
	checkOAuthRedirect() {

		const hash = window.location.hash;
		const urlParams = new URLSearchParams( hash.substring( 1 ) );

		// Check if this is a callback from our OAuth handler
		if ( urlParams.has( 'sketchfab_auth' ) ) {

			if ( urlParams.has( 'access_token' ) ) {

				const accessToken = urlParams.get( 'access_token' );
				const expiresIn = parseInt( urlParams.get( 'expires_in' ) ) || 3600;

				this.handleAuthSuccess( accessToken, expiresIn );

			} else if ( urlParams.has( 'error' ) ) {

				const error = urlParams.get( 'error' );
				const errorDescription = urlParams.get( 'error_description' );

				this.handleAuthError( new Error( `OAuth error: ${error} - ${errorDescription}` ) );

			}

			// Clean up URL
			history.replaceState( {}, document.title, window.location.pathname );

		}

	}

	/**
	 * Start OAuth authentication flow
	 */
	authenticate() {

		return new Promise( ( resolve, reject ) => {

			// Store callback for later execution
			this.authCallbacks.push( { resolve, reject } );

			if ( this.api.isAuthenticated ) {

				this.executeCallbacks( null, this.api );
				return;

			}

			const params = new URLSearchParams( {
				response_type: 'code',
				client_id: this.clientId,
				redirect_uri: this.redirectUri,
				scope: 'read',
				state: this.generateState()
			} );

			const authUrl = `${this.authBaseUrl}?${params.toString()}`;

			// For development, redirect in same window
			// In production, consider using popup window
			if ( this.isDevelopment() ) {

				window.location.href = authUrl;

			} else {

				this.openAuthPopup( authUrl );

			}

		} );

	}

	/**
	 * Open authentication in popup window
	 */
	openAuthPopup( authUrl ) {

		const width = 600;
		const height = 700;
		const left = window.screenX + ( window.outerWidth - width ) / 2;
		const top = window.screenY + ( window.outerHeight - height ) / 2;

		this.authWindow = window.open(
			authUrl,
			'sketchfab-auth',
			`width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
		);

		// Poll for popup closure or message
		const pollTimer = setInterval( () => {

			try {

				if ( this.authWindow.closed ) {

					clearInterval( pollTimer );
					this.handleAuthError( new Error( 'Authentication cancelled by user' ) );

				}

			} catch ( error ) {

				// Cross-origin restriction, continue polling

			}

		}, 1000 );

		// Listen for messages from popup
		const messageHandler = ( event ) => {

			if ( event.origin !== window.location.origin ) return;

			if ( event.data.type === 'sketchfab-auth-success' ) {

				clearInterval( pollTimer );
				window.removeEventListener( 'message', messageHandler );
				this.authWindow.close();

				this.handleAuthSuccess( event.data.accessToken, event.data.expiresIn );

			} else if ( event.data.type === 'sketchfab-auth-error' ) {

				clearInterval( pollTimer );
				window.removeEventListener( 'message', messageHandler );
				this.authWindow.close();

				this.handleAuthError( new Error( event.data.error ) );

			}

		};

		window.addEventListener( 'message', messageHandler );

	}

	/**
	 * Handle successful authentication
	 */
	handleAuthSuccess( accessToken, expiresIn ) {

		this.api.storeToken( accessToken, expiresIn );
		this.executeCallbacks( null, this.api );

	}

	/**
	 * Handle authentication error
	 */
	handleAuthError( error ) {

		this.executeCallbacks( error, null );

	}

	/**
	 * Execute pending authentication callbacks
	 */
	executeCallbacks( error, result ) {

		this.authCallbacks.forEach( callback => {

			if ( error ) {

				callback.reject( error );

			} else {

				callback.resolve( result );

			}

		} );

		this.authCallbacks = [];

	}

	/**
	 * Generate random state for OAuth security
	 */
	generateState() {

		return Math.random().toString( 36 ).substring( 2, 15 ) +
			   Math.random().toString( 36 ).substring( 2, 15 );

	}

	/**
	 * Check if running in development mode
	 */
	isDevelopment() {

		return window.location.hostname === 'localhost' ||
			   window.location.hostname === '127.0.0.1' ||
			   window.location.hostname === '0.0.0.0';

	}

	/**
	 * Sign out user
	 */
	signOut() {

		this.api.clearStoredToken();

		// Notify any listeners
		window.dispatchEvent( new CustomEvent( 'sketchfab-auth-changed', {
			detail: { authenticated: false }
		} ) );

	}

	/**
	 * Get current authentication status
	 */
	isAuthenticated() {

		return this.api.isAuthenticated;

	}

	/**
	 * Get API instance
	 */
	getAPI() {

		return this.api;

	}

}

export { SketchfabAuth };