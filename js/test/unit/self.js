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

	function buttonTest(httpMethod, type) {
		type = type ? type : '';
		var name = httpMethod.toUpperCase() + ' ' + type;
		asyncTest(name, function () {
			// QUnit.config.current.testName
			test.asyncNavRegister( 
				'<div>' +
				'<button type="button" class="' + Harness.TEST_CSS_CLASS + '" ' +
					'data-thx-' + httpMethod + '="click" data-thx-' + httpMethod + '-path="frags/user/user1" ' +
					'data-thx-' + httpMethod + '-result="[class^=thymus-user]" ' +
					(type ? 'data-thx-' + httpMethod + '-type="' + type + '" ' : '') + '>' +
				'</button>' +
				'</div>',
			function(event) {
				var $p = $(event.target);
				var $el = $p.find('.user-name');
				var valid = $el.children().length > 0;
				Harness.ok(valid, name + (valid ? ' results verfified' : 
					' results not found'), null, $p);
			},
			'click', Harness.EVT_FRAG_LOAD);
		});
	}

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
});
//# sourceURL=test/js/self.js