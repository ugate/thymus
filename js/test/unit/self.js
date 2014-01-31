$(function () {

	// tests
	module('self-targeting');
	buttonTest('get');
	buttonTest('get', 'async|include');
	buttonTest('get', 'async|replace');
	buttonTest('get', 'async|update');
	buttonTest('post');
	buttonTest('post', 'async|include');
	buttonTest('post', 'async|replace');
	buttonTest('post', 'async|update');
	buttonTest('put');
	buttonTest('put', 'async|include');
	buttonTest('put', 'async|replace');
	buttonTest('put', 'async|update');
	buttonTest('delete');
	buttonTest('delete', 'async|include');
	buttonTest('delete', 'async|replace');
	buttonTest('delete', 'async|update');

	/**
	 * Tests the various HTTP method verbs and siphon types
	 * 
	 * @param httpMethod the HTTP verb
	 * @param type the type (e.g. include, etc.)
	 */
	function buttonTest(httpMethod, type) {
		type = type ? type : '';
		var name = httpMethod.toUpperCase() + ' ' + type;
		asyncTest(name, function () {
			var $t = $(
				'<div>' +
				'<button type="button" class="' + Harness.TEST_CSS_CLASS + '" ' +
					'data-thx-' + httpMethod + '="click" data-thx-' + httpMethod + '-path="frags/user/user1" ' +
					'data-thx-' + httpMethod + '-result="[class^=thymus-user]" ' +
					(type ? 'data-thx-' + httpMethod + '-type="' + type + '" ' : '') + '>' +
				'</button>' +
				'</div>'
			);
			Harness.currentRun.currentModule().asyncNavRegister($t,
			function(event) {
				var $p, $el, valid, rpl = event.fragType.toLowerCase() == 'replace';
				if (rpl) {
					$p = $(event.target);
					valid = $p.parent().length == 0;
					Harness.ok(valid, name + (valid ? 
							' verfified old element is no longer part of the DOM' : 
								' old element is still part of the DOM'), 
									null, $p.parent());
				}
				$el = $t.find('.user-name');
				valid = $el.children().length > 0;
				Harness.ok(valid, name + (valid ? ' results verfified' : 
					' results not found'), null, $el);
			},
			'click', Harness.EVT_FRAG_LOAD);
		});
	}
});
//# sourceURL=test/js/self.js