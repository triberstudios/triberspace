/**
 * Sketchfab Browser UI Component
 * Provides search, preview, and import interface for Sketchfab models
 */

import { UIPanel, UIText, UIInput, UIButton, UISelect, UIBreak } from '../libs/ui.js';
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

	const container = new UIPanel();
	container.setClass( 'sketchfab-modal-content' );
	container.setId( 'sketchfab-browser' );

	// Header
	const header = new UIPanel();
	header.setClass( 'header' );

	const title = new UIText( 'Sketchfab Browser' );
	title.setClass( 'title' );
	header.add( title );

	container.add( header );

	// Authentication Section
	const authSection = new UIPanel();
	authSection.setClass( 'auth-section' );

	const authStatus = new UIText();
	authStatus.setClass( 'auth-status' );

	const authButton = new UIButton( 'Sign in to Sketchfab' );
	authButton.dom.addEventListener( 'click', handleAuthClick );

	authSection.add( authStatus );
	authSection.add( new UIBreak() );
	authSection.add( authButton );

	container.add( authSection );

	// Search Section
	const searchSection = new UIPanel();
	searchSection.setClass( 'search-section' );
	searchSection.setDisplay( 'none' );

	const searchInput = new UIInput( '' );
	searchInput.dom.placeholder = 'Search models...';
	searchInput.dom.addEventListener( 'keyup', function ( event ) {

		if ( event.keyCode === 13 ) { // Enter key

			performSearch();

		}

	} );

	const searchButton = new UIButton( 'Search' );
	searchButton.dom.addEventListener( 'click', function() {
		performSearch();
	} );

	const sortSelect = new UISelect();
	sortSelect.setOptions( {
		'-likeCount': 'Most liked',
		'-viewCount': 'Most viewed',
		'-publishedAt': 'Most recent',
		'name': 'Name A-Z'
	} );
	sortSelect.dom.addEventListener( 'change', function() {
		performSearch();
	} );

	const licenseSelect = new UISelect();
	licenseSelect.setOptions( {
		'': 'All licenses',
		'CC0': 'CC0 (Public Domain)',
		'CC BY': 'CC BY',
		'CC BY-SA': 'CC BY-SA'
	} );
	licenseSelect.dom.addEventListener( 'change', function() {
		performSearch();
	} );

	// Create horizontal search row container with grouped elements
	const searchRow = new UIPanel();
	searchRow.setClass( 'search-row' );

	// Add all controls directly to the row - right aligned
	searchRow.add( sortSelect );
	searchRow.add( licenseSelect );
	searchRow.add( searchInput );
	searchRow.add( searchButton );

	searchSection.add( searchRow );

	container.add( searchSection );

	// Results Section
	const resultsSection = new UIPanel();
	resultsSection.setClass( 'results-section' );
	resultsSection.setDisplay( 'none' );

	const resultsList = new UIPanel();
	resultsList.setClass( 'results-list' );

	resultsSection.add( resultsList );

	container.add( resultsSection );

	// Pagination Footer (at bottom)
	const paginationFooter = new UIPanel();
	paginationFooter.setClass( 'pagination-footer' );
	paginationFooter.setDisplay( 'block' ); // Always show, we'll control button states

	const prevButton = new UIButton( '← Previous' );
	prevButton.dom.addEventListener( 'click', function() {
		navigatePage( currentPage - 1 );
	} );

	const pageInfo = new UIText( 'Ready to search' );
	pageInfo.setClass( 'page-info' );

	const nextButton = new UIButton( 'Next →' );
	nextButton.dom.addEventListener( 'click', function() {
		navigatePage( currentPage + 1 );
	} );

	paginationFooter.add( prevButton );
	paginationFooter.add( pageInfo );
	paginationFooter.add( nextButton );

	container.add( paginationFooter );

	// Loading indicator
	const loadingIndicator = new UIPanel();
	loadingIndicator.setClass( 'loading-indicator' );
	loadingIndicator.setDisplay( 'none' );

	const loadingText = new UIText( 'Loading...' );
	loadingIndicator.add( loadingText );

	container.add( loadingIndicator );

	// Initialize authentication status and pagination controls
	updateAuthStatus();
	updatePaginationControls();

	// Authentication event handlers
	function handleAuthClick() {

		if ( auth.isAuthenticated() ) {

			auth.signOut();
			updateAuthStatus();

		} else {

			authButton.dom.disabled = true;
			authButton.dom.textContent = 'Signing in...';

			auth.authenticate()
				.then( () => {

					updateAuthStatus();

				} )
				.catch( error => {

					authButton.dom.disabled = false;
					authButton.dom.textContent = 'Sign in to Sketchfab';

				} );

		}

	}

	function updateAuthStatus() {

		if ( auth.isAuthenticated() ) {

			authSection.setDisplay( 'none' ); // Hide the entire auth section when signed in

			searchSection.setDisplay( 'block' );

			// Load initial results
			performSearch();

		} else {

			authStatus.setValue( 'Sign in to browse and import Sketchfab models' );
			authButton.dom.textContent = 'Sign in to Sketchfab';
			authButton.dom.disabled = false;
			authButton.setDisplay( 'block' );
			authSection.setDisplay( 'block' ); // Show the auth section when signed out

			searchSection.setDisplay( 'none' );
			resultsSection.setDisplay( 'none' );

			// Reset all state when signed out
			currentResults = [];
			currentPage = 1;
			hasMorePages = false;
			isLoading = false;
			updatePaginationControls();

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
			const query = searchInput.getValue();

			const response = await api.searchModels( query, searchOptions );

			handleSearchResponse( response );

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
			lastSearchQuery = searchInput.getValue();
			nextCursor = null;
		}
	}

	function buildSearchOptions( page ) {
		const sortBy = sortSelect.getValue();
		const license = licenseSelect.getValue();

		const searchOptions = {
			sortBy: sortBy,
			count: PAGE_SIZE
		};

		// Add cursor for pagination if not on page 1
		if ( page > 1 && nextCursor ) {
			searchOptions.cursor = nextCursor;
		}

		if ( license ) {
			searchOptions.license = license;
		}

		return searchOptions;
	}

	function handleSearchResponse( response ) {
		// Validate API response structure
		if ( ! response || typeof response !== 'object' ) {
			throw new Error( 'Invalid API response' );
		}

		currentResults = Array.isArray( response.results ) ? response.results : [];

		// Extract cursor information from response
		extractCursors( response );

		// Update pagination state based on response
		hasMorePages = !!response.next;

		displayResults( response );

		// Update pagination controls after all state changes
		updatePaginationControls();
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

	function displayResults( response ) {

		resultsSection.setDisplay( 'block' );

		// Clear previous results
		resultsList.clear();

		// Display models
		if ( currentResults.length === 0 ) {

			const noResults = new UIText( 'No models found. Try adjusting your search terms.' );
			noResults.setClass( 'no-results' );
			resultsList.add( noResults );

		} else {

			currentResults.forEach( ( model, index ) => {

				const modelItem = createModelItem( model );
				resultsList.add( modelItem );

			} );

		}

	}

	function createModelItem( model ) {

		const item = new UIPanel();
		item.setClass( 'model-item' );

		// Model thumbnail
		const thumbnail = document.createElement( 'img' );
		thumbnail.className = 'model-thumbnail';
		thumbnail.src = model.thumbnails ? model.thumbnails.images[ 0 ].url : '';
		thumbnail.alt = model.name;

		const thumbnailContainer = new UIPanel();
		thumbnailContainer.dom.appendChild( thumbnail );

		// Model info
		const info = new UIPanel();
		info.setClass( 'model-info' );

		const name = new UIText( model.name );
		name.setClass( 'model-name' );

		const author = new UIText( `by ${model.user.displayName}` );
		author.setClass( 'model-author' );

		const license = new UIText( model.license ? model.license.label : 'Unknown License' );
		license.setClass( 'model-license' );

		const stats = new UIText( `❤ ${model.likeCount} 👁 ${model.viewCount}` );
		stats.setClass( 'model-stats' );

		info.add( name );
		info.add( author );
		info.add( license );
		info.add( stats );

		// Import button
		const importButton = new UIButton( 'Import' );
		importButton.setClass( 'import-button' );
		importButton.dom.addEventListener( 'click', () => importModel( model ) );

		// Assemble item
		item.add( thumbnailContainer );
		item.add( info );
		item.add( importButton );

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

	// Update pagination controls (optimized)
	function updatePaginationControls() {

		// Cache DOM elements for better performance
		const prevButtonDOM = prevButton.dom;
		const nextButtonDOM = nextButton.dom;

		// Handle case when we don't have results yet
		if ( currentResults.length === 0 ) {
			prevButtonDOM.disabled = true;
			nextButtonDOM.disabled = true;
			pageInfo.setValue( currentPage === 1 ? 'Ready to search' : 'No results' );
			return;
		}

		// Calculate button states
		const prevDisabled = currentPage <= 1;
		const nextDisabled = !hasMorePages;

		// Batch DOM updates to reduce reflow
		if ( prevButtonDOM.disabled !== prevDisabled ) {
			prevButtonDOM.disabled = prevDisabled;
		}

		if ( nextButtonDOM.disabled !== nextDisabled ) {
			nextButtonDOM.disabled = nextDisabled;
		}

		// Update page info
		pageInfo.setValue( `${currentPage}` );

	}

	function navigatePage( page ) {

		// Allow navigation even during loading, but prevent rapid clicks to same page
		if ( isLoading && page === currentPage ) {
			return;
		}

		// Basic validation
		if ( page < 1 ) {
			return;
		}

		if ( page === currentPage ) {
			return;
		}

		// Block navigation to next page if we know there are no more pages
		if ( page > currentPage && !hasMorePages ) {
			return;
		}

		// Update current page IMMEDIATELY before loading starts
		currentPage = page;
		isLoading = true;
		updatePaginationControls();

		performSearch( page );

	}

	function displayError( message ) {

		resultsList.clear();

		const errorText = new UIText( `Error: ${message}` );
		errorText.setClass( 'error-message' );
		resultsList.add( errorText );

		resultsSection.setDisplay( 'block' );

		// Reset loading state
		isLoading = false;
		updatePaginationControls();

	}

	function showLoading( show ) {

		loadingIndicator.setDisplay( show ? 'block' : 'none' );

	}

	// Public API
	return {

		container: container,

		show: function () {

			container.setDisplay( 'block' );

		},

		hide: function () {

			container.setDisplay( 'none' );

		},

		toggle: function () {

			const isVisible = container.dom.style.display !== 'none';
			container.setDisplay( isVisible ? 'none' : 'block' );

		},

		destroy: function () {

			// Clean up any event listeners or resources
			currentResults = [];
			currentPage = 1;
			totalPages = 0;
			isLoading = false;

		}

	};

}

export { SketchfabBrowser };