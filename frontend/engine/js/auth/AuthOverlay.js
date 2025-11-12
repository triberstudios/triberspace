/**
 * AuthOverlay
 * Non-dismissible overlay that prompts user to log in
 */

// Detect environment and use correct URLs
const getUrls = () => {
	const hostname = window.location.hostname;
	const isProduction = hostname === 'engine.triber.space' || hostname.includes('pages.dev');

	return {
		frontendUrl: isProduction ? 'https://triber.space' : 'http://localhost:3000',
		editorUrl: isProduction ? 'https://engine.triber.space' : 'http://localhost:3003'
	};
};

const { frontendUrl: FRONTEND_URL, editorUrl: EDITOR_URL } = getUrls();

class AuthOverlay {
	constructor() {
		this.overlay = null;
	}

	/**
	 * Show the auth overlay
	 */
	show() {
		// Don't create multiple overlays
		if (this.overlay) return;

		// Create overlay container
		this.overlay = document.createElement('div');
		this.overlay.id = 'auth-overlay';
		this.overlay.className = 'auth-overlay';

		// Create modal card
		const modal = document.createElement('div');
		modal.className = 'auth-modal';

		// Lock icon (Phosphor)
		const icon = document.createElement('i');
		icon.className = 'ph-fill ph-lock';
		icon.style.fontSize = '48px';
		icon.style.color = '#fcfcfc';
		icon.style.marginBottom = '24px';
		icon.style.display = 'block';

		// Heading
		const heading = document.createElement('h2');
		heading.className = 'auth-heading';
		heading.textContent = 'Authentication required';

		// Description
		const description = document.createElement('p');
		description.className = 'auth-description';
		description.textContent = 'Please sign in to access the Triber Editor';

		// Login button
		const loginButton = document.createElement('button');
		loginButton.className = 'auth-button';
		loginButton.textContent = 'Sign in';

		// Handle button click
		loginButton.addEventListener('click', () => {
			// Redirect to main app sign-in with redirect back to editor
			const redirectUrl = encodeURIComponent(EDITOR_URL);
			window.location.href = `${FRONTEND_URL}/auth/sign-in?redirect=${redirectUrl}`;
		});

		// Assemble modal
		modal.appendChild(icon);
		modal.appendChild(heading);
		modal.appendChild(description);
		modal.appendChild(loginButton);

		// Assemble overlay
		this.overlay.appendChild(modal);

		// Add to document
		document.body.appendChild(this.overlay);

		// Trigger fade-in animation
		setTimeout(() => {
			this.overlay.classList.add('auth-overlay-visible');
		}, 10);

		console.log('🔒 Auth overlay shown');
	}

	/**
	 * Hide the auth overlay
	 */
	hide() {
		if (!this.overlay) return;

		this.overlay.classList.remove('auth-overlay-visible');

		// Remove after transition
		setTimeout(() => {
			if (this.overlay && this.overlay.parentNode) {
				this.overlay.parentNode.removeChild(this.overlay);
			}
			this.overlay = null;
		}, 300);

		console.log('✅ Auth overlay hidden');
	}
}

export { AuthOverlay };
