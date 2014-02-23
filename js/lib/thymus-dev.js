/**
 * Loads all the required thymus libraries using
 * <code>../../grunt/libs.js</code> definition to concatenate each library
 * into one script that will be inserted in a <code>script</code> tag in order
 * to mimic a true build implementation.
 * <p>
 * <b>NOTE: development use only!</b><br/>Use the javascript libraries
 * included in <code>dist</code> for production use.
 * </p>
 */
+function($) {
	// request the inclusion script
	var basePath = $('#thymus').attr('data-thx-base-path');
	var libPath = basePath + '/grunt/fabricator.js';
	$.ajax({
		url : libPath,
		dataType : 'script',
		cache : false
	}).done(done).fail(fail);

	/**
	 * Once the includes script loads, processes any inclusions and add the
	 * cumulative script to the DOM
	 * 
	 * @param r
	 *            the raw script result
	 * @param status
	 *            the status of the result
	 * @param the
	 *            XHR for the request
	 */
	function done(r, status, xhr) {
		fabricator.basePath = basePath;
		var js = fabricator.processScriptIncludes();
		if (js) {
			var scr = document.createElement('script');
			scr.type = 'text/javascript';
			scr.appendChild(document.createTextNode(wrap(js)));
			document.body.appendChild(scr);
		}
	}

	/**
	 * Handles case when the inclusion script fails to load
	 * 
	 * @param the
	 *            XHR for the request
	 * @param ts
	 *            the status of the result
	 * @param e
	 *            the error
	 */
	function fail(xhr, ts, e) {
		console.error(ts + ' loading ' + libPath);
		throw e;
	}

	/**
	 * Wraps the raw script results to indicate development purposes and
	 * debugging flag for browsers
	 * 
	 * @param js
	 *            the script string to be wrapped
	 */
	function wrap(js) {
		return '/* Pre-build fabrication for includes:\n * '
				+ fabricator.processedIncludePaths.join('\n * ') + '\n */\n' + js
				+ '//# sourceURL=thymus.js';
	}
}(window.jQuery);