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

	asyncTest('should perform full page transfer with parameters', function () {
		// generate random in-line frame ID/name
		var loadVerifySelector = '#username';
		var iframeId = Harness.generateIframeId();
		var d = new Harness.Data();
		d.html = 
			'<div>' +
				'<button type="button" class="qunit" ' +
					'data-thx-get="click" data-thx-get-path="?{#globalLoginPath}" ' +
					'data-thx-get-type="sync|transfer" ' +
					'data-thx-get-target="' + iframeId + '" ' +
					'data-thx-get-params=".simple-nav-params :input"></button>' +
				'<input id="globalLoginPath" type="hidden" value="login" />' +
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
		test.asyncNavRegister( 
				d.html,
			function(event) {
				var f = window[event.fragWinTarget];
				if (!f) {
					ok(false, 'loaded, but window[event.fragWinTarget] cannot be found');
				}
				// validate that the login page has been loaded by checking the presence of the user name element
				var $u = $(loadVerifySelector, f.document);
				var valid = $u.length > 0;
				Harness.ok(valid, valid ? 'Found "' + loadVerifySelector + '"' : 
					'Cannot find "' + loadVerifySelector + '" in loaded fragment', null, 
					$('body', f.document));
				// validate the parameters were passed
				d.validate(event.parameters);
			},
			'click', Harness.EVT_FRAG_LOAD, iframeId
		);
	});

});
//# sourceURL=test/js/nav.js