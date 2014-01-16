$(function () {

    module('navigation');

      asyncTest('should load self-targeting destination siphon include', function () {
    	  // QUnit.config.current.testName
    	Harness.asyncNavRegister( 
        	'<button type="button" class="' + Harness.TEST_CSS_CLASS + '" ' +
        		'data-thx-get="click" data-thx-get-path="frags/user/user1"' +
        		'data-thx-get-result="[class^=&quot;thymus-user&quot;]">' +
        	'</button>', 
        	function(event) {
        		var $p = $(event.target);
        		var $el = $p.find('.user-name');
        		var valid = $el.children().length > 0;
        		Harness.ok(valid, 'loaded', null, $p);
    		},
    		'click',
    		Harness.EVT_FRAG_LOAD);
      });

      asyncTest('should perform full page transfer with parameters', function () {
    	  Harness.asyncNavRegister( 
			'<button type="button" class="qunit" ' +
				'data-thx-get="click" data-thx-get-path="?{#globalLoginPath}" ' +
				'data-thx-get-type="sync|transfer" ' +
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
				'<textarea rows="4" cols="50" name="simpleNavParam6"></textarea>' +
			'</div>', 
        	function(event) {
	      		var $p = $(event.target);
	      		var valid = $el.length > 0;
	          	ok(valid, 'loaded: ' + $p.html());
	  		},
	  		'click',
	  		Harness.EVT_FRAG_BDOM);
      });

});
//# sourceURL=test/js/nav.js