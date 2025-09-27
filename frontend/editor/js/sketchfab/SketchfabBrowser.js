/**
 * Sketchfab Browser UI Component
 * Provides search, preview, and import interface for Sketchfab models
 */

import { UIPanel, UIRow, UIText, UIInput, UIButton, UISelect, UIBreak } from '../libs/ui.js';
import { SketchfabAuth } from './SketchfabAuth.js';
import { SketchfabLoader } from './SketchfabLoader.js';

function SketchfabBrowser( editor ) {

	const strings = editor.strings;
	const auth = new SketchfabAuth();
	const loader = new SketchfabLoader( editor );

	let currentResults = [];
	let currentPage = 1;
	let totalPages = 1;
	let isLoading = false;

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

	const searchInput = new UIInput();
	searchInput.dom.placeholder = 'Search models...';
	searchInput.dom.addEventListener( 'keyup', function ( event ) {

		if ( event.keyCode === 13 ) { // Enter key

			performSearch();

		}

	} );

	const searchButton = new UIButton( 'Search' );
	searchButton.dom.addEventListener( 'click', performSearch );

	const sortSelect = new UISelect();
	sortSelect.setOptions( {
		'-likeCount': 'Most liked',
		'-viewCount': 'Most viewed',
		'-publishedAt': 'Most recent',
		'name': 'Name A-Z'
	} );
	sortSelect.dom.addEventListener( 'change', performSearch );

	const licenseSelect = new UISelect();
	licenseSelect.setOptions( {
		'': 'All licenses',
		'CC0': 'CC0 (Public Domain)',
		'CC BY': 'CC BY',
		'CC BY-SA': 'CC BY-SA'
	} );
	licenseSelect.dom.addEventListener( 'change', performSearch );

	searchSection.add( new UIText( 'Search' ).setClass( 'section-title' ) );
	searchSection.add( searchInput );
	searchSection.add( searchButton );
	searchSection.add( new UIBreak() );
	searchSection.add( new UIText( 'Sort by' ) );
	searchSection.add( sortSelect );
	searchSection.add( new UIBreak() );
	searchSection.add( new UIText( 'License' ) );
	searchSection.add( licenseSelect );

	container.add( searchSection );

	// Results Section
	const resultsSection = new UIPanel();
	resultsSection.setClass( 'results-section' );
	resultsSection.setDisplay( 'none' );

	const resultsHeader = new UIPanel();
	resultsHeader.setClass( 'results-header' );

	const resultsInfo = new UIText();
	resultsInfo.setClass( 'results-info' );

	const prevButton = new UIButton( '← Previous' );
	prevButton.dom.addEventListener( 'click', () => navigatePage( currentPage - 1 ) );

	const nextButton = new UIButton( 'Next →' );
	nextButton.dom.addEventListener( 'click', () => navigatePage( currentPage + 1 ) );

	const pageInfo = new UIText();
	pageInfo.setClass( 'page-info' );

	resultsHeader.add( resultsInfo );
	resultsHeader.add( new UIBreak() );
	resultsHeader.add( prevButton );
	resultsHeader.add( pageInfo );
	resultsHeader.add( nextButton );

	const resultsList = new UIPanel();
	resultsList.setClass( 'results-list' );

	resultsSection.add( resultsHeader );
	resultsSection.add( resultsList );

	container.add( resultsSection );

	// Loading indicator
	const loadingIndicator = new UIPanel();
	loadingIndicator.setClass( 'loading-indicator' );
	loadingIndicator.setDisplay( 'none' );

	const loadingText = new UIText( 'Loading...' );
	loadingIndicator.add( loadingText );

	container.add( loadingIndicator );

	// Initialize authentication status
	updateAuthStatus();

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

			authStatus.setValue( 'Signed in to Sketchfab' );
			authButton.dom.textContent = 'Sign out';
			authButton.dom.disabled = false;

			searchSection.setDisplay( 'block' );

			// Load initial results
			performSearch();

		} else {

			authStatus.setValue( 'Sign in to browse and import Sketchfab models' );
			authButton.dom.textContent = 'Sign in to Sketchfab';
			authButton.dom.disabled = false;

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
				offset: ( page - 1 ) * 24,
				count: 24
			};

			if ( license ) {

				searchOptions.license = license;

			}

			const response = await api.searchModels( query, searchOptions );

			currentResults = response.results || [];
			currentPage = page;
			totalPages = Math.ceil( ( response.count || 0 ) / 24 );

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

		// Update results info
		const count = response.count || 0;
		const start = ( currentPage - 1 ) * 24 + 1;
		const end = Math.min( currentPage * 24, count );

		resultsInfo.setValue( `Showing ${start}-${end} of ${count} models` );

		// Update pagination
		prevButton.dom.disabled = currentPage <= 1;
		nextButton.dom.disabled = currentPage >= totalPages;
		pageInfo.setValue( `Page ${currentPage} of ${totalPages}` );

		// Clear previous results
		resultsList.clear();

		// Display models
		if ( currentResults.length === 0 ) {

			const noResults = new UIText( 'No models found. Try adjusting your search terms.' );
			noResults.setClass( 'no-results' );
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

	function navigatePage( page ) {

		if ( page < 1 || page > totalPages || isLoading ) return;

		performSearch( page );

	}

	function displayError( message ) {

		resultsList.clear();

		const errorText = new UIText( `Error: ${message}` );
		errorText.setClass( 'error-message' );
		resultsList.add( errorText );

		resultsSection.setDisplay( 'block' );

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

		}

	};

}

export { SketchfabBrowser };