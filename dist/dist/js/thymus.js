/*!
 * thymus.js v1.0.0 (http://thymusjs.org)
 * Copyright 2013-2014 Akira LLC
 * Licensed under MIT (https://github.com/ugate/thymus/blob/master/LICENSE)
 */
+function($) {
	var NS = displayName = 'thymus';
	var DFLT_PATH_SEP = '/';
	var REGEX_ABS_PATH = /([^:]\/|\\)(?:\/|\\)+/;
	var REGEX_ABS_SPLIT = /\?|#/;
	var REGEX_CDATA = /<!\[CDATA\[(?:.|\r\n|\n|\r)*?\]\]>/ig;
	var DATA_JS = 'data:text/javascript,';
	var JQUERY_URL_ATTR = 'data-thx-jquery-url';
	var JQUERY_DEFAULT_URL = 'http://code.jquery.com/jquery.js';
	var FRAGS_LOAD_DEFERRED_LOAD_ATTR = 'data-thx-deferred-load';
	var BASE_PATH_ATTR = 'data-thx-base-path';
	var FRAGS_PRE_LOAD_CSS_ATTR = 'data-thx-preload-css';
	var FRAGS_PRE_LOAD_JS_ATTR = 'data-thx-preload-js';
	var DFTL_RSLT_NAME = NS + '-results';
	var VARS_ATTR_TYPE = 'with';
	var DOM_ATTR_TYPES = [ 'type', 'params', 'path', 'result', 'dest', 'target',
			'delegate', VARS_ATTR_TYPE ];
	var DOM_ATTR_AGENT = 'agent';
	var HTTP_METHODS = [ 'GET', 'POST', 'DELETE', 'PUT' ];
	var DTEXT = 'text';
	var DHTML = 'html';
	var ASYNC = 'async';
	var SYNC = 'sync';
	var URL_ATTR = 'urlattr';
	var TTRAN = 'transfer';
	var TATTR = 'attribute';
	var TINC = 'include';
	var TREP = 'replace';
	var TUPD = 'update';
	var TYPES_PPU = [ URL_ATTR, TATTR, TINC, TREP, TUPD ];
	var TDFLT = TINC;
	var eventFuncs = {};
	var eventFuncCnt = 0;
	var isLinux = false;
	var ieVersion = 0;
	var ieVersionCompliant = 9;
	var basePath = null;
	var updateUrls = false;
	var firstRun = true;
	var rootRun = true;

	if (typeof $ === 'undefined') {
		throw new Error('jQuery is required for ' + NS);
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
		var $$ = this;
		var $c = c;
		$$.cache = function($x) {
			if ($x instanceof $) {
				if ($c instanceof $) {
					$c = $c.add($x);
				} else {
					$c = $x;
				}
			}
			return $c;
		};
		$$.clear = function(n) {
			$c = null;
			return n ? $$ : null;
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
		var $$ = this;
		var dc = new JqCache($dc);
		var rc = new JqCache(r);
		$$.detachCache = new JqCache();
		$$.rsltCache = function(r) {
			return rc.cache(r instanceof $ ? r
					: typeof r === 'object' ? $(r) : r);
		};
		$$.destCache = function($dc) {
			return dc.cache($dc);
		};
		$$.manip = function(ia, alt) {
			var $d = dc.cache();
			var $r = rc.cache();
			if ($d && $r) {
				// don't use wrapper in destinations
				$r = $r.is(DFTL_RSLT_NAME) ? $r.contents() : $r;
				var f = typeof alt === 'function' ? function(i, r) {
					return alt($d, $r, i, this);
				} : null;
				if (typeof ia === 'function') {
					ia($d, $r);
				} else if (ia) {
					$d.append(f ? f : alt ? alt : $r);
				} else {
					// detach in order to keep event propigation
					var drwArgs = f ? f : alt ? alt : $r;
					if ($.isArray(drwArgs)) {
						detachReplaceWith.apply($d, drwArgs);
					} else {
						detachReplaceWith.call($d, drwArgs);
					}
					$$.detachCache.cache($d);
				}
				return $r;
			}
			return null;
		};
		$$.clear = function(n) {
			dc = dc.clear(n);
			rc = rc.clear(n);
			return n ? $$ : null;
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
		var $$ = this;
		var nc = new ManipCache(ndc, nrc);
		var ac = new ManipCache(adc, arc);
		var dc = null;
		var altnc = [];
		var rc = null;
		function alt(arr, x, fx) {
			if (arr && x && typeof fx === 'function') {
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
				for (var i = 0; i < arr.length; i++) {
					var m = arr[i].x;
					if (m.is(x)) {
						return arr[i].fx;
					}
				}
			}
			return null;
		}
		$$.rsltCache = function(rc) {
			return nc.rsltCache(rc);
		};
		$$.destCache = function($dc, altr) {
			alt(altnc, $dc, altr);
			return nc.destCache($dc);
		};
		$$.detachCache = function() {
			return dc;
		};
		$$.manips = function(n) {
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
			dc = nc.detachCache;
			rc = rc.clear(n);
			$$.clear(n);
			return $r;
		};
		$$.clear = function(n) {
			nc = nc ? nc.clear(n) : n ? new ManipCache() : null;
			ac = ac ? ac.clear(n) : n ? new ManipCache() : null;
			rc = rc ? rc.clear(n) : n ? new ManipCache() : null;
			return n ? $$ : null;
		};
	}

	/**
	 * A {ManipsCache} variant used for <code>JQuery.append</code> and
	 * <code>JQuery.replaceWith</code> operations caching
	 * 
	 * @constructor
	 */
	function AppReplCache() {
		var $$ = this;
		var ach = new ManipsCache(true);
		var rch = new ManipsCache(false);
		var dc = null;
		var ich = [];
		function manips($r, c, n) {
			return $r ? $r.add(c.manips(n)) : c.manips(n);
		}
		$$.detachCache = function() {
			return dc;
		};
		$$.rsltCache = function(ia, rc, solo) {
			if (solo) {
				// the result is destination specific
				var rdc = new ManipsCache(ia);
				rdc.rsltCache(rc);
				ich[ich.length] = rdc;
				return rdc.rsltCache();
			} else {
				return (ia ? ach : rch).rsltCache(rc);
			}
		};
		$$.destCache = function(ia, $dc, altr, rc) {
			if (rc) {
				for (var i = 0; i < ich.length; i++) {
					if (rc.is(ich[i].rsltCache())) {
						return ich[i].destCache($dc, altr);
					}
				}
			} else {
				return (ia ? ach : rch).destCache($dc, altr);
			}
		};
		$$.appendReplaceAll = function(n) {
			var $r = null;
			for (var i = 0; i < ich.length; i++) {
				$r = manips($r, ich[i], n);
			}
			$r = manips($r, ach, n);
			$r = manips($r, rch, n);
			dc = rch.detachCache();
			$$.clear(n);
			return $r;
		};
		$$.clear = function(n) {
			ach = ach ? ach.clear(n) : n ? new ManipsCache(true) : null;
			rch = rch ? rch.clear(n) : n ? new ManipsCache(false) : null;
			ich = n ? [] : null;
			return n ? $$ : null;
		};
	}

	/**
	 * Detach version of JQuery's replaceWith
	 */
	function detachReplaceWith() {
		var	args = jQuery.map(this, function(elem) {
			return [ elem.nextSibling, elem.parentNode ];
		}), i = 0;
		this.domManip(arguments, function(elem) {
			var next = args[i++], parent = args[i++];
			if (parent) {
				if (next && next.parentNode !== parent) {
					next = this.nextSibling;
				}
				jQuery(this).detach();
				parent.insertBefore(elem, next);
			}
		}, true);
		return i ? this : this.detach();
	}


		/**
	 * DOM event function that allows listener updates and on/off options
	 * 
	 * @constructor
	 * @param pel
	 *            the parent element that
	 * @param el
	 *            the element that will be broadcasting the event
	 * @param en
	 *            the event name
	 * @param m
	 *            the HTTP method
	 * @param del
	 *            an optional event delegate selector
	 * @param fx
	 *            the function that will be executed when an incoming event is
	 *            received (parameters: current parent element, reference to the
	 *            DOM event function)
	 * @param rfx
	 *            an optional function that will be called once the event has
	 *            completed
	 */
	function DomEventFunc(pel, el, en, m, del, fx, rfx) {
		var $el = $(el);
		var $pel = $(pel);
		var func = fx;
		var event = en;
		function on(evt) {
			var rtn = func($pel, $(this), evt);
			if (typeof rfx === 'function') {
				rfx(rtn, evt);
			}
		}
		this.update = function(pel, en, fx, add) {
			$pel = pel ? $(pel) : $pel;
			func = fx || func;
			if ((en && en != event) || add == false) {
				$el.off(event, del, on);
				event = en || event;
			}
			if (add == true) {
				$el.on(event, del, on);
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
	 * @param del
	 *            an optional event delegate selector
	 * @param fx
	 *            the function to execute when the event occurs (when the
	 *            function returns <code>true</code> the event listener will
	 *            be turned off)
	 */
	function addOrUpdateEventFunc(ctx, a, m, pel, el, evt, del, fx) {
		var en = getEventName(evt, false);
		if (el) {
			// prevent duplicating event listeners
			for ( var k in eventFuncs) {
				if (eventFuncs[k].isMatch(m, el)
						&& eventFuncs[k].getEvent() == en) {
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
			eventFuncs[fn] = new DomEventFunc(pel, el, en, m, del, fx, fxCheck);
			eventFuncs[fn].getElement().on('remove', del, function() {
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
	 * @param type
	 *            the navigation type {ASYNC} or {SYNC} delimited by the
	 *            specified separator, with global inclusion type
	 * @param typeSep
	 *            the separator to extract the type of the navigation options
	 * @param target
	 *            the window target delimited by the specified separator, with
	 *            the optional window options
	 * @param targetSep
	 *            the separator to extract the target of the navigation options
	 */
	function NavOptions(type, typeSep, target, targetSep) {
		var $$ = this;
		var win = null, rcnt = 0;
		var ptype = type ? splitWithTrim(type, typeSep) : [ ASYNC ];
		$$.isAsync = ptype[0].toLowerCase() == SYNC ? false : true;
		var forceType = ptype.length > 1;
		ptype = forceType ? ptype[1].toLowerCase() : TDFLT;
		$$.target = target ? splitWithTrim(target, targetSep) : [ '_self' ];
		$$.options = $$.target.length > 1 ? $$.target[1] : undefined;
		$$.history = $$.target.length > 2 ? $$.target[2] : undefined;
		$$.target = $$.target[0];
		$$.reuseMax = 1;
		$$.reuse = function() {
			return rcnt < $$.reuseMax ? ++rcnt : 0;
		};
		$$.isFullPageSync = function() {
			return !$$.isAsync && ptype == TTRAN;
		};
		$$.type = function(nt) {
			if (!forceType && nt) {
				ptype = nt;
			}
			return ptype;
		};
		$$.getWin = function(loc, delay, timeout, dfx, lfx) {
			function opt() {
				var w = getWinHandle();
				var oe = null, ol = w.location.href, ohn = w.location.hostname;
				var $f = loc instanceof $ && loc.is('form') ? loc : null;
				if ($f) {
					$('body', w.document).append($f);
				}
				if (dfx) {
					dfx.call();
				}
				if (lfx) {
					var li = 0;
					function onOff(on) {
						// do not cache window/document handles (IE may throw
						// Permission Denied)
						var wh = getWinHandle();
						var $t = $f || $(wh);
						var e = null;
						if (li == 0) {
							// TODO : for some reason Linux wont fire unload (tested on chrome)
							e = ieVersion > 0 || isLinux ? 'ready' : $f ? 'submit' : 'unload';
						} else if (li == 1) {
							e = 'ready'; //e = ieVersion > 0 ? 'ready' : 'load';
							$t = $(wh);
						}
						if (!e) {
							return;
						}
						if (on) {
							if (e == 'ready') {
								// wait for the document to complete loading
								wait(delay, timeout, getWinHandle, function(cnt, e) {
									oe();
								});
							} else {
								$t.on(e, oe);
							}
						} else {
							try {
								$t.off(e, oe);
							} catch (e) {
								// ignore
							}
							li++;
						}
					}
					oe = function() {
						onOff();
						// wait for location to change before listening for
						// ready/load state or it will never fire
						wait(delay, timeout, null, function(cnt, e) {
							if (e) {
								lfx.call(e);
								return;
							}
							try {
								var w = getWinHandle();
								if (ohn && ohn != w.location.hostname) {
									// different host will not trigger load
									// event- best effort exhausted
									lfx.call();
									return true;
								}
								if (ol != w.location.href) {
									oe = function() {
										onOff();
										lfx.call();
									};
									onOff(true);
									return true;
								}
							} catch (e2) {
								lfx.call(e2);
							}
						});
					};
					onOff(true);
				}
				if ($f) {
					$f.submit();
				}
			}
			function getWinHandle(wr) {
				var w = wr || window;
				if ($$.target != '_self') {
					var tn = $$.target.charAt(0) == '_' ? $$.target
							.substring(1) : $$.target;
					w = w[tn];
				}
				return w;
			}
			try {
				if (!win && $$.type == '_blank' && !loc) {
					win = window.open('about:blank', $$.target, $$.options,
							$$.history);
					win.document.write('<html><body></body></html>');
					opt();
					return win;
				} else if (!win) {
					win = getWinHandle(win);
				}
				if (typeof loc === 'string') {
					// opening window using the specified location (works with
					// same window navigation as well)
					win = window.open(loc, $$.target, $$.options, $$.history);
					opt();
				} else if (loc) {
					opt();
				}
			} catch (e) {
				if (lfx) {
					lfx.call(win, null, e);
				}
			}
			return win;
		};
		$$.toString = function() {
			return lbls('object', $$.constructor.name, 'type', $$.type(),
					'forceType', forceType, 'target', $$.target, 'options',
					$$.options, 'history', $$.history);
		};
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
		function adjCtx(ctx) {
			return typeof ctx === 'string' ? ctx.toLowerCase() : '';
		}
		function add(ctx, nvs) {
			ctx = adjCtx(ctx);
			return nvs ? nvs.replace(arx, function(m, n, v) {
				if (!cache[ctx]) {
					cache[ctx] = [];
				}
				cache[ctx][n] = rep(ctx, v);
				return n;
			}) : '';
		}
		function rep(ctx, s) {
			ctx = adjCtx(ctx);
			function rpl(mch, v) {
				if (cache[ctx]) {
					return cache[ctx][v];
				}
				return undefined;
			}
			return s ? siphonReplace(s, rrx, rpl) : '';
		}
		this.add = add;
		this.rep = rep;
		this.get = function(ctx, n) {
			ctx = adjCtx(ctx);
			return ctx ? cache[ctx] ? n ? cache[ctx][n] : cache[ctx].slice(0)
					: cache.slice(0) : undefined;
		};
	}

	/**
	 * Recursively replaces values found within a string with values found from
	 * JQuery selector(s). Results from each JQuery string found will use the
	 * passed regular expression function to retrieve the replacement value.
	 * 
	 * @param s
	 *            the string to replace JQuery selectors in
	 * @param rx
	 *            the regular expression that will be used to match the siphon
	 *            pattern (should match the innermost pattern and should be
	 *            escaped for single and double quotes)
	 * @param rfx
	 *            the function that will be passed to the replace function
	 *            (along with the passed regular expression)
	 * @param m
	 *            the optional HTTP method context of the passed {Vars}
	 * @param vars
	 *            the optional {Vars} used for variable substitution
	 * @returns the siphoned string with replaced values returned from all/any
	 *          found JQuery selector(s)
	 */
	function siphonReplace(s, rx, rfx, m, vars) {
		// siphon strings
		function rStr(s) {
			var ck = false;
			var ns = s;
			do {
				ck = false;
				ns = ns.replace(rx, function(mch, v) {
					// TODO : remove leading bracket siphon removal check
					v = v.indexOf(0) == '{' == 0 ? v.substr(1) : v;
					var evs = rfx(mch, v);
					ck = true;
					return rStr(evs);
				});
			} while (ck);
			return ns;
		}
		// substitute variables and siphon values
		return typeof s === 'string' ? rStr(vars ? vars.rep(m, s) : s) : '';
	}

	/**
	 * Extracts a key from
	 */
	function extractKey($p, attrs) {
		// iterate over the attributes that will be used as keys
		var k = null;
		$.each(opts.paramNameAttrs, function(i, v) {
			k = propAttr($p, v);
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
	 * @returns the first valid attribute object (attr, val) occurrence (if any)
	 */
	function getOptsAttrVal($el, n, opts, emptyChk) {
		if ((!n && !opts) || !$el) {
			return undefined;
		} else {
			var o = n;
			var a = null;
			if (opts && $.isArray(o = !n ? opts : opts[n])) {
				for (var i = 0; i < o.length; i++) {
					a = propAttr($el, o[i]);
					if ((!emptyChk && a !== undefined) || (emptyChk && a)) {
						return {
							attr : o[i],
							val : a
						};
					}
				}
			} else if (typeof o === 'string') {
				a = propAttr($el, o);
				return a !== undefined ? {
					attr : o,
					val : a
				} : null;
			}
		}
		return null;
	}

	/**
	 * Extracts value(s) from node(s) returned from the supplied JQuery
	 * selector. The JQuery selector can also contain a &quot;directive&quot;
	 * that will determine how value(s) are captured from node(s) returned from
	 * the JQuery selector. The &quot;directive&quot; regular expression will be
	 * used to determine what will be used to extract values from the returned
	 * nodes from the JQuery selector. Possible values are &quot;text&quot;,
	 * &quot;html&quot; or an attribute name or when nothing is defined JQuery's
	 * val() function will be called to retrieve the replacement value.
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
	 *            (can also be a callback function that will pass the selector;
	 *            when omitted the current document will be queried)
	 * @param adfx
	 *            an optional function that will be called when an attribute
	 *            directive is found, but no data/value can be extracted
	 *            (passes: element, name, event name and event attribute)
	 * @returns the siphoned string with replaced values returned from all/any
	 *          found JQuery selector(s)
	 */
	function extractValues(s, drx, dl, attrNames, el, adfx) {
		function getEV(nv, n, v, d) {
			return (d && nv.length > 0 ? d : '')
					+ (n && n.val ? n.val + '=' : '') + v;
		}
		// captures node value(s) using an optional directive
		function exNVs(evt, d, $x) {
			var nv = '';
			var ci = '';
			if (!d) {
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
						nv += getEV(nv, null, this.value, dl);
					});
				}
			} else {
				var ist = d.toLowerCase() == DTEXT;
				var ish = d.toLowerCase() == DHTML;
				var n = '';
				$x.each(function() {
					ci = $(this);
					n = attrNames ? getOptsAttrVal(ci, null, attrNames, true)
							: null;
					n = n ? n.val : null;
					var civ = ist ? ci.text() : ish ? ci.html() : undefined;
					if (civ === undefined && d) {
						if (adfx) {
							// let function handle attribute directives that
							// have no value
							civ = adfx(ci, n, evt, d);
						}
						if (!civ && ci.is('[' + d + ']')) {
							// not an event directive or event directive is
							// invalid
							civ = propAttr(ci, d);
						}
					}
					if (civ) {
						nv += getEV(nv, n, civ, dl);
					}
				});
			}
			return nv !== undefined && nv != null ? nv : s;
		}
		if (s) {
			// capture JQuery selector/directive and return the node value(s)
			var xt = s ? s.split(drx) : null;
			var $x = xt ? typeof el === 'function' ? el(xt[0])
					: el instanceof $ ? el.find(xt[0]) : $(xt[0]) : null;
			if ($x && $x.length > 0) {
				// directive may be have an event/attribute directive
				var evt = '';
				var dir = '';
				if (xt && xt.length > 2) {
					evt = xt[1];
					dir = xt[2];
				} else if (xt && xt.length > 1) {
					dir = xt[1];
				}
				return exNVs(evt, dir, $x);
			}
		}
		return '';
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
		ctx.opts = opts;
		var includeReplaceAttrs = opts.includeAttrs.concat(opts.replaceAttrs);
		var protocolForFile = opts.regexFileTransForProtocolRelative
				.test(location.protocol) ? 'http:' : null;
		// construct the JQuery selector that will identify what fragments to
		// load
		var domAttrs = opts.getAttrs.concat(opts.postAttrs.concat(opts.putAttrs
				.concat(opts.deleteAttrs)));
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
		 * @param el
		 *            the element that initiated the the execution (when not
		 *            present the parent element will be used)
		 */
		ctx.exec = function(a, el) {
			// validate/set action scope properties
			function scp(a, sel) {
				sc(a, 'selector', sel);
				sc(a, 'searchScope');
				sc(a, 'destScope');
			}
			// validate/set action scope property
			function sc(a, p, alt) {
				a[p] = a[p] ? a[p] instanceof $ && a[p].length > 0 ? a[p]
						: $(a[p]) : $(alt);
				if (a[p].length <= 0) {
					a[p] = null;
				}
			}
			a = typeof a === 'object' ? a : {
				action : a
			};
			var hf = eventFuncs[a.action];
			if (hf && typeof hf.f === 'function') {
				// directly invoke action as a function
				hf.f(el);
			} else if (a.action === opts.actionLoadFrags) {
				// force selector to the parent in order to ensure plugin
				// selection scope
				a.selector = el;
				scp(a, el);
				loadFragments(a.action, a.selector, a.searchScope, a.destScope,
						fragSelector, null, null);
			} else if (a.action === opts.actionNavInvoke) {
				if (!a.pathSiphon) {
					log('No path specified for ' + a.action, 1);
					return;
				}
				a.method = a.method ? a.method : opts.ajaxTypeDefault;
				var no = new NavOptions(a.typeSiphon, opts.typeSep,
						a.targetSiphon, opts.targetSep);
				if (!no.isFullPageSync()) {
					// partial page update
					scp(a, el);
					loadFragments(a.action, a.selector, a.searchScope,
							a.destScope, a, no, null);
				} else {
					// full page transfer
					scp(a, el);
					var t = new FragsTrack(a.action, a.selector, a.searchScope,
							a.destScope, a);
					var f = new Frag(null, t.actionScope, t);
					f.nav(no);
				}
			} else if (a.action === opts.actionNavRegister) {
				// convert URLs (if needed) and register event driven templating
				scp(a, el);
				var t = new FragsTrack(a.action, a.selector, a.searchScope,
						a.destScope, {});
				var f = new Frag(null, t.actionScope, t);
				htmlDomAdjust(t, f, t.actionScope, true);
			} else if (a.action === opts.actionOptions) {
				return opts;
			} else {
				throw new Error('Invalid action: ' + a.action);
			}
		};

				/**
		 * Broadcasts a fragment(s) event
		 * 
		 * @param evt
		 *            the event to broadcast (should contain a
		 *            <code>source</code> or <code>scope</code> property
		 *            that will contain the element to trigger the event)
		 * @param ecb
		 *            a callback function for handling errors
		 * @returns true when the event has requested to prevent the default
		 *          action
		 */
		function broadcastFragEvent(evt, ecb) {
			var el = null;
			try {
				el = evt.sourceEvent ? $(evt.sourceEvent.target)
						: evt.source ? evt.source : evt.target ? evt.target
								: evt.actionScope;
				// TODO : audio/video custom event trigger will cause media to
				// refresh
				if (el.is('video') || el.is('audio')) {
					el = el.parent();
				}
				try {
					el.trigger(evt);
				} catch (e) {
					ecb('Error triggering fragment event '
							+ (evt ? evt.type + ' ' + evt : 'unknown event'),
							el, e);
				}
				var sfc = script && evt.chain === opts.eventFragChain ? propAttr(
						script, opts.fragListenerAttr)
						: null;
				var sfsc = script && evt.chain === opts.eventFragsChain ? propAttr(
						script, opts.fragsListenerAttr)
						: null;
				if (sfc || sfsc) {
					var fs = sfc ? sfc : sfsc;
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
							ecb('Error in ' + fs + ' ' + (evt ? evt : ''), el,
									e);
						}
					}
				}
				return evt.isDefaultPrevented();
			} catch (e) {
				ecb('Error broadcasting fragment event for '
						+ (evt ? evt.type + ' ' + evt : 'unknown event'), el, e);
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
				var evt = chain == opts.eventFragChain ? genFragEvent(type, t,
						f) : genFragsEvent(chain, type, t);
				return broadcastFragEvent(evt, function(msg, el, e) {
					// error may never reach listener- try to log it
					var fmsg = msg + ' for ' + (f || t);
					t.addError(fmsg, f, e);
					log(fmsg, e);
				});
			}
			if (chain == opts.eventFragChain || chain == opts.eventFragsChain) {
				var bhttp = type == opts.eventFragsBeforeHttp
						|| type == opts.eventFragBeforeHttp;
				if (f) {
					if (!f.frp.pathSiphon()) {
						t.addError('Invalid URL for ' + f.toString(), f);
						f.cancelled = true;
						if (bhttp) {
							fire();
						}
					} else if (f) {
						f.cancelled = fire();
					}
					if (f.cancelled) {
						t.ccnt++;
					}
				} else if (bhttp) {
					t.cancelled = fire();
				} else {
					fire();
				}
			}
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
			e.sourceEvent = t.siphon.sourceEvent;
			e.action = t.action;
			e.frags = type == opts.eventFragsLoad ? t.genFragObjs() : undefined;
			e.fragAdjustments = t.adjustments;
			e.fragCancelCount = t.ccnt;
			e.fragCount = t.cnt;
			e.actionScope = t.actionScope;
			e.searchScope = t.searchScope;
			e.destScope = t.destScope;
			e.errors = t.getErrors();
			e.loadTime = t.elapsedTime(e.timeStamp);
			e.log = function(m, l) {
				log(m ? m : '', l, this);
			};
			e.toFormattedString = function() {
				return lbls('event chain', e.chain, 'sourceEvent',
						e.sourceEvent, 'action', e.action, 'fragCancelCount',
						e.fragCancelCount, 'fragCount', e.fragCount,
						'actionScope', e.actionScope, 'searchScope',
						e.searchScope, 'destScope', e.destScope, 'errors',
						e.errors, 'loadTime', e.loadTime);
			};
			return e;
		}


				/**
		 * {Frag} tracking mechanism to handle multiple {Frag}s
		 * 
		 * @constructor
		 * 
		 * @param action
		 *            the name of the action that initiated the tracking
		 * @param actionScope
		 *            the scope element(s) where selections will be made to find
		 *            fragments to load
		 * @param searchScope
		 *            the scope element(s) used for element selections
		 * @param destScope
		 *            the scope element(s) used for destination selection
		 *            (defaults to the current document's HTML element)
		 * @param siphon
		 *            the optional object that will contain siphon attribute
		 *            overrides
		 * @param navOpts
		 *            the {NavOptions}
		 */
		function FragsTrack(action, actionScope, searchScope, destScope,
				siphon, navOpts) {
			var start = new Date();
			var $$ = this;
			$$.action = action;
			$$.lastFrag = null;
			$$.ctxPath = getAppCtxPath(opts.regexAbsPath, opts.pathSep,
					bypassPath);
			$$.navOpts = navOpts;
			$$.cancelled = false;
			$$.ccnt = 0;
			$$.cnt = 0;
			$$.len = 0;
			var done = false;
			var c = [];
			var frags = [];
			function setScope(p, s) {
				if (s instanceof $ && s.length > 0) {
					$$[p] = s;
				} else if (typeof $$[p] === 'undefined') {
					$$[p] = $('html');
				}
			}
			$$.resetSiphon = function(ns, as, ss, ds, sh, rv) {
				setScope('actionScope', as);
				setScope('searchScope', ss);
				setScope('destScope', ds);
				$$.isTopLevel = isTopLevelEl($$.actionScope);
				if (typeof ns === 'object') {
					$$.siphon = ns;
				} else if ($$.siphon) {
					$$.siphon.selector = ns;
				} else {
					$$.siphon = {
						selector : ns
					};
				}
				$$.isShortHand = typeof sh !== 'undefined' ? sh
						: $$.actionScope.is($$.siphon.selector);
				if (rv || !$$.siphon.vars) {
					$$.siphon.vars = new Vars(opts.regexVarNameVal,
							opts.regexVarSiphon);
				}
			};
			$$.resetSiphon(siphon, actionScope, searchScope, destScope);
			$$.queueFrag = function(f) {
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
			$$.getQueuedFrags =  function(f) {
				return c[f.pseudoUrl()];
			};
			$$.addFrag = function(f) {
				frags.push(f);
			};
			$$.genFragObjs = function() {
				var a = [];
				for (var i=0; i<frags.length; i++) {
					a.push(addFragProps({}, $$, frags[i]));
				}
				return a;
			};
			var e = [];
			$$.addError = function(em, f, oc, hs, xhr) {
				function newError(f) {
					var e = new Error(em + (oc ? '. Cause: ' + oc.message : ''));
					var o = {
						cause : oc,
						status : hs,
						statusCode : xhr ? xhr.status : null
					};
					if (f) {
						o.fragSrc = addFragProps({}, $$, f);
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
			$$.getErrors = function() {
				return e;
			};
			$$.elapsedTime = function(t) {
				return (t ? t : (new Date()).getTime()) - start.getTime();
			};
			$$.hasJustCompleted = function() {
				return !done && $$.cnt >= $$.len ? (done = true) : false;
			};
			$$.done = function(cb) {
				if ($$.hasJustCompleted()) {
					if (cb) {
						cb();
					}
					broadcast(opts.eventFragsChain, opts.eventFragsLoad, $$);
					// actually remove detached elements (detached versus remove
					// in order to maintain broadcast capabilities on replaced nodes)
					var dc = $$.detachCache();
					if (dc && dc.cache()) {
						// cleanup data/events
						dc.cache().remove();
					}
				}
			};
			var detachc = null;
			$$.detachCache = function(cache) {
				if (!detachc) {
					detachc = cache;
				} else if (cache) {
					detachc.cache(cache.cache());
				}
				return detachc;
			};
			$$.adjustments = null;
		}

		/**
		 * Fragment constructor
		 * 
		 * @constructor
		 * @param pf
		 *            the parent fragment (if any)
		 * @param $fl
		 *            the fragment loaded from source DOM element
		 * @param t
		 *            the optional template selector
		 */
		function Frag(pf, $fl, t) {
			var $$ = this;
			t.addFrag($$);
			// var isHead = $fl instanceof $ ? $fl.is('head') : false;
			$$.pf = pf;
			$$.pel = t.actionScope;
			$$.el = $fl;
			$$.parentOrigin = $fl.parent();
			var siphon = t.siphon;
			var loadSiphon = null;
			// "a" will represent the short-hand attrs
			var a = null;
			// scope select will identify if fragment details will come from the
			// passed tracking siphon or extracted by fragment attributes
			if (!t.isShortHand
					&& (loadSiphon = new SiphonAttrs(opts.ajaxTypeDefault,
							'load', null, siphon.selector, $$.el,
							t.siphon.vars, true, t.searchScope)).isValid) {
				// DOM siphon attribute for a load event will take presedence
				// over short-hand include/replace/etc.
				loadSiphon.vars = t.siphon.vars;
				siphon = loadSiphon;
			} else if (!t.isShortHand) {
				a = getFragAttr($fl, opts.includeAttrs);
			}
			$$.ajaxAsync = true;
			$$.navOpts = t.navOpts && t.navOpts.reuse() ? t.navOpts
					: new NavOptions(siphon.typeSiphon, opts.typeSep,
							siphon.targetSiphon, opts.targetSep);
			if (!a && !t.isShortHand) {
				a = getFragAttr($fl, opts.replaceAttrs);
				$$.navOpts.type(TREP);
			} else {
				$$.navOpts.type(TINC);
			}
			// short-hand attrs may have path and result siphon
			a = a ? a.split(opts.multiSep) : null;
			$$.eventSiphon = siphon.eventSiphon;
			$$.delegateSiphon = siphon.delegateSiphon;
			$$.method = siphon.method ? siphon.method : opts.ajaxTypeDefault;
			$$.getVars = function() {
				return siphon.vars ? siphon.vars.get($$.method) : null;
			};
			$$.ws = siphon.withSiphon;
			if (siphon.vars && $$.ws) {
				// add user variables
				siphon.vars.add($$.method, $$.ws);
			}
			$$.fps = new FragParamSiphon(t, $$, siphon.paramsSiphon,
					siphon.vars);
			$$.frs = new FragResultSiphon(t, $$, !a ? siphon.resultSiphon : a
					&& a.length > 1 ? $.trim(a[1]) : null, siphon.vars);
			$$.frp = new FragPathSiphon(t, $$, !a ? siphon.pathSiphon : a
					&& a.length > 0 ? $.trim(a[0]) : null, siphon.vars);
			$$.fds = new FragDestSiphon(t, $$,
					!a && siphon.destSiphon ? siphon.destSiphon : $$.el,
					siphon.vars);
			$$.destResults = null;
			$$.e = null;
			$$.cancelled = false;
			var wcnt = 1;
			$$.ccnt = function(a) {
				if (a) {
					wcnt++;
				} else if (a == false && --wcnt == 0) {
					// no longer waiting for any more child fragments to
					// complete
					t.cnt++;
					broadcast(opts.eventFragChain, opts.eventFragLoad, t, $$);
				}
				return wcnt;
			};
			if ($$.pf) {
				// increment child fragment count on parent fragment
				$$.pf.ccnt(true);
			}
			$$.pseudoUrl = function(f) {
				return ($$.frp.pathSiphon() ? $$.frp.pathSiphon() : '')
						+ ($$.fps.params() ? '?' + $$.fps.params() : '');
			};
			$$.as = siphon.agentSiphon;
			$$.done = function() {
				if (!$$.cancelled) {
					$$.ccnt(false);
				} else {
					t.cnt++;
				}
				// decrement parent fragments child count
				var x = $$;
				while (x = x.pf) {
					x.ccnt(false);
				}
				// add detachments for global removal
				t.detachCache($$.detachCache());
			};
			$$.domStart = function() {
				broadcast(opts.eventFragChain, opts.eventFragBeforeDom, t, $$);
			};
			$$.domEnd = function(hasErrors) {
				// DOM ended, but child fragments may exist
				broadcast(opts.eventFragChain, opts.eventFragAfterDom, t, $$);
			};
			var arc = new AppReplCache();
			// handles processing of fragments
			$$.rslt = function(r, rr, xhr, ts, e) {
				var xIsJ = r instanceof $;
				if (ts || e) {
					t.addError('Error at ' + $$.toString() + ': ' + ts + '- '
							+ e, $$, e, ts, xhr);
				} else if (xIsJ && r.is('script')) {
					if (xhr && xhr.status != 200) {
						t.addError(xhr.status + ': ' + ts + ' path siphon="'
								+ $$.frp.pathSiphon() + '"', $$, e, ts, xhr);
					} else if (!xhr && $$.frp.pathSiphon()
							&& $$.frs.resultSiphon()) {
						var sd = $$.frp.pathSiphon().indexOf(DATA_JS);
						sd = sd > -1 ? $$.frp.pathSiphon().substr(
								DATA_JS.length) : $$.frp.pathSiphon();
						var ss = propAttr(r, 'type');
						$(
								'<script'
										+ (typeof ss === 'string'
												&& ss.length > 0 ? ' type="'
												+ ss + '">' : '>') + sd
										+ '</script>').appendTo(
								$$.frs.resultSiphon());
					}
				} else {
					// add the result(s) to the destination(s)
					$$.fds.add(t.destScope, arc, $$.frs.add(arc, rr, r), rr, $$
							.isModel(xhr), ts, xhr);
				}
				$$.domStart();
			};
			$$.dest = function() {
				var $adds = null;
				try {
					$adds = arc.appendReplaceAll();
					if (!$adds) {
						t.addError('Nothing to add to the desitination(s) '
								+ ' for ' + $$.toString(), $$, e);
					}
				} catch (e) {
					t.addError(
							'Error while adding desitination results to the DOM '
									+ ' for ' + $$.toString(), $$, e);
				}
				$$.domEnd();
				if (!$adds) {
					return;
				}
				// make post template DOM adjustments- no need for URL updates-
				// they needed to be completed prior to placement in the DOM or
				// URLs in some cases will be missed (like within the head)
				htmlDomAdjust(t, $$, $adds, false);
				return $$.destResults = jqAdd($$.destResults, $adds);
			};
			$$.detachCache = function() {
				return arc.detachCache();
			};
			$$.nav = function(no) {
				var rtn = null, dcb = null, lcb = null;
				if (opts.eventIsBroadcast) {
					t.len++;
					broadcast(opts.eventFragsChain, opts.eventFragsBeforeHttp,
							t);
					if (t.cancelled) {
						return;
					}
					broadcast(opts.eventFragChain, opts.eventFragBeforeHttp, t,
							$$);
					if ($$.cancelled) {
						return;
					}
					dcb = function() {
						$$.domEnd();
					};
					// wait for the window to complete, then fire events
					lcb = function(e) {
						if (e) {
							t.addError('Error while waiting for navigation '
									+ 'window to complete loading', $$, e);
						}
						$$.done();
						t.done();
					};
				}
				no = no ? no : $$.navOpts;
				var vars = null;
				if ($$.method.toLowerCase() != 'get') {
					// for performance we'll build input strings versus nodes
					// before we simulate the synchronous form submission/page
					// transfer
					var fd = $('<form style="display:none;" action="'
							+ $$.frp.pathSiphon() + '" method="'
							+ $$.method + '" />');
					vars = $$.fps.params(null, true);
					var ips = '';
					for (var i = 0; i < vars.length; i++) {
						ips += '<input name="' + vars[i].name + '" value="'
								+ vars[i].value + '" />';
					}
					fd.append(ips);
					$$.domStart();
					// submit form
					rtn = no.getWin(fd, opts.readyStateDelay,
							opts.readyStateTimeout, dcb, lcb);
				} else {
					var loc = $$.frp.pathSiphon();
					var vars = $$.fps.params();
					if (vars) {
						loc += '?' + vars;
					}
					$$.domStart();
					// open window or change location
					rtn = no.getWin(loc, opts.readyStateDelay,
							opts.readyStateTimeout, dcb, lcb);
				}
				return rtn;
			};
			$$.isModel = function(xhr) {
				var mt = xhr ? xhr.getResponseHeader('Content-Type') : null;
				return mt
						&& (mt.indexOf('json') >= 0 || mt.indexOf('xml') >= 0);
			};
			$$.isSimpleView = function(xhr) {
				var mt = xhr ? xhr.getResponseHeader('Content-Type') : null;
				return mt
						&& (mt.indexOf('text/plain') >= 0 || mt
								.indexOf('octet-stream') >= 0);
			};
			$$.isFullView = function(xhr) {
				return !$$.isModel(xhr) && !$$.isSimpleView(xhr);
			};
			$$.getStack = function() {
				var us = [];
				var cf = $$;
				do {
					us[us.length] = {
						pathSiphon : cf.frp.pathSiphon(),
						resultSiphon : cf.frs.getFuncOrResultSiphon(),
						destSiphon : cf.fds.destSiphon(),
						destResults : cf.destResults
					};
				} while ((cf = cf.pf));
				return us;
			};
			$$.adjustments = null;
			$$.addAdjustments = function(el, ov, nv, an) {
				var c = {
					scope : el,
					oldValue : ov,
					newValue : nv,
					attrName : an
				};
				if (!$$.adjustments) {
					$$.adjustments = [];
				}
				if (!t.adjustments) {
					t.adjustments = [];
				}
				$$.adjustments[$$.adjustments.length] = c;
				t.adjustments[t.adjustments.length] = c;
			};
			$$.toString = function() {
				return lbls('object', $$.constructor.name, 'options',
						$$.navOpts.toString(), 'HTTP method', $$.method, 'URL',
						$$.pseudoUrl(), 'parameter siphon', $$.fps
								.paramSiphon(), 'path siphon', $$.frp
								.pathSiphon(), 'result siphon', $$.frs
								.getFuncOrResultSiphon(), 'destination siphon',
						$$.fds.destSiphon(), 'agent siphon', $$.as,
						'cancelled', $$.cancelled, 'error', $$.e ? $$.e.message
								: null);
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
			o.fragAdjustments = f ? f.adjustments : undefined;
			o.action = t.action;
			o.parentOrigin = f ? f.parentOrigin : undefined;
			o.sourceEvent = t.siphon.sourceEvent;
			o.eventSiphon = f ? f.eventSiphon : undefined;
			o.paramsSiphon = f ? f.fps.paramSiphon() : undefined;
			o.parameters = f ? f.fps.params() : undefined;
			o.pathSiphon = f ? f.frp.pathSiphon() : undefined;
			o.resultSiphon = f ? f.frs.getFuncOrResultSiphon() : undefined;
			o.destSiphon = f ? f.fds.destSiphon() : undefined;
			o.agentSiphon = f ? f.as : undefined;
			o.destResults = f ? f.destResults instanceof $ ? f.destResults
					: f.el : undefined;
			o.error = f ? f.e : undefined;
			o.actionScope = f ? f.el : t.actionScope;
			o.searchScope = t.searchScope;
			o.destScope = t.destScope;
			o.chain = opts.eventFragChain;
			o.variables = f ? f.getVars() : t.siphon ? t.siphon.vars.get()
					: undefined;
			o.log = function(m, l) {
				log(m ? m : '', l, this);
			};
			o.toFormattedString = function() {
				return lbls('event chain', o.chain, 'fragCount', o.fragCount,
						'fragCurrTotal', o.fragCurrTotal, 'action', o.action,
						'sourceEvent', o.sourceEvent, 'parameters',
						o.parameters, 'paramsSiphon', o.paramsSiphon,
						'pathSiphon', o.pathSiphon, 'resultSiphon',
						o.resultSiphon, 'destSiphon', o.destSiphon, 'element',
						o.element, 'actionScope', o.actionScope, 'searchScope',
						o.searchScope, 'destScope', o.destScope, 'error',
						o.error);
			};
			return o;
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
		 * @param action
		 *            the action name that initiated loading
		 * @param scopeAction
		 *            the selector to the root element(s) where load attributes
		 *            will be searched
		 * @param scopeSearch
		 *            the selector to the root element(s) where fragments will
		 *            be searched
		 * @param scopeDest
		 *            the selector to the root element(s) where destination
		 *            elements will be searched (defaults to the current
		 *            document's HTML element)
		 * @param siphon
		 *            the siphon/selector to the templates that will be
		 *            included/replaced
		 * @param nav
		 *            a {NavOptions} reference that will be used (otherwise, one
		 *            will be created dynamically for each fragment encountered)
		 * @param func
		 *            the callback function that will be called when all
		 *            fragments have been loaded (parameters: the original root
		 *            element, the number of fragments processed and an array of
		 *            error objects- if any)
		 */
		function loadFragments(action, scopeAction, scopeSearch, scopeDest,
				siphon, nav, func) {
			var t = new FragsTrack(action, scopeAction, scopeSearch, scopeDest,
					siphon, nav);
			broadcast(opts.eventFragsChain, opts.eventFragsBeforeHttp, t);
			if (t.cancelled) {
				return;
			}
			function done(pf, t, f) {
				if (t.cnt > t.len) {
					t.addError('Expected ' + t.len
							+ ' fragments, but recieved ' + t.cnt, f, null,
							null, null);
				}
				if (f) {
					f.done();
				}
				t.done(function() {
					if (typeof func === 'function') {
						func(t.actionScope, t.cnt, t.getErrors());
					}
					if (firstRun) {
						firstRun = false;
						if (updateUrls) {
							refreshNamedAnchor();
						}
					}
				});
			}
			function hndlFunc(f, cb, r, status, xhr) {
				if (f.frs.getFunc() && f.frs.getFunc().isValid) {
					var rr = f.frs
							.getFunc()
							.run(
									{
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
													t
															.addError(
																	'Error during handler proceed',
																	f, e,
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
				var url = propAttr($x, 'src');
				var hasu = url && url.length > 0;
				var hasdu = hasu && url.indexOf(DATA_JS) >= 0;
				t.len++;
				var sf = new Frag(f, $x, t);
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
				broadcast(opts.eventFragChain, opts.eventFragBeforeHttp, t, sf);
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
				// TITLE/BASE/META and some strip out KEYGEN/PROGRESS/SOURCE.
				// so, we
				// can't use the typical JQuery/browser parsing on the result
				// for
				// those tags.
				var ris = typeof r === 'string';
				if (ris) {
					var hs = '<head ';
					var he = '</head>';
					var his = r.indexOf(hs);
					if (his > -1) {
						var hie = r.indexOf(he);
						var hr = '<div ' + r.substring(his + hs.length, hie)
								+ '</div>';
						hr = hr.substring(0, hr.indexOf('>') + 1);
						var $hr = $(hr + '</div>');
						var ha = getFragAttr($hr, opts.fragAttrs);
						if (ha && ha == f.frs.resultSiphon($hr)) {
							hr = hr.replace(/div/g, 'head');
							hr = r.substring(r.indexOf(hr) + hr.length, r
									.indexOf(he));
							var $h = $('head');
							hr = htmlDataAdjust(t, f, hr);
							var hf = new Frag(null, $h, t);
							// prevent script from auto loading
							var scs = hr.match(opts.regexScriptTags);
							if (scs) {
								$.each(scs, function(i, sc) {
									doScript(hf, $h, $(sc), cb);
									hr = hr.replace(sc, '');
								});
							}
							// head is special case that does not require
							// multiple result/destination compilations
							hf.rslt(hr);
							hf.dest();
							cb($h, f);
							return;
						}
					}
				}
				// capture results
				var rslt = ris ? htmlDataAdjust(t, f, r) : r;
				var $c = ris ? f.frs.parse(rslt) : rslt;
				// loop through the resolvers separately in order to handle any
				// directives that may be defined
				var $rslts = f.frs.each($c, null, xhr, function(i, rr) {
					// need to re-parse result because any nodes that may be
					// appended to a destination from a previous result resolver
					// iteration will no longer be present in the result node
					var $fs = rr.selectFrom(i == 0 || !ris ? $c : f.frs
							.parse(rslt));
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
					f = new Frag(pf, $fl, t);
					cb = typeof cb === 'function' ? cb : function() {
					};
					broadcast(opts.eventFragChain, opts.eventFragBeforeHttp, t,
							f);
					if (f.cancelled) {
						cb(null, f);
						return;
					}
					if (f.frp.pathSiphon() == opts.selfRef) {
						// fragment is within current page
						lcont(f, cb, $('html'), opts.selfRef, null);
						return;
					}
					// when the fragment path is the 1st one in the queue
					// retrieve it
					// the queue will prevent duplicate calls to the same
					// fragment path
					if (t.queueFrag(f)) {
						function adone(r, status, xhr) {
							var tf = t.getQueuedFrags(f);
							tf.result = r;
							tf.status = status;
							tf.xhr = xhr;
							for (var i = 0; i < tf.frags.length; i++) {
								lcont(tf.frags[i], cb, r, status, xhr);
							}
						}
						// use ajax vs load w/content target for more granular
						// control
						$.ajax({
							url : f.frp.pathSiphon(),
							type : f.method,
							data : f.fps.params(),
							async : f.ajaxAsync,
							cache : opts.ajaxCache,
							crossDomain : opts.ajaxCrossDomain
						}).done(adone).fail(
								function(xhr, ts, e) {
									var tf = t.getQueuedFrags(f);
									for (var i = 0; i < tf.frags.length; i++) {
										t.addError('Error at '
												+ tf.frags[i].toString() + ': '
												+ ts + '- ' + e, tf.frags[i],
												e, ts, xhr);
										if (!hndlFunc(tf.frags[i], cb, null,
												ts, xhr)) {
											cb(null, tf.frags[i]);
										}
									}
								});
					} else {
						var tf = t.getQueuedFrags(f);
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
				lfg(pf, $fl,
						function($cf, f) {
							// process any nested fragments
							if ($cf) {
								var nf = false;
								if (t.siphon.selector instanceof $) {
									// need to check destination(s) for nested
									// fragments
									var fsr = new Resolver(fragSelector);
									$cf = fsr.selectFrom($cf);
									// scope needs to revert to the default
									// fragment
									// selector, action scope and non short hand
									// frag
									t.resetSiphon(fragSelector, $cf, null,
											null, false);
									nf = true;
								}
								lfi($cf, f, nf);
							}
							done(pf, t, f);
						});
			}
			// IE strips any attributes in the HEAD tag so we use the thymus
			// script
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
			function lfi($f, f, nf) {
				var $fs = nf || (t.isShortHand && $f.is(t.actionScope)) ? $f
						: $f.find(t.siphon.selector);
				t.len += $fs.length;
				$fs.each(function() {
					lfc(f, $(this));
				});
				if (t.cnt > 0 || ($fs.length == 0 && t.cnt == 0)) {
					done(null, t, f);
				}
			}
			// make initial call
			lfi(t.actionScope, null);
		}


				/**
		 * Updates a navigation {Frag} for an array object returned from
		 * <code>genAttrQueries</code>. Updates will be made to paths when
		 * needed. Also, any DOM driven events will be registered that will
		 * listen for incoming events that will trigger fragment
		 * loading/submission. When DOM driven events are previously processed
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
						var nm = propAttr(el, a.items[ai].name);
						ov = propAttr(el, nm);
						nv = absoluteUrl(nm, t.ctxPath);
						propAttr(el, nm, nv);
						f.addAdjustments(el, ov, nv, a.items[ai].name);
					}
					return '';
				} else {
					var nm = a.items[ai].name;
					var nv = absoluteUrl(v, t.ctxPath);
					f.addAdjustments(el || f.el, v, nv, a.items[ai].name);
					return ' ' + nm + '="' + nv + '"';
				}
			}
			var evts = splitWithTrim(v, opts.multiSep);
			var rs = [];
			$.each(evts, function(i, ev) {
				if (ev.toLowerCase() == 'load') {
					// load events are picked up by normal fragment loading
					return;
				}
				var so = new SiphonAttrs(a.method, ev, opts.actionNavInvoke,
						null, null, t.siphon.vars, false, t.searchScope);
				if (so.isValid) {
					so.eventAttrs = a.items;
					so.typeSiphon = a.type;
					var rtn = addOrUpdateEventFunc(ctx, so.action, so.method,
							f.pel, el, so.eventSiphon, so.delegateSiphon, 
							function(pel, ib, sevt) {
								var $ib = $(ib);
								if (!so.captureAttrs($ib, t.siphon.vars, false,
										true)) {
									// the event is no longer valid because the
									// method/event attribute has removed the
									// event since its registration- thus we
									// need to trigger a removal of the event
									// listener by returning true
									return true;
								}
								so.sourceEvent = sevt;
								so.selector = ib;
								so.searchScope = t.searchScope;
								so.destScope = t.destScope;
								ctx.exec(so, pel);
								return false;
							});
					so.onEvent = rtn.eventAttrValue;
					so.eventSiphon = rtn.eventName;
					f.addAdjustments(el || f.el, null, so.eventSiphon,
							a.items[ai].name);
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
				for (var i = 0; i < a.items.length; i++) {
					s = s.replace(a.items[i].regExp, function(m, v) {
						r = updateNav(t, f, a, i, v, null);
						return typeof r === 'string' ? r
								: r.isValid ? r.onEvent : v;
					});
				}
			} else {
				var v = '';
				// TODO should see about removing URL attributes from selection
				// because they are pre-processed
				var sr = new Resolver(a.sel);
				var sel = sr.selectFrom(s);
				if (!sel || sel.length <= 0) {
					return s;
				}
				sel.each(function() {
					var $c = $(this);
					for (var i = 0; i < a.items.length; i++) {
						v = propAttr($c, a.items[i].name);
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
			// s =
			// s.replace(/\<(\?xml|(\!DOCTYPE[^\>\[]+(\[[^\]]+)?))+[^>]+\>/g,
			// '');
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
		 * Extracts a fragment/include/replacement attribute from a given
		 * element. When the element is the thymus script then an attempt will
		 * be made to pull the <code>opts.fragHeadAttr</code> attribute off
		 * the script and extract the specified attribute from that value.
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
				for (var i = 0; i < attrs.length; i++) {
					a2 = attrs[i].replace('\\', '');
					if (a) {
						if (a == a2) {
							return a2;
						}
					} else {
						fa = propAttr($f, a2);
						if (typeof fa !== 'undefined') {
							return fa;
						}
					}
				}
				return null;
			}
			if (propAttr($f, 'id') == NS) {
				// when the attribute is used on the current script tag then
				// pull the
				// attribute off the script and extract the
				// fragment/include/replacement
				var fa = propAttr($f, opts.fragHeadAttr);
				if (fa) {
					var fas = fa.split('=');
					if (fas.length == 2) {
						return ga(fas[0]) ? fas[1] : null;
					} else {
						throw new Error(NS + ' has invalid atrtribute '
								+ opts.fragHeadAttr + '="' + fa + '" for '
								+ attr);
					}
				}
			} else {
				return ga(null);
			}
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
		 * @param cr
		 *            an optional child {Resolver} of the current {Resolver}
		 * @param t
		 *            an optional {Resolver} type
		 */
		function Resolver(s, d, cr, t) {
			var $$ = this;
			$$.selector = s instanceof $ ? s : s ? $.trim(s) : null;
			$$.directive = d ? $.trim(d) : '';
			if ($$.directive) {
				var ld = $$.directive.toLowerCase();
				if (ld == DTEXT || ld == DHTML) {
					$$.directive = ld;
				}
			}
			// selects node(s) from an element using the internal
			// selector either as a self-selection, a find or filter
			$$.selectFrom = function($el, be) {
				var $r = null;
				if (s && $$.selector) {
					var $p = $el ? $el : $('html');
					var sbe = null;
					var jqs = $$.selector instanceof $;
					if (jqs && $$.selector.is($p)) {
						return $p;
					} else if (jqs && $$.selector.is(DFTL_RSLT_NAME)) {
						// don't use wrapper for selections
						return $p.contents();
					}
					$r = $p.find($$.selector);
					if ($r.length <= 0) {
						if (jqs && be) {
							sbe = genAttrSelByExample($$.selector);
							$r = $p.find(sbe);
						}
						if ($r.length <= 0) {
							$r = $p.filter($$.selector);
							if (sbe && $r.length <= 0) {
								$r = $p.filter(sbe);
							}
						}
					}
				} else {
					$r = $();
				}
				return $r;
			};
			this.child = cr;
			this.type = function() {
				return t;
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
			function add(s, c, t) {
				if (!s) {
					return null;
				}
				var r = null;
				var cr = c ? new Resolver(c[0], c.length > 1 ? c[1] : '', t)
						: null;
				if (s instanceof $ || typeof s === 'string') {
					r = new Resolver(s, cr, t);
				} else {
					r = new Resolver(s[0], s.length > 1 ? s[1] : '', cr, t);
				}
				return rvs[rvs.length] = r;
			}
			function resolve(s) {
				// regular expression must match entire expression
				function rpl(mch, v) {
					var pc = v.split(opts.regexParentChildDelimiter);
					// add resolver, optional child resolver and optional
					// resolver type
					var child = pc.length > 1 ? pc[1] : null;
					var type = pc.length > 2 ? pc[2] : null;
					if (child && TYPES_PPU.indexOf(child.toLowerCase()) >= 0) {
						type = child;
						child = null;
					} else if (child) {
						child = child.split(opts.regexDirectiveDelimiter);
					}
					add(pc[0].split(opts.regexDirectiveDelimiter), child, type);
					// replace expression now that add is done
					return '';
				}
				return siphonReplace(s, opts.regexNodeSiphon, rpl);
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
			if (s instanceof $) {
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
		 * Object that represents all encompassing siphon attributes
		 * 
		 * @constructor
		 * @param m
		 *            the HTTP method used by the siphon
		 * @param evt
		 *            the optional event name of the siphon
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
		 * @param scope
		 *            the optional scope used to lookup possible agents
		 * @param ma
		 *            an optional attribute that will be used to match the
		 *            plugins attribute options- if a match is found the match
		 *            value property will be populated with the found siphon
		 *            value (no other siphon attributes will be captured when
		 *            present)
		 */
		function SiphonAttrs(m, evt, a, s, el, vars, ml, scope, ma) {
			var $$ = this;
			$$.selector = s ? s : '';
			$$.method = m ? m : opts.ajaxTypeDefault;
			$$.eventSiphon = evt;
			$$.matchAttr = ma;
			$$.matchVal = '';
			$$.paramsSiphon = '';
			$$.pathSiphon = '';
			$$.resultSiphon = '';
			$$.destSiphon = '';
			$$.typeSiphon = '';
			$$.targetSiphon = '';
			$$.agentSiphon = '';
			$$.delegateSiphon = '';
			$$.withSiphon = '';
			$$.funcName = '';
			$$.sourceEvent = null;
			$$.isValid = ma || evt;
			$$.captureAttrs = function(el, vars, ml, ow) {
				if ($$.isValid && el) {
					try {
						$$.isValid = addSiphonAttrVals(el, $$.method,
								$$.eventSiphon, $$, DOM_ATTR_TYPES, vars,
								ml, scope, ow);
					} catch (e) {
						log('Unable to capture siphons', e, $$);
						$$.isValid = false;
					}
					return $$.isValid;
				}
				return false;
			};
			if ($$.isValid) {
				if (a) {
					$$.selector = '';
					$$.action = a;
					$$.onEvent = '';
				}
				if (el) {
					$$.captureAttrs(el, vars, ml, true);
				}
			}
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
		 * @param del
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
		function siphonValues(s, m, vars, del, attrNames, el) {
			function resolve(sel) {
				return new Resolver(sel).selectFrom(el);
			}
			function rpl(mch, v) {
				return extractValues(v, opts.regexDirectiveDelimiter, del,
						attrNames, resolve, function($i, n, evt, attr) {
							if (attr) {
								// when an attribute value is not found check
								// for it on an agent
								var sa = new SiphonAttrs(m, evt, null, null,
										$i, vars, false, el, attr);
								return vars.rep(m, sa.matchVal);
							}
						});
			}
			return siphonReplace(s, opts.regexSurrogateSiphon, rpl, m, vars);
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
		 *            the event name used to determine the index of the
		 *            attributes (when ommitted the entire siphon attribute for
		 *            all containing events will be used)
		 * @param o
		 *            the object where the siphon attribute values will be added
		 *            to
		 * @param ns
		 *            the array of attribute names that will be looked up and
		 *            added
		 * @param vars
		 *            the associative array cache of user set names/values
		 *            variables
		 * @param ml
		 *            true to look for each HTTP method verbs when the method
		 *            supplied is not found on the supplied DOM element
		 * @param scope
		 *            the scope of which to select agents from (defaults to the
		 *            current document's HTML element)
		 * @param ow
		 *            true to overwrite object properties that already have a
		 *            non-null or empty value
		 * @returns true when the event exists for the given method and the
		 *          siphon attributes have been added
		 */
		function addSiphonAttrVals($el, m, evt, o, ns, vars, ml, scope, ow) {
			if ($el && m && o && $.isArray(ns)) {
				function Agent() {
					this.run = true;
					this.attr = null;
					this.val = null;
					this.el = null;
				}
				// get attribute name from plug-in options
				function getAN(m, n) {
					var an = n.charAt(0).toUpperCase()
							+ n.substr(1).toLowerCase();
					an = m + (m == n ? '' : an) + 'Attrs';
					return an;
				}
				// get event index (siphon attributes can have multiple events)
				function getEI($el, m) {
					// when a siphon attribute corresponds to an event at the
					// same index we use the attribute value at that index-
					// otherwise, we just use the attribute at the last
					// available index
					if (!evt) {
						return -2;
					}
					var ens = getOptsAttrVal($el, getAN(m, m), opts);
					ens = ens && ens.val ? splitWithTrim(ens.val, opts.multiSep)
							: null;
					return ens ? $.inArray(evt, ens) : -1;
				}
				// get plugin option value for a given attribute name
				function getOV($el, an, ei) {
					var ov = getOptsAttrVal($el, an, opts);
					if (ov && ov.val && ei != -2) {
						var nv = splitWithTrim(ov.val, opts.multiSep);
						nv = nv && ei >= nv.length ? nv[nv.length - 1]
								: nv ? nv[ei] : undefined;
						ov.val = nv;
					}
					return ov;
				}
				// only add when a value doesn't already exist or overwrite is
				// flagged
				function isAdd(n, o, ow) {
					return o[n] !== undefined
							&& (ow || o[n] == null || o[n].length <= 0);
				}
				// get siphon attribute name
				function getSAN(m, n) {
					return (m == n ? 'event' : n) + 'Siphon';
				}
				function addVal($el, m, ei, o, ow, n, an, agent) {
					// only add values for attributes that exist on the
					// passed object and have not yet been set
					if (isAdd(n, o, ow)) {
						var ov = getOV($el, an, ei);
						if (o.matchAttr && ov && o.matchAttr == ov.attr) {
							// match attribute found
							o.matchVal = ov.val;
						}
						if (!ov || !ov.val) {
							// try to lookup an agent that has the attribute (if
							// any)
							if (agent.run) {
								agent.run = false;
								agent.attr = getSAN(m, DOM_ATTR_AGENT);
								agent.val = getOV($el,
										getAN(m, DOM_ATTR_AGENT), ei);
								if (agent.val) {
									// siphon possible selectors
									agent.val = siphonValues(agent.val.val, m,
											vars, opts.agentSelSep, null, scope);
								}
								if (isAdd(agent.attr, o, ow)) {
									o[agent.attr] = agent.val;
								}
								if (agent.val) {
									// capture the agent's siphon attributes
									agent.el = $(agent.val);
									agent.val = new SiphonAttrs(m, evt, null,
											agent.el.selector, null, vars,
											false, scope, o.matchAttr);
									agent.el.each(function() {
										// 1st come, 1st serve- don't
										// overwrite attributes that have
										// already been set by a previous
										// agent element
										if (!capture(agent.el, m, agent.val,
												false, false, false)) {
											agent.val = null;
										}
									});
								}
							}
							if (agent.val && typeof agent.val === 'object'
									&& agent.val[n]) {
								o[n] = agent.val[n];
								vars.add(this.method, this.ws);
								if (!o.matchVal) {
									// ensure the agents match value gets set
									o.matchVal = agent.val.matchVal;
								}
								if (!o.withSiphon) {
									// ensure the agents with siphon gets set
									o.withSiphon = agent.val.withSiphon;
								}
							} else {
								o[n] = ov ? ov.val : null;
							}
						} else {
							o[n] = ov.val;
						}
					}
				}
				// capture siphon attribute
				function captureSA($el, m, ei, o, ow) {
					var an = null;
					var n = null;
					var agent = new Agent();
					for (var i = 0; i < ns.length; i++) {
						n = ns[i].toLowerCase();
						an = getAN(m, n);
						n = getSAN(m, n);
						addVal($el, m, ei, o, ow, n, an, agent);
					}
					// ensure user defined variables get set
					if (vars && o.withSiphon) {
						vars.add(m, o.withSiphon);
					}
					return o;
				}
				// capture all siphon attributes for the current methods event
				function capture($el, m, o, re, ml, ow) {
					m = m.toLowerCase();
					var ei = getEI($el, m);
					if (ei < 0 && ei > -2) {
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
								null, t.searchScope);
						if (rpp
								&& rpp.length > 0
								&& rpp.toLowerCase() != opts.selfRef
										.toLowerCase()
								&& !REGEX_CDATA.test(rpp)) {
							rpp = adjustPath(t.ctxPath, rpp, script ? propAttr(
									script, opts.fragExtensionAttr) : '');
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
		 * @param f
		 *            the {Frag}
		 * @param ps
		 *            the raw parameter siphon string
		 * @param vars
		 *            the associative array cache of names/values variables used
		 *            for <b>surrogate siphon resolver</b>s
		 */
		function FragParamSiphon(t, f, ps, vars) {
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
				var rk = typeof k === 'string' ? k : k.val;
				if (typeof ps === 'string') {
					return ps + (ps.length > 0 ? opts.paramSep : '') + rk + '='
							+ ev;
				} else {
					var o = {};
					o[rk] = ev;
					$.extend(ps, o);
					return ps;
				}
			}
			function add(r, $p, ps) {
				if (isExcludedVal($p)) {
					return ps;
				}
				// iterate over the attributes that will be used as keys
				var k = getOptsAttrVal($p, null, opts.paramNameAttrs, true);
				if (!k || !k.val) {
					return ps;
				}
				var v = !r.directive ? $p.val() : r.directive == DTEXT ? $p
						.text() : r.directive == DHTML ? $p.html() : propAttr(
						$p, r.directive);
				if (v !== undefined && v !== null) {
					if ($.isArray(v)) {
						$.each(v, function(i, ev) {
							ps = kv(ps, k, ev);
						});
					} else {
						ps = kv(ps, k, v);
					}
				}
				return ps;
			}
			function resolve(uj, psn) {
				var psx = getNewPs(uj, psn);
				if (psx) {
					psp = siphonValues(psx, f.method, vars, opts.paramSep,
							null, t.searchScope);
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
					var $elc = $el instanceof $ ? $el : $ell ? $ell
							: t.searchScope ? t.searchScope : $('html');
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
								x = add(r, $(this), x);
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
						var iel = el instanceof $;
						rsp = siphonValues(rsp ? rsp : iel ? el : rs, f.method,
								vars, opts.resultSep, null, el || t.searchScope);
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
				var rIsJ = r instanceof $;
				var rslt = null;
				if (rr && rr.directive && rr.directive != DTEXT
						&& rr.directive != DHTML) {
					// try to get the result as an attribute
					rslt = rIsJ ? propAttr(r, rr.directive) : null;
				} else {
					// try to format result as text (if needed)
					rslt = rIsJ && rr && rr.directive == DTEXT ? getTextVals(r)
							: r ? r : '';
				}
				if (typeof rslt === 'string' && !opts.regexTags.test(rslt)) {
					// prepare the non-HTML result string for DOM insertion
					rslt = $(document.createTextNode(rslt));
				} else if (rslt && !(rslt instanceof $)) {
					rslt = $(rslt);
				}
				if (rslt) {
					arc.rsltCache(f.navOpts.type() !== TREP, rslt, rr
							&& rr.child);
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
					var tq = 0;
					if (isAttr(dr)) {
						propAttr($ds, dr.directive, '');
					} else if (rr && (!dr.directive || dr.directive == DHTML)) {
						// remove any existing prior result node(s) that may
						// exist under the destination that match the result
						// siphon (ic)
						var $c = rr.selectFrom($ds, true);
						if ($c.length > 0) {
							$c.remove();
						} else {
							tq = 1;
						}
					} else {
						tq = 1;
					}
					if (tq == 1) {
						// remove any existing text content that may exist under
						// the destination
						$ds.contents().filter(function() {
							return this.nodeType === 3;
						}).remove();
					}
				}
				var altr = null;
				if (!r && rr && rr.directive && rr.directive != DTEXT
						&& rr.directive != DHTML) {
					// no result, but is directed for an attribute- must be
					// self-referencing
					altr = function($d, $r) {
						return propAttr($d, rr.directive);
					};
				} else if (isAttr(dr)) {
					// result needs to be set on attribute
					altr = function($d, $r) {
						var v = ia && !iu ? propAttr($d, dr.directive) : null;
						propAttr($d, dr.directive, (v ? v : '')
								+ getTextVals($r));
					};
				} else if (r instanceof $ && dr.directive == DTEXT) {
					// result needs to be text
					altr = function($d, $r) {
						return getTextVals($r);
					};
				} else if ($altr instanceof $) {
					// alternative result node provided
					altr = function($d, $r) {
						return $altr;
					};
				}
				if (r || altr) {
					// cache the destination for DOM insertion after all other
					// destinations have also been cached (prevents multiple
					// result resolver overwrites and improves performance)
					arc.destCache(ia, $ds, altr, rr && rr.child ? r : null);
				}
			}
			function appendTo(arc, iu, im, dr, $d, rr, r, altr) {
				return addTo(arc, true, iu, im, dr, $d, rr, r, altr);
			}
			function replaceTo(arc, iu, im, dr, $d, rr, r, altr) {
				return addTo(arc, false, iu, im, dr, $d, rr, r, altr);
			}
			;
			this.destSiphon = function(dsn) {
				dsp = dsn ? dsn : dsp;
				if (!dsp || dsn) {
					dsp = siphonValues(dsp || ds, f.method, vars, opts.destSep,
							null, t.destScope);
					dsr = new NodeResolvers(dsp ? dsp
							: ds instanceof $ ? ds : '', opts.fragAttrs);
				}
				return dsp;
			};
			this.destResolver = function(dsn) {
				this.destSiphon(dsn);
				return dsr;
			};
			this.add = function($p, arc, r, rr, im, ts, xhr) {
				var addType = f.navOpts.type();
				function addDest(i, dr) {
					try {
						var $x = null;
						var $ds = dr.selectFrom($p);
						if ($ds.length <= 0) {
							return true;
						}
						if (addType === TREP) {
							try {
								$x = $(r);
								replaceTo(arc, false, im, dr, $ds, rr, $x);
							} catch (e) {
								// node may contain top level text nodes
								$x = $ds.parent();
								replaceTo(arc, false, im, dr, $ds, rr, r, $x);
							}
						} else if (addType === TINC || addType === TUPD) {
							if (f.fds.destSiphon() || addType === TUPD) {
								if (f.fds.destSiphon()) {
									// when updating remove any pre-exsisting
									// results
									// from the destination that match the
									// result siphon
									appendTo(arc, addType === TUPD, im, dr,
											$ds, rr, r);
								} else {
									// when updating remove everything in the
									// destination
									appendTo(arc, addType === TUPD, im, dr,
											$ds, rr, r);
								}
							} else {
								appendTo(arc, false, im, dr, $ds, rr, r);
							}
						} else {
							var em = 'Invalid destination type "' + addType
									+ '" for ' + f.toString();
							t.addError(em, f, null, ts, xhr);
							return false;
						}
					} catch (e) {
						t.addError('Error while processing desitination "' + dr
								+ '" for ' + f.toString(), f, e, ts, xhr);
					}
				}
				if (rr && rr.child) {
					// result resolver already has predefined destination
					addType = rr.type() ? rr.type() : addType;
					addDest(-1, rr.child);
				} else {
					// add the result to each of the destinations
					this.destResolver().each(addDest);
				}
			};
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
		 * @returns the file name for the supplied URL (or empty when not
		 *          present)
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
							&& propAttr($el, 'nodeName').toLowerCase() == 'input' && opts.regexParamCheckable
							.test(propAttr($el, 'type')));
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
			if ($el instanceof $) {
				$el.each(function(i, r) {
					e = $(r);
					if (e.is(':input') && !e.is(':button')) {
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
			x = x && p.lastIndexOf(opts.pathSep) != (p.length - 1) ? x
					.toLowerCase() == opts.inheritRef ? getFileExt(location.href)
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
		 * @returns the absolute path version of the relative path in relation
		 *          to the provided absolute path (or just the supplied relative
		 *          path when it's really an absolute path)
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
				return propAttr($s, attr);
			}
		}


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
			var f = !nn && typeof window[fs] === 'function' ? window[fn]
					: undefined;
			var a = null;
			this.isValid = typeof f === 'function';
			this.setArgs = function(nam) {
				if (this.isValid) {
					if ($.isArray(a) && a.length > 0) {
						var ia = nam && $.isArray(nam);
						for (var i = 0; i < a.length; i++) {
							a[i] = a[i].replace(opts.regexFuncArgReplace, '');
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
				return x.length > 1 ? '[' + x.substring(0, x.length - 2) + ']'
						: '';
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
			log('Error in ' + fs + ' ' + amts(am), e);
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
	 * Attempts to retrieve a property or attribute from an element (reasons why
	 * JQuery separates the two does not apply within this plug-in)
	 * 
	 * @param $el
	 *            the element
	 * @param n
	 *            the name of the property or attribute
	 * @param v
	 *            the optional value to set
	 * @returns the property or attribute
	 */
	function propAttr($el, n, v) {
		var pa = '';
		if ($el && n) {
			if (typeof v !== 'undefined') {
				$el.prop(n, v);
				// $el.attr(n, v);
				return $el;
			}
			pa = $el.prop(n);
			if (typeof pa === 'undefined' || pa instanceof $) {
				pa = $el.attr(n);
			}
		}
		return pa;
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
	 * When available, logs a message to the console
	 * 
	 * @param m
	 *            the message to log
	 * @param l
	 *            the logging level (i.e. <code>1</code> (or an
	 *            <code>Error</code> object) is <code>error</code>,
	 *            <code>2</code> is <code>warn</code>, <code>3</code> is
	 *            <code>log</code> (default))
	 * @param o
	 *            the optional object that the log is for (will iterate over
	 *            properties and print name/values to the console)
	 */
	function log(m, l, o) {
		function iem(m, o) {
			if (o) {
				var a = [];
				for ( var n in o) {
					if (this[n] && typeof this[n] !== 'function'
							&& o.hasOwnPropery(n)) {
						a.push(n);
						a.push(this[n]);
					}
				}
				return m + (a.length > 0 ? '\nFor:\n' + lbls.apply(o, a) : '');
			}
			return m;
		}
		try {
			m = m ? m : '';
			m = ieVersion <= 0 || ieVersion > ieVersionCompliant ? m
					: typeof m.toFormattedString === 'function' ? m
							.toFormattedString() : iem(m, o);
			if (typeof window.console !== 'undefined'
					&& typeof window.console.log !== 'undefined') {
				var ie = l instanceof Error;
				if ((ie || l == 1) && window.console.error) {
					if (m) {
						window.console.error(m
								+ (ie ? ' Cause: ' + l.message : ''));
					}
				} else if (l == 2 && window.console.warn) {
					if (m) {
						window.console.warn(m);
					}
				} else {
					if (m) {
						window.console.log(m);
					}
				}
				if (o) {
					window.console.log(o);
				}
			}
		} catch (e) {
			// consume
		}
	}

	/**
	 * Waits for a predetermined amount of time before executing a function
	 * multiple times until the function returns true or until a timeout is
	 * reached (executes function once when a document is provided and it has
	 * finished loading)
	 * 
	 * @param delay
	 *            the delay between checks in milliseconds
	 * @param timeout
	 *            the timeout in milliseconds
	 * @param winFx
	 *            optional function that will return a window that will be used
	 *            for document reference to check for ready state before calling
	 *            supplied callback function
	 * @param fx
	 *            the function to call for each interval
	 */
	function wait(delay, timeout, winFx, fx) {
		var limit = 0;
		var timer = null;
		timer = setInterval(function() {
			try {
				var win = null;
				if (limit >= timeout) {
					clearInterval(timer);
					fx(limit, new Error("Timmed out after " + (limit * timeout)
							+ " milliseconds"));
				} else if (typeof winFx === 'function' && (win = winFx())) {
					if (win.document.readyState == 'loaded'
							|| win.document.readyState == 'complete') {
						fx(limit);
						clearInterval(timer);
					}
				} else if (fx(limit)) {
					clearInterval(timer);
				}
				limit++;
			} catch (e) {
				clearInterval(timer);
				fx(limit, e);
			}
		}, delay);
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
		for (var i = 0; i < x.length; i++) {
			y = '[' + x[i] + ']';
			ra.items.push({
				name : x[i],
				sel : y,
				regExp : new RegExp('\\s' + x[i] + rxs, 'ig')
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
		var tn = propAttr($el, 'tagName');
		$.each($el, function() {
			var a = this.attributes;
			for ( var k in a) {
				if (a[k].nodeName && a[k].nodeValue !== undefined) {
					as += (as.length > 0 ? ',' : '') + tn + '[' + a[k].nodeName
							+ '="' + a[k].nodeValue + '"]';
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
		var tn = propAttr(el, 'tagName');
		tn = tn ? tn.toLowerCase() : null;
		return tn === 'html' || tn === 'head';
	}

	/**
	 * JQuery add convenience for <code>add</code> function with validation
	 * 
	 * @param o
	 *            the JQuery object to add to
	 * @param ao
	 *            the item to add to the JQuery object
	 */
	function jqAdd(o, ao) {
		if (o instanceof $) {
			return ao ? o.add(ao) : o;
		}
		return ao ? $(o).add(ao) : $(o);
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
	 * Initializes thymus.js plug-in and loads any fragments within the page like
	 * the capture setting of the <code>href</code> of the document's
	 * <code>base</code> to the path from the {BASE_PATH_ATTR} attribute.
	 */
	function init() {
		if ($.fn[NS] !== undefined) {
			return;
		}
		var thx = $('#' + NS);
		if (!thx.length) {
			throw new Error('No script found with ID: ' + NS);
		}
		updateUrls = true;
		basePath = thx.attr(BASE_PATH_ATTR);
		var $base = $('base');
		var bp = $base.attr('href');
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
			// $base.prop('href', basePath);
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
			fragAttrs : [ 'data-thx-fragment', 'th\\:fragment',
					'data-th-fragment' ],
			includeAttrs : [ 'data-thx-include', 'th\\:include',
					'data-th-include' ],
			replaceAttrs : [ 'data-thx-replace', 'th\\:replace',
					'data-th-replace' ],
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
			getDelegateAttrs : [ 'data-thx-get-delegate' ],
			postDelegateAttrs : [ 'data-thx-post-delegate' ],
			putDelegateAttrs : [ 'data-thx-put-delegate' ],
			deleteDelegateAttrs : [ 'data-thx-delete-delegate' ],
			getWithAttrs : [ 'data-thx-get-with' ],
			postWithAttrs : [ 'data-thx-post-with' ],
			putWithAttrs : [ 'data-thx-put-with' ],
			deleteWithAttrs : [ 'data-thx-delete-with' ],
			fragExtensionAttr : 'data-thx-frag-extension',
			fragListenerAttr : 'data-thx-onfrag',
			fragsListenerAttr : 'data-thx-onfrags',
			fragHeadAttr : 'data-thx-head-frag',
			paramNameAttrs : [ 'name', 'id' ],
			readyStateDelay : 10,
			readyStateTimeout : 30000,
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
			regexParentChildDelimiter : /=>/g,
			regexSurrogateSiphon : /\?([^\?"']+?(?:(?:"|')[^"']*(?:"|')[^\?{}"']*)*)}/g, // /(?:\?{)((?:(?:\\.)?|(?:(?!}).))+)(?:})/g,
			regexNodeSiphon : /\|([^\|"']+?(?:(?:"|')[^"']*(?:"|')[^\|{}"']*)*)}/g,
			regexVarSiphon : /\$([^\$"']+?(?:(?:"|')[^"']*(?:"|')[^\${}"']*)*)}/g,
			regexVarNameVal : /((?:\\.|[^=,]+)*)=("(?:\\.|[^"\\]+)*"|(?:\\.|[^,"\\]+)*)/g,
			regexParamCheckable : /^(?:checkbox|radio)$/i,
			regexParamReplace : /\r?\n/g,
			regexDestTextOrAttrVal : /[^\x21-\x7E\s]+/g,
			regexFilterFindSplit : /\s+/,
			paramReplaceWith : '\r\n',
			resultWrapperTagName : DFTL_RSLT_NAME,
			eventIsBroadcast : true,
			eventFragChain : 'frag',
			eventFragsChain : 'frags',
			eventFragBeforeHttp : 'beforehttp.thx.frag',
			eventFragBeforeDom : 'beforedom.thx.frag',
			eventFragAfterDom : 'afterdom.thx.frag',
			eventFragLoad : 'load.thx.frag',
			eventFragsBeforeHttp : 'beforehttp.thx.frags',
			eventFragsLoad : 'load.thx.frags',
			actionLoadFrags : 'frags.load',
			actionNavRegister : 'nav.register',
			actionNavInvoke : 'nav.invoke',
			actionOptions : 'opts.get'
		};
		/**
		 * thymus.js plug-in action execution
		 * 
		 * @param a
		 *            the action object (or action string)
		 * @parma the options (relative to the context of the element(s) for
		 *        which the plug-in is being called from)
		 */
		$.fn[NS] = function(a, opts) {
			var o = $.extend({}, defs, opts);
			var x = null, xl = null;
			var s = this.selector;
			return this.each(function() {
				if (firstRun && rootRun && $.contains(document, this[0])) {
					// make sure the root document has navigation capabilities
					rootRun = false;
					$('html')[NS](o.actionNavRegister);
				}
				xl = $.data(this, NS);
				if (opts || !xl) {
					xl = x ? x : (x = new FragCtx(s, thx, o));
					$.data(this, NS, xl);
				}
				xl.exec(a, this);
			});
		};
		$.fn[NS].defaults = defs;
		try {
			// TODO : better IE version detection
			ieVersion = (ieVersion = (navigator.userAgent || "")
					.match(/(?:(?:MSIE\s*)|(?:Trident.*rv:))(\d+\.?\d*)/i))
					&& ieVersion.length > 1 ? parseFloat(ieVersion[1], 10) : 0;
		} catch (e) {
			log('Unable to detect IE version: ', e);
		}

		try {
			isLinux = navigator.platform.toLowerCase().indexOf('linux') >= 0;
		} catch (e) {
			log('Unable to detect Linux: ', e);
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
		preloadResources(propAttr(thx, FRAGS_PRE_LOAD_CSS_ATTR), propAttr(
				thx, FRAGS_PRE_LOAD_JS_ATTR), function(s, d, ts, jqxhr, e) {
			if (e) {
				var ne = 'Unable to load "' + s + '" ' + e + ', status: ' + ts
						+ ', data: ' + d;
				log(ne, 1);
				throw new Error(ne);
			} else {
				var $p = $('html');
				if (!thx.attr(FRAGS_LOAD_DEFERRED_LOAD_ATTR)) {
					// auto-process the fragments
					$p[NS](defs.actionLoadFrags);
				}
			}
		});
	}

	// start thymus.js
	$(document).ready(init);


}(window.jQuery);



