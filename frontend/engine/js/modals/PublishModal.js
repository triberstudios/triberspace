/**
 * PublishModal - Two-step modal for publishing experiences
 * Step 1: Form (name, description, world tags)
 * Step 2: Success/Share view with social buttons
 */

class PublishModal {
	constructor( editor ) {
		this.editor = editor;
		this.isOpen = false;
		this.currentState = 'form'; // 'form' or 'success'

		this.formData = {
			name: '',
			description: '',
			worlds: [] // Array of selected world objects { id, slug, name }
		};

		this.init();
	}

	init() {
		// Create modal HTML structure
		this.createModalElements();

		// Attach event listeners
		this.attachEventListeners();

		// Add to DOM
		document.body.appendChild( this.overlay );
	}

	createModalElements() {
		// Overlay
		this.overlay = document.createElement( 'div' );
		this.overlay.className = 'publish-modal-overlay';
		this.overlay.style.display = 'none';

		// Modal container
		this.modal = document.createElement( 'div' );
		this.modal.className = 'publish-modal';

		// Close button (X)
		this.closeButton = document.createElement( 'button' );
		this.closeButton.className = 'publish-modal-close';
		this.closeButton.innerHTML = '&times;';
		this.closeButton.setAttribute( 'aria-label', 'Close' );

		// Content container (will switch between form and success)
		this.content = document.createElement( 'div' );
		this.content.className = 'publish-modal-content';

		// Create both views
		this.formView = this.createFormView();
		this.successView = this.createSuccessView();

		// Add form view initially
		this.content.appendChild( this.formView );

		// Assemble modal
		this.modal.appendChild( this.closeButton );
		this.modal.appendChild( this.content );
		this.overlay.appendChild( this.modal );
	}

	createFormView() {
		const view = document.createElement( 'div' );
		view.className = 'publish-modal-form';

		// Header
		const header = document.createElement( 'h2' );
		header.className = 'publish-modal-title';
		header.textContent = 'Publish experience';
		view.appendChild( header );

		// Form
		const form = document.createElement( 'form' );
		form.className = 'publish-form';

		// Name input
		const nameGroup = document.createElement( 'div' );
		nameGroup.className = 'publish-form-group';

		const nameLabel = document.createElement( 'label' );
		nameLabel.textContent = 'Experience name';
		nameLabel.className = 'publish-form-label';

		this.nameInput = document.createElement( 'input' );
		this.nameInput.type = 'text';
		this.nameInput.className = 'publish-form-input';
		this.nameInput.placeholder = 'Enter experience name';
		this.nameInput.maxLength = 100;
		this.nameInput.required = true;

		nameGroup.appendChild( nameLabel );
		nameGroup.appendChild( this.nameInput );

		// Description textarea
		const descGroup = document.createElement( 'div' );
		descGroup.className = 'publish-form-group';

		const descLabel = document.createElement( 'label' );
		descLabel.textContent = 'Description';
		descLabel.className = 'publish-form-label';

		this.descInput = document.createElement( 'textarea' );
		this.descInput.className = 'publish-form-textarea';
		this.descInput.placeholder = 'Describe your experience...';
		this.descInput.maxLength = 500;
		this.descInput.rows = 4;

		descGroup.appendChild( descLabel );
		descGroup.appendChild( this.descInput );

		// World tags input (replaces visibility)
		const worldsGroup = document.createElement( 'div' );
		worldsGroup.className = 'publish-form-group';

		const worldsLabel = document.createElement( 'label' );
		worldsLabel.textContent = 'Worlds';
		worldsLabel.className = 'publish-form-label';

		const worldsHint = document.createElement( 'span' );
		worldsHint.className = 'publish-form-hint';
		worldsHint.textContent = 'Optionally add to worlds/categories';

		this.worldsInput = document.createElement( 'input' );
		this.worldsInput.type = 'text';
		this.worldsInput.className = 'publish-form-input';
		this.worldsInput.placeholder = 'Type to search worlds (e.g., art, music, gaming)';
		this.worldsInput.autocomplete = 'off';

		// Selected tags container
		this.worldTagsContainer = document.createElement( 'div' );
		this.worldTagsContainer.className = 'publish-world-tags';

		// Autocomplete dropdown
		this.worldSuggestions = document.createElement( 'div' );
		this.worldSuggestions.className = 'publish-world-suggestions';
		this.worldSuggestions.style.display = 'none';

		worldsGroup.appendChild( worldsLabel );
		worldsGroup.appendChild( worldsHint );
		worldsGroup.appendChild( this.worldsInput );
		worldsGroup.appendChild( this.worldTagsContainer );
		worldsGroup.appendChild( this.worldSuggestions );

		// Button group
		const buttonGroup = document.createElement( 'div' );
		buttonGroup.className = 'publish-form-buttons';

		this.cancelButton = document.createElement( 'button' );
		this.cancelButton.type = 'button';
		this.cancelButton.className = 'publish-btn publish-btn-secondary';
		this.cancelButton.textContent = 'Cancel';

		this.publishButton = document.createElement( 'button' );
		this.publishButton.type = 'submit';
		this.publishButton.className = 'publish-btn publish-btn-primary';
		this.publishButton.textContent = 'Publish experience';

		buttonGroup.appendChild( this.cancelButton );
		buttonGroup.appendChild( this.publishButton );

		// Assemble form
		form.appendChild( nameGroup );
		form.appendChild( descGroup );
		form.appendChild( worldsGroup );
		form.appendChild( buttonGroup );

		view.appendChild( form );
		this.form = form;

		return view;
	}

	createSuccessView() {
		const view = document.createElement( 'div' );
		view.className = 'publish-modal-success';

		// Success icon
		const icon = document.createElement( 'div' );
		icon.className = 'publish-success-icon';
		icon.innerHTML = `
			<svg width="64" height="64" viewBox="0 0 64 64" fill="none">
				<circle cx="32" cy="32" r="30" stroke="currentColor" stroke-width="3" fill="none"/>
				<path d="M20 32 L28 40 L44 24" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
			</svg>
		`;

		// Success title
		const title = document.createElement( 'h2' );
		title.className = 'publish-modal-title';
		title.textContent = 'Experience published!';

		// Success message
		const message = document.createElement( 'p' );
		message.className = 'publish-success-message';
		message.textContent = 'Your experience is now live and ready to share.';

		// URL section
		const urlSection = document.createElement( 'div' );
		urlSection.className = 'publish-url-section';

		const urlLabel = document.createElement( 'label' );
		urlLabel.className = 'publish-form-label';
		urlLabel.textContent = 'Experience URL';

		const urlContainer = document.createElement( 'div' );
		urlContainer.className = 'publish-url-container';

		this.urlInput = document.createElement( 'input' );
		this.urlInput.type = 'text';
		this.urlInput.className = 'publish-form-input publish-url-input';
		this.urlInput.readOnly = true;

		this.copyButton = document.createElement( 'button' );
		this.copyButton.type = 'button';
		this.copyButton.className = 'publish-btn publish-btn-copy';
		this.copyButton.textContent = 'Copy';

		urlContainer.appendChild( this.urlInput );
		urlContainer.appendChild( this.copyButton );
		urlSection.appendChild( urlLabel );
		urlSection.appendChild( urlContainer );

		// Share section
		const shareSection = document.createElement( 'div' );
		shareSection.className = 'publish-share-section';

		const shareLabel = document.createElement( 'label' );
		shareLabel.className = 'publish-form-label';
		shareLabel.textContent = 'Share on social media';

		const shareButtons = document.createElement( 'div' );
		shareButtons.className = 'publish-share-buttons';

		// Social buttons with Phosphor-style icons
		const socials = [
			{
				name: 'Instagram',
				className: 'instagram',
				icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor">
					<path d="M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160ZM176,24H80A56.06,56.06,0,0,0,24,80v96a56.06,56.06,0,0,0,56,56h96a56.06,56.06,0,0,0,56-56V80A56.06,56.06,0,0,0,176,24Zm40,152a40,40,0,0,1-40,40H80a40,40,0,0,1-40-40V80A40,40,0,0,1,80,40h96a40,40,0,0,1,40,40ZM192,76a12,12,0,1,1-12-12A12,12,0,0,1,192,76Z"/>
				</svg>`
			},
			{
				name: 'Twitter',
				className: 'twitter',
				icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor">
					<path d="M247.39,68.94A8,8,0,0,0,240,64H209.57A48.66,48.66,0,0,0,168.1,40a46.91,46.91,0,0,0-33.75,13.7A47.9,47.9,0,0,0,120,88v6.09C79.74,83.47,46.81,50.72,46.46,50.37a8,8,0,0,0-13.65,4.92c-4.31,47.79,9.57,79.77,22,98.18a110.93,110.93,0,0,0,21.88,24.2c-15.23,17.53-39.21,26.74-39.47,26.84a8,8,0,0,0-3.85,11.93c.75,1.12,3.75,5.05,11.08,8.72C53.51,229.7,65.48,232,80,232c70.67,0,129.72-54.42,135.75-124.44l29.91-29.9A8,8,0,0,0,247.39,68.94Zm-45,29.41a8,8,0,0,0-2.32,5.14C196,166.58,143.28,216,80,216c-10.56,0-18-1.4-23.22-3.08,11.51-6.25,27.56-17,37.88-32.48A8,8,0,0,0,92,169.08c-.47-.27-43.91-26.34-44-96,16,13,45.25,33.17,78.67,38.79A8,8,0,0,0,136,104V88a32,32,0,0,1,9.6-22.92A30.94,30.94,0,0,1,167.9,56c12.66.16,24.49,7.88,29.44,19.21A8,8,0,0,0,204.67,80h16Z"/>
				</svg>`
			},
			{
				name: 'Facebook',
				className: 'facebook',
				icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor">
					<path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm8,191.63V152h24a8,8,0,0,0,0-16H136V112a16,16,0,0,1,16-16h16a8,8,0,0,0,0-16H152a32,32,0,0,0-32,32v24H96a8,8,0,0,0,0,16h24v63.63a88,88,0,1,1,16,0Z"/>
				</svg>`
			},
			{
				name: 'Messages',
				className: 'messages',
				icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor">
					<path d="M216,48H40A16,16,0,0,0,24,64V224a15.85,15.85,0,0,0,9.24,14.5A16.13,16.13,0,0,0,40,240a15.89,15.89,0,0,0,10.25-3.78.69.69,0,0,0,.13-.11L82.5,208H216a16,16,0,0,0,16-16V64A16,16,0,0,0,216,48ZM40,224h0ZM216,192H82.5a16,16,0,0,0-10.3,3.75l-.12.11L40,224V64H216Z"/>
				</svg>`
			},
			{
				name: 'WhatsApp',
				className: 'whatsapp',
				icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor">
					<path d="M187.58,144.84l-32-16a8,8,0,0,0-8,.5l-14.69,9.8a40.55,40.55,0,0,1-16-16l9.8-14.69a8,8,0,0,0,.5-8l-16-32A8,8,0,0,0,104,64a40,40,0,0,0-40,40,88.1,88.1,0,0,0,88,88,40,40,0,0,0,40-40A8,8,0,0,0,187.58,144.84ZM152,176a72.08,72.08,0,0,1-72-72A24,24,0,0,1,99.29,80.46l11.48,23L101,118a8,8,0,0,0-.73,7.51,56.47,56.47,0,0,0,30.15,30.15A8,8,0,0,0,138,155l14.61-9.74,23,11.48A24,24,0,0,1,152,176ZM128,24A104,104,0,0,0,36.18,176.88L24.83,210.93a16,16,0,0,0,20.24,20.24l34.05-11.35A104,104,0,1,0,128,24Zm0,192a87.87,87.87,0,0,1-44.06-11.81,8,8,0,0,0-6.54-.67L40,216,52.47,178.6a8,8,0,0,0-.66-6.54A88,88,0,1,1,128,216Z"/>
				</svg>`
			}
		];

		socials.forEach( social => {
			const btn = document.createElement( 'button' );
			btn.type = 'button';
			btn.className = `publish-btn publish-btn-social publish-btn-${social.className}`;
			btn.innerHTML = social.icon;
			btn.setAttribute( 'data-social', social.className );
			btn.setAttribute( 'aria-label', `Share on ${social.name}` );
			btn.title = social.name;
			shareButtons.appendChild( btn );
		});

		shareSection.appendChild( shareLabel );
		shareSection.appendChild( shareButtons );

		// Done button
		const doneButtonContainer = document.createElement( 'div' );
		doneButtonContainer.className = 'publish-form-buttons';

		this.doneButton = document.createElement( 'button' );
		this.doneButton.type = 'button';
		this.doneButton.className = 'publish-btn publish-btn-primary';
		this.doneButton.textContent = 'Done';

		doneButtonContainer.appendChild( this.doneButton );

		// Assemble success view
		view.appendChild( icon );
		view.appendChild( title );
		view.appendChild( message );
		view.appendChild( urlSection );
		view.appendChild( shareSection );
		view.appendChild( doneButtonContainer );

		return view;
	}

	attachEventListeners() {
		// Close button
		this.closeButton.addEventListener( 'click', () => this.close() );

		// Overlay click (close)
		this.overlay.addEventListener( 'click', (e) => {
			if ( e.target === this.overlay ) {
				this.close();
			}
		});

		// Escape key
		document.addEventListener( 'keydown', (e) => {
			if ( e.key === 'Escape' && this.isOpen ) {
				this.close();
			}
		});

		// Form submission
		this.form.addEventListener( 'submit', (e) => {
			e.preventDefault();
			this.handlePublish();
		});

		// Cancel button
		this.cancelButton.addEventListener( 'click', () => this.close() );

		// Done button
		this.doneButton.addEventListener( 'click', () => this.close() );

		// Copy button
		this.copyButton.addEventListener( 'click', () => this.handleCopy() );

		// Social share buttons
		const socialButtons = this.successView.querySelectorAll( '[data-social]' );
		socialButtons.forEach( btn => {
			btn.addEventListener( 'click', (e) => {
				const social = e.currentTarget.getAttribute( 'data-social' );
				this.handleSocialShare( social );
			});
		});

		// World tags input - autocomplete
		this.worldsInput.addEventListener( 'input', () => this.debounce( () => this.handleWorldSearch(), 300 ) );

		// Hide suggestions when clicking outside
		document.addEventListener( 'click', (e) => {
			if ( !this.worldsInput.contains( e.target ) && !this.worldSuggestions.contains( e.target ) ) {
				this.worldSuggestions.style.display = 'none';
			}
		});
	}

	// Debounce helper
	debounce( func, wait ) {
		clearTimeout( this.debounceTimer );
		this.debounceTimer = setTimeout( func, wait );
	}

	async handleWorldSearch() {
		const query = this.worldsInput.value.trim();

		if ( query.length < 2 ) {
			this.worldSuggestions.style.display = 'none';
			return;
		}

		try {
			const response = await fetch( `http://localhost:3001/api/v1/worlds/search?q=${encodeURIComponent(query)}` );
			const data = await response.json();

			if ( data.success && data.data.worlds ) {
				this.renderWorldSuggestions( data.data.worlds, query );
			}
		} catch ( error ) {
			console.error( 'Error searching worlds:', error );
		}
	}

	renderWorldSuggestions( worlds, query ) {
		this.worldSuggestions.innerHTML = '';

		// Filter out already selected worlds
		const selectedIds = this.formData.worlds.map( w => w.id );
		const availableWorlds = worlds.filter( w => !selectedIds.includes( w.id ) );

		// Show existing worlds
		availableWorlds.forEach( world => {
			const option = document.createElement( 'div' );
			option.className = 'publish-suggestion-item';
			option.innerHTML = `
				<span class="publish-suggestion-name">${world.name}</span>
				<span class="publish-suggestion-count">${world.spaceCount || 0} spaces</span>
			`;
			option.addEventListener( 'click', () => this.selectWorld( world ) );
			this.worldSuggestions.appendChild( option );
		});

		// Show "create new" if no exact match
		const slug = this.generateSlug( query );
		const exactMatch = worlds.find( w => w.slug === slug );

		if ( !exactMatch ) {
			const createOption = document.createElement( 'div' );
			createOption.className = 'publish-suggestion-item publish-suggestion-create';
			createOption.innerHTML = `
				<span class="publish-suggestion-name">+ Create "${query}"</span>
			`;
			createOption.addEventListener( 'click', () => this.selectWorld({ name: query, slug, isNew: true }) );
			this.worldSuggestions.appendChild( createOption );
		}

		this.worldSuggestions.style.display = availableWorlds.length > 0 || !exactMatch ? 'block' : 'none';
	}

	selectWorld( world ) {
		// Add to selected worlds
		this.formData.worlds.push( world );

		// Render tags
		this.renderWorldTags();

		// Clear input and hide suggestions
		this.worldsInput.value = '';
		this.worldSuggestions.style.display = 'none';
	}

	removeWorld( worldSlug ) {
		this.formData.worlds = this.formData.worlds.filter( w => w.slug !== worldSlug );
		this.renderWorldTags();
	}

	renderWorldTags() {
		this.worldTagsContainer.innerHTML = '';

		this.formData.worlds.forEach( world => {
			const tag = document.createElement( 'div' );
			tag.className = 'publish-world-tag';
			tag.innerHTML = `
				<span>${world.name}</span>
				<button type="button" class="publish-world-tag-remove" data-slug="${world.slug}">&times;</button>
			`;

			const removeBtn = tag.querySelector( '.publish-world-tag-remove' );
			removeBtn.addEventListener( 'click', () => this.removeWorld( world.slug ) );

			this.worldTagsContainer.appendChild( tag );
		});
	}

	generateSlug( name ) {
		return name
			.toLowerCase()
			.trim()
			.replace( /[^\w\s-]/g, '' )
			.replace( /\s+/g, '-' )
			.replace( /-+/g, '-' )
			.substring( 0, 100 );
	}

	open() {
		this.isOpen = true;
		this.currentState = 'form';

		// Reset form
		this.nameInput.value = '';
		this.descInput.value = '';
		this.worldsInput.value = '';
		this.formData.worlds = [];
		this.renderWorldTags();

		// Show form view
		this.switchToFormView();

		// Show modal with animation
		this.overlay.style.display = 'flex';
		requestAnimationFrame( () => {
			this.overlay.classList.add( 'publish-modal-open' );
		});

		// Focus first input
		setTimeout( () => this.nameInput.focus(), 100 );
	}

	close() {
		this.overlay.classList.remove( 'publish-modal-open' );

		setTimeout( () => {
			this.overlay.style.display = 'none';
			this.isOpen = false;
		}, 200 );
	}

	switchToFormView() {
		this.content.innerHTML = '';
		this.content.appendChild( this.formView );
		this.currentState = 'form';
	}

	switchToSuccessView() {
		this.content.innerHTML = '';
		this.content.appendChild( this.successView );
		this.currentState = 'success';

		// Focus done button
		setTimeout( () => this.doneButton.focus(), 100 );
	}

	async handlePublish() {
		// Get form data
		this.formData.name = this.nameInput.value.trim();
		this.formData.description = this.descInput.value.trim();

		// Validate
		if ( !this.formData.name ) {
			alert( 'Please enter an experience name' );
			this.nameInput.focus();
			return;
		}

		// Show loading state
		const originalText = this.publishButton.textContent;
		this.publishButton.textContent = 'Publishing...';
		this.publishButton.disabled = true;

		try {
			// 1. Ensure worlds exist (only if worlds were selected)
			let worlds = [];
			if ( this.formData.worlds.length > 0 ) {
				const worldNames = this.formData.worlds.map( w => w.name );
				const worldsResponse = await fetch( 'http://localhost:3001/api/v1/worlds/ensure', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ worldNames })
				});

				const worldsData = await worldsResponse.json();
				if ( !worldsData.success ) {
					throw new Error( 'Failed to ensure worlds exist' );
				}

				worlds = worldsData.data.worlds;

				// Check permissions (all public worlds allow publishing for now)
				const cannotPublishTo = worlds.filter( w => !w.canPublishTo );
				if ( cannotPublishTo.length > 0 ) {
					throw new Error( `You don't have permission to publish to: ${cannotPublishTo.map(w => w.slug).join(', ')}` );
				}
			}

			// 2. Serialize scene to JSON
			const sceneData = this.editor.toJSON();
			const sceneBlob = new Blob( [JSON.stringify( sceneData )], { type: 'application/json' } );

			// 3. Get presigned URL for scene upload
			const timestamp = Date.now();
			const filename = `scene-${timestamp}.json`;

			const presignedResponse = await fetch( 'http://localhost:3001/api/v1/uploads/presigned', {
				method: 'POST',
				credentials: 'include', // Include auth cookies
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					category: 'spaces',
					entityId: 'temp',
					filename,
					fileSize: sceneBlob.size
				})
			});

			const presignedData = await presignedResponse.json();
			if ( !presignedData.success ) {
				throw new Error( 'Failed to get upload URL' );
			}

			// 4. Upload scene JSON to R2
			const uploadResponse = await fetch( presignedData.data.uploadUrl, {
				method: 'PUT',
				body: sceneBlob,
				headers: { 'Content-Type': 'application/json' }
			});

			if ( !uploadResponse.ok ) {
				throw new Error( 'Failed to upload scene data' );
			}

			// 5. Create space with worldIds (only include if worlds exist)
			const spacePayload = {
				name: this.formData.name,
				description: this.formData.description,
				spaceType: 'custom',
				sceneDataUrl: presignedData.data.cdnUrl,
				publishStatus: 'published'
			};

			// Only add worldIds if worlds were selected
			if ( worlds.length > 0 ) {
				spacePayload.worldIds = worlds.map( w => w.id );
			}

			const spaceResponse = await fetch( 'http://localhost:3001/api/v1/spaces', {
				method: 'POST',
				credentials: 'include', // Include auth cookies
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify( spacePayload )
			});

			const spaceData = await spaceResponse.json();
			if ( !spaceData.success ) {
				const errorMsg = spaceData.error?.message || 'Failed to create space';
				throw new Error( errorMsg );
			}

			// 6. Show success - Generate URL
			// Format: /s/{spaceName-publicId} for standalone spaces
			//         /w/{worldSlug}/{spaceName-publicId} for world-scoped spaces
			const spaceName = this.formData.name.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
				.replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
			const spaceSlug = `${spaceName}-${spaceData.data.space.id}`;

			let experienceUrl;
			if ( worlds.length > 0 ) {
				// World-scoped space: /w/{worldSlug}/{spaceSlug}
				const worldSlug = worlds[0].slug; // Use first world's slug
				experienceUrl = `http://localhost:3000/w/${worldSlug}/${spaceSlug}`;
			} else {
				// Standalone space: /s/{spaceSlug}
				experienceUrl = `http://localhost:3000/s/${spaceSlug}`;
			}

			this.urlInput.value = experienceUrl;
			this.switchToSuccessView();

		} catch ( error ) {
			console.error( 'Publish failed:', error );
			alert( 'Publish failed: ' + error.message );
		} finally {
			this.publishButton.textContent = originalText;
			this.publishButton.disabled = false;
		}
	}

	handleCopy() {
		const url = this.urlInput.value;

		// Copy to clipboard
		navigator.clipboard.writeText( url ).then( () => {
			// Show feedback
			const originalText = this.copyButton.textContent;
			this.copyButton.textContent = 'Copied!';
			this.copyButton.classList.add( 'publish-btn-copied' );

			setTimeout( () => {
				this.copyButton.textContent = originalText;
				this.copyButton.classList.remove( 'publish-btn-copied' );
			}, 2000 );
		}).catch( err => {
			console.error( 'Failed to copy:', err );
		});
	}

	handleSocialShare( social ) {
		const url = this.urlInput.value;
		const text = `Check out my experience: ${this.formData.name}`;

		let shareUrl;
		switch ( social ) {
			case 'instagram':
				// Instagram doesn't have a direct share URL, so we'll just open Instagram
				// In a real implementation, this would use the Instagram API or mobile share
				alert( 'Instagram sharing: Copy the URL and share it on Instagram!' );
				navigator.clipboard.writeText( url );
				return;
			case 'twitter':
				shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
				break;
			case 'facebook':
				shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
				break;
			case 'messages':
				// Use SMS share (works on mobile, opens default messaging app)
				shareUrl = `sms:?&body=${encodeURIComponent(text + ' ' + url)}`;
				break;
			case 'whatsapp':
				// WhatsApp share URL
				shareUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`;
				break;
		}

		if ( shareUrl ) {
			window.open( shareUrl, '_blank', 'width=600,height=400' );
		}
	}
}

export { PublishModal };
