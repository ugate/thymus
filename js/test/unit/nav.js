$(function () {

	var test = null;
	module('navigation', {
		setup : function() {
			test = new Harness.Test();
		},
		teardown : function() {
			test = test.destroy();
		}
	});

	asyncTest('should load self-targeting destination siphon include', function () {
		// QUnit.config.current.testName
		test.asyncNavRegister( 
			'<button type="button" class="' + Harness.TEST_CSS_CLASS + '" ' +
				'data-thx-get="click" data-thx-get-path="frags/user/user1"' +
				'data-thx-get-result="[class^=&quot;thymus-user&quot;]">' +
			'</button>', 
		function(event) {
			var $p = $(event.target);
			var $el = $p.find('.user-name');
			var valid = $el.children().length > 0;
			Harness.ok(valid, (valid ? 'results verfified... ' : 
				'results not found'), null, $p);
		},
		'click', Harness.EVT_FRAG_LOAD);
	});

	asyncTest('should perform full page transfer with parameters', function () {
		var iframeId = Harness.generateIframeId();
		test.asyncNavRegister( 
			'<button type="button" class="qunit" ' +
				'data-thx-get="click" data-thx-get-path="?{#globalLoginPath}" ' +
				'data-thx-get-type="sync|transfer" ' +
				'data-thx-get-target="' + iframeId + '" ' +
				'data-thx-get-params=".simple-nav-params :input"></button>' +
			'<input id="globalLoginPath" type="hidden" value="login" />' +
			'<div class="simple-nav-params">' +
			'<input type="text" name="simpleNavParam1"/>' +
			'<input type="checkbox" class="simple-nav-params" name="simpleNavParam2" />' + 
			'<input type="radio" name="simpleNavParam3" value="radio 3" />' +
			'<input type="radio" name="simpleNavParam3" value="radio 2" />' +
			'<select name="simpleNavParam4" multiple="multiple">' +
				'<option value="option 1"></option>' +
				'<option value="option 2"></option>' +
			'</select>' +
			'<input type="range" name="simpleNavParam5" min="1" max="100" />' +
			'<textarea rows="4" cols="50" name="simpleNavParam6"></textarea>',
		function(event) {
			var f = window[event.fragWinTarget];
			if (!f) {
				ok(false, 'loaded, but window[event.fragWinTarget] cannot be found');
			}
			var $u = $('#username', f.document);
			var valid = $u.length > 0;
			Harness.ok(valid, valid ? 'loaded and found "#username"' : 
				'loaded, but cannot find "#username" in ', null, 
				$('body', f.document));
		},
		'click', Harness.EVT_FRAG_LOAD, iframeId);
	});

});
//# sourceURL=test/js/nav.js