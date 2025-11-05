/**
 * Sketchfab Browser UI Component
 * Provides search, preview, and import interface for Sketchfab models
 */

// Note: Converting to native DOM elements for clean modal implementation
import { SketchfabAuth } from './SketchfabAuth.js';
import { SketchfabLoader } from './SketchfabLoader.js';

function SketchfabBrowser( editor ) {

	const strings = editor.strings;
	const auth = new SketchfabAuth();
	const loader = new SketchfabLoader( editor );

	// Pagination configuration
	const PAGE_SIZE = 24;

	let currentResults = [];
	let currentPage = 1;
	let isLoading = false;
	let lastSearchQuery = ''; // Track search query changes
	let nextCursor = null; // Store cursor for next page
	let hasMorePages = false; // Track if there are more pages available

	const container = document.createElement( 'div' );
	container.className = 'sketchfab-modal-content';
	container.id = 'sketchfab-browser';

	// Top header - title only (close button handled by modal container)
	const topHeader = document.createElement( 'div' );
	topHeader.className = 'top-header';

	const title = document.createElement( 'h2' );
	title.className = 'title';
	title.textContent = 'Sketchfab browser';

	topHeader.appendChild( title );
	container.appendChild( topHeader );

	// Controls header - category filters and search controls
	const controlsHeader = document.createElement( 'div' );
	controlsHeader.className = 'controls-header';

	// Left side - category filters
	const categoryFilters = document.createElement( 'div' );
	categoryFilters.className = 'category-filters';

	const categories = [
		{ key: 'galleries', label: 'Galleries', searchTerm: 'Art galleries' },
		{ key: 'buildings', label: 'Buildings', searchTerm: 'building' },
		{ key: 'outdoors', label: 'Outdoors', searchTerm: 'outdoor environment' }
	];

	let activeCategory = 'galleries';

	categories.forEach( category => {
		const btn = document.createElement( 'button' );
		btn.className = `category-btn ${category.key === activeCategory ? 'active' : ''}`;
		btn.textContent = category.label;
		btn.dataset.category = category.key;

		btn.addEventListener( 'click', function() {
			// Update active category
			activeCategory = category.key;

			// Update button states
			categoryFilters.querySelectorAll( '.category-btn' ).forEach( b => {
				b.classList.remove( 'active' );
			});
			btn.classList.add( 'active' );

			// Set search input to the category's search term and perform search
			searchInput.value = category.searchTerm;
			performSearch();
		});

		categoryFilters.appendChild( btn );
	});

	// Right side - search controls (using native DOM to avoid UI framework conflicts)
	const searchControls = document.createElement( 'div' );
	searchControls.className = 'search-controls';

	// Sort select
	const sortSelect = document.createElement( 'select' );
	sortSelect.className = 'sort-select';

	const sortOptions = {
		'-likeCount': 'Most liked',
		'-viewCount': 'Most viewed',
		'-publishedAt': 'Most recent',
		'name': 'Name A-Z'
	};

	Object.entries( sortOptions ).forEach( ( [ value, label ] ) => {
		const option = document.createElement( 'option' );
		option.value = value;
		option.textContent = label;
		sortSelect.appendChild( option );
	} );

	sortSelect.addEventListener( 'change', function() {
		performSearch();
	} );

	// Search input with icon
	const searchInputWrapper = document.createElement( 'div' );
	searchInputWrapper.className = 'search-input-wrapper';

	const searchInput = document.createElement( 'input' );
	searchInput.type = 'text';
	searchInput.className = 'search-input';
	searchInput.placeholder = 'Search models...';
	searchInput.addEventListener( 'keyup', function ( event ) {
		if ( event.keyCode === 13 ) { // Enter key
			performSearch();
		}
	} );

	const searchIcon = document.createElement( 'span' );
	searchIcon.className = 'search-icon';
	searchIcon.innerHTML = '🔍';

	searchInputWrapper.appendChild( searchInput );
	searchInputWrapper.appendChild( searchIcon );

	searchControls.appendChild( sortSelect );
	searchControls.appendChild( searchInputWrapper );

	controlsHeader.appendChild( categoryFilters );
	controlsHeader.appendChild( searchControls );

	container.appendChild( controlsHeader );

	// Authentication Section
	const authSection = document.createElement( 'div' );
	authSection.className = 'auth-section';

	const authStatus = document.createElement( 'p' );
	authStatus.className = 'auth-status';

	const authButton = document.createElement( 'button' );
	authButton.textContent = 'Sign in to Sketchfab';
	authButton.addEventListener( 'click', handleAuthClick );

	authSection.appendChild( authStatus );
	authSection.appendChild( document.createElement( 'br' ) );
	authSection.appendChild( authButton );

	container.appendChild( authSection );

	// Results Section
	const resultsSection = document.createElement( 'div' );
	resultsSection.className = 'results-section';
	resultsSection.style.display = 'none';

	const resultsList = document.createElement( 'div' );
	resultsList.className = 'results-list';

	resultsSection.appendChild( resultsList );

	container.appendChild( resultsSection );

	// Infinite scroll setup
	resultsSection.addEventListener( 'scroll', function() {
		const scrollTop = resultsSection.scrollTop;
		const scrollHeight = resultsSection.scrollHeight;
		const clientHeight = resultsSection.clientHeight;

		// Load more when near the bottom (within 100px)
		if ( scrollTop + clientHeight >= scrollHeight - 100 && hasMorePages && !isLoading ) {
			loadMoreResults();
		}
	} );

	// Loading indicator
	const loadingIndicator = document.createElement( 'div' );
	loadingIndicator.className = 'loading-indicator';
	loadingIndicator.style.display = 'none';

	const loadingText = document.createElement( 'span' );
	loadingText.textContent = 'Loading...';
	loadingIndicator.appendChild( loadingText );

	container.appendChild( loadingIndicator );

	// Initialize authentication status
	updateAuthStatus();

	// Authentication event handlers
	function handleAuthClick() {

		if ( auth.isAuthenticated() ) {

			auth.signOut();
			updateAuthStatus();

		} else {

			authButton.disabled = true;
			authButton.textContent = 'Signing in...';

			auth.authenticate()
				.then( () => {

					updateAuthStatus();

				} )
				.catch( error => {

					authButton.disabled = false;
					authButton.textContent = 'Sign in to Sketchfab';

				} );

		}

	}

	function updateAuthStatus() {

		if ( auth.isAuthenticated() ) {

			authSection.style.display = 'none'; // Hide the entire auth section when signed in

			// Show controls header
			controlsHeader.style.display = 'block';

			// Set default search term and load initial results
			const defaultCategory = categories.find( cat => cat.key === activeCategory );
			if ( defaultCategory ) {
				searchInput.value = defaultCategory.searchTerm;
			}
			performSearch();

		} else {

			authStatus.textContent = 'Sign in to browse and import Sketchfab models';
			authButton.textContent = 'Sign in to Sketchfab';
			authButton.disabled = false;
			authButton.style.display = 'block';
			authSection.style.display = 'block'; // Show the auth section when signed out

			// Hide controls header
			controlsHeader.style.display = 'none';
			resultsSection.style.display = 'none';

			// Reset all state when signed out
			currentResults = [];
			currentPage = 1;
			hasMorePages = false;
			isLoading = false;

		}

	}

	// Search functionality
	async function performSearch( page = 1 ) {

		page = validatePageParam( page );

		if ( ! auth.isAuthenticated() ) {
			return;
		}

		resetStateForNewSearch( page );

		isLoading = true;
		showLoading( true );

		try {

			const api = auth.getAPI();
			const searchOptions = buildSearchOptions( page );
			const query = searchInput.value;

			const response = await api.searchModels( query, searchOptions );

			handleSearchResponse( response, page === 1 );

		} catch ( error ) {

			displayError( error.message );

		} finally {

			isLoading = false;
			showLoading( false );

		}

	}

	// Helper functions for search
	function validatePageParam( page ) {
		return ( typeof page === 'number' && !isNaN( page ) && page >= 1 ) ? page : 1;
	}

	function resetStateForNewSearch( page ) {
		if ( page === 1 ) {
			currentPage = 1;
			currentResults = [];
			hasMorePages = false;
			lastSearchQuery = searchInput.value;
			nextCursor = null;
		}
	}

	function buildSearchOptions( page ) {
		const sortBy = sortSelect.value;

		const searchOptions = {
			sortBy: sortBy,
			count: PAGE_SIZE
		};

		// Add cursor for pagination if not on page 1
		if ( page > 1 && nextCursor ) {
			searchOptions.cursor = nextCursor;
		}

		// Category filtering is now handled via search terms set in the search input

		return searchOptions;
	}

	function handleSearchResponse( response, isNewSearch = true ) {
		// Validate API response structure
		if ( ! response || typeof response !== 'object' ) {
			throw new Error( 'Invalid API response' );
		}

		const newResults = Array.isArray( response.results ) ? response.results : [];

		if ( isNewSearch ) {
			currentResults = newResults;
		} else {
			// Append new results for infinite scroll
			currentResults = currentResults.concat( newResults );
		}

		// Extract cursor information from response
		extractCursors( response );

		// Update pagination state based on response
		hasMorePages = !!response.next;

		displayResults( response, isNewSearch );
	}

	// Load more results for infinite scroll
	async function loadMoreResults() {
		if ( ! auth.isAuthenticated() || isLoading || !hasMorePages ) {
			return;
		}

		currentPage += 1;
		isLoading = true;
		showLoading( true );

		try {
			const api = auth.getAPI();
			const searchOptions = buildSearchOptions( currentPage );
			const query = searchInput.value;

			const response = await api.searchModels( query, searchOptions );
			handleSearchResponse( response, false );

		} catch ( error ) {
			console.error( 'Failed to load more results:', error );
		} finally {
			isLoading = false;
			showLoading( false );
		}
	}

	// Extract cursor values from API response
	function extractCursors( response ) {

		// Reset cursors
		nextCursor = null;

		// Extract cursor from next URL
		if ( response.next ) {
			try {
				const nextUrl = new URL( response.next );
				nextCursor = nextUrl.searchParams.get( 'cursor' );
			} catch ( e ) {
				// Ignore cursor extraction errors
			}
		}


		// Update pagination state based on response
		hasMorePages = !!response.next;

	}


	// Simplified pagination state - just ensure currentPage is set correctly
	function updatePaginationState( response, requestedPage ) {

		// Ensure requestedPage is a valid number
		if ( typeof requestedPage !== 'number' || isNaN( requestedPage ) || requestedPage < 1 ) {
			requestedPage = 1;
		}

		// Only update currentPage if it's not already set correctly
		// (it should already be set by navigatePage before the API call)
		if (currentPage !== requestedPage) {
			currentPage = requestedPage;
		}

	}

	function displayResults( response, isNewSearch = true ) {

		resultsSection.style.display = 'block';

		// Clear previous results only for new searches
		if ( isNewSearch ) {
			resultsList.innerHTML = '';
		}

		// Display models
		if ( currentResults.length === 0 && isNewSearch ) {

			const noResults = document.createElement( 'p' );
			noResults.className = 'no-results';
			noResults.textContent = 'No models found. Try adjusting your search terms.';
			resultsList.appendChild( noResults );

		} else {

			// For new search, display all results; for infinite scroll, only display new results
			const resultsToDisplay = isNewSearch ? currentResults : response.results;

			resultsToDisplay.forEach( ( model, index ) => {

				const modelItem = createModelItem( model );
				resultsList.appendChild( modelItem );

			} );

		}

	}

	function createModelItem( model ) {

		const item = document.createElement( 'div' );
		item.className = 'model-item';

		// Model thumbnail
		const thumbnail = document.createElement( 'img' );
		thumbnail.className = 'model-thumbnail';
		thumbnail.src = model.thumbnails ? model.thumbnails.images[ 0 ].url : '';
		thumbnail.alt = model.name;

		item.appendChild( thumbnail );

		// Model info container
		const info = document.createElement( 'div' );
		info.className = 'model-info';

		// Model content (text info)
		const content = document.createElement( 'div' );
		content.className = 'model-content';

		const name = document.createElement( 'h3' );
		name.className = 'model-name';
		name.textContent = model.name;

		const author = document.createElement( 'p' );
		author.className = 'model-author';
		author.textContent = `by ${model.user.displayName}`;

		const license = document.createElement( 'p' );
		license.className = 'model-license';
		license.textContent = model.license ? model.license.label : 'Unknown License';

		const stats = document.createElement( 'p' );
		stats.className = 'model-stats';
		stats.textContent = `❤ ${model.likeCount} 👁 ${model.viewCount}`;

		content.appendChild( name );
		content.appendChild( author );
		content.appendChild( license );
		content.appendChild( stats );

		// Import button
		const importButton = document.createElement( 'button' );
		importButton.className = 'import-button';
		importButton.textContent = 'Import';
		importButton.addEventListener( 'click', () => importModel( model ) );

		info.appendChild( content );
		info.appendChild( importButton );

		item.appendChild( info );

		return item;

	}

	async function importModel( model ) {

		try {

			const api = auth.getAPI();

			// Request download
			const downloadData = await api.requestDownload( model.uid );

			if ( ! downloadData.gltf || ! downloadData.gltf.url ) {

				throw new Error( 'Model download not available' );

			}

			// Load the model
			await loader.loadModel( downloadData, model, ( progress ) => {

				// Progress feedback could be added here

			} );


		} catch ( error ) {

			let errorMessage = error.message;
			if (error.message.includes('405')) {
				errorMessage = 'This model is not available for download. Please try a different model.';
			} else if (error.message.includes('401') || error.message.includes('Authentication')) {
				errorMessage = 'Authentication expired. Please sign in again.';
			} else if (error.message.includes('Model download not available')) {
				errorMessage = 'This model does not allow downloads. Please try a different model.';
			}

			alert( `Failed to import model: ${errorMessage}` );

		}

	}


	function displayError( message ) {

		resultsList.innerHTML = '';

		const errorText = document.createElement( 'p' );
		errorText.className = 'error-message';
		errorText.textContent = `Error: ${message}`;
		resultsList.appendChild( errorText );

		resultsSection.style.display = 'block';

		// Reset loading state
		isLoading = false;

	}

	function showLoading( show ) {

		loadingIndicator.style.display = show ? 'block' : 'none';

	}

	// Public API
	return {

		container: container,

		show: function () {

			container.style.display = 'block';

		},

		hide: function () {

			container.style.display = 'none';

		},

		toggle: function () {

			const isVisible = container.style.display !== 'none';
			container.style.display = isVisible ? 'none' : 'block';

		},

		destroy: function () {

			// Clean up any event listeners or resources
			currentResults = [];
			currentPage = 1;
			hasMorePages = false;
			isLoading = false;

		}

	};

}

export { SketchfabBrowser };