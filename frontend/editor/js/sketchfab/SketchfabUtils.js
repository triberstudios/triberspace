/**
 * Sketchfab Utilities
 * Helper functions for Sketchfab integration
 */

class SketchfabUtils {

	/**
	 * Format file size for display
	 */
	static formatFileSize( bytes ) {

		if ( bytes === 0 ) return '0 Bytes';

		const k = 1024;
		const sizes = [ 'Bytes', 'KB', 'MB', 'GB' ];
		const i = Math.floor( Math.log( bytes ) / Math.log( k ) );

		return parseFloat( ( bytes / Math.pow( k, i ) ).toFixed( 2 ) ) + ' ' + sizes[ i ];

	}

	/**
	 * Format number with thousands separator
	 */
	static formatNumber( num ) {

		return num.toString().replace( /\B(?=(\d{3})+(?!\d))/g, ',' );

	}

	/**
	 * Generate license badge color
	 */
	static getLicenseColor( license ) {

		if ( ! license ) return '#666';

		const licenseType = license.label.toLowerCase();

		if ( licenseType.includes( 'cc0' ) ) return '#00a651';
		if ( licenseType.includes( 'cc by' ) ) return '#f89c20';
		if ( licenseType.includes( 'commercial' ) ) return '#e31837';

		return '#666';

	}

	/**
	 * Validate Sketchfab model UID format
	 */
	static isValidUID( uid ) {

		// Sketchfab UIDs are typically 32-character hexadecimal strings
		return /^[a-f0-9]{32}$/i.test( uid );

	}

	/**
	 * Extract UID from Sketchfab URL
	 */
	static extractUIDFromURL( url ) {

		const regex = /sketchfab\.com\/3d-models\/[^\/]+\/([a-f0-9]{32})/i;
		const match = url.match( regex );

		return match ? match[ 1 ] : null;

	}

	/**
	 * Get thumbnail URL for different sizes
	 */
	static getThumbnailURL( model, size = 'medium' ) {

		if ( ! model.thumbnails || ! model.thumbnails.images ) {

			return null;

		}

		// Available sizes: small, medium, large
		const sizeMap = {
			small: 200,
			medium: 400,
			large: 800
		};

		const targetWidth = sizeMap[ size ] || 400;

		// Find the closest size
		let bestImage = model.thumbnails.images[ 0 ];
		let bestDiff = Math.abs( bestImage.width - targetWidth );

		for ( const image of model.thumbnails.images ) {

			const diff = Math.abs( image.width - targetWidth );

			if ( diff < bestDiff ) {

				bestImage = image;
				bestDiff = diff;

			}

		}

		return bestImage.url;

	}

	/**
	 * Check if license allows commercial use
	 */
	static isCommercialUse( license ) {

		if ( ! license ) return false;

		const label = license.label.toLowerCase();

		// CC0 and CC BY allow commercial use
		return label.includes( 'cc0' ) || ( label.includes( 'cc by' ) && ! label.includes( 'nc' ) );

	}

	/**
	 * Generate attribution HTML
	 */
	static generateAttributionHTML( model ) {

		const author = model.user ? model.user.displayName : 'Unknown Author';
		const license = model.license ? model.license.label : 'Unknown License';
		const url = `https://sketchfab.com/3d-models/${model.slug}/${model.uid}`;

		return `
			<div class="sketchfab-attribution">
				<strong>"${model.name}"</strong> by
				<a href="${model.user?.profileUrl || '#'}" target="_blank">${author}</a>
				is licensed under
				<a href="${model.license?.url || '#'}" target="_blank">${license}</a>.
				<br>
				Source: <a href="${url}" target="_blank">Sketchfab</a>
			</div>
		`;

	}

	/**
	 * Debounce function for search input
	 */
	static debounce( func, wait ) {

		let timeout;

		return function executedFunction( ...args ) {

			const later = () => {

				clearTimeout( timeout );
				func( ...args );

			};

			clearTimeout( timeout );
			timeout = setTimeout( later, wait );

		};

	}

	/**
	 * Create download progress tracker
	 */
	static createProgressTracker( onProgress ) {

		let loaded = 0;
		let total = 0;

		return {

			update: ( progressEvent ) => {

				if ( progressEvent.lengthComputable ) {

					loaded = progressEvent.loaded;
					total = progressEvent.total;

					if ( onProgress ) {

						onProgress( {
							loaded,
							total,
							percentage: ( loaded / total ) * 100
						} );

					}

				}

			},

			getProgress: () => ( {
				loaded,
				total,
				percentage: total > 0 ? ( loaded / total ) * 100 : 0
			} )

		};

	}

	/**
	 * Validate Creative Commons compliance
	 */
	static validateLicenseCompliance( model, usage = 'editorial' ) {

		const license = model.license;

		if ( ! license ) {

			return {
				compliant: false,
				reason: 'No license information available'
			};

		}

		const label = license.label.toLowerCase();

		// Check for commercial use restrictions
		if ( usage === 'commercial' && label.includes( 'nc' ) ) {

			return {
				compliant: false,
				reason: 'License does not allow commercial use (NC - Non-Commercial)'
			};

		}

		// Check for share-alike requirements
		if ( label.includes( 'sa' ) ) {

			return {
				compliant: true,
				reason: 'Attribution required. Derivative works must use same license (SA - Share Alike)',
				requiresAttribution: true,
				requiresSameAccess: true
			};

		}

		// CC0 is always compliant
		if ( label.includes( 'cc0' ) ) {

			return {
				compliant: true,
				reason: 'Public domain - no restrictions',
				requiresAttribution: false
			};

		}

		// Standard CC BY
		if ( label.includes( 'cc by' ) ) {

			return {
				compliant: true,
				reason: 'Attribution required',
				requiresAttribution: true
			};

		}

		return {
			compliant: false,
			reason: 'Unknown or incompatible license'
		};

	}

}

export { SketchfabUtils };