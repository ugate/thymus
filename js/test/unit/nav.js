+function($) {
$(function () {

	// tests
	module('navigation');
	buttonTest('get', 'sync|transfer', 'login', '#username');
	buttonTest('post', 'sync|transfer', 'login', '#username');

	/**
	 * Tests the various HTTP method verbs and siphon types
	 * 
	 * @param httpMethod
	 *            the HTTP verb
	 * @param type
	 *            the type (e.g. include, etc.)
	 * @param path
	 *            the path to use for the navigation
	 * @param valSel
	 *            the selector string (or array of selectors) to lookup and
	 *            validate against when the navigation completes
	 */
	function buttonTest(httpMethod, type, path, valSel) {
		if (!type) {
			throw ('type required');
		}
		var name = 'Full page ' + httpMethod.toUpperCase() + ' ' + type;
		asyncTest(name, function () {
			// generate random in-line frame ID/name
			var iframeId = Harness.generateIframeId();
			var m = Harness.currentRun.currentModule();
			var d = m.currentTest();
			d.html = 
				'<div>' +
					'<button type="button" class="' + Harness.TEST_CSS_CLASS + '" ' +
						'data-thx-' + httpMethod + '="click" data-thx-' + httpMethod + '-path="?{#globalLoginPath}" ' +
						'data-thx-' + httpMethod + '-type="' + type + '" ' +
						'data-thx-' + httpMethod + '-target="' + iframeId + '" ' +
						'data-thx-' + httpMethod + '-params=".simple-nav-params :input"></button>' +
					'<input id="globalLoginPath" type="hidden" value="' + path + '" />' +
					'<div class="simple-nav-params">' +
						'<input type="text" ' + d.keyVal('text value') + '/>' +
						'<input type="checkbox" checked="checked" ' + d.keyVal('checkbox value 1') + '/>' +
						'<input type="checkbox" ' + d.keyVal('checkbox value 2', true) + '/>' + 
						'<input type="radio" ' + d.keyVal('radio value 1', true) + '/>' +
						'<input type="radio" checked="checked" ' + d.keyVal('radio value 2') + '/>' +
						'<select multiple="multiple" ' + d.keyVal() + '>' +
							'<option ' + d.keyVal('select option 1', true, true) + '></option>' +
							'<option selected="selected" ' + d.keyVal('select option 2', false, true) + '></option>' +
						'</select>' +
						'<input type="range" min="1" max="100" ' + d.keyVal(25) + '/>' +
						'<textarea rows="4" cols="50" ' + d.keyVal() + '>' + d.keyVal('textarea value 1', false, true, ' ') + '</textarea>' +
						'<input type="text" disabled="disabled" ' + d.keyVal('text value 2', true) + '/>' +
						'<div><input type="text" ' + d.keyVal('nested text value 1') + '/></div>' +
					'</div>' +
					'<input type="text" ' + d.keyVal('text value 3', true) + '/>' +
				'</div>';
			m.asyncNavRegister( 
					d.html,
				function(event) {
					// validate the parameters were passed, the login page is loaded and the user name element is present
					d.validate(event, valSel);
				},
				'click', Harness.EVT_FRAG_LOAD, iframeId
			);
		});
	}
});
}(window.jQuery);
//# sourceURL=test/js/nav.js