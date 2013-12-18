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
	this.NS = this.displayName = 'thymus';
	this.DFLT_PATH_SEP = '/';
	this.REGEX_ABS_PATH = /([^:]\/|\\)(?:\/|\\)+/;
	this.REGEX_ABS_SPLIT = /\?|#/;
	this.REGEX_CDATA = /<!\[CDATA\[(?:.|\r\n|\n|\r)*?\]\]>/ig;
	this.DATA_JS = 'data:text/javascript,';
	this.JQUERY_URL_ATTR = 'data-thx-jquery-url';
	this.JQUERY_DEFAULT_URL = 'http://code.jquery.com/jquery.js';
	this.FRAGS_LOAD_DEFERRED_LOAD_ATTR = 'data-thx-deferred-load';
	this.BASE_PATH_ATTR = 'data-thx-base-path';
	this.FRAGS_PRE_LOAD_CSS_ATTR = 'data-thx-preload-css';
	this.FRAGS_PRE_LOAD_JS_ATTR = 'data-thx-preload-js';
	this.DFTL_RSLT_NAME = NS + '-results';
	this.VARS_ATTR_TYPE = 'with';
	this.DOM_ATTR_TYPES = [ 'type', 'params', 'path', 'result', 'dest',
			'target', VARS_ATTR_TYPE ];
	this.DOM_ATTR_AGENT = 'agent';
	this.HTTP_METHODS = [ 'GET', 'POST', 'DELETE', 'PUT' ];
	this.DTEXT = 'text';
	this.DHTML = 'html';
	this.ASYNC = 'async';
	this.SYNC = 'sync';
	this.URL_ATTR = 'urlattr';
	this.TTRAN = 'transfer';
	this.TATTR = 'attribute';
	this.TINC = 'include';
	this.TREP = 'replace';
	this.TUPD = 'update';
	this.TYPES_PPU = [ URL_ATTR, TATTR, TINC, TREP, TUPD ];
	this.TDFLT = TINC;
	this.eventFuncs = {};
	this.eventFuncCnt = 0;
	this.ieVersion = 0;
	this.ieVersionCompliant = 9;
	this.jq = window.jQuery;
	this.basePath = null;
	this.updateUrls = false;
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
	 * JQuery node cache that utilizes <code>JQuery.add</code> with
	 * <code>null</code> handling
	 * 
	 * @constructor
	 * @param c
	 *            the optional initial cache element
	 */
	function JqCache(c) {
		var $c = c;
		this.cache = function($x) {
			if ($x instanceof jQuery) {
				if ($c instanceof jQuery) {
					$c = $c.add($x);
				} else {
					$c = $x;
				}	
			}
			return $c;
		};
		this.clear = function(n) {
			$c = null;
			return n ? this : null;
		};
	}

	/**
	 * A {JqCache} variant used for <code>JQuery.append</code>,
	 * <code>JQuery.replace</code> or any other manipulation operation
	 * 
	 * @constructor
	 * @param $dc
	 *            the optional initial destination cache element
	 * @param r
	 *            the optional initial origin/result cache element or text
	 */
	function ManipCache($dc, r) {
		var dc = new JqCache($dc);
		var rc = new JqCache(r);
		this.rsltCache = function(r) {
			return rc.cache(r instanceof jQuery ? r
					: typeof r === 'object' ? $(r) : r);
		};
		this.destCache = function($dc) {
			return dc.cache($dc);
		};
		this.manip = function(ia, alt) {
			var $d = dc.cache();
			var $r = rc.cache();
			if ($d && $r) {
				var f = typeof alt === 'function' ? function(i, r) {
					return alt($d, $r, i, this);
				} : null;
				if (typeof ia === 'function') {
					ia($d, $r);
				} else if (ia) {
					$d.append(f ? f : alt ? alt : $r);
				} else {
					$d.replaceWith(f ? f : alt ? alt : $r);
				}
				return $r;
			}
			return null;
		};
		this.clear = function(n) {
			dc = dc.clear(n);
			rc = rc.clear(n);
			return n ? this : null;
		};
	}

	/**
	 * A {ManipCache} variant used for <code>JQuery.append</code> or
	 * <code>JQuery.replaceWith</code> caching that span separate <b>node</b>
	 * and <b>attribute</b> scopes
	 * 
	 * @constructor
	 * @param ia
	 *            true for append, false for replace
	 * @param ndc
	 *            the optional node destination cache
	 * @param nrc
	 *            the optional node origin/result cache
	 * @param adc
	 *            the optional attribute destination cache
	 * @param arc
	 *            the optional attribute origin/result cache
	 */
	function ManipsCache(ia, ndc, nrc, adc, arc) {
		var nc = new ManipCache(ndc, nrc);
		var ac = new ManipCache(adc, arc);
		var altnc = [];
		var rc = null;
		function alt(arr, x, fx) {
			if (arr, x && typeof fx === 'function') {
				// result unique to destination
				var uc = {
					x : x, 
					fx : fx
				};
				arr.push(uc);
			}
		}
		function has(arr, x) {
			if (x && x.length > 0) {
				for ( var i = 0; i < arr.length; i++) {
					var m = arr[i].x;
					if (m.is(x)) {
						return arr[i].fx;
					}
				}
			}
			return null;
		}
		this.rsltCache = function(rc) {
			return nc.rsltCache(rc);
		};
		this.destCache = function($dc, altr) {
			alt(altnc, $dc, altr);
			return nc.destCache($dc);
		};
		this.manips = function(n) {
			rc = rc ? rc : new JqCache();
			// when there are no alternatives we can perform the normal
			// append/replaceWith operations- otherwise, we need to handle the
			// results individually in order to apply the destination specific
			// results
			var $r = rc.cache(nc.manip(ia, altnc.length > 0 ? function($ds,
					$rs, i, d) {
				var $d = $(d);
				var fx = has(altnc, $d);
				if (fx) {
					// let the alternative function determine results
					return fx($d, $rs);
				} else {
					// TODO : should be a way to tell JQuery append/replaceWith
					// not to clone- we need to always clone nodes to prevent
					// movement to other destinations (JQuery already does this
					// with append/replaceWith, except for the last node)
					return $rs.clone(true, true);
				}
			} : null));
			rc = rc.clear(n);
			this.clear(n);
			return $r;
		};
		this.clear = function(n) {
			nc = nc ? nc.clear(n) : n ? new ManipCache() : null;
			ac = ac ? ac.clear(n) : n ? new ManipCache() : null;
			rc = rc ? rc.clear(n) : n ? new ManipCache() : null;
			return n ? this : null;
		};
	}

	/**
	 * A {ManipsCache} variant used for <code>JQuery.append</code> and
	 * <code>JQuery.replaceWith</code> operations caching
	 * 
	 * @constructor
	 */
	function AppReplCache() {
		var ach = new ManipsCache(true);
		var rch = new ManipsCache(false);
		this.rsltCache = function(ia, rc) {
			return (ia ? ach : rch).rsltCache(rc);
		};
		this.destCache = function(ia, $dc, altr) {
			return (ia ? ach : rch).destCache($dc, altr);
		};
		this.appendReplace = function(n) {
			var $r = ach.manips(n);
			$r = $r ? $r.add(rch.manips(n)) : rch.manips(n);
			this.clear(n);
			return $r;
		};
		this.clear = function(n) {
			ach = ach ? ach.clear(n) : n ? new ManipsCache(true) : null;
			rch = rch ? rch.clear(n) : n ? new ManipsCache(false) : null;
			return n ? this : null;
		};
	}

	/**
	 * Navigation options
	 * 
	 * @constructor
	 * @param s
	 *            the string that will contain the name of the navigation and
	 *            the options
	 * @param tsep
	 *            the separator to extract the type of navigation
	 * @param osep
	 *            the separator to extract the name from the options
	 */
	function NavOptions(type, typeSep, target, targetSep) {
		var win = null, rcnt = 0;
		var ptype = type ? splitWithTrim(type, typeSep) : [ ASYNC ];
		this.isAsync = ptype[0].toLowerCase() == SYNC ? false : true;
		var forceType = ptype.length > 1;
		ptype = forceType ? ptype[1].toLowerCase() : TDFLT;
		this.target = target ? splitWithTrim(target, targetSep) : [ '_self' ];
		this.options = this.target.length > 1 ? this.target[1] : undefined;
		this.history = this.target.length > 2 ? this.target[2] : undefined;
		this.target = this.target[0].toLowerCase();
		this.reuseMax = 1;
		this.reuse = function() {
			return rcnt < this.reuseMax ? ++rcnt : 0;
		};
		this.isFullPageSync = function() {
			return !this.isAsync && ptype == TTRAN;
		};
		this.type = function(nt) {
			if (!forceType && nt) {
				ptype = nt;
			}
			return ptype;
		};
		this.getWin = function(loc) {
			if (loc) {
				return window
						.open(loc, this.target, this.options, this.history);
			}
			if (!win && this.type == '_blank') {
				win = window.open('about:blank', this.target, this.options,
						this.history);
				win.document.write('<html><body></body></html>');
			} else if (!win) {
				win = this.target != '_self' ? window[this.target.charAt(0) == '_' ? this.target
						.substring(1)
						: this.target]
						: window;
			}
			return win;
		};
		this.toString = function() {
			return lbls('object', this.constructor.name, 'type', this.type(),
					'forceType', forceType, 'target', this.target, 'options',
					this.options, 'history', this.history);
		};
	}

	/**
	 * When available, logs a message to the console
	 * 
	 * @param m
	 *            the message to log
	 * @param l
	 *            the logging level (i.e. <code>1</code> is <code>error</code>,
	 *            <code>2</code> is <code>warn</code>, <code>3</code> is
	 *            <code>log</code> (default))
	 */
	function log(m, l) {
		if (m && typeof window.console !== 'undefined'
				&& typeof window.console.log !== 'undefined') {
			var nm = ieVersion <= 0 || ieVersion > ieVersionCompliant ? m
					: typeof m.toFormattedString === 'function' ? m
							.toFormattedString() : m;
			if (l == 1 && window.console.error) {
				window.console.error(nm);
			} else if (l == 2 && window.console.warn) {
				window.console.warn(nm);
			} else {
				window.console.log(nm);
			}
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
	 * @param rxs
	 *            the regular expression suffix used to capture the attribute
	 *            (should include anything after the attribute name)
	 * @returns a attributes query object
	 */
	function genAttrQueries(a, h, t, rxs) {
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
				regExp : new RegExp('\\s' + x[i] + rxs,
						'ig')
			});
			ra.sel += ra.sel.length > 0 ? ',' + y : y;
		}
		return ra;
	}

	/**
	 * Creates a JQuery selector
	 * 
	 * @param a
	 *            the of array of attributes to select on
	 * @param v
	 *            the optional attribute value to match for each item in the
	 *            array
	 * @param ed
	 *            the optional equals designation that will prepended to the
	 *            equals sign (when a valid attribute value is supplied)
	 * @param tn
	 *            the optional tag name to match the attributes against
	 * @returns JQuery selector
	 */
	function genAttrSelect(a, v, ed, tn) {
		var r = '';
		var as = $.isArray(a) ? a : [ a ];
		for (var i = 0; i < as.length; i++) {
			r += (i > 0 ? ',' : '') + (tn ? tn : '') + '[' + as[i]
					+ (v ? (ed ? ed : '') + '="' + v + '"' : '') + ']';
		}
		return r;
	}

	/**
	 * Generates a JQuery selector based upon an element's attributes
	 * 
	 * @param $el
	 *            the element to create the attribute selector from
	 */
	function genAttrSelByExample($el, $p) {
		var as = '';
		var tn = $el.prop('tagName');
		$.each($el, function() {
			var a = this.attributes;
			for ( var k in a) {
				if (a[k].nodeName && a[k].nodeValue !== undefined) {
					as += (as.length > 0 ? ',' : '') + tn + '['
							+ a[k].nodeName + '="' + a[k].nodeValue + '"]';
				}
			}
		});
		return as ? as : tn;
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
	 * JQuery add convienience for <code>add</code> function with validation
	 * 
	 * @param o
	 *            the JQuery object to add to
	 * @param ao
	 *            the item to add to the JQuery object
	 */
	function jqAdd(o, ao) {
		if (o instanceof jQuery) {
			return ao ? o.add(ao) : o;
		}
		return ao ? $(o).add(ao) : $(o);
	}

	/**
	 * @returns a label/value to-string representation of the specified
	 *          arguments
	 */
	function lbls() {
		var s = '[';
		var l = '';
		for (var i = 0; i < arguments.length; i++) {
			if (l) {
				s += arguments[i] ? l + arguments[i] : '';
				l = '';
			} else {
				l = (s.length > 1 ? ', ' : '') + arguments[i] + ': ';
			}
		}
		return s + ']';
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
	 * Converts a relative path to an absolute path
	 * 
	 * @param relPath
	 *            the relative path to convert
	 * @param absPath
	 *            the absolute path to do the conversion from
	 * @param rxAbsPath
	 *            the regular expression that will be used to replace the
	 *            absolute path with
	 * @param pathSep
	 *            the path separator to use during conversion
	 * @param bypassFunc
	 *            a function that will return a path when absolute path
	 *            resolution needs to be bypassed (returns <code>null</code>
	 *            to resolve)
	 * @returns the absolute path version of the relative path in relation to
	 *          the provided absolute path (or just the supplied relative path
	 *          when it's really an absolute path)
	 */
	function absolutePath(relPath, absPath, rxAbsPath, pathSep, bypassFunc) {
		// TODO : combine multiple regular expressions
		var absStack, relStack, i, d;
		relPath = relPath || '';
		if (typeof bypassFunc === 'function') {
			var vp = bypassFunc(relPath);
			if (vp) {
				return vp;
			}
		}
		// remove query parameters, hashes and duplicate slashes
		absPath = absPath ? absPath.split(REGEX_ABS_SPLIT)[0].replace(
				rxAbsPath, '$1') : '';
		absStack = absPath ? absPath.split(pathSep) : [];
		if (absStack.length > 0
				&& absStack[absStack.length - 1].indexOf('.') > -1) {
			// remove file name
			absStack.pop();
		}
		relStack = relPath.split(pathSep);
		for (i = 0; i < relStack.length; i++) {
			d = relStack[i];
			if (!d || d == '.') {
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
		absPath = absStack.join(pathSep);
		return absPath ? absPath.replace(rxAbsPath, '$1') : absPath;
	}

	/**
	 * Gets the context path used to resolve paths to fragments and URLs within
	 * href/src/etc. attributes contained in fragments
	 * 
	 * @param rxAbsPath
	 *            the regular expression that will be used to replace the
	 *            absolute path with
	 * @param pathSep
	 *            the path separator to use during conversion
	 * @param bypassFunc
	 *            a function that will return a path when absolute path
	 *            resolution needs to be bypassed (returns <code>null</code>
	 *            to resolve)
	 * @returns the application context path
	 */
	function getAppCtxPath(rxAbsPath, pathSep, bypassFunc) {
		var c = basePath;
		if (!c) {
			c = pathSep;
		}
		// capture the absolute URL relative to the defined context path
		// attribute value
		c = absolutePath(c, window.location.href, rxAbsPath, pathSep,
				bypassFunc);
		c += c.lastIndexOf(pathSep) != c.length - 1 ? pathSep : '';
		return c;
	}

	/**
	 * Converts a relative path into an absolute path
	 * 
	 * @param relPath
	 *            the relative path
	 * @param rxAbsPath
	 *            the regular expression that will be used to replace the
	 *            absolute path with
	 * @param pathSep
	 *            the path separator to use during conversion
	 * @param bypassFunc
	 *            a function that will return a path when absolute path
	 *            resolution needs to be bypassed (returns <code>null</code>
	 *            to resolve)
	 */
	function getAppCtxRelPath(relPath, rxAbsPath, pathSep, bypassFunc) {
		return absolutePath(relPath, getAppCtxPath(rxAbsPath, pathSep),
				rxAbsPath, pathSep, bypassFunc);
	}

	/**
	 * Variables cache for localized attribute name/value pairs.
	 * 
	 * @constructor
	 * @param arx
	 *            the global regular expression that will be used to extact
	 *            variable names/values when adding variables (replace function
	 *            is used so the passed parameters should be the match for the
	 *            entire expression, the 2nd name of the variable and the 3rd
	 *            parameter should be the value of the variable)
	 * @param rrx
	 *            the global regular expression that will be used to substitute
	 *            variable values when performing a string replacement (replace
	 *            function is used so the passed parameters should be the match
	 *            for the entire expression, the 2nd should be the variable name
	 *            expression)
	 */
	function Vars(arx, rrx) {
		var cache = [];
		function add(ctx, nvs) {
			return nvs ? nvs.replace(arx, function(m, n, v) {
				if (!cache[ctx]) {
					cache[ctx] = [];
				}
				cache[ctx][n] = rep(ctx, v);
				return n;
			}) : '';
		}
		function rep(ctx, s) {
			return s ? s.replace(rrx, function(m, n) {
				if (cache[ctx]) {
					return cache[ctx][n];
				}
				return undefined;
			}) : '';
		}
		this.add = add;
		this.rep = rep;
		this.get = function(ctx, n) {
			return ctx ? cache[ctx] ? n ? cache[ctx][n] : cache[ctx].slice(0)
					: cache.slice(0) : undefined;
		};
	}

	/**
	 * Extracts a key from 
	 */
	function extractKey($p, attrs) {
		// iterate over the attributes that will be used as keys
		var k = null;
		$.each(opts.paramNameAttrs, function(i, v) {
			k = $p.attr(v);
			if (k) {
				return false;
			}
		});
		return k;
	}

	/**
	 * Gets an attribute value using an plug-in option name
	 * 
	 * @param $el
	 *            the element to get the attribute from
	 * @param n
	 *            the name of the plug-in option that will be used in retrieving
	 *            the attribute value (optional)
	 * @param opts
	 *            the options that should contain either a property that matches
	 *            the passed name that will contain an array of attribute names
	 *            or just an array of attribute names (optional)
	 * @param emptyChk
	 *            true to validate the attribute value is not empty before
	 *            returning the value
	 * @returns the first valid attribute value occurrence (if any)
	 */
	function getOptsAttrVal($el, n, opts, emptyChk) {
		if ((!n && !opts) || !$el) {
			return undefined;
		} else {
			var o = n;
			var a = null;
			if (opts && $.isArray(o = !n ? opts : opts[n])) {
				for (var i = 0; i < o.length; i++) {
					a = $el.attr(o[i]);
					if ((!emptyChk && a !== undefined) || (emptyChk && a)) {
						return a;
					}
				}
			} else if (typeof o === 'string') {
				a = $el.attr(o);
				return a !== undefined ? a : null;
			}
		}
		return null;
	}

	/**
	 * Extracts value(s) from node(s) returned from the supplied JQuery
	 * selector. The JQuery selector can also contain a type that will determine
	 * how value(s) are captured from node(s) returned from the JQuery selector.
	 * The &quot;directive&quot; regular expression will be used to determine
	 * what will be used to extract values from the returned nodes from the
	 * JQuery selector. Possible values are &quot;text&quot;, &quot;html&quot;
	 * or an attribute name or when nothing is defined JQuery's val() function
	 * will be called to retrieve the replacement value.
	 * 
	 * @param s
	 *            the string that will contain just a JQuery selector or a
	 *            JQuery selector and a type that indicates how to extract
	 *            value(s) from the node(s) returned by the JQuery selector
	 *            (delimited by character(s) defined by the type regular
	 *            expression)
	 * @param drx
	 *            the global directive regular expression dilimiter that will be
	 *            used to <i>split</i> node values for extraction- first
	 *            <i>split</i> value should be a valid JQuery selector while
	 *            any additional <i>split</i> value(s) should be either
	 *            &quot;text&quot;, &quot;html&quot; or an attribute name
	 * @param d
	 *            the delimiter to use when multiple results are returned from a
	 *            JQuery selector
	 * @param attrNames
	 *            array of attribute name(s) to use to extract keys from that
	 *            will be sent along with the value(s) (separated by
	 *            <code>=</code>); when not a valid array only value(s) will
	 *            be used
	 * @param el
	 *            the DOM element that will be used to find siphoned values on
	 *            (when omitted the current document will be queried)
	 * @returns the siphoned string with replaced values returned from all/any
	 *          found JQuery selector(s)
	 */
	function extractValues(s, drx, d, attrNames, el) {
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
				nv = attrNames ? $x.serialize() : $x.serializeArray();
                if (!nv || nv.length <= 0) {
                	nv = '';
					$x.each(function() {
						ci = $(this);
						nv += getEV(nv, attrNames ? getOptsAttrVal(ci, null,
								attrNames, true) : null, ci.val(), d);
					});
				} else if (!attrNames) {
					var nva = nv;
					nv = '';
					$.each(nva, function() {
						nv += getEV(nv, null, this.value, d);
					});
				}
            } else {
				var ist = t.toLowerCase() == DTEXT;
				var ish = t.toLowerCase() == DHTML;
				var n = '';
				$x.each(function() {
					ci = $(this);
					n = attrNames ? getOptsAttrVal(ci, null, attrNames, true)
							: null;
					nv += getEV(nv, n, ist ? ci.text() : ish ? ci.html() : ci
							.attr(t), d);
				});
            }
            return nv !== undefined && nv != null ? nv : s;
    	}
	    if (s) {
			var xt = s ? s.split(drx) : null;
			var $x = xt ? el ? el.find(xt[0]) : $(xt[0]) : null;
			if ($x && $x.length > 0) {
				return exNVs(xt && xt.length > 1 ? xt[1] : '', $x);
			}
	    }
	    return '';
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
				var rr = {
					result : '',
					errorMessage : '',
					errorCause : ''
				};
				if (this.isValid) {
					try {
						if (nam && a) {
							this.setArgs(nam);
						}
						if ($.isArray(a) && a.length > 0) {
							rr.result = f.apply(thisArg, a);
						} else if (a) {
							rr.result = f.call(thisArg, a);
						} else {
							rr.result = f.call(thisArg);
						}
					} catch (e) {
						rr.errorMessage = 'Error while calling ' + fs + ' '
								+ amts(am) + ': ' + e;
						rr.errorCause = e;
					}
				}
				return rr;
			};
			this.getFuncString = function() {
				return this.isValid ? f.toString() : '';
			};
		} catch (e) {
			log('Error in ' + fs + ' ' + amts(am) + ': ' + e, 1);
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
		var fragSelector = genAttrSelect(includeReplaceAttrs, null, null);
		fragSelector = (fragSelector ? fragSelector + ',' : '')
				+ genAttrSelect(domAttrs, 'load', '*');
		var urlAttrs = genAttrQueries(opts.urlAttrs, 'GET', URL_ATTR,
				opts.regexAttrRelUrlSuffix);
		var getAttrs = genAttrQueries(opts.getAttrs, 'GET', TDFLT,
				opts.regexAttrAnyUrlSuffix);
		var postAttrs = genAttrQueries(opts.postAttrs, 'POST', TDFLT,
				opts.regexAttrAnyUrlSuffix);
		var putAttrs = genAttrQueries(opts.putAttrs, 'PUT', TDFLT,
				opts.regexAttrAnyUrlSuffix);
		var deleteAttrs = genAttrQueries(opts.deleteAttrs, 'DELETE', TDFLT,
				opts.regexAttrAnyUrlSuffix);

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
				loadFragments(p, fragSelector, null, null);
			} else if (a.action === opts.actionNavInvoke) {
				if (!a.pathSiphon) {
					log('No path specified for ' + a.action, 1);
					return;
				}
				a.method = a.method ? a.method : 'GET';
				var no = new NavOptions(a.typeSiphon, opts.typeSep,
						a.targetSiphon, opts.targetSep);
				if (!no.isFullPageSync()) {
					// partial page update
					loadFragments(c ? c : p, a, no, null);
				} else {
					// full page transfer
					var t = new FragsTrack(a.selector ? $(a.selector) : $(selector), a);
					var f = new Frag(null, t.scope, t.scope, t);
					broadcast(opts.eventFragChain, opts.eventFragBeforeHttp, t, f);
					f.nav(no);
				}
			} else if (a.action === opts.actionNavRegister) {
				// convert URLs (if needed) and register event driven templating
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
				eventSiphon : evt,
				paramsSiphon : '',
				pathSiphon : '',
				resultSiphon : '',
				destSiphon : '',
				typeSiphon : '',
				targetSiphon : '',
				agentSiphon : '',
				withSiphon : '',
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
		 * Recursively replaces values found within a string with values found
		 * from JQuery selector(s). Results from each JQuery string found will
		 * use the &quot;directive&quot; regular expression to determine what
		 * will be used to extract values from the returned nodes from the
		 * JQuery selector. Possible values are &quot;text&quot;,
		 * &quot;html&quot; or an attribute name or when nothing is defined an
		 * attempt to call JQuery's val() function will be made to retrieve the
		 * replacement value.
		 * 
		 * @param s
		 *            the string to replace JQuery selectors in
		 * @param m
		 *            the HTTP method context of the passed {Vars}
		 * @param vars
		 *            the {Vars} used for variable substitution
		 * @param d
		 *            the delimiter to use when multiple results are returned
		 *            from a JQuery selector
		 * @param attrNames
		 *            array of attribute name(s) to use to extract keys from
		 *            that will be sent along with the value(s) (separated by
		 *            <code>=</code>); when not a valid array only value(s)
		 *            will be used
		 * @param el
		 *            the DOM element that will be used to find siphoned values
		 *            on (when omitted the current document will be queried)
		 * @returns the siphoned string with replaced values returned from
		 *          all/any found JQuery selector(s)
		 */
		function siphonValues(s, m, vars, d, attrNames, el) {
			// siphon node values
			function sVals(s, d, attrNames, el) {
				return s.replace(opts.regexSurrogateSiphon, function(m, v) {
					return sVals(extractValues(v,
							opts.regexDirectiveDelimiter, d, attrNames,
							el), d, attrNames, el);
				});
			}
			// substitute variables and siphon node values
			return typeof s === 'string' ? sVals(vars.rep(m, s), d, attrNames,
					el) : '';
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
					var ens = getOptsAttrVal($el, getAN(m, m), opts);
					ens = ens ? splitWithTrim(ens, opts.multiSep) : null;
					return ens ? $.inArray(evt, ens) : -1;
				}
				function getOV($el, an, ei) {
					var ov = getOptsAttrVal($el, an, opts);
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
										agt = siphonValues(agt, m, vars,
												opts.agentSelSep, null);
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
			if (a.type === URL_ATTR) {
				if (el) {
					if (!script.is(el)) {
						el.attr(a.items[ai].name, absoluteUrl(el
								.attr(a.items[ai].name), t.ctxPath));
					}
					return '';
				} else {
					return ' ' + a.items[ai].name + '="'
							+ absoluteUrl(v, t.ctxPath) + '"';
				}
			}
			var evts = splitWithTrim(v, opts.multiSep);
			var rs = [];
			$.each(evts, function(i, ev) {
				if (ev.toLowerCase() == 'load') {
					// load events are picked up by normal fragment loading
					return;
				}
				var so = genSiphonObj(a.method, ev, opts.actionNavInvoke, null,
						null, t.siphon.vars, false);
				if (so.isValid) {
					so.eventAttrs = a.items;
					so.typeSiphon = a.type;
					var rtn = addOrUpdateEventFunc(ctx, so.action, so.method,
							f.pel, el, so.eventSiphon, function(pel, ib) {
								var $ib = $(ib);
								if (!so.captureAttrs($ib, t.siphon.vars, false, true)) {
									// the event is no longer valid because the
									// method/event attribute has removed the
									// event since its registration- thus we
									// need to trigger a removal of the event
									// listener by returning true
									return true;
								}
								so.selector = ib;
								ctx.exec(so, pel, ib);
								return false;
							});
					so.onEvent = rtn.eventAttrValue;
					so.eventSiphon = rtn.eventName;
					rs[rs.length] = so;
				} else {
					t.addError('Expected an event for action "'
							+ opts.actionNavInvoke + '" and method "'
							+ so.method + '"', f, null, null, null);
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
			if (updateUrls) {
				s = updateNavAttrs(t, f, urlAttrs, s);
			}
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
		 *            counterparts (only performed when {updateUrls} is true)
		 */
		function htmlDomAdjust(t, f, s, uu) {
			if (uu && updateUrls) {
				updateNavAttrs(t, f, urlAttrs, s);
			}
			updateNavAttrs(t, f, getAttrs, s);
			updateNavAttrs(t, f, postAttrs, s);
			updateNavAttrs(t, f, putAttrs, s);
			updateNavAttrs(t, f, deleteAttrs, s);
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
		 * Checks whether or not the passed element should be admitted for value
		 * inclusion
		 * 
		 * @param $el
		 *            the element to check for a exclusion on
		 * @returns true when the element is disabled or is deemed checkable,
		 *          but is not checked
		 */
		function isExcludedVal($el) {
			return $el.is(':disabled')
					|| (!$el.is(':checked')
							&& $el.prop('nodeName').toLowerCase() == 'input' && opts.regexParamCheckable
							.test($el.prop('type')));
		}

		/**
		 * Extracts a cumulative string of input value(s) and/or text of the
		 * containing elements
		 * 
		 * @param $el
		 *            the element(s) to get the value(s) and/or text
		 * @param d
		 *            the optional delimiter that will separate each value/text
		 * @returns cumulative string of input value(s) and/or text
		 */
		function getTextVals($el, d) {
			var t = '';
			var e = null;
			var v = null;
			if ($el instanceof jQuery) {
				$el.each(function(i, r) {
					e = $(r);
					if (e.is(':input')) {
						v = !isExcludedVal(e) ? e.val() : '';
					} else {
						v = e.text().replace(opts.regexDestTextOrAttrVal, '');
					}
					t += (t && d ? d : '') + (v ? v : '');
				});
			}
			return t;
		}

		/**
		 * Resolver that can make selections based upon JQuery selectors and
		 * directives that indicate how the selected node(s) will be used
		 * 
		 * @param s
		 *            the string that will be used to contruct node resolvers
		 *            from or a pre-selected JQuery node object
		 * @param d
		 *            the directive to use for the selection: possible values
		 *            are &quot;text&quot;, &quot;html&quot; or an attribute
		 *            name or when nothing is defined JQuery's val() function
		 *            will be called to retrieve the replacement value
		 */
		function Resolver(s, d) {
			this.selector = s instanceof jQuery ? s : s ? $.trim(s) : null;
            this.directive = d ? $.trim(d) : '';
            if (this.directive) {
            	var ld = this.directive.toLowerCase();
            	if (ld == DTEXT || ld == DHTML) {
            		this.directive = ld;
            	}
            }
			this.selectFrom = function($el, be) {
				if (!s) {
					return '';
				}
				var $p = $el ? $el : $('html');
				var sbe = null;
				var jqs = this.selector instanceof jQuery;
				if (jqs && this.selector.is($p)) {
					return $p;
				}
				var $r = $p.find(this.selector);
				if ($r.length <= 0) {
					if (jqs && be) {
						sbe = genAttrSelByExample(this.selector);
						$r = $p.find(sbe);
					}
					if ($r.length <= 0) {
						$r = $p.filter(this.selector);
						if (sbe && $r.length <= 0) {
							$r = $p.filter(sbe);
						}
					}
				}
				return $r;
			};
			this.toString = function() {
				return lbls('selector', this.selector, 'directive',
						this.directive);
			};
		}

		/**
		 * Node resolvers captures one or more JQuery selectors along with any
		 * directives (e.g. &quot;text&quot;, &quot;html&quot; or attribute
		 * name)
		 * 
		 * @constructor
		 * @param s
		 *            the string that will be used to contruct node resolvers
		 *            from or a pre-selected JQuery node object
		 * @param pa
		 *            array of additional attributes to add resolvers for
		 *            (optional and will be treated cumulatively as one single
		 *            resolver)
		 */
		function NodeResolvers(s, pa) {
			var rvs = [];
			function add(s) {
				if (!s) {
					return null;
				}
				var r = null;
				if (s instanceof jQuery || typeof s === 'string') {
					r = new Resolver(s);
				} else {
					r = new Resolver(s[0], s.length > 1 ? s[1] : '');
				}
				return rvs[rvs.length] = r;
			}
			function resolve(s) {
				// regular expression must match entire expression
				var nv = s.replace(opts.regexNodeSiphon, function(m, v) {
					add(v.split(opts.regexDirectiveDelimiter));
					// replace expression now that add is done
					return '';
				});
				return nv;
			}
			this.siphon = s;
			this.each = function(fx) {
				if (typeof fx === 'function') {
					return $.each(rvs, fx);
				}
			};
			this.size = function() {
				return rvs.length;
			};
			if (s instanceof jQuery) {
				// already selected
				add(s);
			} else {
				// evaluate any node resolvers within the string and add any
				// remaining raw JQuery selectors that may not be wrapped in the
				// regular expression
				add(resolve(s));
				if (pa && s && opts.regexFragName.test(s)) {
					// add selection for any predefined attributes
					add(genAttrSelect(pa, s, null));
				}	
			}
		}

		/**
		 * Fragment path siphon
		 * 
		 * @constructor
		 * @param t
		 *            the {FragsTrack}
		 * @param f
		 *            the {Frag} the path siphon is for
		 * @param rp
		 *            the raw routing path siphon string
		 * @param vars
		 *            the associative array cache of names/values variables used
		 *            for <b>surrogate siphon resolver</b>s
		 */
		function FragPathSiphon(t, f, rp, vars) {
			var rpp = null;
			this.pathSiphon = function(rpn) {
				try {
					rp = rpn ? rpn : rp;
					if (!rpp || rpn) {
						rpp = siphonValues(rp, f.method, vars, opts.pathSep,
								null);
						if (rpp
								&& rpp.length > 0
								&& rpp.toLowerCase() != opts.selfRef
										.toLowerCase()
								&& !REGEX_CDATA.test(rpp)) {
							rpp = adjustPath(t.ctxPath, rpp, script ? script
									.attr(opts.fragExtensionAttr) : '');
						} else if (f.frs.resultSiphon()) {
							rpp = opts.selfRef;
						}
					}
					return rpp;
				} catch (e) {
					t.addError('Failed to capture path siphon on '
							+ (rpn ? rpn : rpp ? rpp : rp), null, e);
				}
			};
		}

		/**
		 * Fragment parameters siphon
		 * 
		 * @constructor
		 * @param t
		 *            the {FragsTrack}
		 * @param m
		 *            the HTTP method
		 * @param ps
		 *            the raw parameter siphon string
		 * @param vars
		 *            the associative array cache of names/values variables used
		 *            for <b>surrogate siphon resolver</b>s
		 */
		function FragParamSiphon(t, m, ps, vars) {
			var pnr = null;
			var psp = null;
			var pspp = null;
			var $ell = null;
			function getNewPs(uj, psn) {
				ps = psn ? psn : ps;
				// parameter siphons can capture either JSON or URL encoded
				// strings; so, only return a parameter siphon when either the
				// requested type has changed or a parameter siphon has not yet
				// been generated
				return (ps && !psp) || psn || (!uj && typeof psp === 'object')
						|| (uj && typeof psp === 'string') ? ps : null;
			}
			function kv(ps, k, v) {
				var ev = encodeURIComponent(v.replace(opts.regexParamReplace,
						opts.paramReplaceWith));
				if (typeof ps === 'string') {
					return ps + (ps.length > 0 ? opts.paramSep : '') + k + '='
							+ ev;
				} else {
					var o = {};
					o[k] = ev;
					$.extend(ps, o);
					return ps;
				}
			}
			function add(r, $p, ps, uj) {
				if (isExcludedVal($p)) {
					return ps;
				}
				// iterate over the attributes that will be used as keys
				var k = getOptsAttrVal($p, null, opts.paramNameAttrs, true);
				if (!k) {
					return ps;
				}
				var v = !r.directive ? $p.val() : r.directive == DTEXT ? $p
						.text() : r.directive == DHTML ? $p.html() : $p
						.attr(r.directive);
				if (v !== undefined && v !== null) {
					if ($.isArray(v)) {
						if (uj) {
							// convert each item in the array to a key/value
							// pair and add the array to the master object
							var vm = $.map(v, function(ev) {
								return kv({}, k, ev);
							});
							ps = kv(ps, k, vm);
						} else {
							$.each(v, function(i, ev) {
								ps = kv(ps, k, ev);
							});
						}
					} else {
						ps = kv(ps, k, v);
					}
				}
				return ps;
			}
			function resolve(uj, psn) {
				var psx = getNewPs(uj, psn);
				if (psx) {
					psp = siphonValues(psx, m, vars, opts.paramSep, null);
					pnr = new NodeResolvers(psp);
				}
				return psx;
			}
			// gets/sets and returns a parameter siphon string or object with
			// replaced surrogate siphon resolvers
			this.paramSiphon = function(uj, psn) {
				try {
					resolve(uj, psn);
					return psp;
				} catch (e) {
					t.addError('Failed to capture parameter siphon on '
							+ (psn ? psn : ps), null, e);
				}
			};
			// gets/sets and returns a parameter siphon string or object with
			// replaced surrogate siphon resolvers and node siphon resolvers
			this.params = function($el, uj, psn) {
				try {
					var $elc = $el instanceof jQuery ? $el : $ell ? $ell
							: $('html');
					// only trigger a capture when element has changed or a new
					// parameter siphon has been requested
					if (resolve(uj, psn) || (psp && (!$ell || !$ell.is($elc)))) {
						$ell = $elc;
						var x = uj ? {} : '';
						pnr.each(function(i, r) {
							var $p = r.selectFrom($ell);
							// avoiding JQuery serialize functions due to name
							// only capture
							// ps = add(r, $p, ps, uj);
							// ps = kv(ps, uj ? $p.serializeArray() :
							// $p.serialize());
							$p.each(function() {
								// add the key/value parameters individually in
								// order to handle the directive
								x = add(r, $(this), x, uj);
							});
						});
						pspp = x;
					}
					return pspp;
				} catch (e) {
					t.addError('Failed to capture parameters for element '
							+ $el + ' on ' + (psn ? psn : ps), null, e);
				}
			};
		}

		/**
		 * Fragment result siphon
		 * 
		 * @constructor
		 * @param t
		 *            the {FragsTrack}
		 * @param f
		 *            the {Frag} the destination siphon is for
		 * @param rs
		 *            the raw result siphon string or the pre-selected node(s)
		 * @param vars
		 *            the associative array cache of names/values variables used
		 *            for <b>surrogate siphon resolver</b>s
		 */
		function FragResultSiphon(t, f, rs, vars) {
			rs = typeof rs === 'string' ? $.trim(rs) : rs ? rs : null;
			var rsp = null;
			var rsr = null;
			var fx = null;
			var cel = null;
			this.getFunc = function() {
				return fx;
			};
			this.resultSiphon = function(el, rsn) {
				try {
					rsp = rsn ? rsn : rsp;
					if (!rsp || rsn || (el && el.nodeType && !el.is(cel))) {
						var iel = el instanceof jQuery;
						rsp = siphonValues(rsp ? rsp : iel ? el : rs, f.method,
								vars, opts.resultSep, null, el);
						if (!rsp && iel) {
							rsp = el;
						}
						// check if the result siphon is a function
						fx = new Func(opts, rsp, null, true);
						// default node resolver to either the siphoned string,
						// the passed element or nothing
						rsr = new NodeResolvers(!fx || !fx.isValid ? rsp ? rsp
								: iel ? el : '' : '', opts.fragAttrs);
						cel = el;
					}
					return rsp;
				} catch (e) {
					t.addError('Failed to capture result siphon on ' + rsn,
							null, e);
				}
			};
			this.add = function(arc, rr, r) {
				var rIsJ = r instanceof jQuery;
				var rslt = null;
				if (rr && rr.directive && rr.directive != DTEXT
						&& rr.directive != DHTML) {
					// try to get the result as an attribute
					rslt = rIsJ ? r.attr(rr.directive) : null;
				} else {
					// try to format result as text (if needed)
					rslt = rIsJ && rr && rr.directive == DTEXT ? getTextVals(r)
							: r ? r : '';
				}
				if (typeof rslt === 'string' && !opts.regexTags.test(rslt)) {
					// prepare the non-HTML result string for DOM insertion
					rslt = $(document.createTextNode(rslt));
				} else if (rslt && !(rslt instanceof jQuery)) {
					rslt = $(rslt);
				}
				if (rslt) {
					arc.rsltCache(f.navOpts.type() !== TREP, rslt);
				}
				return rslt;
			};
			this.each = function(el, rsn, xhr, efx) {
				this.resultSiphon(el, rsn);
				if (rsr && rsr.size() > 0) {
					rsr.each(efx);
					return f.dest();
				}
				return null;
			};
			this.parse = function(rslt) {
				var tn = opts.resultWrapperTagName || DFTL_RSLT_NAME;
				return $('<' + tn + '>' + rslt + '</' + tn + '>');
			};
			this.result = function(el) {
				return $(el).add(this.parse(''));
			};
			this.getFuncOrResultSiphon = function() {
				return fx && fx.isValid ? fx.getFuncString() : this
						.resultSiphon();
			};
		}

		/**
		 * Fragment destination siphon
		 * 
		 * @constructor
		 * @param t
		 *            the {FragsTrack}
		 * @param f
		 *            the {Frag} the destination siphon is for
		 * @param ds
		 *            the raw destination siphon string or the pre-selected
		 *            node(s)
		 * @param vars
		 *            the associative array cache of names/values variables used
		 *            for <b>surrogate siphon resolver</b>s
		 */
		function FragDestSiphon(t, f, ds, vars) {
			ds = typeof ds === 'string' ? $.trim(ds) : ds ? ds : null;
			var dsp = null;
			var dsr = null;
			function isAttr(r) {
				return r && r.directive && r.directive != DTEXT
						&& r.directive != DHTML;
			}
			function addTo(arc, ia, iu, im, dr, $ds, rr, r, $altr) {
				if (im) {
					// TODO : handle model/data processing
					return $ds;
				}
				// clear out any existing data from the destination node(s)
				if (iu) {
					if (isAttr(dr)) {
						$ds.attr(dr.directive, '');
					} else if (rr && (!dr.directive || dr.directive == DHTML)) {
						// remove any existing prior result node(s) that may
						// exist under the destination that match the result
						// siphon (ic)
						var $c = rr.selectFrom($ds, true);
						if ($c.length > 0) {
							$c.remove();
						} else {
							// residual text should be removed
							$ds.contents().filter(function() {
								return this.nodeType === 3;
							}).remove();
						}
					} else {
						// remove any existing content that may exist
						// under the destination
						$ds.contents().remove();
					}
				}
				var altr = null;
				if (!r && rr && rr.directive && rr.directive != DTEXT
						&& rr.directive != DHTML) {
					// no result, but is directed for an attribute- must be
					// self-referencing
					altr = function($d, $r) {
						return $d.attr(rr.directive);
					};
				} else if (isAttr(dr)) {
					// result needs to be set on attribute
					altr = function($d, $r) {
						var v = ia && !iu ? $d.attr(dr.directive) : null;
						$d.attr(dr.directive, (v ? v : '') + getTextVals($r));
					};
				} else if (r instanceof jQuery && dr.directive == DTEXT) {
					// result needs to be text
					altr = function($d, $r) {
						return getTextVals($r);
					};
				} else if ($altr instanceof jQuery) {
					// alternative result node provided
					altr = function($d, $r) {
						return $altr;
					};
				}
				if (r || altr) {
					// cache the destination for DOM insertion after all other
					// destinations have also been cached (prevents multiple
					// result resolver overwrites and improves performance)
					arc.destCache(ia, $ds, altr);
				}
			}
			function appendTo(arc, iu, im, dr, $d, rr, r, altr) {
				return addTo(arc, true, iu, im, dr, $d, rr, r, altr);
			}
			function replaceTo(arc, iu, im, dr, $d, rr, r, altr) {
				return addTo(arc, false, iu, im, dr, $d, rr, r, altr);
			};
			this.destSiphon = function(dsn) {
				dsp = dsn ? dsn : dsp;
				if (!dsp || dsn) {
					dsp = siphonValues(dsp || ds, f.method, vars, opts.destSep,
							null);
					dsr = new NodeResolvers(dsp ? dsp
							: ds instanceof jQuery ? ds : '', opts.fragAttrs);
				}
				return dsp;
			};
			this.destResolver = function(dsn) {
				this.destSiphon(dsn);
				return dsr;
			};
			this.add = function($p, arc, r, rr, im, ts, xhr) {
				this.destResolver().each(function(i, dr) {
					try {
						var $x = null;
						var $ds = dr.selectFrom($p);
						if ($ds.length <= 0) {
							return true;
						}
						if (f.navOpts.type() === TREP) {
							try {
								$x = $(r);
								replaceTo(arc, false, im, dr, $ds, rr, $x);
							} catch (e) {
								// node may contain top level text nodes
								$x = $ds.parent();
								replaceTo(arc, false, im, dr, $ds, rr, r, $x);
							}
						} else if (f.navOpts.type() === TINC
								|| f.navOpts.type() === TUPD) {
							if (f.fds.destSiphon() || f.navOpts.type() === TUPD) {
								if (f.fds.destSiphon()) {
									// when updating remove any pre-exsisting results 
									// from the destination that match the result siphon
									appendTo(arc, f.navOpts.type() === TUPD, im, dr, 
												$ds, rr, r);
								} else {
									// when updating remove everything in the destination
									appendTo(arc, f.navOpts.type() === TUPD, im, dr, $ds, 
											rr,	r);
								}
							} else {
								appendTo(arc, false, im, dr, $ds, rr, r);
							}
						} else {
							t.addError('Invalid destination type "' + f.navOpts.type()
									+ '" for ' + f.toString(), f, null, ts, xhr);
							return false;
						}
					} catch (e) {
						t.addError('Error while processing desitination "' 
								+ dr
								+ '" for ' + f.toString(), f, e, ts, xhr);
					}
				});
			};
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
				var pi = p.indexOf('?');
				if (pi >= 0) {
					p = p.substring(0, pi) + x + p.substring(pi);
				} else {
					p += x;
				}
			}
			p = absoluteUrl(p, c);
			return p;
		}

		/**
		 * Converts a relative URL to an absolute URL
		 * 
		 * @param relPath
		 *            the relative path to convert
		 * @param absPath
		 *            the absolute path to do the conversion from
		 * @returns the absolute path version of the relative path in relation to
		 *          the provided absolute path (or just the supplied relative path
		 *          when it's really an absolute path)
		 */
		function absoluteUrl(relPath, absPath) {
			return absolutePath(relPath, absPath, opts.regexAbsPath,
					opts.pathSep, bypassPath);
		}

		/**
		 * Bypasses a path when the path is determined to be an IANA protocol
		 * 
		 * @param p
		 *            the path to check for bypass
		 * @returns the bypass path (or null when no bypass is needed)
		 */
		function bypassPath(p) {
			return opts.regexIanaProtocol.test(p) ? urlAdjust(p,
					protocolForFile) : null;
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
				var sfbsc = script && evt.chain === opts.eventFragsBeforeChain ? script
						.attr(opts.fragsBeforeListenerAttr)
						: null;
				var sfsc = script && evt.chain === opts.eventFragsChain ? script
						.attr(opts.fragsListenerAttr)
						: null;
				if (sfc || sfbsc || sfsc) {
					var fs = sfc ? sfc : sfbsc ? sfbsc : sfsc;
					if (fs) {
						try {
							var f = new Func(opts, fs, evt);
							if (f.isValid) {
								var rr = f.run(el);
								if (rr.result == false) {
									evt.preventDefault();
									evt.stopPropagation();
								}
							}
						} catch (e) {
							log('Error in ' + fs + ' ' + (evt ? evt : '') + ': ' + e, 1);
						}
					}
				}
				return evt.isDefaultPrevented();
			} catch (e) {
				log('Error in ' + evt.type + ' ' + (evt ? evt : '') + ': ' + e, 1);
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
						: genFragsEvent(chain, type, t));
			}
			if (chain == opts.eventFragChain
					|| chain == opts.eventFragsBeforeChain
					|| chain == opts.eventFragsChain) {
				if (type == opts.eventFragAfterDom
						|| type == opts.eventFragLoad
						|| type == opts.eventFragsLoad
						|| type == opts.eventFragsBeforeLoad) {
					fire();
				} else if (f && !f.frp.pathSiphon()) {
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
		 *            the optional object that will contain siphon attribute
		 *            overrides
		 * @param isRoot
		 *            true when the root frament selection is the actual
		 *            template element
		 */
		function FragsTrack(s, siphon, navOpts) {
			var start = new Date();
			this.isTopLevel = isTopLevelEl(s);
			this.ctxPath = getAppCtxPath(opts.regexAbsPath, opts.pathSep,
					bypassPath);
			this.isSelfSelect = siphon && s.is(siphon.selector);
			this.scope = s;
			this.siphon = siphon ? siphon : {};
			this.siphon.vars = this.siphon.vars ? this.siphon.vars : new Vars(
					opts.regexVarNameVal, opts.regexVarSiphon);
			this.navOpts = navOpts;
			this.ccnt = 0;
			this.cnt = 0;
			this.len = 0;
			var c = [];
			this.addFrag = function(f) {
				var url = f.pseudoUrl();
				if (c[url]) {
					c[url].frags[c[url].frags.length] = f;
					return false;
				} else {
					c[url] = {
						result : null,
						status : null,
						xhr : null,
						frags : [ f ]
					};
				}
				return true;
			};
			this.getFrags = function(f) {
				return c[f.pseudoUrl()];
			};
			var e = [];
			this.addError = function(em, f, oc, hs, xhr) {
				function newError(f) {
					var e = new Error(em + (oc ? '. Cause: ' + oc.message : ''));
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
			var siphon = t.siphon;
			var loadSiphon = null;
			// "a" will represent the short-hand attrs
			var a = null;
			// scope select will identify if fragment details will come from the
			// passed tracking siphon or extracted by fragment attributes
			if (!t.isSelfSelect
					&& (loadSiphon = genSiphonObj(opts.ajaxTypeDefault, 'load',
							null, siphon.selector, this.el, t.siphon.vars, true)).isValid) {
				// DOM siphon attribute for a load event will take presedence
				// over short-hand include/replace/etc.
				loadSiphon.vars = t.siphon.vars;
				siphon = loadSiphon;
			} else if (!t.isSelfSelect) {
				a = getFragAttr($fl, opts.includeAttrs);
			} else {
				a = null;
			}
			this.ajaxAsync = true;
			this.navOpts = t.navOpts && t.navOpts.reuse() ? t.navOpts
					: new NavOptions(siphon.typeSiphon, opts.typeSep,
							siphon.targetSiphon, opts.targetSep);
			if (!a && !t.isSelfSelect) {
				a = getFragAttr($fl, opts.replaceAttrs);
				this.navOpts.type(TREP);
			} else {
				this.navOpts.type(TINC);
			}
			// short-hand attrs may have path and result siphon
			a = a ? a.split(opts.multiSep) : null;
			this.event = siphon.eventSiphon;
			this.method = siphon.method ? siphon.method
					: opts.ajaxTypeDefault;
			this.getVars = function() {
				return siphon.vars ? siphon.vars.get(this.method) : null;
			};
			this.ws = siphon.withSiphon;
			if (siphon.vars && this.ws) {
				// add user variables
				siphon.vars.add(this.method, this.ws);
			}
			this.fps = new FragParamSiphon(t, this.method, siphon.paramsSiphon,
					siphon.vars);
			this.frs = new FragResultSiphon(t, this,
					!a ? siphon.resultSiphon : a && a.length > 1 ? $.trim(a[1])
							: null, siphon.vars);
			this.frp = new FragPathSiphon(t, this, !a ? siphon.pathSiphon : a
					&& a.length > 0 ? $.trim(a[0]) : null, siphon.vars);
			this.fds = new FragDestSiphon(t, this,
					!a && siphon.destSiphon ? siphon.destSiphon : this.el,
					siphon.vars);
			this.destScope = null;
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
			this.pseudoUrl = function(f) {
				return (this.frp.pathSiphon() ? this.frp.pathSiphon() : '')
						+ (this.fps.params() ? '?' + this.fps.params() : '');
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
			var arc = new AppReplCache();
			// handles processing of fragments
			this.rslt = function(r, rr, xhr, ts, e) {
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
				var xIsJ = r instanceof jQuery;
				if (xIsJ && r.is('script')) {
					if (xhr && xhr.status != 200) {
						t.addError(xhr.status + ': ' + ts
								+ ' path siphon="' + this.frp.pathSiphon() 
								+ '"', this, e, ts, xhr);
						this.domDone(true);
						return;
					} else if (!xhr && this.frp.pathSiphon() && this.frs.resultSiphon()) {
						var sd = this.frp.pathSiphon().indexOf(DATA_JS);
						sd = sd > -1 ? this.frp.pathSiphon().substr(
								DATA_JS.length) : this.frp.pathSiphon();
						var ss = r.prop('type');
						$('<script' + (typeof ss === 'string' && ss.length > 0 ? 
							' type="' + ss + '">' : '>') + sd + 
									'</script>').appendTo(this.frs.resultSiphon());
					}
				} else {
					// TODO : should there be an option to designate a parent
					// node for which the destination selection will be made? if
					// so, just pass it in as the 1st parameter for the
					// destination siphon's add function:
					this.fds.add(null, arc, this.frs.add(arc, rr, r), rr, this
							.isModel(xhr), ts, xhr);
				}
				this.domDone(false);
			};
			this.dest = function() {
				var $adds = null;
				try {
					$adds = arc.appendReplace();
				} catch (e) {
					t.addError('Error while adding desitination results to the DOM ' 
							+ ' for ' + this.toString(), this, e);
				}
				if (!$adds) {
					this.domDone(true);
					return;
				}
				// make post template DOM adjustments- no need for URL updates-
				// they needed to be completed prior to placement in the DOM or
				// URLs in some cases will be missed (like within the head)
				htmlDomAdjust(t, ctx, $adds, false);
				return this.destScope = jqAdd(this.destScope, $adds);
			};
			this.nav = function(no) {
				no = no ? no : this.navOpts;
				var vars = null;
				if (this.method.toLowerCase() != 'get') {
					// for performance we'll build input strings versus nodes
					// before we simulate the synchronous form submission/page
					// transfer
					var fd = $('<form style="display:none;" action="'
							+ this.frp.pathSiphon() + '" method="'
							+ this.method + '" />');
					vars = this.fps.params(true);
					var ips = '';
					for (var i = 0; i < vars.length; i++) {
						ips += '<input name="' + vars[i].name + '" value="'
								+ vars[i].value + '" />';
					}
					fd.append(ips);
					no.getWin().$('body').append(fd);
					fd.submit();
					return no.getWin();
				} else {
					var loc = this.frp.pathSiphon();
					var vars = this.fps.params();
					if (vars) {
						loc += '?' + vars;
					}
					return no.getWin(loc);
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
						pathSiphon : cf.frp.pathSiphon(),
						resultSiphon : cf.frs.getFuncOrResultSiphon(),
						destSiphon : cf.fds.destSiphon(),
						destScope : cf.destScope
					};
				} while ((cf = cf.pf));
				return us;
			};
			this.toString = function() {
				return lbls('object', this.constructor.name, 'options',
						this.navOpts.toString(), 'HTTP method', this.method,
						'URL', this.pseudoUrl(), 'parameter siphon', this.fps
								.paramSiphon(), 'path siphon', this.frp
								.pathSiphon(), 'result siphon', this.frs
								.getFuncOrResultSiphon(), 'destination siphon',
						this.fds.destSiphon(), 'agent siphon', this.as,
						'cancelled', this.cancelled, 'error',
						this.e ? this.e.message : null);
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
			o.httpMethod = f ? f.method : undefined;
			o.fragCount = t.cnt;
			o.fragCurrTotal = t.len;
			o.fragPendingPeerCount = f && f.pf ? f.pf.ccnt() : 0;
			o.fragWin = f ? f.navOpts.getWin() : undefined;
			o.fragIsAsync = f ? f.navOpts.isAsync : undefined;
			o.fragType = f ? f.navOpts.type() : undefined;
			o.fragWinTarget = f ? f.navOpts.target : undefined;
			o.fragWinOptions = f ? f.navOpts.options : undefined;
			o.fragWinHistoryFlag = f ? f.navOpts.history : undefined;
			o.fragStack = f ? f.getStack() : undefined;
			o.sourceEvent = f ? f.event : undefined;
			o.paramsSiphon = f ? f.fps.paramSiphon() : undefined;
			o.parameters = f ? f.fps.params() : undefined;
			o.pathSiphon = f ? f.frp.pathSiphon() : undefined;
			o.resultSiphon = f ? f.frs.getFuncOrResultSiphon() : undefined;
			o.destSiphon = f ? f.fds.destSiphon() : undefined;
			o.agentSiphon = f ? f.as : undefined;
			o.destScope = f ? f.destScope instanceof jQuery ? f.destScope
					: f.el : undefined;
			o.error = f ? f.e : undefined;
			o.scope = t.scope;
			o.chain = opts.eventFragChain;
			o.variables = f ? f.getVars() : t.siphon ? t.siphon.vars.get()
					: undefined;
			o.log = function(l) {
				log(o, l);
			};
			o.toFormattedString = function() {
				return lbls('event chain', o.chain, 'fragCount', o.fragCount,
						'fragCurrTotal', o.fragCurrTotal, 'sourceEvent',
						o.sourceEvent, 'parameters', o.parameters,
						'paramsSiphon', o.paramsSiphon, 'pathSiphon',
						o.pathSiphon, 'resultSiphon', o.resultSiphon,
						'destSiphon', o.destSiphon, 'element', o.element,
						'error', o.error);
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
		 * @param chain
		 *            the chaining designation for the event
		 * @param type
		 *            the type of fragments event
		 * @param t
		 *            the {FragsTrack} used
		 * @returns a fragments JQuery event
		 */
		function genFragsEvent(chain, type, t) {
			var e = $.Event(type);
			e.chain = chain;
			e.fragCancelCount = t.ccnt;
			e.fragCount = t.cnt;
			e.scope = t.scope;
			e.errors = t.getErrors();
			e.loadTime = t.elapsedTime(e.timeStamp);
			e.log = function(l) {
				log(this, l);
			};
			e.toFormattedString = function() {
				return lbls('event chain', e.chain, 'fragCancelCount',
						e.fragCancelCount, 'fragCount', e.fragCount, 'scope',
						e.scope, 'errors', e.errors, 'loadTime', e.loadTime);
			};
			return e;
		}

		/**
		 * Loads fragments (nested supported) into the page using a predefined
		 * HTML attribute for fragment discovery. The attribute value should
		 * contain a URL followed by a replacement/include value that will match
		 * a fragment result attribute. For example:
		 * 
		 * <pre>
		 * &lt;!-- source element --&gt;
		 * &lt;div id=&quot;parent&quot;&gt;
		 * 	&lt;div th:fragments=&quot;path/to/frags :: fragContents&quot;&gt;&lt;/div&gt;
		 * &lt;/div&gt;
		 * &lt;!-- fragment element --&gt;
		 * &lt;div th:fragment=&quot;fragContents&quot;&gt;Contents&lt;/div&gt;
		 * </pre>
		 * 
		 * Will result in:
		 * 
		 * <pre>
		 * &lt;!-- when including --&gt;
		 * &lt;div id=&quot;parent&quot;&gt;
		 * 	&lt;div th:fragments=&quot;path/to/frags :: fragContents&quot;&gt;Contents&lt;/div&gt;
		 * &lt;/div&gt;
		 * &lt;!-- when replacing --&gt;
		 * &lt;div id=&quot;parent&quot;&gt;
		 * 	&lt;div th:fragment=&quot;fragContents&quot;&gt;Contents&lt;/div&gt;
		 * &lt;/div&gt;
		 * </pre>
		 * 
		 * @param scopeSel
		 *            the selector to the root element where fragments will be
		 *            looked for
		 * @param siphon
		 *            the siphon/selector to the templates that will be
		 *            included/replaced
		 * @param nav
		 *            a {NavOptions} reference that will be used (otherwise, one will
		 *            be created dynamically for each fragment encountered)
		 * @param func
		 *            the callback function that will be called when all
		 *            fragments have been loaded (parameters: the original root
		 *            element, the number of fragments processed and an array of
		 *            error objects- if any)
		 */
		function loadFragments(scopeSel, siphon, nav, func) {
			var $s = $(scopeSel);
			var so = typeof siphon === 'object' ? siphon : {
				selector : siphon
			};
			var t = new FragsTrack($s, so, nav);
			broadcast(opts.eventFragsBeforeChain, opts.eventFragsBeforeLoad, t);
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
						if (updateUrls) {
							refreshNamedAnchor();
						}
					}
					broadcast(opts.eventFragsChain, opts.eventFragsLoad, t);
				}
			}
			function hndlFunc(f, cb, r, status, xhr) {
				if (f.frs.getFunc() && f.frs.getFunc().isValid) {
					var rr = f.frs.getFunc().run({
						handle : {
							type : f.navOpts.type(),
							target : f.navOpts.target,
							data : r,
							status : status,
							xhr : xhr,
							fragSrc : addFragProps({}, t, f),
							proceed : function(x) {
								try {
									f.rslt(x);
									f.dest();
								} catch (e) {
									t.addError('Error during handler proceed', f, e, 
											status, xhr);
								}
							}
						}
					});
					if (rr.errorMessage) {
						t.addError(rr.errorMessage, f, rr.errorCause, status,
								xhr);
					}
					cb(f.el, f);
					return true;
				}
				return false;
			}
			function doScript(f, $t, $x, cb) {
				function sdone(sf, jqxhr, ts, e) {
					// when there is no xhr, assume inline script that needs to
					// be processed on the target
					sf.rslt(sf.el, null, jqxhr, ts, e);
					cb(jqxhr && (!ts || !e) ? $t : null, sf);
				}
				var url = $x.prop('src');
				var hasu = url && url.length > 0;
				var hasdu = hasu && url.indexOf(DATA_JS) >= 0;
				t.len++;
				var sf = new Frag(f, $s, $x, t);
				var path = hasu ? url : $x.text();
				path = path ? path : $x.html();
				sf.frp.pathSiphon(path);
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
					f.rslt(r, null, status, xhr, null);
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
						// prevent script from auto loading
						var scs = hr.match(opts.regexScriptTags);
						if (scs) {
							$.each(scs, function(i, sc) {
								doScript(hf, $h, $(sc), cb);
								hr = hr.replace(sc, '');
							});
						}
						// head is special case that does not require multiple
						// result/destination compilations
						hf.rslt(hr);
						hf.dest();
						cb($h, f);
						return;
					}
				}
				// capture results
				var rslt = htmlDataAdjust(t, f, r);
				var $c = f.frs.parse(rslt);
				// loop through the resolvers separately in order to handle any
				// directives that may be defined
				var $rslts = f.frs.each($c, null, xhr, function(i, rr) {
					// need to re-parse result because any nodes that may be
					// appended to a destination from a previous result resolver
					// iteration will no longer be present in the result node
					var $fs = rr.selectFrom(i == 0 ? $c : f.frs.parse(rslt));
					if ($fs.length <= 0) {
						// nothing found
						return true;
					}
					// loop through the selected result nodes and handle DOM
					// insertion
					$fs.each(function() {
						var $cf = $(this);
						var $cfs = $cf.find('script');
						$cfs.each(function() {
							doScript(f, $cf, $(this), cb);
						});
						if ($cf.is('script')) {
							doScript(f, $cf, $cf, cb);
						} else {
							f.rslt($cf, rr, xhr);
						}
					});
				});
				if ($rslts && $rslts.length > 0) {
					cb($rslts, f);
				} else {
					t.addError('No matching results for ' + f.toString()
							+ ' in\n' + r, f, null, status, xhr);
					cb(null, f);
				}
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
					if (f.frp.pathSiphon() == opts.selfRef) {
						// fragment is within current page
						lcont(f, cb, $('html').html(), opts.selfRef, null);
						return;
					}
					// when the fragment path is the 1st one in the queue retrieve it
					// the queue will prevent duplicate calls to the same fragment path
					if (t.addFrag(f)) {
						function adone(r, status, xhr) {
							var tf = t.getFrags(f);
							tf.result = r;
							tf.status = status;
							tf.xhr = xhr;
							for (var i=0; i<tf.frags.length; i++) {
								lcont(tf.frags[i], cb, r, status, xhr);
							}
						}
						// use ajax vs load w/content target for more granular control
						$.ajax({
							url: f.frp.pathSiphon(),
							type: f.method,
							data: f.fps.params(),
							async: f.ajaxAsync,
							cache: opts.ajaxCache,
							crossDomain: opts.ajaxCrossDomain
						}).done(adone).fail(function(xhr, ts, e) {
							var tf = t.getFrags(f);
							for (var i = 0; i < tf.frags.length; i++) {
								t.addError('Error at ' + tf.frags[i].toString() + ': '
										+ ts + '- ' + e, tf.frags[i], e, ts, xhr);
								if (!hndlFunc(tf.frags[i], cb, null, ts, xhr)) {
									cb(null, tf.frags[i]);
								}
							}
						});
					} else {
						var tf = t.getFrags(f);
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
				var $fs = t.isSelfSelect && $f.is(t.scope) ? $f : $f.find(so.selector);
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
			ajaxCrossDomain : false,
			ajaxTypeDefault : 'GET',
			inheritRef : 'inherit',
			pathSep : DFLT_PATH_SEP,
			paramSep : '&',
			agentSelSep : ',',
			resultSep : ',',
			destSep : ',',
			typeSep : '|',
			targetSep : '|',
			multiSep : '::',
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
			getTypeAttrs : [ 'data-thx-get-type' ],
			postTypeAttrs : [ 'data-thx-post-type' ],
			putTypeAttrs : [ 'data-thx-put-type' ],
			deleteTypeAttrs : [ 'data-thx-delete-type' ],
			getTargetAttrs : [ 'data-thx-get-target' ],
			postTargetAttrs : [ 'data-thx-post-target' ],
			putTargetAttrs : [ 'data-thx-put-target' ],
			deleteTargetAttrs : [ 'data-thx-delete-target' ],
			getAgentAttrs : [ 'data-thx-get-agent' ],
			postAgentAttrs : [ 'data-thx-post-agent' ],
			putAgentAttrs : [ 'data-thx-put-agent' ],
			deleteAgentAttrs : [ 'data-thx-delete-agent' ],
			getWithAttrs : [ 'data-thx-get-with' ],
			postWithAttrs : [ 'data-thx-post-with' ],
			putWithAttrs : [ 'data-thx-put-with' ],
			deleteWithAttrs : [ 'data-thx-delete-with' ],
			fragExtensionAttr : 'data-thx-frag-extension',
			fragListenerAttr : 'data-thx-onfrag',
			fragsListenerAttr : 'data-thx-onfrags',
			fragsBeforeListenerAttr : 'data-thx-onbeforefrags',
			fragHeadAttr : 'data-thx-head-frag',
			paramNameAttrs : [ 'name', 'id' ],
			regexFragName : /^[_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*$/,
			regexFunc : /^[_$a-zA-Z\xA0-\uFFFF].+?\(/i,
			regexFileName : /[^\/?#]+(?=$|[?#])/,
			regexTags : /<[a-z]+[^>]*>(?:[\S\s]*?)<\/(?:[\S\s]*?)[a-z]+>/i,
			regexScriptTags : /<script[^>]*>([\\S\\s]*?)<\/script>/img,
			regexAttrRelUrlSuffix : '\s*=\s*[\"|\\\'](?!(?:[a-z]+:)|/|#)(.*?)[\"|\\\']',
			regexAttrAnyUrlSuffix : '\s*=\s*[\\"|\'](.*?)[\\"|\']',
			regexIanaProtocol : /^(([a-z]+)?:|\/|#)/i,
			regexFileTransForProtocolRelative : /^(file:?)/i,
			regexAbsPath : REGEX_ABS_PATH,
			regexFuncArgs : /(('|").*?('|")|[^('|"),\s]+)(?=\s*,|\s*$)/g,
			regexFuncArgReplace : /['"]/g,
			regexDirectiveDelimiter : /->/g,
			regexSurrogateSiphon : /(?:\?{)((?:(?:\\.)?|(?:(?!}).))+)(?:})/g,
			regexNodeSiphon : /(?:\|{)((?:(?:\\.)?|(?:(?!}).))+)(?:})/g,
			regexVarSiphon : /(?:\${)((?:(?:\\.)?|(?:(?!}).))+)(?:})/g,
			regexVarNameVal : /((?:\\.|[^=,]+)*)=("(?:\\.|[^"\\]+)*"|(?:\\.|[^,"\\]+)*)/g,
			regexParamCheckable : /^(?:checkbox|radio)$/i,
			regexParamReplace : /\r?\n/g,
			regexDestTextOrAttrVal : /[^\x21-\x7E]+/g,
			paramReplaceWith : '\r\n',
			resultWrapperTagName : DFTL_RSLT_NAME,
			eventIsBroadcast : true,
			eventFragChain : 'frag',
			eventFragsBeforeChain : 'fragsBefore',
			eventFragsChain : 'frags',
			eventFragBeforeHttp : 'beforehttp.thx.frag',
			eventFragBeforeDom : 'beforedom.thx.frag',
			eventFragAfterDom : 'afterdom.thx.frag',
			eventFragLoad : 'load.thx.frag',
			eventFragsBeforeLoad : 'beforeload.thx.frags',
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
			log('Unable to detect IE version: ' + e, 1);
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
				var su = getAppCtxRelPath(s, REGEX_ABS_PATH, DFLT_PATH_SEP);
				$.getScript(su).done(function(data, ts, jqxhr) {
					cb(su, data, ts, jqxhr, null);
				}).fail(function(jqxhr, ts, e) {
					cb(su, null, ts, jqxhr, e);
				});
			} else {
				cb(null, null, null, null);
			}
		}
		preloadResources(script.attr(FRAGS_PRE_LOAD_CSS_ATTR), script
				.attr(FRAGS_PRE_LOAD_JS_ATTR), function (s, d, ts, jqxhr, e) {
			if (e) {
				var ne = 'Unable to load "' + s + '" ' + e + ', status: ' + ts
						+ ', data: ' + d;
				log(ne, 1);
				throw new Error(ne);
			} else {
				var $p = $('html');
				if (!preLoadAttr(FRAGS_LOAD_DEFERRED_LOAD_ATTR)) {
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
	 * Retrieves or assigns an elements attribute before loading has begun
	 * 
	 * @param a
	 *            the attribute to retrieve or assign
	 * @param d
	 *            the optional default value to return when the attribute cannot
	 *            be found
	 * @param v
	 *            the value to set (when invalid nothing will be set, but rather
	 *            the existing vlaue will be returned)
	 * @param e
	 *            the optional element to retrieve the attribute value from
	 *            (null/undefined will use script element)
	 */
	function preLoadAttr(a, d, e, v) {
		if (!e) {
			e = document.getElementById(NS);
			if (!e) {
				throw new Error('Missing script ID: ' + NS);
			}
		}
		if (v && e) {
			if (e.setAttribute) {
				e.setAttribute(a, v);
			} else {
				e.attributes[a].nodeValue = v;
			}
		}
		var r = e ? e.getAttribute ? e.getAttribute(a)
				: e.attributes[a].nodeValue : null;
		return d && !r ? d : r;
	}

	/**
	 * Preforms pre-initialization tasks like the capture setting of the
	 * <code>href</code> of the document's <code>base</code> to the path
	 * from the {BASE_PATH_ATTR} attribute and loading JQuery (if needed).
	 */
	function preInit() {
		updateUrls = true;
		basePath = preLoadAttr(BASE_PATH_ATTR);
		//var body = document.getElementsByTagName('body')[0];
		var base = document.getElementsByTagName('base')[0];
		var bp = base ? preLoadAttr('href', null, base) : null;
		var bpu = bp && basePath && bp.toLowerCase() != basePath.toLowerCase();
		var fbpu = ieVersion > 0 && ieVersion <= ieVersionCompliant;
		if (bpu) {
			// base is already processed at this point, need to manually handle
			// conversion of relative URLs to absolute paths
			log('Found base href="' + bp + '" while ' + NS + ' '
					+ BASE_PATH_ATTR + '="' + basePath
					+ '". Relative URLs will be updated via JQuery and may '
					+ 'not reflect the base tag href', 2);
			// update base href
			//preLoadAttr('href', null, base, basePath);
			// write base href
			// document.write('<base href="' + urlAdjust(basePath) + '" />');
		} else if (!basePath && !fbpu) {
			// some IE versions do not handle URLs from base properly
			updateUrls = false;
			basePath = bp;
		}
		if (!basePath) {
			updateUrls = false;
			throw new Error('Unable to capture ' + BASE_PATH_ATTR);
		}
		// initialize
		if (!jq) {
			loadJQuery();
		} else {
			init(null);
		}
	}

	/**
	 * Loads JQuery using a value set with the {JQUERY_URL_ATTR} attribute or
	 * {JQUERY_DEFAULT_URL} when the {JQUERY_URL_ATTR} attribute is not defined
	 */
	function loadJQuery() {
		var su = preLoadAttr(JQUERY_URL_ATTR, JQUERY_DEFAULT_URL);
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
	}
	
	// start thymus.js
	preInit();
})();