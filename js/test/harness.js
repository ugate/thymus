/**
 * Test harness
 */
var Harness = {

	ACTION_NAV_REG : 'nav.register',
	EVT_FRAG_BHTTP : 'beforehttp',
	EVT_FRAG_BDOM : 'beforedom.thx.frag',
	EVT_FRAG_LOAD : 'load.thx.frag',
	TEST_CSS_CLASS : 'qunit',

	/**
	 * Registers and optionally executes navigational tests
	 * 
	 * @param html
	 *            the HTML to test
	 * @param fx
	 *            the listener for the test event
	 * @param uevt
	 *            the user event to trigger
	 * @param tevt
	 *            the test event to listen for
	 * @param noInvoke
	 *            true to prevent invocation of user event trigger
	 */
	asyncNavRegister : function(html, fx, uevt, tevt, noInvoke) {
		var p = $(html);
		var n = p.length == 1 && p.hasClass(Harness.TEST_CSS_CLASS) ? p
				: p.length > 1 ? p.filter('.' + Harness.TEST_CSS_CLASS) : p
						.find('.' + Harness.TEST_CSS_CLASS);
		if (n.length <= 0) {
			Harness.ok(false, 'Unable to find .' + Harness.TEST_CSS_CLASS);
			start();
			return n;
		}
		p.thymus(Harness.ACTION_NAV_REG, {
			actionScope : p,
			searchScope : p,
			destScope : p
		});
		Harness.ok(true, Harness.ACTION_NAV_REG, 'action');
		if (uevt) {
			if (typeof fx === 'function') {
				tevt = tevt ? tevt : uevt;
				n.on(tevt, function(event) {
					Harness.ok(true, tevt, 'discovered');
					if (event.error) {
						Harness.ok(false, event.error);
					} else {
						try {
							fx(event);
						} catch (e) {
							Harness.ok(false, e);
						}
					}
					start();
				});
			}
			if (!noInvoke) {
				n.trigger(uevt);
				Harness.ok(true, uevt, ' triggered');
			}
		}
		return n;
	},
	ok : function(state, msg, pp, el) {
		var ise = msg instanceof Error && msg.stack;
		var nm = null;
		if (ise) {
			nm = msg.stack.replace(msg.message, '');
			nm = msg.message + '\n' + nm;
		} else if (pp) {
			nm = pp + ': "' + msg + '"';
		} else {
			nm = msg;
		}
		if (el instanceof jQuery && QUnit.urlParams.showRslts) {
			nm += el.html();
		}
		ok(ise ? false : state, nm);
	},
	init : function() {
		// See
		// https://github.com/axemclion/grunt-saucelabs#test-result-details-with-qunit
		QUnit.done(function(results) {
			window.global_test_results = results;
		});
		QUnit.config.testTimeout = 30000;
		/*
		 * QUnit.config.autostart = false; function init(event) { QUnit.start(); }
		 */
		QUnit.config.urlConfig
				.push({
					id : 'showRslts',
					label : 'Show HTML results',
					tooltip : 'Show HTML result content for each individual test that supports this feature.'
				});
	}
};
Harness.init();