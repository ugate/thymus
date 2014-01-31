/**
 * Harness for test module use
 */
var Harness = {

	ACTION_NAV_REG : 'nav.register',
	EVT_FRAGS_BHTTP : 'beforehttp.thx.frags',
	EVT_FRAG_BHTTP : 'beforehttp.thx.frag',
	EVT_FRAG_BDOM : 'beforedom.thx.frag',
	EVT_FRAG_ADOM : 'afterdom.thx.frag',
	EVT_FRAG_LOAD : 'load.thx.frag',
	EVT_FRAGS_LOAD : 'load.thx.frags',
	TEST_CSS_CLASS : 'qunit',
	TEST_FIXTURE_ID : 'qunit-fixture',
	TEST_FIXTURE_SEL : '#qunit-fixture',
	REGEX_PARAMS_STR : /([^&=]+)=([^&]*)/g,
	DFLT_HTTP_STATUS_WARN_START : 400,
	DFLT_HTTP_STATUS_WARN_END : 499,
	currentRun : null,
	moduleCount : 0,
	testCount : 0,
	asyncTestCount : 0,

	/**
	 * An extension to the QUnit counterpart that takes additional formatting
	 * options as well as takes into account if HTML contents should be shown
	 * 
	 * @param state
	 *            the assertion state (a value of <code>null</code> will only
	 *            be asserted when the global option verbose is turned on)
	 * @param msg
	 *            the message passed to the assertion
	 * @param pp
	 *            an optional prepender text
	 * @param el
	 *            an optional element to show HTML for (when global option
	 *            verbose is turned on)
	 */
	ok : function(state, msg, pp, el) {
		if (state == null && !QUnit.urlParams.verbose) {
			return;
		}
		var isWarn = state == 'warn';
		state = state == null ? true : isWarn ? true : state;
		var ise = msg instanceof Error && msg.stack;
		var nm = null, wm = null;
		if (ise) {
			if (isWarn) {
				nm = msg.message;
				wm = msg.stack.replace(msg.message, '');
				wm = 'Warning: \n' + msg.message + '\n' + wm;
			} else {
				nm = msg.stack.replace(msg.message, '');
				nm = msg.message + '\n' + nm;
			}
		} else if (pp) {
			nm = pp + ': ' + msg;
		} else {
			nm = msg;
		}
		if (el && QUnit.urlParams.verbose) {
			nm += '... ' + (el instanceof jQuery ? el.html() : el);
		}
		ok(state, nm);
		if (isWarn) {
			var t = Harness.currentRun.currentModule().currentTest();
			t.queueWarn(QUnit.config.current.id, wm);
		}
	},

	/**
	 * Creates a test selection that will find or filter in one step
	 * 
	 * @param el
	 *            the node to select from
	 * @param sel
	 *            the selector to use
	 * @returns the selection
	 */
	testSelect : function(el, sel) {
		return el.length == 1 && el.hasClass(Harness.TEST_CSS_CLASS) ? el
				: el.length > 1 ? el.filter(sel) : el.find(sel);
	},

	/**
	 * Generates a mapping with a key as the parameter name and values as and
	 * array of found values
	 * 
	 * @param o
	 *            either the URL encoded string of parameters or a window to get
	 *            the search parameters (defaults to the current windows search
	 *            parameters)
	 * @returns an object that contains a mapping of parameters "params" and a
	 *          count of found parameters "cnt"
	 */
	getParams : function(o) {
		var s = typeof o === 'string' ? o
				: typeof o === 'object' && o.document ? o.document.location.search
						: window.location.search;
		var t = s.indexOf('?');
		if (t >= 0 && t < (s.length - 1)) {
			s = s.substr(t + 1);
		}
		var ss = s.match(Harness.REGEX_PARAMS_STR);
		var il = ss.length - 1, p = null, oa = [];
		for (var i = 0; i <= il; i++) {
			p = ss[i];
			if (i == il) {
				// remove possible hashes
				t = p.split('#');
				if (t > 1) {
					p.pop();
					p = p.join('#');
				}
			}
			t = p.indexOf('=');
			var k = decodeURIComponent(p.substr(0, t));
			var v = decodeURIComponent((p.length - 1) == t ? '' : p
					.substr(t + 1));
			if (!oa[k]) {
				oa[k] = {
					vals : []
				};
			}
			oa[k].vals.push(v);
		}
		return {
			params : oa,
			cnt : il + 1
		};
	},

	/**
	 * Generates a mapping with a key as the parameter name and values as and
	 * array of found values
	 * 
	 * @param o
	 *            an object that contains parameter name/value properties
	 * @returns an object that contains a mapping of parameters "params" and a
	 *          count of found parameters "cnt"
	 */
	getParamsFromObj : function(o) {
		var r = {
			cnt : 0,
			params : {}
		};
		for ( var k in o) {
			if (o.hasOwnProperty(k)) {
				if (!r.params[k]) {
					r.params[k] = {
						vals : []
					};
					r.cnt++;
				}
				r.params[k].vals.push(decodeURIComponent(o[k]));
			}
		}
		return r;
	},

	/**
	 * Adds an in-line frame to the test fixture
	 * 
	 * @param id
	 *            the ID applied to the in-line frame
	 * @param html
	 *            optional HTML content or node(s) to append to the created
	 *            in-line frame document
	 * @returns the in-line frame
	 */
	addIframe : function(id, html) {
		var ihtml = '<!doctype html><html><head>'
				+ '<meta http-equiv="content-type" content="text/html;charset=utf-8" />'
				+ '</head><body>' + html + '</body></html>';
		var i = document.createElement('iframe');
		i.name = i.id = id;
		(Harness.TEST_FIXTURE_ID == 'body' ? document.body : document
				.getElementById(Harness.TEST_FIXTURE_ID)).appendChild(i);
		i.src = 'javascript:document.write(\'' + ihtml + '\')';
		return $('#' + id);
	},

	/**
	 * @returns a randomly generated in-line frame ID
	 */
	generateIframeId : function() {
		return 'qunitFrame' + Math.floor((Math.random() * 10000) + 1);
	},

	/**
	 * HTTP status code range
	 * 
	 * @constructor
	 * @param start
	 *            of HTTP status code range
	 * @param end
	 *            of HTTP status code range
	 */
	HttpStatusRange : function(start, end) {
		this.inRange = function(hsc) {
			return hsc >= start && hsc <= end;
		};
	},

	/**
	 * Initializes the test harness
	 */
	init : function() {

		/**
		 * {Harness} run construct for framework/test related run tasks
		 * 
		 * @param data
		 *            the QUnit data
		 */
		function Run(data) {
			var $$ = this;
			$$.assertions = 0;
			$$.total = 0;
			$$.passed = 0;
			$$.failed = 0;
			$$.warned = 0;
			var isDone = false;
			var modules = [];
			var moduleIndex = 0;
			var httpc = new HttpCapable([ 'post', 'put', 'delete' ]);

			/**
			 * @returns the current {Module}
			 */
			$$.currentModule = function() {
				return modules[moduleIndex];
			};

			/**
			 * Pushes a {Module} <b>called automatically by {Harness}</b>
			 * 
			 * @param data
			 *            the data to add to the {Module}
			 * @returns the push
			 */
			$$.pushModule = function(data) {
				moduleIndex = modules.length;
				return modules.push(new Module(data, $$));
			};

			/**
			 * Increments the {Run} totals based upon the QUnit data <b>called
			 * automatically by {Harness}</b>
			 * 
			 * @param data
			 *            the QUnit data
			 */
			$$.increment = function(data) {
				$$.total += data.total;
				$$.passed += data.passed;
				$$.failed += data.failed;
				$$.warned += data.warned;
			};

			/**
			 * Perform {Test} completion tasks <b>called automatically by
			 * {Harness}</b>
			 * 
			 * @param data
			 *            the QUnit data
			 */
			$$.done = function(data) {
				if (isDone || !data) {
					return isDone;
				}
				isDone = true;
			};

			/**
			 * Gets an object representing the checked HTTP methods
			 * 
			 * @param m
			 *            the HTTP method
			 * @returns the an object with failed, status, text when the HTTP
			 *          method was checked or null when it was not checked
			 */
			$$.httpCapable = function(m) {
				return httpc.get(m);
			};

			/**
			 * HTTP method capabilities that calls the server for each of the
			 * passed HTTP methods to determine if the server is capable of
			 * handling the request
			 * 
			 * @constructor
			 * @param ss
			 *            the HTTP methods to call
			 */
			function HttpCapable(ss) {
				var ms = [];
				this.get = function(m) {
					var t = m.toLowerCase();
					return ms[t];
				};
				function put(m, f, s, t) {
					ms[m] = new Item(f, s, t);
				}
				function Item(f, s, t) {
					this.failed = f;
					this.status = s;
					this.text = t;
				}
				function done(r, status, xhr) {
					put(this.type.toLowerCase(), false, xhr.status,
							xhr.statusText);
				}
				function fail(xhr, ts, e) {
					put(this.type.toLowerCase(), true, xhr.status,
							xhr.statusText);
				}
				for (var i = 0; i < ss.length; i++) {
					$.ajax({
						url : window.location,
						type : ss[i],
						async : true,
						cache : false
					}).done(done).fail(fail);
				}
			}
		}

		/**
		 * A convenience construct for framework/test related module tasks
		 * 
		 * @constructor
		 * @param data
		 *            the QUnit data
		 * @param run
		 *            the {Run}
		 */
		function Module(data, run) {
			var $$ = this;
			$$.run = run;
			$$.name = data && data.name ? data.name : 'default-module';
			$$.total = 0;
			$$.passed = 0;
			$$.failed = 0;
			$$.warned = 0;
			var isDone = false;
			var tests = [];
			var testIndex = 0;

			/**
			 * @returns the current test
			 */
			$$.currentTest = function() {
				return tests[testIndex];
			};

			/**
			 * Pushes a {Test} <b>called automatically by {Harness}</b>
			 * 
			 * @param data
			 *            the data to add to the {Test}
			 * @returns the push
			 */
			$$.pushTest = function(data) {
				testIndex = tests.length;
				return tests.push(new Test(data, $$));
			};

			/**
			 * Increments the {Module} totals based upon the QUnit data
			 * <b>called automatically by {Harness}</b>
			 * 
			 * @param data
			 *            the QUnit data
			 */
			$$.increment = function(data) {
				$$.total += data.total;
				$$.passed += data.passed;
				$$.failed += data.failed;
				$$.warned += data.warned;
				$$.run.increment(data);
			};

			/**
			 * Creates a descriptive representation of the specified event
			 * 
			 * @param evt
			 *            the event object
			 * @param act
			 *            the alternative action to use when the event does not
			 *            have an action property
			 * @returns the description
			 */
			function desc(evt, act) {
				var ea = act ? act : evt.action;
				return (typeof evt === 'string' ? evt : evt.type
						+ (evt.namespace ? '.' + evt.namespace : ''))
						+ (ea ? ' (for action ' + ea + ')' : '');
			}

			/**
			 * Listens for the specified events, logs them to the UI and
			 * prevents further processing when an event contains an error
			 * 
			 * @param n
			 *            the node(s) the event will be listened on
			 * @param evt
			 *            the event name to listen for with regards to the
			 *            callback function
			 * @param cb
			 *            the callback function that will be called when an
			 *            event is received
			 * @param httpStatusWarnRange
			 *            a {Harness.HttpStatusRange} instance that will
			 *            designate a range of HTTP status codes that will
			 *            result in a warning, but will not cause the test to
			 *            fail
			 */
			function listen(n, evt, cb, httpStatusWarnRange) {
				function on(event) {
					var t = $$.currentTest();
					Harness.ok(true, desc(event), '#' + ++t.eventCount
							+ 'Event received');
					if ((typeof cb === 'undefined' || cb != true)
							&& event.error) {
						if (httpStatusWarnRange
								&& httpStatusWarnRange
										.inRange(event.error.statusCode)) {
							t.eventWarned++;
							Harness.ok('warn', event.error);
						} else {
							Harness.ok(false, event.error);
						}
						start();
					}
					if (typeof cb === 'function') {
						cb(event);
					}
				}
				n.on(evt, on);
			}

			/**
			 * Listens for all incoming framework events, logs them to the UI
			 * and prevents further processing when an event contains an error
			 * 
			 * @param n
			 *            the node(s) the event will be listened on
			 * @param evt
			 *            the event name to listen for with regards to the
			 *            callback function
			 * @param cb
			 *            the callback function that will be called when an
			 *            event is received
			 * @param httpStatusWarnRange
			 *            a {Harness.HttpStatusRange} instance that will
			 *            designate a range of HTTP status codes that will
			 *            result in a warning, but will not cause the test to
			 *            fail
			 */
			function listenAll(n, evt, cb, httpStatusWarnRange) {
				var ihe = false, ucb = false;
				for (var i = 0; i < Harness.EVTS.length; i++) {
					ucb = Harness.EVTS[i] == evt;
					if (!ihe) {
						ihe = ucb;
					}
					listen(n, Harness.EVTS[i],
							ucb ? cb : i == 0 ? true : false,
							httpStatusWarnRange);
				}
				if (!ihe) {
					listen(n, evt, cb, httpStatusWarnRange);
				}
			}

			/**
			 * Registers and optionally executes navigational tests
			 * 
			 * @param html
			 *            the HTML or DOM element(s) to test
			 * @param fx
			 *            the listener for the test event
			 * @param uevt
			 *            the user event to trigger
			 * @param tevt
			 *            the test event to listen for
			 * @param iframeId
			 *            when present, an in-line frame will be created using
			 *            the supplied ID and the specified HTML will be
			 *            appended to it's body
			 * @param noInvoke
			 *            true to prevent invocation of user event trigger
			 * @param httpStatusWarnRange
			 *            a {Harness.HttpStatusRange} instance that will
			 *            designate a range of HTTP status codes that will
			 *            result in a warning, but will not cause the test to
			 *            fail (defaults to 4xx range)
			 */
			$$.asyncNavRegister = function(html, fx, uevt, tevt, iframeId,
					noInvoke, httpStatusWarnRange) {
				httpStatusWarnRange = !httpStatusWarnRange ? new Harness.HttpStatusRange(
						Harness.DFLT_HTTP_STATUS_WARN_START,
						Harness.DFLT_HTTP_STATUS_WARN_END)
						: httpStatusWarnRange;
				var p = $(html).appendTo(Harness.TEST_FIXTURE_SEL);
				var doc = iframeId ? Harness.addIframe(iframeId, p).contents()
						: document;
				var n = Harness.testSelect(p, '.' + Harness.TEST_CSS_CLASS);
				if (n.length <= 0) {
					Harness.ok(false, 'Unable to find .'
							+ Harness.TEST_CSS_CLASS);
					start();
					return n;
				}
				// need to pass scope for elements that are not attached to the
				// DOM
				var a = $.contains(document, p[0]) ? Harness.ACTION_NAV_REG : {
					action : Harness.ACTION_NAV_REG,
					actionScope : p,
					searchScope : p,
					destScope : p
				};
				p.thymus(a);
				Harness.ok(true, Harness.ACTION_NAV_REG, 'Action executed');
				if (uevt) {
					function iframeCheck(event, doc) {
						var httpc = Harness.currentRun
								.httpCapable(event.httpMethod);
						if (httpc && httpc.failed) {
							var umsg = event.httpMethod + ' ' + httpc.text;
							if (httpStatusWarnRange
									&& httpStatusWarnRange.inRange(cstat)) {
								Harness.ok('warn', umsg);
							} else {
								Harness.ok(false, umsg);
							}
							return false;
						}
						var w = window[event.fragWinTarget];
						if (!w) {
							ok(false, 'loaded, but window['
									+ event.fragWinTarget + '] cannot be found');
							return true;
						}
						var $h = $('html', w.document);
						if ($h.length <= 0) {
							ok(false,
									'loaded, but cannot be find any HTML in window['
											+ event.fragWinTarget + ']');
							return true;
						}
						return true;
					}
					// need to override teardown because testDone will not show
					// added assertions done within callback
					var teardown = QUnit.config.current.testEnvironment.teardown;
					var test = $$.currentTest();
					QUnit.config.current.testEnvironment.teardown = function() {
						test.assertsDone.apply(this, arguments);
						teardown.apply(this, arguments);
					};
					if (typeof fx === 'function') {
						tevt = tevt ? tevt : uevt;
						// need to listen on parent in case the action removes
						// the node
						listenAll(n, tevt, function(event) {
							try {
								if (!$$.hasError(event)
										&& typeof fx === 'function') {
									var c = !iframeId
											|| iframeCheck(event, doc);
									var rtn = !c ? null : fx(event, doc);
									start();
									return rtn;
								}
							} catch (e) {
								Harness.ok(false, e);
							}
						}, httpStatusWarnRange);
					}
					if (!noInvoke) {
						n.trigger(uevt);
						Harness.ok(true, uevt, 'Event triggered');
					}
				}
				return n;
			};

			/**
			 * Checks if a framework event has errors
			 * 
			 * @param event
			 *            the event to check
			 * @returns true when an error exists
			 */
			$$.hasError = function(event) {
				return !event
						|| (event.error || (event.errors && event.errors.length > 0));
			};

			/**
			 * Perform {Test} completion tasks
			 * 
			 * @param data
			 *            the QUnit data
			 */
			$$.done = function(data) {
				if (isDone || !data) {
					return isDone;
				}
				isDone = true;
			};
		}

		/**
		 * Test data construct used for common testing tasks that simplify
		 * validation of such things as passed parameters
		 * 
		 * @constructor
		 * @param data
		 *            the QUnit data
		 * @param module
		 *            the module
		 */
		function Test(data, module) {
			function Params() {
				this.pa = [];
				this.cnt = 0;
			}
			var $$ = this;
			$$.module = module;
			$$.name = data && data.name ? data.name : module.name
					+ '-default-test';
			$$.passedAsserts = 0;
			$$.failedAsserts = 0;
			$$.total = 0;
			$$.passed = 0;
			$$.failed = 0;
			$$.warned = 0;
			$$.eventWarned = 0;
			$$.eventCount = 0;
			$$.html = '';
			var pp = 'HTTP Parameters', outParams = new Params(), noOutParams = new Params(), cnt = 0;
			var isDone = false;
			var warns = [];

			/**
			 * Validates that the incoming parameters are passed with the
			 * expected test parameters
			 * 
			 * @param params
			 *            the incoming parameters to validate
			 * @param strict
			 *            true to ensure that there are no additional parameters
			 *            present that are not within the expected parameters
			 */
			function validateParams(params, strict) {
				Harness.ok(true, 'Validating incoming', pp, params);
				var ips = typeof params === 'object' ? Harness
						.getParamsFromObj(params) : Harness.getParams(params);
				var op = null, ip = null;
				// ensure we have the same amount of incoming parameters as we
				// do parameters that were submitted
				if ((strict && ips.cnt != outParams.cnt)
						|| (!strict && ips.cnt < outParams.cnt)) {
					Harness.ok(false, 'Expected ' + outParams.cnt
							+ ', but found ' + ips.cnt, pp);
				}
				// verify parameters that should be present are indeed present
				for ( var i in outParams.pa) {
					op = outParams.pa[i];
					ip = ips.params[op.key];
					if (!ip) {
						Harness.ok(false, 'Unable to find "' + op.key
								+ '" with a value(s) "' + op.vals.join(',')
								+ '"', pp);
					} else {
						if (op.chkVals(ip.vals)) {
							Harness.ok(true, 'Incoming "' + op.key
									+ '" found with a value(s) "'
									+ ip.vals.join(',')
									+ '" and contain all of the '
									+ 'expected outgoing value(s) "'
									+ op.vals.join(',') + '"', pp);
						} else {
							Harness.ok(false, 'Incoming "' + op.key
									+ '" with a value(s) "' + ip.vals.join(',')
									+ '" does not contain some/all '
									+ 'of the expected outgoing value(s) "'
									+ op.vals.join(',') + '"', pp);
						}
					}
				}
				// verify parameters that should have been excluded
				for ( var i in noOutParams.pa) {
					op = noOutParams.pa[i];
					ip = ips.params[op.key];
					// incoming parameter is present
					if (ip && !op.chkVals(ip.vals, true)) {
						Harness.ok(false, 'Incoming "' + op.key
								+ '" found with a value(s) "'
								+ ip.vals.join(',')
								+ '", but should have been excluded '
								+ 'from outgoing value(s) "'
								+ op.vals.join(',') + '"', pp);
					} else {
						Harness.ok(true, (ip ? 'Incoming "' + op.key
								+ '" with a value(s) "' + ip.vals.join(',')
								: 'Outgoing "' + op.key)
								+ '" verified not to contain the '
								+ 'excluded value(s) "'
								+ op.vals.join(',')
								+ '"', pp);
					}
				}
			}

			$$.keyVal = function(v, x, useLastKey, va, na) {
				var k = 'param' + (useLastKey ? cnt : ++cnt);
				var p = x ? noOutParams : outParams;
				if (!useLastKey) {
					p.cnt++;
				}
				if (!p.pa[k]) {
					p.pa[k] = {
						vals : [],
						hasSameVals : function(ovals) {
							return $(this.vals).not(ovals).length == 0
									&& $(ovals).not(this.vals).length == 0;
						},
						chkVals : function(ovals, exclude) {
							if (!ovals || ovals.length <= 0) {
								return exclude ? true : false;
							}
							var io = 0;
							for (var i = 0; i < this.vals.length; i++) {
								io = ovals.indexOf(this.vals[i]);
								if ((!exclude && io == -1)
										|| (exclude && io > -1)) {
									return false;
								}
							}
							return true;
						}
					};
				}
				if (v) {
					p.pa[k].vals.push(typeof v === 'string' ? v : v.toString());
				}
				p.pa[k].key = k;
				return (k && !useLastKey ? (na ? ' ' + na : ' name') + '="' + k
						+ '" ' : '')
						+ (v ? (va ? va == ' ' ? v : ' ' + va + '="' + v + '" '
								: ' value="' + v + '" ') : '');
			};
			$$.validate = function(event, selectors, strict) {
				validateParams(event.parameters, strict);
				var doc = window.document;
				if (event.fragWinTarget) {
					var w = window[event.fragWinTarget];
					if (!w) {
						ok(false, 'window[' + event.fragWinTarget
								+ '] cannot be found');
						return;
					}
					doc = w.document;
				}
				var ss = $.isArray(selectors) ? selectors
						: typeof selectors === 'string' ? [ selectors ] : [];
				for (var i = 0; i < ss.length; i++) {
					var $el = $(ss[i], doc);
					var valid = $el.length > 0;
					Harness.ok(valid, valid ? 'Found "' + ss[i] + '"'
							: 'Cannot find "' + ss[i] + '" in loaded fragment',
							null, $('body', doc));
				}
			};

			/**
			 * Queues warning data that will be updated in the DOM for visual
			 * indication of warnings (warnings are passing assertions).
			 * <b>called automatically by {Harness}</b>
			 * 
			 * @param id
			 *            the element ID where the warning will be appened
			 * @param message
			 *            an optional warning message
			 */
			$$.queueWarn = function(id, message) {
				warns.push({
					id : id,
					anum : $$.passedAsserts + $$.failedAsserts,
					msg : message ? message : ''
				});
			};

			/**
			 * Perfrom assertion tasks <b>called automatically by {Harness}</b>
			 * 
			 * @param data
			 *            the QUnit data
			 */
			$$.asserted = function(data) {
				if (data.result) {
					$$.passedAsserts++;
				} else {
					$$.failedAsserts++;
				}
			};

			/**
			 * Perform assertion completion tasks <b>called automatically by
			 * {Harness}</b>
			 */
			$$.assertsDone = function() {
				if ($$.eventWarned <= 0 && $$.eventCount != Harness.EVTS.length) {
					Harness.ok(false, 'Expected "' + Harness.EVTS.length
							+ '" framework events, but received "'
							+ $$.eventCount + '"');
				}
			};

			/**
			 * Perform {Test} completion tasks <b>called automatically by
			 * {Harness}</b>
			 * 
			 * @param data
			 *            the QUnit data
			 */
			$$.done = function(data) {
				if (isDone || !data) {
					return isDone;
				}
				isDone = true;
				data.warned = warns.length;
				for (var i = 0; i < warns.length; i++) {
					var $t = $('#' + warns[i].id);
					var $li = $t.find('.qunit-assert-list > li:nth-child('
							+ warns[i].anum + ')');
					$li.addClass('thx-assert-warn');
					if (warns[i].msg) {
						var msg = '<pre class="thx-pre-warn">' + warns[i].msg
								+ '</pre>';
						$li.append(msg);
					}
					if (data.failed <= 0) {
						$t.addClass('thx-warn');
					}
				}
				warns = [];
				$$.total += data.total;
				$$.passed += data.passed;
				$$.failed += data.failed;
				$$.warned += data.warned;
				$$.module.increment(data);
			};
		}

		try {
			Harness.ieVersion = (/MSIE\s*(\d+\.?\d*)/i)
					.test(navigator.userAgent || "") ? parseFloat(RegExp.$1, 10)
					: 0;
		} catch (e) {
			Harness.ieVersion = 0;
			if (window.console && window.console.log) {
				window.console.log('Unable to detect IE version: ', e);
			} else {
				throw e;
			}
		}
		// configuration
		Harness.EVTS = [ Harness.EVT_FRAGS_BHTTP, Harness.EVT_FRAG_BHTTP,
				Harness.EVT_FRAG_BDOM, Harness.EVT_FRAG_ADOM,
				Harness.EVT_FRAG_LOAD, Harness.EVT_FRAGS_LOAD ];
		QUnit.config.testTimeout = 10000;
		/*
		 * QUnit.config.autostart = false; function init(event) { QUnit.start(); }
		 */
		QUnit.config.urlConfig
				.push({
					id : 'verbose',
					label : 'Verbose',
					tooltip : 'Show extended information such as HTML result content for each individual test (that supports this feature).'
				});

		// proxy so we can track queue count
		function overrideQUnit(n, fx) {
			var ofx = QUnit[n];
			QUnit[n] = function() {
				fx.apply(QUnit, arguments);
				if (typeof ofx === 'function') {
					try {
						ofx.apply(this, arguments);
					} catch (e) {
						Harness.ok(false, e.message + ' at '
								+ extractStacktrace(e));
					}
				}
			};
		}
		overrideQUnit('module', function() {
			Harness.moduleCount++;
		});
		overrideQUnit('test', function() {
			Harness.testCount++;
		});
		function loader() {
			// visual test progress indicator
			var l = $('.meter');
			var h = Harness;
			if (!h.currentCount) {
				h.currentCount = 0;
			}
			var v = ++h.currentCount;
			var cv = 100;
			var tc = QUnit.config.testNumber ? 2 : h.testCount + 1;
			if (v < tc) {
				cv = v * (100 / tc);
			} else {
				l.removeClass('animate');
			}
			l.addClass(h.currentRun && h.currentRun.failed ? 'thx-fail'
					: h.currentRun && h.currentRun.warned ? 'thx-warn'
							: 'thx-pass');
			l.css('width', cv + '%');
		}

		// listeners
		QUnit.begin(function(data) {
			loader();
			Harness.currentRun = new Run(data);
		});
		QUnit.moduleStart(function(data) {
			Harness.currentRun.pushModule(data);
		});
		QUnit.testStart(function(data) {
			var h = Harness;
			var r = h.currentRun;
			if (!r.currentModule()) {
				r.pushModule(data);
			}
			r.currentModule().pushTest(data);
		});
		QUnit.log(function(data) {
			Harness.currentRun.currentModule().currentTest().asserted(data);
		});
		QUnit.testDone(function(data) {
			Harness.currentRun.currentModule().currentTest().done(data);
			loader();
		});
		QUnit.moduleDone(function(data) {
			Harness.currentRun.currentModule().done(data);
		});
		QUnit.done(function(data) {
			Harness.currentRun.done(data);
			// See
			// https://github.com/axemclion/grunt-saucelabs#test-result-details-with-qunit
			window.global_test_results = data;
		});
	}
};
Harness.init();