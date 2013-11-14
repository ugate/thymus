/* ============================================
   thymus.js version 1.0.0 https://github.com/ugate/thymus

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" basis,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either expressed or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
 */// ============================================
(function() {
	var NS = this.displayName = 'thymus';
	var JQUERY_URL_ATTR = 'data-thx-jquery-url';
	var JQUERY_DEFAULT_URL = 'http://code.jquery.com/jquery.min.js';
	var FRAGS_LOAD_DEFERRED_LOAD_ATTR = 'data-thx-deferred-load';
	var FRAGS_PRE_LOAD_CSS_ATTR = 'data-thx-preload-css';
	var FRAGS_PRE_LOAD_JS_ATTR = 'data-thx-preload-js';
	var DOM_ATTR_TYPES = [ 'type', 'params', 'path', 'result', 'dest' ];
	var DOM_ATTR_AGENT = 'agent';
	var HTTP_METHODS = [ 'GET', 'POST', 'DELETE', 'PUT' ];
	this.TATTR = 'attribute';
	this.TINC = 'include';
	this.TREP = 'replace';
	this.TUPD = 'update';
	this.TYPES_ASYNC = [ this.TATTR, this.TINC, this.TREP, this.TUPD ];
	var eventFuncs = {};
	var eventFuncCnt = 0;
	this.ieVersion = 0;
	this.firstRun = true;
	this.rootRun = true;

	/**
	 * DOM event function that allows listener updates and on/off options
	 * 
	 * @constructor
	 * @param pel
	 *            the parent element that
	 * @param el
	 *            the element that will be broadcasting the event
	 * @param m
	 *            the HTTP method
	 * @param en
	 *            the event name
	 * @param fx
	 *            the function that will be executed when an incoming event is
	 *            received (parameters: current parent element, reference to the
	 *            DOM event function)
	 * @param rfx
	 *            an optional function that will be called once the event has
	 *            completed
	 */
	function DomEventFunc(pel, el, en, m, fx, rfx) {
		var $el = $(el);
		var $pel = $(pel);
		var func = fx;
		var event = en;
		function on() {
			var rtn = func($pel, $(this));
			if (typeof rfx === 'function') {
				rfx(rtn);
			}
		}
		this.update = function(pel, en, fx, add) {
			$pel = pel ? $(pel) : $pel;
			func = fx || func;
			if ((en && en != event) || add == false) {
				$el.off(event, on);
				event = en || event;
			}
			if (add == true) {
				$el.on(event, on);
			}
		};
		this.isMatch = function(m, el) {
			return this.getMethod() == m && this.getElement().is(el);
		};
		this.getElement = function() {
			return $el;
		};
		this.getEvent = function() {
			return event;
		};
		this.getMethod = function() {
			return m;
		};
		this.update(null, null, null, true);
	}

	/**
	 * Adds or updates an event function that will execute the supplied function
	 * when the specified DOM event occurs
	 * 
	 * @param ctx
	 *            the {FragCtx}
	 * @param a
	 *            the action
	 * @param m
	 *            the HTTP method
	 * @param pel
	 *            the parent element
	 * @param el
	 *            the element the event is for
	 * @param evt
	 *            the event name
	 * @param fx
	 *            the function to execute when the event occurs (when the
	 *            function returns <code>true</code> the event listener will
	 *            be turned off)
	 */
	function addOrUpdateEventFunc(ctx, a, m, pel, el, evt, fx) {
		var en = getEventName(evt, false);
		if (el) {
			// prevent duplicating event listeners
			for ( var k in eventFuncs) {
				if (eventFuncs[k].isMatch(m, el) && eventFuncs[k].getEvent() == en) {
					eventFuncs[k].update(pel, null, fx, null);
					return true;
				}
			}
			var fn = a + '.' + m + ++eventFuncCnt;
			var ev = null;
			function fxCheck(rmv) {
				if (rmv === true) {
					eventFuncs[fn].update(null, null, null, false);
					eventFuncs[fn] = null;
				}
			}
			eventFuncs[fn] = new DomEventFunc(pel, el, en, m, fx, fxCheck);
			eventFuncs[fn].getElement().on('remove', function() {
				fxCheck(true);
			});
		} else {
			throw new Error('Cannot register "' + en
					+ '" event for function action "' + fx
					+ '" on element(s) from selector "' + selector
					+ '" prior to being added to the DOM');
			// possible memory leaks may occur on the HTTP functions
			// when dealing with raw data replacements that are removed
			// from the DOM at a later time- currently not being used
			// ev = ' ' + getEventName(evt, true) + '="' + '$(\'' + selector
			// + '\').' + NS + '(\'' + fn + '\',this)"';
		}
		return {
			funcName : fn,
			eventAttrValue : ev,
			eventName : en
		};
	}

	/**
	 * Gets a normalized event name
	 * 
	 * @param n
	 *            the raw event name
	 * @param u
	 *            true to use the "on" prefix
	 */
	function getEventName(n, u) {
		return n && n.toLowerCase().indexOf('on') == 0 ? u ? n : n.substr(2)
				: u ? 'on' + n : n;
	}

	/**
	 * Navigation options
	 * 
	 * @constructor
	 * @param s
	 *            the string that will contain the name of the navigation and
	 *            the options
	 * @param sep
	 *            the separator to extract the name from the options
	 */
	function NavOptions(s, sep) {
		this.name = s ? splitWithTrim(s, sep) : [ '_blank' ];
		this.options = this.name.length > 1 ? this.name[1] : undefined;
		this.history = this.name.length > 2 ? this.name[2] : undefined;
		this.name = this.name[0].toLowerCase();
		this.isFullPageSync = s && this.name && $.inArray(this.name, TYPES_ASYNC) < 0;
	}

	/**
	 * When available, logs a message to the console
	 * 
	 * @param m
	 *            the message to log
	 */
	function log(m) {
		if (m && typeof window.console !== 'undefined'
				&& typeof window.console.log !== 'undefined') {
			window.console.log(ieVersion <= 0 || ieVersion > 9 ? m
					: typeof m.toFormattedString === 'function' ? m
							.toFormattedString() : m);
		}
	}

	/**
	 * Generates an object that has a <code>items</code> property that
	 * contains an array of regular expressions that match the entire attribute
	 * (with any value) for each of the specified attributes
	 * 
	 * @param a
	 *            the array (or comma separated string) of attributes to
	 *            generate JQuery selectors/regular expressions for
	 * @param h
	 *            the HTTP method name
	 * @param t
	 *            the template type (e.g. include, replace, etc.)
	 * @returns a attributes query object
	 */
	function genAttrQueries(a, h, t) {
		var ra = {
			items : [],
			sel : '',
			method : h,
			type : t
		};
		var y = '';
		var x = $.isArray(a) ? a : a && typeof a === 'string' ? a.split(',')
				: [];
		for ( var i = 0; i < x.length; i++) {
			y = '[' + x[i] + ']';
			ra.items.push({
				name : x[i],
				sel : y,
				regExp : new RegExp('\\s' + x[i] + '=[\\"|\'](.*?)[\\"|\']',
						'ig')
			});
			ra.sel += ra.sel.length > 0 ? ',' + y : y;
		}
		return ra;
	}

	/**
	 * Determines if a specified element is a top level DOM element
	 * 
	 * @param el
	 *            the element to check
	 * @returns true when the element is a top level element
	 */
	function isTopLevelEl(el) {
		if (!el) {
			return false;
		}
		var tn = el.prop('tagName');
		tn = tn ? tn.toLowerCase() : null;
		return tn === 'html' || tn === 'head';
	}

	/**
	 * Refreshes the named anchor for the page (if any)
	 */
	function refreshNamedAnchor() {
		var i = location.href.lastIndexOf('#');
		if (i >= 0) {
			location.href = location.href.substring(i);
		}
	}

	/**
	 * Extracts value(s) from node(s) returned from the supplied JQuery
	 * selector. The JQuery selector can also contain a type that will determine
	 * how value(s) are captured from node(s) returned from the JQuery selector.
	 * The &quot;type&quot; regular expression will be used to determine what
	 * will be used to extract values from the returned nodes from the JQuery
	 * selector. Possible values are &quot;text&quot;, &quot;html&quot; or an
	 * attribute name or when nothing is defined JQuery's serializeArray() will
	 * be called on the node(s). When serializeArray() is empty an attempt to
	 * call JQuery's val() function will be made to retrieve the replacement
	 * value.
	 * 
	 * @param s
	 *            the string that will contain just a JQuery selector or a
	 *            JQuery selector and a type that indicates how to extract
	 *            value(s) from the node(s) returned by the JQuery selector
	 *            (delimited by character(s) defined by the type regular
	 *            expression)
	 * @param trx
	 *            the regular expression that will be used to find the type of
	 *            node value extraction (match should return at least two
	 *            values- the 1st being the JQuery selector and the 2nd being
	 *            the type)
	 * @param d
	 *            the delimiter to use when multiple results are returned from a
	 *            JQuery selector
	 * @param useNameId
	 *            true to use name(s) (or id if a name is not present) along
	 *            with the value(s) (separated by <code>=</code>); false to
	 *            use only the value(s)
	 * @param el
	 *            the DOM element that will be used to find siphoned values on
	 *            (when omitted the current document will be queried)
	 * @returns the siphoned string with replaced values returned from all/any
	 *          found JQuery selector(s)
	 */
	function extractValues(s, trx, d, useNameId, el) {
		function getEV(nv, n, v, d) {
			return (d && nv.length > 0 ? d : '') + (n ? n + '=' : '')
					+ v;
		}
    	function exNVs(t, $x) {
            var nv = '';
            var ci = '';
            if (!t) {
            	// it would be nice if we could check if has
				// val(), but an empty string may be
				// returned by val() so serialize array is
				// checked instead
				nv = useNameId ? $x.serialize() : $x.serializeArray();
                if (!nv || nv.length <= 0) {
                	nv = '';
					$x.each(function() {
						ci = $(this);
						nv += getEV(nv, useNameId ? ci.prop('name') : null,
								ci.val(), d);
					});
				} else if (!useNameId) {
					var nva = nv;
					nv = '';
					$.each(nva, function() {
						nv += getEV(nv, null, this.value, d);
					});
				}
            } else {
				var ist = t.toLowerCase() == 'text';
				var ish = t.toLowerCase() == 'html';
				var n = '';
				$x.each(function() {
					ci = $(this);
					n = useNameId ? ci.prop('name') : null;
					nv += getEV(nv, n, ist ? ci.text() : ish ? ci.html()
							: ci.attr(t), d);
				});
            }
            return nv !== undefined && nv != null ? nv : s;
    	}
	    if (s) {
	        var x = s;
	        var t = '';
	        s.replace(trx, function(m, v1, v2) {
	            x = v1;
	            t = v2 ? v2 : '';
	        });
	        var $x = x ? el ? el.find(x) : $(x) : null;
	        if ($x && $x.length > 0) {
	        	return exNVs(t, $x);
	        }
	    }
	    return '';
	}

	/**
	 * Recursively replaces values found within a string with values found from
	 * JQuery selector(s). Results from each JQuery string found will use the
	 * &quot;type&quot; regular expression to determine what will be used to
	 * extract values from the returned nodes from the JQuery selector. Possible
	 * values are &quot;text&quot;, &quot;html&quot; or an attribute name or
	 * when nothing is defined JQuery's serializeArray() will be called on the
	 * node(s). When serializeArray() is empty an attempt to call JQuery's val()
	 * function will be made to retrieve the replacement value.
	 * 
	 * @param s
	 *            the string to replace JQuery selectors in
	 * @param vrx
	 *            the regular expression that will be used to extact variable
	 *            paths/names
	 * @param vars
	 *            the associative array cache of name/value variables that will
	 *            be used for substituting values within the passed string
	 * @param rx
	 *            the regular expression that will be used to find the JQuery
	 *            selector(s) (replace function is used so the 1st value should
	 *            be the raw JQuery selector- no other characters allowed)
	 * @param trx
	 *            the regular expression that will be used to find the type of
	 *            node value extraction (match should return at least two
	 *            values- the 1st being the JQuery selector and the 2nd being
	 *            the type)
	 * @param d
	 *            the delimiter to use when multiple results are returned from a
	 *            JQuery selector
	 * @param useNameId
	 *            true to use name(s) (or id if a name is not present) along
	 *            with the value(s) (separated by <code>=</code>); false to
	 *            use only the value(s)
	 * @param el
	 *            the DOM element that will be used to find siphoned values on
	 *            (when omitted the current document will be queried)
	 * @returns the siphoned string with replaced values returned from all/any
	 *          found JQuery selector(s)
	 */
	function siphonValues(s, vrx, vars, rx, trx, d, useNameId, el) {
		// siphon variable values
		function sVars(s, vrx, c, el) {
			return s.replace(vrx, function(m, v) {
				return sVars(v, vrx, c, el);
			});
		}
		// siphon node values
		function sVals(s, rx, trx, d, useNameId, el) {
			return s.replace(rx, function(m, v) {
				return sVals(extractValues(v, trx, d, useNameId, el), rx, trx,
						d, useNameId, el);
			});
		}
		return s ? sVals(sVars(s, vrx, vars, el), rx, trx, d, useNameId, el)
				: '';
	}

	/**
	 * Function constructor that evaluates an expression string to determine if
	 * it is a valid function within the current window. When the function
	 * exists it will be made available for execution along with any arguments
	 * that may have been declared within the passed string. An attempt will be
	 * made during execution of the function to pass any arguments that match
	 * the name/key in the specified argument array. A special argument
	 * substitution is given to an argument with a key/name of &quot;event&quot;
	 * that pass the event object as one of the arguments.
	 * 
	 * @constructor
	 * @param opts
	 *            the options for function and argument extraction
	 * @param fs
	 *            function string (can contain arguments)
	 * @param am
	 *            an associative array with the key/index relative to an
	 *            argument name and the value as the argument value
	 * @param nn
	 *            true to exclude running of functions where the supplied
	 *            function string is not surrounded in parenthesis
	 * @returns {Func}
	 */
	function Func(opts, fs, am, nn) {
		try {
			var f = !nn && typeof window[fs] === 'function' ? window[fn] : undefined;
			var a = null;
			this.isValid = typeof f === 'function';
			this.setArgs = function(nam) {
				if (this.isValid) {
					if ($.isArray(a) && a.length > 0) {
						var ia = nam && $.isArray(nam);
						for (var i=0; i<a.length; i++) {
							a[i] = a[i].replace(opts.regexFuncArgReplace,
									'');
							if (a[i] == 'event' && !ia) {
								a[i] = nam;
							} else if (ia && nam[a[i]]) {
								a[i] = nam[a[i]];
							}
						}
					} else if (typeof nam === 'object') {
						a = nam;
					}
				}
			};
			if (!f) {
				var fn = opts.regexFunc.exec(fs);
				if (fn) {
					fn = fn[0];
					if (fn) {
						a = fs.substring(fn.length, fs.lastIndexOf(')'));
					}
					fn = fs.split('(')[0];
					if (typeof window[fn] === 'function') {
						f = window[fn];
						this.isValid = true;
						if (a && a.length > 0) {
							a = a.match(opts.regexFuncArgs);
							this.setArgs(am);
						} else if (am) {
							this.setArgs(am);
						}
					}
				}
			}
			function amts(am) {
				var x = '';
				if (am) {
					for ( var k in am) {
						x += k + '=' + am[k] + ',';
					}
				}
				return x.length > 1 ? '[' + x.substring(0, x.length - 2) + ']' : '';
			}
			this.run = function(thisArg, nam) {
				if (this.isValid) {
					try {
						if (nam && a) {
							this.setArgs(nam);
						}
						if ($.isArray(a) && a.length > 0) {
							return f.apply(thisArg, a);
						} else if (a) {
							return f.call(thisArg, a);
						} else {
							return f.call(thisArg);
						}
					} catch (e) {
						log('Error while calling ' + fs + ' ' + amts(am)
								+ ': ' + e);
					}
				}
				return;
			};
		} catch (e) {
			log('Error in ' + fs + ' ' + amts(am) + ': ' + e);
		}
	}

	/**
	 * Splits a string and ensures each element in the returned array is trimmed
	 * of white spaces
	 * 
	 * @param s
	 *            the string to split
	 * @param exp
	 *            the expression to split with
	 * @returns an array of split/trimmed elements
	 */
	function splitWithTrim(s, exp) {
		return $.map(s.split(exp), $.trim);
	}

	/**
	 * thymus.js context constructor
	 * 
	 * @constructor
	 * @param selector
	 *            the JQuery selector responsible for the fragment context
	 * @param script
	 *            the thymus.js script handle
	 * @param opts
	 *            the JQuery options used
	 */
	function FragCtx(selector, script, opts) {
		var ctx = this;
		this.opts = opts;
		var includeReplaceAttrs = opts.includeAttrs.concat(opts.replaceAttrs);
		var protocolForFile = opts.regexFileTransForProtocolRelative
				.test(location.protocol) ? 'http:' : null;
		// construct the JQuery selector that will identify what fragments to
		// load
		var domAttrs = opts.getAttrs.concat(opts.postAttrs
				.concat(opts.putAttrs.concat(opts.deleteAttrs)));
		var fragSelector = getThxSel(includeReplaceAttrs, null, null);
		fragSelector = (fragSelector ? fragSelector + ',' : '')
				+ getThxSel(domAttrs, 'load', '*');
		var urlAttrs = genAttrQueries(opts.urlAttrs, 'GET', TATTR);
		var getAttrs = genAttrQueries(opts.getAttrs, 'GET', TINC);
		var postAttrs = genAttrQueries(opts.postAttrs, 'POST', TINC);
		var putAttrs = genAttrQueries(opts.putAttrs, 'PUT', TINC);
		var deleteAttrs = genAttrQueries(opts.deleteAttrs, 'DELETE', TINC);

		/**
		 * Executes a {FragCtx} action
		 * 
		 * @param a
		 *            the action object (or string defining the action name)
		 *            that will be executed
		 * @param p
		 *            the parent element that initiated the execution
		 * @param c
		 *            the c element that initiated the the execution (when not
		 *            present the parent element will be used)
		 */
		this.exec = function(a, p, c) {
			a = typeof a === 'object' ? a : {
				action : a
			};
			var hf = eventFuncs[a.action];
			if (hf && typeof hf.f === 'function') {
				// directly invoke action as a function
				hf.f(p, c);
			} else if (a.action === opts.actionLoadFrags) {
				loadFragments(p, fragSelector, false, null);
			} else if (a.action === opts.actionNavInvoke) {
				if (!a.pathSiphon) {
					log('No path specified for ' + a.action);
					return;
				}
				a.method = a.method ? a.method : 'GET';
				var no = new NavOptions(a.typeSiphon, opts.winOpenOptsSep);
				if (!no.isFullPageSync) {
					// partial page update
					loadFragments(c ? c : p, a, true, null);
				} else {
					// full page transfer
					var t = new FragsTrack(a.selector ? $(a.selector) : $(selector), {});
					var f = new Frag(null, t.scope, t.scope, {
						siphon : a
					});
					broadcast(opts.eventFragChain, opts.eventFragBeforeHttp, t, f);
					f.nav(no);
				}
			} else if (a.action === opts.actionNavRegister) {
				// convert URLs and register event driven navigation
				var t = new FragsTrack(a.selector ? $(a.selector) : $(selector), {});
				var f = new Frag(null, t.scope, t.scope, t);
				htmlDomAdjust(t, f, t.scope, true);
			} else {
				throw new Error('Invalid action: ' + a.action);
			}
		};

		/**
		 * Generates a siphon object
		 * 
		 * @param m
		 *            the HTTP method used by the siphon
		 * @param evt
		 *            the event name of the siphon
		 * @param a
		 *            the optional action that the siphon will execute (valid
		 *            for DOM siphons only)
		 * @param s
		 *            the siphon's JQuery selector
		 * @param el
		 *            the DOM element that will be used to capture dynamic
		 *            siphon attributes from
		 * @param vars
		 *            the associative array cache of names/values variables
		 * @param ml
		 *            true to look for each HTTP method verbs when the method
		 *            supplied is not found on the supplied DOM element
		 * @returns the siphon object
		 */
		function genSiphonObj(m, evt, a, s, el, vars, ml) {
			var so = {
				selector : s ? s : '',
				method : m ? m : opts.ajaxTypeDefault,
				typeSiphon : '',
				eventSiphon : evt,
				paramsSiphon : '',
				pathSiphon : '',
				resultSiphon : '',
				destSiphon : '',
				agentSiphon : '',
				funcName : '',
				isValid : evt && evt.length > 0
			};
			so.captureAttrs = function(el, vars, ml, ow) {
				if (so.isValid && el) {
					so.isValid = addSiphonAttrVals(el, so.method,
							so.eventSiphon, so, DOM_ATTR_TYPES, vars, ml, ow);
					return so.isValid;
				}
				return false;
			};
			if (so.isValid) {
				if (a) {
					so.selector = '';
					so.action = a;
					so.onEvent = '';
				}
				if (el) {
					so.captureAttrs(el, vars, ml, true);
				}
			}
			return so;
		}
		/**
		 * Gets an attribute value using an plug-in option name
		 * 
		 * @param $el
		 *            the element to get the attribute from
		 * @param n
		 *            the name of the plug-in option that will be used in
		 *            retrieving the attribute value
		 * @returns the attribute value
		 */
		function getOptsAttrVal($el, n) {
			if (!n || !$el) {
				return undefined;
			} else {
				var o = null;
				var a = null;
				if ($.isArray(o = opts[n])) {
					for (var i = 0; i < o.length; i++) {
						a = $el.attr(o[i]);
						if (a !== undefined) {
							return a;
						}
					}
				} else if (typeof o === 'string') {
					a = $el.attr(o);
					return a !== undefined ? $el.attr(o) : null;
				}
			}
			return null;
		}

		/**
		 * Adds DOM siphon attributes to an object based upon an array of
		 * attribute names
		 * 
		 * @param $el
		 *            the element that contains the the siphon attributes
		 * @param m
		 *            the HTTP method context
		 * @param evt
		 *            the event name
		 * @param o
		 *            the object where the siphon attribute values will be added
		 *            to
		 * @param ns
		 *            the array of attribute names to look for
		 * @param vars
		 *            the associative array cache of names/values variables
		 * @param ml
		 *            true to look for each HTTP method verbs when the method
		 *            supplied is not found on the supplied DOM element
		 * @param ow
		 *            true to overwrite object properties that already have a
		 *            non-null or empty value
		 * @returns true when the event exists for the given method and the
		 *          siphon attributes have been added
		 */
		function addSiphonAttrVals($el, m, evt, o, ns, vars, ml, ow) {
			if ($el && m && o && evt && $.isArray(ns)) {
				function getAN(m, n) {
					var an = n.charAt(0).toUpperCase() + n.substr(1).toLowerCase();
					an = m + (m == n ? '' : an) + 'Attrs';
					return an;
				}
				function getEI($el, m) {
					var ens = getOptsAttrVal($el, getAN(m, m));
					ens = ens ? splitWithTrim(ens, opts.multiSep) : null;
					return ens ? $.inArray(evt, ens) : -1;
				}
				function getOV($el, an, ei) {
					var ov = getOptsAttrVal($el, an);
					ov = ov ? splitWithTrim(ov, opts.multiSep) : null;
					ov = ov && ei >= ov.length ? ov[ov.length - 1]
							: ov ? ov[ei] : undefined;
					return ov;
				}
				function isAdd(n, o, ow) {
					return o[n] !== undefined && (ow || o[n] == null || o[n].length <= 0);
				}
				function getSAN(m, n) {
					return (m == n ? 'event' : n) + 'Siphon';
				}
				function captureSA($el, m, ei, o, ow) {
					var an = null;
					var n = null;
					var ov = null;
					var agtt = false;
					var agtn = null;
					var agt = null;
					var $agt = null;
					for (var i=0; i<ns.length; i++) {
						n = ns[i].toLowerCase();
						an = getAN(m, n);
						n = getSAN(m, n);
						// only add values for attributes that exist on the
						// passed object and have not yet been set
						if (isAdd(n, o, ow)) {
							// when a siphon attribute corresponds to an event at
							// the same index we use the attribute value at that
							// index- otherwise, we just use the attribute at the
							// last available index
							ov = getOV($el, an, ei);
							if (!ov) {
								// try to lookup an agent that has the attribute (if any)
								if (!agtt) {
									agtt = true;
									agtn = getSAN(m, DOM_ATTR_AGENT);
									agt = getOV($el, getAN(m, DOM_ATTR_AGENT), ei);
									if (agt) {
										// siphon possible selectors
										agt = siphonValues(agt, opts.regexVarSiphon, vars, 
												opts.regexSelectSiphon, opts.regexValTypeSiphon, 
												opts.agentSelSep, false);
									}
									if (isAdd(agtn, o, ow)) {
										o[agtn] = agt;
									}
									if (agt) {
										// capture the agent's siphon attributes
										$agt = $(agt);
										agt = genSiphonObj(m, evt, null,
												$agt.selector, null, vars,
												false);
										$agt.each(function() {
											// 1st come, 1st serve- don't
											// overwrite attributes that have
											// already been set by a previous
											// agent element
											if (!capture($agt, m, agt, false, false, false)) {
												agt = null;
											}
										});
									}
								}
								if (agt && typeof agt === 'object' && agt[n]) {
									o[n] = agt[n];
								} else {
									o[n] = ov;
								}
							} else {
								o[n] = ov;
							}
						}
					}
					return o;
				}
				function capture($el, m, o, re, ml, ow) {
					m = m.toLowerCase();
					var ei = getEI($el, m);
					if (ei < 0) {
						// event is not in the attributes
						if (ml) {
							$.each(HTTP_METHODS, function() {
								var gm = this.toLowerCase();
								if (gm != m) {
									ei = getEI($el, gm);
									if (ei >= 0) {
										m = gm;
										return false;
									}
								}
							});
							if (ei < 0) {
								if (re) {
									return false;
								}
								ei = 0;
							}
						} else {
							if (re) {
								return false;
							}
							ei = 0;
						}
					}
					captureSA($el, m, ei, o, ow);
					return true;
				}
				return capture($el, m, o, true, ml, ow);
			}
			return false;
		}

		/**
		 * Updates a navigation {Frag} for an array object returned from
		 * <code>genAttrQueries</code>. Updates will be made to paths when
		 * needed. Also, any DOM driven events will be registered that will
		 * listen for incoming events that will trigger fragment loading/submission. When DOM driven events are previously processed
		 * 
		 * @param t
		 *            the {FragsTrack}
		 * @param f
		 *            the {Frag}
		 * @param a
		 *            an array object returned from <code>genAttrQueries</code>
		 * @param ai
		 *            the index of the array object
		 * @param v
		 *            the navigation attribute value to use in the update
		 * @param el
		 *            the optional element that will be altered
		 * @returns a navigation object or string when a simple attribute update
		 *          has been made or needs to be made
		 */
		function updateNav(t, f, a, ai, v, el) {
			if (a.type === TATTR) {
				if (el) {
					if (!script.is(el)) {
						el.attr(a.items[ai].name, absolutePath(el
								.attr(a.items[ai].name), t.ctxPath));
					}
					return '';
				} else {
					return ' ' + a.items[ai].name + '="'
							+ absolutePath(v, t.ctxPath) + '"';
				}
			}
			var evts = splitWithTrim(v, opts.multiSep);
			var rs = [];
			$.each(evts, function(i, ev) {
				if (ev.toLowerCase() == 'load') {
					// load events are picked up by normal fragment loading
					return;
				}
				var r = genSiphonObj(a.method, ev, opts.actionNavInvoke, null,
						null, t.vars, false);
				if (r.isValid) {
					r.eventAttrs = a.items;
					r.typeSiphon = a.type;
					var rtn = addOrUpdateEventFunc(ctx, r.action, r.method,
							f.pel, el, r.eventSiphon, function(pel, ib) {
								var $ib = $(ib);
								if (!r.captureAttrs($ib, t.vars, false, true)) {
									// the event is no longer valid because the
									// method/event attribute has removed the
									// event since its registration- thus we
									// need to trigger a removal of the event
									// listener by returning true
									return true; 
								}
								r.selector = ib;
								ctx.exec(r, pel, ib);
								return false;
							});
					r.onEvent = rtn.eventAttrValue;
					r.eventSiphon = rtn.eventName;
					rs[rs.length] = r;
				} else {
					t.addError('Expected an event for action "'
							+ opts.actionNavInvoke + '" and method "'
							+ r.method + '"', f, null, null, null);
				}
			});
			return rs;
		}

		/**
		 * Converts HTTP driven attributes to corresponding DOM events that will
		 * make thymus.js handles
		 * 
		 * @param t
		 *            the {FragsTrack}
		 * @param f
		 *            the {Frag}
		 * @param a
		 *            an object returned from <code>genAttrQueries</code>
		 * @param s
		 *            the string or element which will contain the attributes to
		 *            update
		 * @returns the string with the converted HTTP driven attributes
		 */
		function updateNavAttrs(t, f, a, s) {
			var r = '';
			s = typeof s === 'string' ? s : $(s);
			if (typeof s === 'string') {
				for ( var i = 0; i < a.items.length; i++) {
					s = s.replace(a.items[i].regExp, function(m, v) {
						r = updateNav(t, f, a, i, v, null);
						return typeof r === 'string' ? r
								: r.isValid ? r.onEvent : v;
					});
				}
			} else {
				var v = '';
				s.find(a.sel).each(function() {
					var $c = $(this);
					for ( var i = 0; i < a.items.length; i++) {
						v = $c.attr(a.items[i].name);
						if (v) {
							r = updateNav(t, f, a, i, v, $c);
						}
					}
				});
			}
			return s;
		}

		/**
		 * Replaces any path-relative <code>opts.urlAttrs</code> values with
		 * an absolute counterpart relative to the fragments location and the
		 * context path defined on for the thumus.js script
		 * 
		 * @param t
		 *            the {FragsTrack}
		 * @param f
		 *            the {Frag}
		 * @param s
		 *            the raw data content string
		 * @returns content adjusted data content string
		 */
		function htmlDataAdjust(t, f, s) {
			//s = s.replace(/\<(\?xml|(\!DOCTYPE[^\>\[]+(\[[^\]]+)?))+[^>]+\>/g, '');
			s = updateNavAttrs(t, f, urlAttrs, s);
			return s;
		}

		/**
		 * Applies any DOM adjustments that need to be made after a template has
		 * been placed in the DOM
		 * 
		 * @param t
		 *            the {FragsTrack}
		 * @param f
		 *            the {Frag}
		 * @param s
		 *            the DOM element source to be adjusted
		 * @param uu
		 *            true to update any relative URLs to their absolute
		 *            counterparts
		 */
		function htmlDomAdjust(t, f, s, uu) {
			if (uu) {
				updateNavAttrs(t, f, urlAttrs, s);
			}
			updateNavAttrs(t, f, getAttrs, s);
			updateNavAttrs(t, f, postAttrs, s);
			updateNavAttrs(t, f, putAttrs, s);
			updateNavAttrs(t, f, deleteAttrs, s);
		}

		/**
		 * Converts a relative path to an absolute path
		 * 
		 * @param relPath
		 *            the relative path to convert
		 * @param absPath
		 *            the absolute path to do the conversion from
		 * @returns the absolute path version of the relative path in relation to
		 *          the provided absolute path (or just the supplied relative path
		 *          when it's really an absolute path)
		 */
		function absolutePath(relPath, absPath) {
			var absStack, relStack, i, d;
			relPath = relPath || '';
			if (opts.regexIanaProtocol.test(relPath)) {
				return urlAdjust(relPath, protocolForFile);
			}
			absPath = absPath ? absPath.replace(opts.regexAbsPath, '') : '';
			absStack = absPath ? absPath.split(opts.pathSep) : [];
			relStack = relPath.split(opts.pathSep);
			for (i = 0; i < relStack.length; i++) {
				d = relStack[i];
				if (d == '.') {
					continue;
				}
				if (d == '..') {
					if (absStack.length) {
						absStack.pop();
					}
				} else {
					absStack.push(d);
				}
			}
			return absStack.join(opts.pathSep);
		}

		/**
		 * Extracts a fragment/include/replacement attribute from a given element. When
		 * the element is the thymus script then an attempt will be made to pull
		 * the <code>opts.fragHeadAttr</code> attribute off the script and
		 * extract the specified attribute from that value.
		 * 
		 * @param $f
		 *            the element to extract the attribute from
		 * @param attrs
		 *            the attributes to extract
		 */
		function getFragAttr($f, attrs) {
			function ga(a) {
				var fa = undefined;
				var a2 = undefined;
				for ( var i = 0; i < attrs.length; i++) {
					a2 = attrs[i].replace('\\', '');
					if (a) {
						if (a == a2) {
							return a2;
						}
					} else {
						fa = $f.attr(a2);
						if (typeof fa !== 'undefined') {
							return fa;
						}
					}
				}
				return null;
			}
			if ($f.prop('id') == NS) {
				// when the attribute is used on the current script tag then pull the
				// attribute off the script and extract the
				// fragment/include/replacement
				var fa = $f.attr(opts.fragHeadAttr);
				if (fa) {
					var fas = fa.split('=');
					if (fas.length == 2) {
						return ga(fas[0]) ? fas[1] : null;
					} else {
						throw new Error(NS + ' has invalid atrtribute ' + 
								opts.fragHeadAttr + '="' + 
								fa + '" for ' + attr);
					}
				}
			} else {
				return ga(null);
			}
		}

		/**
		 * Gets a file extension from a URL
		 * 
		 * @param url
		 *            the URL to get the file extension from
		 * @returns the file extension for the supplied URL (or empty when not
		 *          present)
		 */
		function getFileExt(url) {
			var x = getFile(url);
			if (x) {
				x = x.split('.');
				x = x.length > 1 ? '.' + x[x.length - 1] : '';
			}
			return x;
		}

		/**
		 * Gets a file name
		 * 
		 * @param url
		 *            the URL to get the file file name from
		 * @returns the file name for the supplied URL (or empty when not present)
		 */
		function getFile(url) {
			var f = '';
			if (url) {
				var fs = url.match(opts.regexFileName);
				if (fs && fs.length > 0) {
					f = fs[0];
				}
			}
			return f;
		}

		/**
		 * Fragment result selector
		 * 
		 * @constructor
		 * @param rs
		 *            the raw result siphon string
		 * @param vars
		 *            the associative array cache of names/values variables
		 */
		function FragResultSel(rs, vars) {
			rs = rs ? $.trim(rs) : null;
			var rsp = null;
			var fx = null;
			var cel = null;
			this.getFunc = function() {
				return fx;
			};
			this.resultSiphon = function(el, rsn) {
				rsp = rsn ? rsn : rsp;
				if (!rsp || rsn || (el && el.nodeType && !el.is(cel))) {
					rsp = siphonValues(rs, opts.regexVarSiphon, vars,
							opts.regexSelectSiphon, opts.regexValTypeSiphon,
							opts.resultSep, false, el);
					// check if the result siphon is a function
					fx = new Func(opts, rsp, null, true);
					cel = el;
				}
				return rsp;
			};
			this.getFuncOrResultSiphon = function() {
				return this.getFunc() && this.getFunc().isValid ? this
						.getFunc().run : this.resultSiphon();
			};
			// retrieves the JQuery selector for capturing a fragments content
			this.getSel = function(el, rsn) {
				var crs = this.resultSiphon(el, rsn);
				return crs && (!fx || !fx.isValid) ? crs
						+ (this.usesFragAttr() ? ','
								+ getThxSel(opts.fragAttrs, crs, null) : '')
						: '';
			};
			this.usesFragAttr = function() {
				return rsp && opts.regexFragName.test(rsp);
			};
		}

		/**
		 * Gets the fragment JQuery selector
		 * 
		 * @param a
		 *            the of array of fragment attributes (matches any)
		 * @param v
		 *            the optional attribute value to match for each item in the
		 *            array
		 * @param ed
		 *            the optional equals designation that will prepended to the
		 *            equals sign (when a valid attribute value is supplied)
		 * @returns JQuery selector
		 */
		function getThxSel(a, v, ed) {
			var r = '';
			var as = $.isArray(a) ? a : [ a ];
			for (var i = 0; i < as.length; i++) {
				r += (i > 0 ? ',' : '') + '[' + as[i]
						+ (v ? (ed ? ed : '') + '="' + v + '"' : '') + ']';
			}
			return r;
		}

		/**
		 * Adjusts a path to conform to the specified context (if needed) and
		 * applies the provided file extension (or inherits the current pages
		 * file extension)
		 * 
		 * @param c
		 *            the context path
		 * @param p
		 *            the path to adjust
		 * @param x
		 *            the file extension to apply
		 */
		function adjustPath(c, p, x) {
			x = x && p.lastIndexOf(opts.pathSep) != (p.length - 1) ? 
					x.toLowerCase() == opts.inheritRef ? getFileExt(location.href)
					: getFileExt(p) ? '' : x
					: '';
			if (x) {
				p += x;
			}
			p = absolutePath(p, c);
			return p;
		}

		/**
		 * Gets the context path used to resolve paths to fragments and URLs within
		 * href/src/etc. attributes contained in fragments
		 */
		function getScriptCtxPath() {
			var c = getScriptAttr(opts.contextPathAttr);
			if (!c) {
				c = opts.pathSep;
			}
			// capture the absolute URL relative to the defined context path attribute
			// value
			c = absolutePath(c, window.location.href);
			c += c.lastIndexOf(opts.pathSep) != c.length - 1 ? opts.pathSep : '';
			return c;
		}

		/**
		 * Gets an attribute of the current script
		 * 
		 * @param attr
		 *            the attribute to extract
		 */
		function getScriptAttr(attr) {
			if (!attr) {
				return null;
			}
			var $s = script;
			if ($s && $s.length > 0) {
				return $s.attr(attr);
			}
		}

		/**
		 * Broadcasts a fragment(s) event
		 * 
		 * @param evt
		 *            the event to broadcast (should contain a
		 *            <code>source</code> or <code>scope</code> property
		 *            that will contain the element to trigger the event)
		 * @returns true when the event has requested to prevent the default
		 *          action
		 */
		function broadcastFragEvent(evt) {
			try {
				var el = evt.source ? evt.source : evt.scope;
				el.trigger(evt);
				var sfc = script && evt.chain === opts.eventFragChain ? script
						.attr(opts.fragListenerAttr)
						: null;
				var sfsc = script && evt.chain === opts.eventFragsChain ? script
						.attr(opts.fragsListenerAttr)
						: null;
				if (sfc || sfsc) {
					var fs = sfc ? sfc : sfsc;
					if (fs) {
						try {
							var f = new Func(opts, fs, evt);
							if (f.isValid) {
								if (f.run(el) == false) {
									evt.preventDefault();
									evt.stopPropagation();
								}
							}
						} catch (e) {
							log('Error in ' + fs + ' ' + (evt ? evt : '') + ': ' + e);
						}
					}
				}
				return evt.isDefaultPrevented();
			} catch (e) {
				log('Error in ' + evt.type + ' ' + (evt ? evt : '') + ': ' + e);
			}
			return false;
		}

		/**
		 * Broadcasts a JQuery event
		 * 
		 * @param chain
		 *            the event chain
		 * @param type
		 *            the type of event
		 * @param t
		 *            the {FragsTrack} used (if any)
		 * @param f
		 *            the {Frag} the event is being issued for (if any)
		 */
		function broadcast(chain, type, t, f) {
			if (!opts.eventIsBroadcast) {
				return;
			}
			function fire() {
				return broadcastFragEvent(chain == opts.eventFragChain ? genFragEvent(
						type, t, f)
						: genFragsEvent(type, t));
			}
			if (chain == opts.eventFragChain || chain == opts.eventFragsChain) {
				if (type == opts.eventFragAfterDom
						|| type == opts.eventFragLoad
						|| type == opts.eventFragsLoad) {
					fire();
				} else if (f && !f.rp()) {
					t.addError('Invalid URL for ' + f.toString(), f, null,
							null, null);
					t.ccnt++;
					f.cancelled = true;
				} else if (f) {
					f.cancelled = fire();
					if (f.cancelled) {
						t.ccnt++;
					}
				}
			}
		}

		/**
		 * {Frag} tracking mechanism to handle multiple {Frag}s
		 * 
		 * @constructor
		 * 
		 * @param s
		 *            the scope element(s) of the tracking
		 * @param siphon
		 *            the template selection used for tracking
		 * @param isRoot
		 *            true when the root frament selection is the actual
		 *            template element
		 */
		function FragsTrack(s, siphon) {
			var start = new Date();
			this.vars = [];
			this.isTopLevel = isTopLevelEl(s);
			this.ctxPath = getScriptCtxPath();
			this.isScopeSelect = siphon && s.is(siphon.selector);
			this.scope = s;
			this.siphon = siphon;
			this.ccnt = 0;
			this.cnt = 0;
			this.len = 0;
			var c = [];
			this.addFrag = function(f) {
				if (c[f.rp()]) {
					c[f.rp()].frags[c[f.rp()].frags.length] = f;
					return false;
				} else {
					c[f.rp()] = {
						result : null,
						status : null,
						xhr : null,
						frags : [ f ]
					};
				}
				return true;
			};
			this.getFrags = function(url) {
				return c[url];
			};
			var e = [];
			this.addError = function(em, f, oc, hs, xhr) {
				function newError(f) {
					var e = new Error(em);
					var o = {
							cause : oc,
							status : hs,
							statusCode : xhr ? xhr.status : null
						};
					if (f) {
						o.fragSrc = addFragProps({}, this, f);
					}
					$.extend(e, o);
					return e;
				}
				if (f) {
					f.e = newError();
					e[e.length] = newError(f);
				} else {
					e[e.length] = newError();
				}
			};
			this.getErrors = function() {
				return e;
			};
			this.elapsedTime = function(t) {
				return (t ? t : (new Date()).getTime()) - start.getTime();
			};
		}

		/**
		 * Fragment constructor
		 * 
		 * @constructor
		 * @param pf
		 *            the parent fragment (if any)
		 * @param $pel
		 *            the parent element that initiated the creation of the
		 *            fragment
		 * @param $fl
		 *            the fragment loaded from source DOM element
		 * @param t
		 *            the optional template selector
		 */
		function Frag(pf, $pel, $fl, t) {
			var ctx = this;
			//var isHead = $fl instanceof jQuery ? $fl.is('head') : false;
			this.pf = pf;
			this.pel = $pel;
			this.el = $fl;
			var a = null;
			var loadSiphon = null;
			var siphon = t.siphon;
			// scope select will identify if fragment details will come from the
			// passed tracking siphon or extracted by fragment attributes
			if (!t.isScopeSelect
					&& (loadSiphon = genSiphonObj(opts.ajaxTypeDefault, 'load',
							null, siphon.selector, this.el, t.vars, true)).isValid) {
				// DOM routing attribute for a load event will take presedence
				// over short-hand include/replace/etc.
				siphon = loadSiphon;
			} else if (!t.isScopeSelect) {
				a = getFragAttr($fl, opts.includeAttrs);
			} else {
				a = null;
			}
			var forcett = siphon.typeSiphon;
			this.dt = forcett ? siphon.typeSiphon : TATTR;
			this.method = siphon.method ? siphon.method
					: opts.ajaxTypeDefault;
			if (!a && !t.isScopeSelect) {
				a = getFragAttr($fl, opts.replaceAttrs);
				if (!forcett) {
					this.dt = TREP;
				}
			} else if (!forcett) {
				this.dt = TINC;
			}
			a = a ? a.split(opts.multiSep) : null;
			this.event = siphon.eventSiphon;
			var ps = siphon.paramsSiphon;
			var rp = !a ? siphon.pathSiphon : a && a.length > 0 ? $.trim(a[0])
					: null;
			var rs = !a ? siphon.resultSiphon : a && a.length > 1 ? $.trim(a[1])
					: null;
			var dsp = !a ? siphon.destSiphon : this.el;
			this.ds = function(dsn) {
				dsp = dsn ? dsn : dsp;
				if (!dsp || dsn) {
					dsp = siphonValues(dsp, opts.regexVarSiphon, t.vars,
							opts.regexSelectSiphon, opts.regexValTypeSiphon,
							opts.destSep, false);
				}
				return dsp;
			};
			if (rp && rp.length > 0
					&& rp.toLowerCase() != opts.selfRef.toLowerCase()) {
				rp = adjustPath(t.ctxPath, rp, script ? script
						.attr(opts.fragExtensionAttr) : '');
			} else if (rs && rs.length > 0) {
				rp = opts.selfRef;
			}
			var rpp = null;
			this.rp = function(rpn) {
				rp = rpn ? rpn : rp;
				if (!rpp || rpn) {
					rpp = siphonValues(rp, opts.regexVarSiphon, t.vars,
							opts.regexSelectSiphon, opts.regexValTypeSiphon,
							opts.pathSep, false);
				}
				return rpp;
			};
			this.frs = new FragResultSel(rs, t.vars);
			this.src = null;
			this.e = null;
			this.cancelled = false;
			var wcnt = 1;
			this.ccnt = function(a) {
				if (a) {
					wcnt++;
				} else if (a == false && --wcnt == 0) {
					// no longer waiting for any more child fragments to complete
					t.cnt++;
					broadcast(opts.eventFragChain, opts.eventFragLoad, t, this);
				}
				return wcnt;
			};
			if (this.pf) {
				// increment child fragment count on parent fragment
				this.pf.ccnt(true);
			}
			var psp = null;
			this.ps = function(uj, psn) {
				ps = psn ? psn : ps;
				// parameter siphons can capture either JSON or URL encoded strings
				if ((ps && !psp) || psn || (!uj && typeof psp === 'object')
						|| (uj && typeof psp === 'string')) {
					psp = siphonValues(ps, opts.regexVarSiphon, t.vars,
							opts.regexSelectSiphon, opts.regexValTypeSiphon,
							opts.paramSep, true);
					psp = uj ? $(psp).serializeArray() : $(psp).serialize();
				}
				return psp;
			};
			this.as = siphon.agentSiphon;
			this.done = function() {
				if (!this.cancelled) {
					this.ccnt(false);
				} else {
					t.cnt++;
				}
				// decrement parent fragments child count
				var x = this;
				while (x = x.pf) {
					x.ccnt(false);
				}
			};
			this.domDone = function(hasErrors) {
				// DOM done, but child fragments may exist
				if (!this.cancelled && !hasErrors) {
					broadcast(opts.eventFragChain, opts.eventFragAfterDom, t, this);
				}
			};
			this.px = function(x, xhr, ts, e) {
				broadcast(opts.eventFragChain, opts.eventFragBeforeDom, t, this);
				if (this.cancelled) {
					this.domDone(false);
					return;
				}
				if (ts || e) {
					t.addError('Error at ' + this.toString() + ': ' + ts + '- '
							+ e, this, e, ts, xhr);
					this.domDone(true);
					return;
				}
				var xIsJ = x instanceof jQuery;
				if (xIsJ && x.is('script')) {
					if (xhr && xhr.status != 200) {
						t.addError(xhr.status + ': ' + ts
								+ ' path siphon="' + this.rp() + '"', this, e, ts, xhr);
						this.domDone(true);
						return;
					} else if (!xhr && this.rp() && this.frs.resultSiphon()) {
						var sdi = this.rp().indexOf('data:text/javascript,');
						var ss = x.prop('type');
						$('<script' + (typeof ss === 'string' && ss.length > 0 ? 
							' type="' + ss + '">' : '>') + (sdi > -1 ? 
								this.rp().substr('data:text/javascript,'.length) : this.rp()) + 
									'</script>').appendTo(this.frs.resultSiphon());
					}
				} else {
					var im = this.isModel(xhr);
					if (this.dt === TREP) {
						var $d = this.ds() ? $(this.ds()) : this.el;
						try {
							var $x = $(x);
							$d.replaceWith($x);
							this.src = $x;
						} catch (e) {
							// node may contain top level text nodes
							var $x = $d.parent();
							$d.replaceWith(x);
							this.src = $x;
						}
					} else if (this.dt === TINC || this.dt === TUPD) {
						if (this.ds() || this.dt === TUPD) {
							var $d = this.ds() ? $(this.ds()) : null;
							if ($d) {
								if (this.dt === TUPD) {
									// remove any existing fragments that may exist
									// under the destination that match the fragment
									// selection
									$d.find(this.frs.getSel(x)).remove();
								}
								$d.append(x);
							} else {
								if (this.dt === TUPD) {
									// remove any existing content that may exist
									// under the element
									this.el.contents().remove();
								}
								this.el.append(x);
							}
						} else {
							this.el.append(x);
						}
						this.src = x;
					}
					// make post template DOM adjustments- no need for URL updates-
					// they needed to be completed prior to placement in the DOM or
					// URLs in some cases will be missed (like within the head)
					htmlDomAdjust(t, ctx, this.src, false);
				}
				this.domDone(false);
			};
			this.nav = function(no) {
				no = no ? no : new NavOptions(this.dt, opts.winOpenOptsSep);
				var vars = null;
				if (this.method.toLowerCase() != 'get') {
					// for performance we'll build input strings versus nodes
					// before we simulate the synchronous form submission/page
					// transfer
					var fd = $('<form style="display:none;" action="' + this.rp()
							+ '" method="' + this.method + '" />');
					vars = this.ps(true);
					var ips = '';
					for (var i = 0; i < vars.length; i++) {
						ips += '<input name="' + vars[i].name + '" value="'
								+ vars[i].value + '" />';
					}
					fd.append(ips);
					var win = null;
					if (no.name == '_blank') {
						win = window.open('about:blank', no.name, no.options,
								no.history);
						win.document.write('<html><body></body></html>');
					} else {
						win = no.name != '_self' ? window[str.charAt(0) == '_' ? no.name
								.substring(1)
								: no.name]
								: window;
					}
					win.$('body').append(fd);
					fd.submit();
				} else {
					var loc = this.rp();
					var vars = this.ps();
					if (vars) {
						loc += '?' + vars;
					}
					window.open(loc, no.name, no.options, no.history);
				}
			};
			this.isModel = function(xhr) {
				var mt = xhr ? xhr.getResponseHeader('Content-Type') : null;
				return mt && (mt.indexOf('json') >= 0 || mt.indexOf('xml') >= 0);
			};
			this.isSimpleView = function(xhr) {
				var mt = xhr ? xhr.getResponseHeader('Content-Type') : null;
				return mt && (mt.indexOf('text/plain') >= 0 || mt.indexOf('octet-stream') >= 0);
			};
			this.isFullView = function(xhr) {
				return !this.isModel(xhr) && !this.isSimpleView(xhr);
			};
			this.getStack = function() {
				var us = [];
				var cf = this;
				do {
					us[us.length] = {
						pathSiphon : cf.rp(),
						resultSiphon : cf.frs.getFuncOrResultSiphon(),
						destination : cf.ds(),
						source : cf.src
					};
				} while ((cf = cf.pf));
				return us;
			};
			this.toString = function() {
				return this.constructor.name + ' -> type: ' + this.dt
						+ ', HTTP method: ' + this.method
						+ ', parameter siphon: ' + this.ps()
						+ ', path siphon: ' + this.rp() + ', result siphon: '
						+ this.frs.getFuncOrResultSiphon()
						+ ', destination siphon: ' + this.ds()
						+ ', agent siphon' + this.as + ', cancelled: '
						+ this.cancelled + ', error: ' + this.e;
			};
		}

		/**
		 * Adds normalized {Frag} properties, functions, etc. to the supplied
		 * object
		 * 
		 * @param o
		 *            the object that the proprties will be added to
		 * @param t
		 *            the {FragsTrack} used
		 * @param f
		 *            the {Frag} the event is being issued for
		 * @returns the passed object
		 */
		function addFragProps(o, t, f) {
			o.fragCount = t.cnt;
			o.fragCurrTotal = t.len;
			o.fragPendingPeerCount = f && f.pf ? f.pf.ccnt(null) : 0;
			o.routingStack = f ? f.getStack() : undefined;
			o.sourceEvent = f ? f.event : undefined;
			o.paramsSiphon = f ? f.ps() : undefined;
			o.pathSiphon = f ? f.rp() : undefined;
			o.resultSiphon = f ? f.frs.getFuncOrResultSiphon() : undefined;
			o.destSiphon = f ? f.ds() : undefined;
			o.agentSiphon = f ? f.as : undefined;
			o.source = f ? f.src instanceof jQuery ? f.src : f.el : undefined;
			o.error = f ? f.e : undefined;
			o.scope = t.scope;
			o.chain = opts.eventFragChain;
			o.log = function() {
				log(o);
			};
			o.toFormattedString = function() {
				return '[' + o.chain + ' event, fragCount: ' + o.fragCount
						+ ', fragCurrTotal: ' + o.fragCurrTotal
						+ ', sourceEvent: ' + o.sourceEvent + ', paramsSiphon: '
						+ o.paramsSiphon + ', pathSiphon: ' + o.pathSiphon
						+ ', resultSiphon: ' + o.resultSiphon
						+ ', destSiphon: ' + o.destSiphon + ', element: '
						+ o.element + ', error: ' + o.error + ']';
			};
			return o;
		}

		/**
		 * Generates a fragment JQuery event
		 * 
		 * @param type
		 *            the type of fragment event
		 * @param t
		 *            the {FragsTrack} used
		 * @param f
		 *            the {Frag} the event is being issued for
		 * @returns a fragment JQuery event
		 */
		function genFragEvent(type, t, f) {
			var e = $.Event(type);
			addFragProps(e, t, f);
			e.type = type;
			return e;
		}

		/**
		 * Generates a fragments JQuery event
		 * 
		 * @param type
		 *            the type of fragments event
		 * @param t
		 *            the {FragsTrack} used
		 * @returns a fragments JQuery event
		 */
		function genFragsEvent(type, t) {
			var e = $.Event(type);
			e.chain = opts.eventFragsChain;
			e.fragCancelCount = t.ccnt;
			e.fragCount = t.cnt;
			e.scope = t.scope;
			e.errors = t.getErrors();
			e.loadTime = t.elapsedTime(e.timeStamp);
			e.log = function() {
				log(this);
			};
			e.toFormattedString = function() {
				return '[' + e.chain + ' event, fragCancelCount: '
						+ e.fragCancelCount + ', fragCount: ' + e.fragCount
						+ ', scope: ' + e.scope + ', errors: ' + e.errors
						+ ', loadTime: ' + e.loadTime + ']';
			};
			return e;
		}

		/**
		 * Loads fragments (nested supported) into the page using a predefined HTML
		 * attribute for fragment discovery. The attribute value should contain a URL
		 * followed by a replacement/include value that will match a fragment result
		 * attribute. For example:
		 * 
		 * <pre>
		 * &lt;!-- source element --&gt;
		 * &lt;div id="parent"&gt;
		 * 	&lt;div th:fragments="path/to/frags :: fragContents"&gt;&lt;/div&gt;
		 * &lt;/div&gt;
		 * &lt;!-- fragment element --&gt;
		 * &lt;div th:fragment="fragContents"&gt;Contents&lt;/div&gt;
		 * </pre>
		 * 
		 * Will result in:
		 * 
		 * <pre>
		 * &lt;!-- when including --&gt;
		 * &lt;div id="parent"&gt;
		 * 	&lt;div th:fragments="path/to/frags :: fragContents"&gt;Contents&lt;/div&gt;
		 * &lt;/div&gt;
		 * &lt;!-- when replacing --&gt;
		 * &lt;div id="parent"&gt;
		 * 	&lt;div th:fragment="fragContents"&gt;Contents&lt;/div&gt;
		 * &lt;/div&gt;
		 * </pre>
		 * 
		 * @param scopeSel
		 *            the selector to the root element where fragments will be looked for
		 * @param siphon
		 *            the siphon/selector to the templates that will be included/replaced
		 * @param altDest
		 *            true to attempt to extract an alternate destination from the template 
		 *            attribute value (falls back on on self destination when not present)
		 * @param func
		 *            the callback function that will be called when all fragments have
		 *            been loaded (parameters: the original root element, the number of
		 *            fragments processed and an array of error objects- if any)
		 */
		function loadFragments(scopeSel, siphon, altDest, func) {
			var $s = $(scopeSel);
			var so = typeof siphon === 'object' ? siphon : {
				selector : siphon
			};
			var t = new FragsTrack($s, so);
			function done(pf, t, f) {
				if (t.cnt > t.len) {
					t.addError('Expected ' + t.len
							+ ' fragments, but recieved ' + t.cnt, f, null,
							null, null);
				}
				if (f) {
					f.done();
				}
				if (t.cnt >= t.len) {
					if (typeof func === 'function') {
						func(t.scope, t.cnt, t.getErrors());
					}
					if (firstRun) {
						firstRun = false;
						refreshNamedAnchor();
					}
					broadcast(opts.eventFragsChain, opts.eventFragsLoad, t);
				}
			}
			function hndlFunc(f, cb, r, status, xhr) {
				if (f.frs.getFunc() && f.frs.getFunc().isValid) {
					f.frs.getFunc().run({
						handle : {
							type : f.dt,
							data : r,
							status : status,
							xhr : xhr,
							fragSrc : addFragProps({}, t, f),
							proceed : function(x) {
								f.px(x);
							}
						}
					});
					cb(null, f);
					return true;
				}
				return false;
			}
			function doScript(f, $t, $x, cb) {
				function sdone(sf, jqxhr, ts, e) {
					// when there is no xhr, assume inline script that needs to
					// be processed on the target
					sf.px(sf.el, jqxhr, ts, e);
					cb(jqxhr && (!ts || !e) ? $t : null, sf);
				}
				var url = $x.prop('src');
				var hasu = url && url.length > 0;
				var hasdu = hasu && url.indexOf('data:text/javascript,') >= 0;
				t.len++;
				var sf = new Frag(f, $s, $x, t);
				var path = hasu ? url : $x.text();
				path = path ? path : $x.html();
				sf.rp(path);
				sf.frs.resultSiphon($t, $t);
				if (!$t.is($x)) {
					// scripts need to be removed from the fragment's DOM in
					// order to prevent them from automatically loading when
					// inserted into the page's DOM
					$x.remove();
				}
				broadcast(opts.eventFragChain,
						opts.eventFragBeforeHttp, t, sf);
				if (sf.cancelled) {
					cb(null, sf);
					return;
				}
				if (!hasu || hasdu) {
					sdone(sf);
					return;
				}
				$.getScript(url).done(function(data, textStatus, jqxhr) {
					sdone(sf, jqxhr);
				}).fail(function(jqxhr, ts, e) {
					sdone(sf, jqxhr, ts, e);
				});
			}
			function lcont(f, cb, r, status, xhr) {
				if (hndlFunc(f, cb, r, status, xhr)) {
					return;
				}
				if (f.isModel(xhr) || f.isSimpleView(xhr)) {
					f.px(r, status, xhr, null);
					cb(null, f);
					return;
				}
				// TODO : htmlDataAdjust processes the entire fragment response-
				// should only adjust the desired fragment siphon

				// just about every browser strips out BODY/HEAD when parsing an
				// HTML DOM, all but Opera strip out HTML, many strip out
				// TITLE/BASE/META and some strip out KEYGEN/PROGRESS/SOURCE. so, we
				// can't use the typical JQuery/browser parsing on the result for
				// those tags.
				var hs = '<head ';
				var he = '</head>';
				var his = r.indexOf(hs);
				if (his > -1) {
					var hie = r.indexOf(he);
					var hr = '<div ' + r.substring(his + hs.length, hie) + '</div>';
					hr = hr.substring(0, hr.indexOf('>') + 1);
					var $hr = $(hr + '</div>');
					var ha = getFragAttr($hr, opts.fragAttrs);
					if (ha && ha == f.frs.resultSiphon($hr)) {
						hr = hr.replace(/div/g, 'head');
						hr = r.substring(r.indexOf(hr) + hr.length, r.indexOf(he));
						var $h = $('head');
						hr = htmlDataAdjust(t, f, hr);
						var hf = new Frag(null, $s, $h, t);
						var scs = hr.match(opts.regexScriptTags);
						if (scs) {
							$.each(scs, function(i, sc) {
								doScript(hf, $h, $(sc), cb);
								hr = hr.replace(sc, '');
							});
						}
						hf.px(hr);
						cb($h, f);
						return;
					}
				}
				// process non-head tags the normal JQuery way
				// (links need to be converted via raw results to
				// prevent warnings and undesired network traffic)
				var $c = $('<results>' + htmlDataAdjust(t, f, r) + '</results>');
				var fs = $c.find(f.frs.getSel($c));
				if (fs.length <= 0) {
					fs = $c.filter(f.frs.getSel($c));
					if (fs.length <= 0) {
						t.addError('No matching results for ' + f.toString()
								+ ' in\n' + r, f, null, status, xhr);
						cb(null, f);
						return;
					}
				}
				fs.each(function() {
					var $cf = $(this);
					var $cfs = $cf.find('script');
					$cfs.each(function() {
						doScript(f, $cf, $(this), cb);
					});
					if ($cf.is('script')) {
						doScript(f, $cf, $cf, cb);
					} else {
						f.px($cf);
					}
					cb($cf, f);
				});
			}
			function lfg(pf, $fl, cb) {
				var f = null;
				try {
					f = new Frag(pf, $s, $fl, t);
					cb = typeof cb === 'function' ? cb : function(){};
					broadcast(opts.eventFragChain, opts.eventFragBeforeHttp, t,
							f);
					if (f.cancelled) {
						cb(null, f);
						return;
					}
					if (f.rp() == opts.selfRef) {
						// fragment is within current page
						lcont(f, cb, $('html').html(), opts.selfRef, null);
						return;
					}
					// when the fragment path is the 1st one in the queue retrieve it
					// the queue will prevent duplicate calls to the same fragment path
					if (f.ps() || t.addFrag(f)) {
						function adone(r, status, xhr) {
							var tf = t.getFrags(f.rp());
							tf.result = r;
							tf.status = status;
							tf.xhr = xhr;
							for (var i=0; i<tf.frags.length; i++) {
								lcont(tf.frags[i], cb, r, status, xhr);
							}
						}
						// use ajax vs load w/content target for more granular control
						$.ajax({
							url: f.rp(),
							type: f.method,
							data: f.ps(),
							cache: opts.ajaxCache
						}).done(adone).fail(function(xhr, ts, e) {
							var tf = t.getFrags(f.rp());
							for (var i = 0; i < tf.frags.length; i++) {
								t.addError('Error at ' + tf.frags[i].toString() + ': '
										+ ts + '- ' + e, tf.frags[i], e, ts, xhr);
								if (!hndlFunc(tf.frags[i], cb, null, ts, xhr)) {
									cb(null, tf.frags[i]);
								}
							}
						});
					} else {
						var tf = t.getFrags(f.rp());
						if (tf.result) {
							// fragment results already retrieved
							lcont(f, cb, tf.result, tf.status, tf.xhr);
							return;
						}
					}
				} catch (e) {
					t.addError('Error at ' + (f ? f.toString() : Frag) + ': '
							+ e, f, e, null, null);
					cb(null, f);
				}
			}
			function lfc(pf, $fl) {
				lfg(pf, $fl, function($cf, f) {
					// process any nested fragments
					if ($cf) {
						lfi($cf, f);
					} else {
						done(pf, t, f);
					}
				});
			}
			// IE strips any attributes in the HEAD tag so we use the thymus script
			// attribute to capture HEAD includes/replacements (if defined)
			if (t.isTopLevel) {
				var $head = $('head');
				if ($head && $head.length > 0) {
					var pf = getFragAttr($head, opts.includeAttrs);
					if (!pf) {
						pf = getFragAttr($head, opts.replaceAttrs);
					}
					if (!pf) {
						t.len++;
						lfc(null, script);
					}
				}
			}
			// recursivly process all the includes/replacements
			function lfi($f, f) {
				var $fs = t.isScopeSelect && $f.is(t.scope) ? $f : $f.find(so.selector);
				t.len += $fs.length;
				$fs.each(function() {
					lfc(f, $(this));
				});
				if (t.cnt > 0 || ($fs.length == 0 && t.cnt == 0)) {
					done(null, t, f);
				}
			}
			// make initial call
			lfi(t.scope, null);
		}
	}

	/**
	 * Initializes thymus.js plug-in and loads any fragments within the page
	 * 
	 * @param jqUrl
	 *            the URL used to load JQuery
	 */
	function init(jqUrl) {
		if ($.fn[NS] !== undefined) {
			return;
		}
		var script = $('#' + NS);
		if (!script) {
			throw new Error('No script found with ID: ' + NS);
		}
		var defs = {
			selfRef : 'this',
			ajaxCache : false,
			ajaxTypeDefault : 'GET',
			crossDomain : false,
			inheritRef : 'inherit',
			pathSep : '/',
			paramSep : '&',
			agentSelSep : ',',
			resultSep : ',',
			destSep : ',',
			multiSep : '::',
			winOpenOptsSep : ';',
			fragExtensionAttr : 'data-thx-frag-extension',
			fragAttrs : [ 'data-thx-fragment', 'th\\:fragment', 'data-th-fragment' ],
			includeAttrs : [ 'data-thx-include', 'th\\:include', 'data-th-include' ],
			replaceAttrs : [ 'data-thx-replace', 'th\\:replace', 'data-th-replace' ],
			urlAttrs : [ 'action', 'archive', 'background', 'cite', 'classid',
					'codebase', 'data', 'dynsrc', 'formaction', 'href', 'icon',
					'longdesc', 'lowsrc', 'manifest', 'poster', 'profile',
					'src', 'usemap' ],
			getAttrs : [ 'data-thx-get' ],
			postAttrs : [ 'data-thx-post' ],
			putAttrs : [ 'data-thx-put' ],
			deleteAttrs : [ 'data-thx-delete' ],
			getPathAttrs : [ 'data-thx-get-path' ],
			postPathAttrs : [ 'data-thx-post-path' ],
			putPathAttrs : [ 'data-thx-put-path' ],
			deletePathAttrs : [ 'data-thx-delete-path' ],
			getTypeAttrs : [ 'data-thx-get-type' ],
			postTypeAttrs : [ 'data-thx-post-type' ],
			putTypeAttrs : [ 'data-thx-put-type' ],
			deleteTypeAttrs : [ 'data-thx-delete-type' ],
			getParamsAttrs : [ 'data-thx-get-params' ],
			postParamsAttrs : [ 'data-thx-post-params' ],
			putParamsAttrs : [ 'data-thx-put-params' ],
			deleteParamsAttrs : [ 'data-thx-delete-params' ],
			getResultAttrs : [ 'data-thx-get-result' ],
			postResultAttrs : [ 'data-thx-post-result' ],
			putResultAttrs : [ 'data-thx-put-result' ],
			deleteResultAttrs : [ 'data-thx-delete-result' ],
			getDestAttrs : [ 'data-thx-get-dest' ],
			postDestAttrs : [ 'data-thx-post-dest' ],
			putDestAttrs : [ 'data-thx-put-dest' ],
			deleteDestAttrs : [ 'data-thx-delete-dest' ],
			getAgentAttrs : [ 'data-thx-get-agent' ],
			postAgentAttrs : [ 'data-thx-post-agent' ],
			putAgentAttrs : [ 'data-thx-put-agent' ],
			deleteAgentAttrs : [ 'data-thx-delete-agent' ],
			contextPathAttr : 'data-thx-context-path',
			fragListenerAttr : 'data-thx-onfrag',
			fragsListenerAttr : 'data-thx-onfrags',
			fragHeadAttr : 'data-thx-head-frag',
			regexFragName : /^[_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*$/,
			regexFunc : /^[_$a-zA-Z\xA0-\uFFFF].+?\(/i,
			regexFileName : /[^\/?#]+(?=$|[?#])/,
			regexScriptTags : /<script[^>]*>([\\S\\s]*?)<\/script>/img,
			regexIanaProtocol : /^(([a-z]+)?:|\/\/|#)/i,
			regexFileTransForProtocolRelative : /^(file:?)/i,
			regexAbsPath : /^\/|(\/[^\/]*|[^\/]+)$/g,
			regexFuncArgs : /(('|").*?('|")|[^('|"),\s]+)(?=\s*,|\s*$)/g,
			regexFuncArgReplace : /['"]/g,
			regexValTypeSiphon : /(^.*)(?:->)(?=([^.]*)$)/g,
			regexSelectSiphon : /(?:\?{)((?:(?:\\.)?|(?:(?!}).))+)(?:})/g,
			regexVarSiphon : /(?:\${)((?:(?:\\.)?|(?:(?!}).))+)(?:})/g,
			eventIsBroadcast : true,
			eventFragChain : 'frag',
			eventFragsChain : 'frags',
			eventFragBeforeHttp : 'beforehttp.thx.frag',
			eventFragBeforeDom : 'beforedom.thx.frag',
			eventFragAfterDom : 'afterdom.thx.frag',
			eventFragLoad : 'load.thx.frag',
			eventFragsLoad : 'load.thx.frags',
			actionLoadFrags : 'frags.load',
			actionNavRegister : 'nav.register',
			actionNavInvoke : 'nav.invoke'
		};
		/**
		 * thymus.js plug-in action execution
		 * 
		 * @param a
		 *            the action object (or action string)
		 * @param altEl
		 *            the alternative initiating element
		 * @parma the options (relative to the context of the element(s) for
		 *        which the plug-in is being called from)
		 */
		$.fn[NS] = function(a, altEl, opts) {
			var o = $.extend({}, defs, opts);
			if (firstRun && rootRun) {
				// make sure the root document has navigation capabilities
				rootRun = false;
				$('html')[NS](o.actionNavRegister);
			}
			var x = null, xl = null;
			var s = this.selector;
			return this.each(function() {
				xl = $.data(this, NS);
				if (opts || !xl) {
					xl = x ? x : (x = new FragCtx(s, script, o));
					$.data(this, NS, xl);
				}
				xl.exec(a, this, altEl);
			});
		};
		$.fn[NS].defaults = defs;
		try {
			var t = document.createElement('b');
			t.id = 4;
			while (t.innerHTML = '<!--[if gt IE ' + ++t.id + ']>1<![endif]-->',
					t.innerHTML > 0) {
			}
			ieVersion = t.id > 5 ? +t.id : 0;
		} catch (e) {
			log('Unable to detect IE version: ' + e.message);
		}

		/**
		 * Pre-loads any resources that may need to be present before fragments
		 * are processed
		 * 
		 * @param l
		 *            an optional link URL
		 * @param s
		 *            an optional script URL
		 * @param cb
		 *            the call back function
		 */
		function preloadResources(l, s, cb) {
			if (l) {
				$('<link type="text/css" href="' + l + '" rel="stylesheet" />')
						.appendTo('head');
			}
			if (s) {
				$.getScript(s).done(function(data, ts, jqxhr) {
					cb(data, ts, jqxhr, null);
				}).fail(function(jqxhr, ts, e) {
					cb(data, ts, jqxhr, e);
				});
			} else {
				cb(null, null, null, null);
			}
		}
		preloadResources(script.attr(FRAGS_PRE_LOAD_CSS_ATTR), script
				.attr(FRAGS_PRE_LOAD_JS_ATTR), function (d, ts, jqxhr, e) {
			if (e) {
				throw e;
			} else {
				var $p = $('html');
				if (!getPreLoadAttr(FRAGS_LOAD_DEFERRED_LOAD_ATTR)) {
					// auto-process the fragments
					$p[NS](defs.actionLoadFrags);
				}
			}
		});
	}

	/**
	 * Performs any URL adjustments that may be needed for proper resolution
	 * 
	 * @param url
	 *            the URL to adjust
	 * @param fp
	 *            the optional file protocol to use
	 */
	function urlAdjust(url, fp) {
		return fp && url.indexOf('//') == 0 ? protocolForFile + url : url;
	}

	/**
	 * Gets an elements attribute before loading has begun
	 * 
	 * @param a
	 *            the attribute to retrieve
	 * @param d
	 *            the optional default value to return when the attribute cannot
	 *            be found
	 * @param e
	 *            the optional element to retrieve the attribute value from
	 *            (null/undefined will use script element)
	 */
	function getPreLoadAttr(a, d, e) {
		if (!e) {
			e = document.getElementById(NS);
			if (!e) {
				throw new Error('Missing script ID: ' + NS);
			}
		}
		var r = e ? e.getAttribute ? e.getAttribute(a) : e.attributes[a].nodeValue : null;
		return d && !r ? d : r;
	}

	// verfifies/loads JQuery using the URL (if needed)
	var jq = window.jQuery;
	if (!jq) {
		var su = getPreLoadAttr(JQUERY_URL_ATTR, JQUERY_DEFAULT_URL);
		var s = document.createElement('script');
		s.src = urlAdjust(su);
		s.type = 'text/javascript';
		s.onload = s.onreadystatechange = function() {
			if (!jq
					&& (!this.readyState || this.readyState == 'loaded' || this.readyState == 'complete')) {
				jq = true;
				init(s.src);
			}
		};
		s.src = su;
		document.getElementsByTagName('head')[0].appendChild(s);
	} else {
		$(function() {
			init(null);
		});
	}
})();