/**
 * Sketchfab Integration Sidebar
 * Top-level sidebar tab for browsing and importing Sketchfab models
 */

import { UIPanel, UIText, UIInput, UIButton, UISelect, UIBreak, UIRow } from './libs/ui.js';
import { SketchfabAuth } from './sketchfab/SketchfabAuth.js';
import { SketchfabLoader } from './sketchfab/SketchfabLoader.js';

// Configuration constants
const SIDEBAR_CONFIG = {
	SEARCH_DEBOUNCE_DELAY: 500,
	MIN_SEARCH_LENGTH: 2,
	PAGE_SIZE: 12,
	THUMBNAIL_HEIGHT: 90
};

function SidebarSketchfab( editor ) {

	const strings = editor.strings;
	const auth = new SketchfabAuth();
	const loader = new SketchfabLoader( editor );

	let currentResults = [];
	let currentPage = 1;
	let totalPages = 1;
	let isLoading = false;
	let searchTimeout = null;

	// UI element references will be created below

	const container = new UIPanel();
	container.setId( 'sketchfab-sidebar' );
	container.dom.style.cssText = `
		height: 100%;
		position: relative;
	`;

	// Create main content container
	const content = new UIPanel();
	content.setClass( 'sketchfab-content' );
	content.dom.style.cssText = `
		height: calc(100% - 90px);
		overflow: hidden;
	`;

	// Create modern auth button (will be added at bottom)
	const authButton = new UIButton( 'Sign in to Sketchfab' );
	authButton.setWidth( '100%' );
	authButton.dom.style.cssText = `
		width: 100%;
		height: 44px;
		background: #4f46e5;
		border: none;
		border-radius: 8px;
		color: white;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	`;

	// Add Sketchfab icon
	authButton.dom.innerHTML = `
		<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
			<path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
		</svg>
		<span class="auth-button-text">Sign in to Sketchfab</span>
	`;

	authButton.dom.addEventListener( 'mouseenter', function () {
		if ( ! this.disabled ) {
			this.style.background = '#6366f1';
			this.style.transform = 'translateY(-1px)';
			this.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.3)';
		}
	} );

	authButton.dom.addEventListener( 'mouseleave', function () {
		if ( ! this.disabled ) {
			this.style.background = '#4f46e5';
			this.style.transform = 'translateY(0)';
			this.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
		}
	} );

	authButton.dom.addEventListener( 'click', handleAuthClick );

	// Search Section
	const searchSection = new UIPanel();
	searchSection.setClass( 'search-section' );
	searchSection.setDisplay( 'none' );
	searchSection.setPadding( '10px 0' );

	// Search input row
	const searchRow = new UIRow();
	const searchInput = new UIInput();
	searchInput.dom.placeholder = 'Search models...';
	searchInput.setWidth( '70%' );
	searchInput.dom.addEventListener( 'keyup', function ( event ) {
		if ( event.keyCode === 13 ) { // Enter key
			if ( searchTimeout ) clearTimeout( searchTimeout );
			performSearch();
		} else {
			// Debounce search for other keys
			if ( searchTimeout ) clearTimeout( searchTimeout );
			searchTimeout = setTimeout( () => {
				if ( searchInput.getValue().trim().length > SIDEBAR_CONFIG.MIN_SEARCH_LENGTH ) {
					performSearch();
				}
			}, SIDEBAR_CONFIG.SEARCH_DEBOUNCE_DELAY );
		}
	} );

	const searchButton = new UIButton( 'Search' );
	searchButton.setWidth( '25%' );
	searchButton.setMarginLeft( '5%' );
	searchButton.dom.addEventListener( 'click', performSearch );

	searchRow.add( searchInput );
	searchRow.add( searchButton );

	// Filter controls
	const filterRow1 = new UIRow();
	filterRow1.add( new UIText( 'Sort by:' ).setWidth( '30%' ) );

	const sortSelect = new UISelect();
	sortSelect.setWidth( '65%' );
	sortSelect.setOptions( {
		'-likeCount': 'Most liked',
		'-viewCount': 'Most viewed',
		'-publishedAt': 'Most recent',
		'name': 'Name A-Z'
	} );
	sortSelect.dom.addEventListener( 'change', performSearch );

	filterRow1.add( sortSelect );

	const filterRow2 = new UIRow();
	filterRow2.add( new UIText( 'License:' ).setWidth( '30%' ) );

	const licenseSelect = new UISelect();
	licenseSelect.setWidth( '65%' );
	licenseSelect.setOptions( {
		'': 'All licenses',
		'CC0': 'CC0 (Public Domain)',
		'CC BY': 'CC BY',
		'CC BY-SA': 'CC BY-SA'
	} );
	licenseSelect.dom.addEventListener( 'change', performSearch );

	filterRow2.add( licenseSelect );

	searchSection.add( searchRow );
	searchSection.add( new UIBreak() );
	searchSection.add( filterRow1 );
	searchSection.add( new UIBreak() );
	searchSection.add( filterRow2 );

	content.add( searchSection );

	// Results Section
	const resultsSection = new UIPanel();
	resultsSection.setClass( 'results-section' );
	resultsSection.setDisplay( 'none' );

	// Results header with pagination - more compact
	const resultsHeader = new UIPanel();
	resultsHeader.setClass( 'results-header' );
	resultsHeader.setPadding( '10px 0' );

	const paginationRow = new UIRow();
	const prevButton = new UIButton( '‹' );
	prevButton.setWidth( '20%' );
	prevButton.dom.addEventListener( 'click', () => navigatePage( currentPage - 1 ) );

	const pageInfo = new UIText();
	pageInfo.setClass( 'page-info' );
	pageInfo.setTextAlign( 'center' );
	pageInfo.setWidth( '60%' );
	pageInfo.setFontSize( '11px' );

	const nextButton = new UIButton( '›' );
	nextButton.setWidth( '20%' );
	nextButton.dom.addEventListener( 'click', () => navigatePage( currentPage + 1 ) );

	paginationRow.add( prevButton );
	paginationRow.add( pageInfo );
	paginationRow.add( nextButton );

	resultsHeader.add( paginationRow );

	// Results list container with scrolling
	const resultsList = new UIPanel();
	resultsList.setClass( 'results-list' );
	resultsList.dom.style.cssText = `
		height: calc(100% - 100px);
		overflow-y: auto;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 6px;
		padding: 8px;
		background: rgba(0, 0, 0, 0.1);
	`;

	resultsSection.add( resultsHeader );
	resultsSection.add( resultsList );

	content.add( resultsSection );

	// Loading indicator
	const loadingIndicator = new UIPanel();
	loadingIndicator.setClass( 'loading-indicator' );
	loadingIndicator.setDisplay( 'none' );
	loadingIndicator.setTextAlign( 'center' );
	loadingIndicator.setPadding( '20px' );

	const loadingText = new UIText( 'Loading...' );
	loadingText.setFontSize( '14px' );
	loadingIndicator.add( loadingText );

	content.add( loadingIndicator );

	container.add( content );

	// Add auth button at the bottom with better styling
	const bottomSection = new UIPanel();
	bottomSection.setClass( 'bottom-section' );
	bottomSection.dom.style.cssText = `
		position: absolute;
		bottom: 10px;
		left: 10px;
		right: 10px;
		padding: 15px 10px 10px 10px;
		margin-top: 20px;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(0, 0, 0, 0.2);
		border-radius: 0 0 6px 6px;
	`;
	bottomSection.add( authButton );

	container.add( bottomSection );

	// Initialize authentication status
	updateAuthStatus();

	// Authentication handlers
	function handleAuthClick() {
		if ( auth.isAuthenticated() ) {
			auth.signOut();
			updateAuthStatus();
		} else {
			authButton.dom.disabled = true;
			authButton.dom.style.opacity = '0.6';
			authButton.dom.style.cursor = 'not-allowed';
			const textSpan = authButton.dom.querySelector( '.auth-button-text' );
			if ( textSpan ) textSpan.textContent = 'Signing in...';

			auth.authenticate()
				.then( () => {
					updateAuthStatus();
				} )
				.catch( error => {
					authButton.dom.disabled = false;
					authButton.dom.style.opacity = '1';
					authButton.dom.style.cursor = 'pointer';
					const textSpan = authButton.dom.querySelector( '.auth-button-text' );
					if ( textSpan ) textSpan.textContent = 'Sign in to Sketchfab';
				} );
		}
	}

	function updateAuthStatus() {
		const textSpan = authButton.dom.querySelector( '.auth-button-text' );

		if ( auth.isAuthenticated() ) {
			if ( textSpan ) textSpan.textContent = 'Sign out';
			authButton.dom.disabled = false;
			authButton.dom.style.opacity = '1';
			authButton.dom.style.cursor = 'pointer';
			authButton.dom.style.background = '#dc2626'; // Red for sign out

			searchSection.setDisplay( 'block' );

			// Load initial results
			performSearch();
		} else {
			if ( textSpan ) textSpan.textContent = 'Sign in to Sketchfab';
			authButton.dom.disabled = false;
			authButton.dom.style.opacity = '1';
			authButton.dom.style.cursor = 'pointer';
			authButton.dom.style.background = '#4f46e5';

			searchSection.setDisplay( 'none' );
			resultsSection.setDisplay( 'none' );
		}
	}

	// Search functionality
	async function performSearch( page = 1 ) {
		if ( isLoading || ! auth.isAuthenticated() ) return;

		isLoading = true;
		showLoading( true );

		try {
			const api = auth.getAPI();
			const query = searchInput.getValue();
			const sortBy = sortSelect.getValue();
			const license = licenseSelect.getValue();

			const searchOptions = {
				sortBy: sortBy,
				offset: ( page - 1 ) * SIDEBAR_CONFIG.PAGE_SIZE,
				count: SIDEBAR_CONFIG.PAGE_SIZE
			};

			if ( license ) {
				searchOptions.license = license;
			}

			const response = await api.searchModels( query, searchOptions );

			currentResults = response.results || [];
			currentPage = page;
			totalPages = Math.ceil( ( response.count || 0 ) / SIDEBAR_CONFIG.PAGE_SIZE );

			displayResults( response );

		} catch ( error ) {
			displayError( error.message );
		} finally {
			isLoading = false;
			showLoading( false );
		}
	}

	function displayResults( response ) {
		resultsSection.setDisplay( 'block' );

		// Update pagination
		prevButton.dom.disabled = currentPage <= 1;
		nextButton.dom.disabled = currentPage >= totalPages;
		pageInfo.setValue( `${currentPage} / ${totalPages}` );

		// Clear previous results
		resultsList.clear();

		// Display models
		if ( currentResults.length === 0 ) {
			const noResults = new UIText( 'No models found. Try different search terms.' );
			noResults.setClass( 'no-results' );
			noResults.setTextAlign( 'center' );
			noResults.setPadding( '20px' );
			resultsList.add( noResults );
		} else {
			currentResults.forEach( model => {
				const modelItem = createModelItem( model );
				resultsList.add( modelItem );
			} );
		}
	}

	function createModelItem( model ) {
		const item = new UIPanel();
		item.setClass( 'model-item' );
		item.setPadding( '10px' );
		item.setMarginBottom( '10px' );
		item.dom.style.cssText += `
			border: 1px solid rgba(255, 255, 255, 0.1);
			border-radius: 4px;
			background: rgba(255, 255, 255, 0.05);
		`;

		// Model thumbnail
		const thumbnailContainer = new UIPanel();
		thumbnailContainer.dom.style.cssText = `
			width: 100%;
			height: ${SIDEBAR_CONFIG.THUMBNAIL_HEIGHT}px;
			background-size: cover;
			background-position: center;
			background-repeat: no-repeat;
			background-image: url('${model.thumbnails ? model.thumbnails.images[0].url : ''}');
			border-radius: 4px;
			margin-bottom: 8px;
			overflow: hidden;
		`;

		// Model info
		const infoContainer = new UIPanel();

		const name = new UIText( model.name );
		name.setClass( 'model-name' );
		name.setFontSize( '13px' );
		name.setFontWeight( 'bold' );
		name.setMarginBottom( '4px' );

		const author = new UIText( `by ${model.user.displayName}` );
		author.setClass( 'model-author' );
		author.setFontSize( '11px' );
		author.setColor( '#888' );
		author.setMarginBottom( '4px' );

		const licenseText = new UIText( model.license ? model.license.label : 'Unknown License' );
		licenseText.setFontSize( '10px' );
		licenseText.setColor( '#666' );
		licenseText.setMarginBottom( '8px' );

		// Import button
		const importButton = new UIButton( 'Import Model' );
		importButton.setWidth( '100%' );
		importButton.setClass( 'import-button' );
		importButton.dom.addEventListener( 'click', () => importModel( model ) );

		infoContainer.add( name );
		infoContainer.add( author );
		infoContainer.add( licenseText );
		infoContainer.add( importButton );

		item.add( thumbnailContainer );
		item.add( infoContainer );

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
				// Progress feedback handled by loader
			} );

		} catch ( error ) {
			let errorMessage = error.message;
			if ( error.message.includes( '405' ) ) {
				errorMessage = 'This model is not available for download.';
			} else if ( error.message.includes( '401' ) || error.message.includes( 'Authentication' ) ) {
				errorMessage = 'Authentication expired. Please sign in again.';
			} else if ( error.message.includes( 'Model download not available' ) ) {
				errorMessage = 'This model does not allow downloads.';
			}

			alert( `Failed to import model: ${errorMessage}` );
		}
	}

	function navigatePage( page ) {
		if ( page < 1 || page > totalPages || isLoading ) return;
		performSearch( page );
	}

	function displayError( message ) {
		// Always ensure loading state is properly reset
		isLoading = false;
		showLoading( false );

		resultsList.clear();

		const errorText = new UIText( `Error: ${message}` );
		errorText.setClass( 'error-message' );
		errorText.setTextAlign( 'center' );
		errorText.setPadding( '20px' );
		errorText.setColor( '#ff6b6b' );
		resultsList.add( errorText );

		// Add retry button for recoverable errors
		if ( ! message.includes( '401' ) && ! message.includes( '403' ) && ! message.includes( 'not available' ) ) {
			const retryButton = new UIButton( 'Retry' );
			retryButton.setWidth( '100px' );
			retryButton.setMarginTop( '10px' );
			retryButton.dom.addEventListener( 'click', () => {
				performSearch( currentPage );
			} );

			const retryContainer = new UIPanel();
			retryContainer.setTextAlign( 'center' );
			retryContainer.add( retryButton );
			resultsList.add( retryContainer );
		}

		resultsSection.setDisplay( 'block' );
	}

	function showLoading( show ) {
		loadingIndicator.setDisplay( show ? 'block' : 'none' );
	}

	// Add cleanup method to container
	container.dispose = function() {
		// Clear any pending search timeout
		if ( searchTimeout ) {
			clearTimeout( searchTimeout );
			searchTimeout = null;
		}

		// Dispose of loader resources
		if ( loader ) {
			loader.dispose();
		}

		// Clear results to prevent memory leaks
		currentResults = [];
	};

	return container;
}

export { SidebarSketchfab };