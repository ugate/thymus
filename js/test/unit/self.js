$(function () {

	var test = null;
	module('self-targeting', {
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
				'data-thx-get-result="[class^=thymus-user]">' +
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

});
//# sourceURL=test/js/self.js