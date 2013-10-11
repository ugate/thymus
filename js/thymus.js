/* ============================================
   Thymus version 1.0 http://ugate.org

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
	this.ieVersion = 0;
	this.firstRun = true;

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
	 *            the template type
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
	 * Function constructor
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
		var TATTR = 'attribute';
		var TINC = 'include';
		var TREP = 'replace';
		var TUPD = 'update';
		var ctx = this;
		this.opts = opts;
		var httpFuncs = {};
		var httpFuncCnt = 0;
		var includeReplaceAttrs = opts.includeAttrs.concat(opts.replaceAttrs);
		var protocolForFile = opts.regexFileTransForProtocolRelative
				.test(location.protocol) ? 'http:' : null;
		var fragSelector = getThxSel(includeReplaceAttrs, null);
		var urlAttrs = genAttrQueries(opts.urlAttrs, 'GET', TATTR);
		var inculdeGetAttrs = genAttrQueries(opts.inculdeGetAttrs, 'GET', TINC);
		var replaceGetAttrs = genAttrQueries(opts.replaceGetAttrs, 'GET', TREP);
		var updateGetAttrs = genAttrQueries(opts.updateGetAttrs, 'GET', TUPD);
		var inculdePostAttrs = genAttrQueries(opts.inculdePostAttrs, 'POST', TINC);
		var replacePostAttrs = genAttrQueries(opts.replacePostAttrs, 'POST', TREP);
		var updatePostAttrs = genAttrQueries(opts.updatePostAttrs, 'POST', TUPD);
		var inculdePutAttrs = genAttrQueries(opts.inculdePutAttrs, 'PUT', TINC);
		var replacePutAttrs = genAttrQueries(opts.replacePutAttrs, 'PUT', TREP);
		var updatePutAttrs = genAttrQueries(opts.updatePutAttrs, 'PUT', TUPD);
		var inculdeDeleteAttrs = genAttrQueries(opts.inculdeDeleteAttrs, 'DELETE', TINC);
		var replaceDeleteAttrs = genAttrQueries(opts.replaceDeleteAttrs, 'DELETE', TREP);
		var updateDeleteAttrs = genAttrQueries(opts.updateDeleteAttrs, 'DELETE', TUPD);

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
			var hf = httpFuncs[a.action];
			if (typeof f === 'function') {
				hf(p, c);
			} else if (a.action === opts.actionLoadFrags) {
				loadFragments(p, fragSelector, false, null);
			} else if (a.action === opts.actionNavRegister) {
				a.method = a.method ? a.method : 'GET';
				if (a.fragTarget) {
					loadFragments(c ? c : p, a, true, null);
				} else if (a.fragUrl) {
					location.href = adjustPath(getScriptCtxPath(), a.fragUrl,
							script ? script.attr(opts.fragExtensionAttr) : '');
				} else {
					log('No fragment target specified for ' + a.action);
				}
			} else if (a.action === opts.actionNavResolve) {
				var t = new FragsTrack(a.selector ? $(a.selector) : $(selector), {});
				var f = new Frag(null, t.scope, t.scope, t);
				htmlDomAdjust(t, f, t.scope, true);
			} else {
				throw new Error('Invalid action: ' + a.action);
			}
		};

		/**
		 * Updates a navigation source for an array object
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
			function av(p, i) {
				return i >= p.length ? '' : $.trim(p[i]);
			}
			v = v.split(opts.fragSep);
			var r = {
				selector : '',
				action : opts.actionNavRegister,
				method : t.method,
				type : a.type,
				event : av(v, 0),
				onEvent : '',
				fragUrl : av(v, 1),
				fragTarget : av(v, 2),
				fragDest : av(v, 3),
				funcName : '',
				isValid : v.length > 1
			};
			if (r.isValid) {
				var hasOn = r.event.toLowerCase().indexOf('on') == 0;
				r.funcName = opts.actionNavResolve + ++httpFuncCnt;
				httpFuncs[r.funcName] = function(pel, ib) {
					r.selector = ib;
					ctx.exec(r, pel, ib);
				};
				if (el) {
					var $el = $(el);
					$el.on(hasOn ? r.event.substr(2) : r.event, function() {
						httpFuncs[r.funcName](f.pel, $(this));
					});
					$el.on('remove', function () {
						httpFuncs[r.funcName] = null;
					});
				} else {
					// possible memory leaks may occur on the HTTP functions
					// when dealing with raw data replacements that are removed
					// from the DOM at a later time- currently not being used
					r.onEvent = ' ' + (hasOn ? '' : 'on') + r.event
							+ '="' + '$(\'' + selector + '\').' + NS
							+ '(\'' + r.funcName + '\',this)"';
				}
			} else {
				t.addError('Expected at least two parameters for '
						+ m, f);
			}
			return r;
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
			s = s.replace(/\<(\?xml|(\!DOCTYPE[^\>\[]+(\[[^\]]+)?))+[^>]+\>/g, '');
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
			updateNavAttrs(t, f, inculdeGetAttrs, s);
			updateNavAttrs(t, f, replaceGetAttrs, s);
			updateNavAttrs(t, f, updateGetAttrs, s);
			updateNavAttrs(t, f, inculdePostAttrs, s);
			updateNavAttrs(t, f, replacePostAttrs, s);
			updateNavAttrs(t, f, updatePostAttrs, s);
			updateNavAttrs(t, f, inculdePutAttrs, s);
			updateNavAttrs(t, f, replacePutAttrs, s);
			updateNavAttrs(t, f, updatePutAttrs, s);
			updateNavAttrs(t, f, inculdeDeleteAttrs, s);
			updateNavAttrs(t, f, replaceDeleteAttrs, s);
			updateNavAttrs(t, f, updateDeleteAttrs, s);
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
			absStack = absPath ? absPath.split('/') : [];
			relStack = relPath.split('/');
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
			return absStack.join('/');
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
		 * @returns the file extension for the supplied URL (or empty when not present)
		 */
		function getFileExt(url) {
			var x = getFile(url);
			if (x) {
				x = x.split('.');
				if (x.length > 1) {
					x = '.' + x[x.length - 1];
				}
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
				var fs = url.match(opts.regexFileExtension);
				if (fs && fs.length > 0) {
					f = fs[0];
				}
			}
			return f;
		}

		/**
		 * Retrieves the JQuery selector for capturing a fragments content
		 * 
		 * @param v
		 *            the value to get the selector for
		 * @returns JQuery selector
		 */
		function getFragFromSel(v) {
			var s = $.trim(v);
			var hf = s && opts.regexFragName.test(s);
			s = s + (hf ? ',' + getThxSel(opts.fragAttrs, s) : '');
			return {
				s : s,
				hasFragAttr : hf
			};
		}

		/**
		 * Gets a template JQuery selector
		 * 
		 * @param a
		 *            the of array of template attributes (matches any)
		 * @param v
		 *            the optional attribute value to match in the array
		 * @returns JQuery selector
		 */
		function getThxSel(a, v) {
			var r = '';
			var as = $.isArray(a) ? a : [ a ];
			for ( var i = 0; i < as.length; i++) {
				r += (i > 0 ? ',' : '') + '[' + as[i] + (v ? '="' + v + '"' : '') + ']';
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
			x = x ? x.toLowerCase() == opts.inheritRef ? getFileExt(location.href)
					: x
					: '';
			if (x && p.indexOf('.') < 0) {
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
				c = '/';
			}
			// capture the absolute URL relative to the defined context path attribute
			// value
			c = absolutePath(c, window.location.href);
			c += c.lastIndexOf('/') != c.length - 1 ? '/' : '';
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
				} else if (f && !f.u) {
					t.addError('Invalid URL for ' + f.toString(), f);
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
		 * @param tsel
		 *            the template selection used for tracking
		 * @param isRoot
		 *            true when the root frament selection is the actual
		 *            template element
		 */
		function FragsTrack(s, tsel) {
			this.isTopLevel = isTopLevelEl(s);
			this.ctxPath = getScriptCtxPath();
			this.isScopeSelect = tsel && s.is(tsel.selector);
			this.scope = s;
			this.tsel = tsel;
			this.ccnt = 0;
			this.cnt = 0;
			this.len = 0;
			var c = [];
			this.addFrag = function(f) {
				if (c[f.u]) {
					c[f.u][c[f.u].length] = f;
					return false;
				} else {
					c[f.u] = [ f ];
				}
				return true;
			};
			this.getFrags = function(url) {
				return c[url];
			};
			var e = [];
			this.addError = function(em, f) {
				e[e.length] = em;
				if (f) {
					f.e = em;
				}
				return e;
			};
			this.getErrors = function() {
				return e;
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
			var forcett = t.tsel && t.tsel.type;
			//var isHead = $fl instanceof jQuery ? $fl.is('head') : false;
			this.pf = pf;
			this.pel = $pel;
			this.el = $fl;
			this.tt = forcett ? t.tsel.type : TATTR;
			var a = !t.isScopeSelect ? getFragAttr($fl, opts.includeAttrs)
					: null;
			if (!a && !t.isScopeSelect) {
				a = getFragAttr($fl, opts.replaceAttrs);
				if (!forcett) {
					this.tt = TREP;
				}
			} else if (!forcett) {
				this.tt = TINC;
			}
			a = a ? a.split(opts.fragSep) : null;
			this.u = !a ? t.tsel.fragUrl : a && a.length > 0 ? $.trim(a[0])
					: null;
			this.t = !a ? t.tsel.fragTarget : a && a.length > 1 ? $.trim(a[1])
					: null;
			this.d = !a ? t.tsel.fragDest : this.el;
			this.m = t.tsel && t.tsel.method ? t.tsel.method : 'GET';
			if (this.u && this.u.length > 0
					&& this.u.toLowerCase() != opts.selfRef.toLowerCase()) {
				this.u = adjustPath(t.ctxPath, this.u, script ? script
						.attr(opts.fragExtensionAttr) : '');
			} else if (this.t && this.t.length > 0) {
				this.u = opts.selfRef;
			}
			this.func = this.t ? new Func(opts, this.t, null, true) : null;
			if (this.t) {
				var fpts = opts.regexFunc.exec(this.t);
				if (fpts) {
					this.t = fpts[0];
				}
			}
			var fso = this.t ? getFragFromSel(this.t) : null;
			this.s = fso ? fso.s : null;
			this.hf = fso ? fso.hasFragAttr : true;
			this.rs = null;
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
			this.p = function(x, jqxhr, ts, e) {
				broadcast(opts.eventFragChain, opts.eventFragBeforeDom, t, this);
				if (this.cancelled) {
					this.domDone(false);
					return;
				}
				if (ts || e) {
					t.addError('Error at ' + this.toString() + ': ' + ts + '- '
							+ e, this);
					this.domDone(true);
					return;
				}
				var xIsJ = x instanceof jQuery;
				if (xIsJ && x.is('script')) {
					if (jqxhr && jqxhr.status != 200) {
						t.addError(jqxhr.status + ': ' + ts
								+ ' URL="' + this.u + '"', this);
						this.domDone(true);
						return;
					} else if (!jqxhr) {
						$('<script>' + this.u.substr('data:text/javascript,'.length) + 
							'</script>').appendTo(x);
					}
				} else {
					if (this.tt === TREP) {
						try {
							var $x = $(x);
							this.el.replaceWith($x);
							this.rs = $x;
						} catch (e) {
							// node may contain top level text nodes
							var $x = this.el.parent();
							this.el.replaceWith(x);
							this.rs = $x;
						}
					} else if (this.tt === TINC || this.tt === TUPD) {
						if (this.d) {
							var $d = $(this.d);
							if (this.tt === TUPD) {
								// remove any existing fragments that may exist
								// under the element
								$d.find(this.s).remove();
							}
							$d.append(x);
						} else {
							this.el.append(x);
						}
						this.rs = x;
					}
					// make post template DOM adjustments- no need for URL updates-
					// they needed to be completed prior to placement in the DOM or
					// URLs in some cases will be missed (like within the head)
					htmlDomAdjust(t, ctx, this.rs, false);
				}
				this.domDone(false);
			};
			this.getTarget = function() {
				return this.func && this.func.isValid ? this.func.run : this.t;
			};
			this.getStack = function() {
				var us = [];
				var cf = this;
				do {
					us[us.length] = {
						url : cf.u,
						target : cf.getTarget(),
						destination : cf.d,
						source : cf.rs
					};
				} while ((cf = cf.pf));
				return us;
			};
			this.toString = function() {
				return this.constructor.name + ' -> type: ' + this.tt
						+ ', URLs: ' + this.us + ', target: ' + this.t
						+ ', destination: ' + this.d + ', select: ' + this.s
						+ ', template type: ' + this.tt + ', HTTP method: '
						+ this.m + ', error: ' + this.e;
			};
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
			e.type = type;
			e.fragCount = t.cnt;
			e.fragCurrTotal = t.len;
			e.fragPendingPeerCount = f && f.pf ? f.pf.ccnt(null) : 0;
			e.fragUrl = f ? f.u : undefined;
			e.fragStack = f ? f.getStack() : undefined;
			e.fragTarget = f ? f.getTarget() : undefined;
			e.fragDestination = f ? f.d : undefined;
			e.source = f ? f.rs instanceof jQuery ? f.rs : f.el : undefined;
			e.error = f ? f.e : undefined;
			e.scope = t.scope;
			e.chain = opts.eventFragChain;
			e.log = function() {
				log(this);
			};
			e.toFormattedString = function() {
				return '[' + this.chain + ' event, fragCount: '
						+ this.fragCount + ', fragCurrTotal: '
						+ this.fragCurrTotal + ', URL: ' + this.url
						+ ', element: ' + this.element + ', error: '
						+ this.error + ']';
			};
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
			e.fragCancelCount = t.ccnt;
			e.fragCount = t.cnt;
			e.scope = t.scope;
			e.errors = t.getErrors();
			e.chain = opts.eventFragsChain;
			e.log = function() {
				log(this);
			};
			e.toFormattedString = function() {
				return '[' + this.chain + ' Event, fragCount: '
						+ this.fragCount + ', errors: ' + this.e + ']';
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
		 * @param selector
		 *            the selector to the root element where fragments will be looked for
		 * @param tselector 
		 *            the selector to the templates that will be included/replaced
		 * @param altDest 
		 *            true to attempt to extract an alternate destination from the template 
		 *            attribute value (falls back on on self destination when not present)
		 * @param func
		 *            the callback function that will be called when all fragments have
		 *            been loaded (parameters: the original root element, the number of
		 *            fragments processed and an array of error objects- if any)
		 */
		function loadFragments(selector, tselector, altDest, func) {
			var $s = $(selector);
			tsel = typeof tselector === 'object' ? tselector : {
				selector : tselector
			};
			var t = new FragsTrack($s, tsel);
			function done(pf, t, f) {
				if (t.cnt > t.len) {
					t.addError('Expected ' + t.len
							+ ' fragments, but recieved ' + t.cnt, f);
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
			function hndlFunc(f, cb, r, status, xhr, e) {
				if (f.func && f.func.isValid) {
					f.func.run({
						handle : {
							source : f.el,
							type : f.tt,
							data : r,
							status : status,
							xhr : xhr,
							error : e,
							process : function(x) {
								f.p(x);
							}
						}
					});
					cb(null, f);
					return true;
				}
				return false;
			}
			function doScript(f, $t, $x, cb) {
				if (!$t.is($x)) {
					$x.remove();
				}
				var url = $x.prop('src');
				function sdone(sf, jqxhr, ts, e) {
					sf.p($t, jqxhr);
					cb(jqxhr && (!ts || !e) ? $t : null, sf);
				}
				if (url && url.length > 0) {
					t.len++;
					var sf = new Frag(f, $s, $x, t);
					sf.u = url;
					sf.t = $t;
					broadcast(opts.eventFragChain,
							opts.eventFragBeforeLoad, t, sf);
					if (sf.cancelled) {
						cb(null, sf);
						return;
					}
					if (url.indexOf('data:text/javascript,') >= 0) {
						sdone(sf);
						return;
					}
					$.getScript(url).done(function(data, textStatus, jqxhr) {
						sdone(sf, jqxhr);
					}).fail(function(jqxhr, ts, e) {
						sdone(sf, jqxhr, ts, e);
					});
				}
			}
			function lcont(f, cb, r, status, xhr) {
				if (hndlFunc(f, cb, r, status, xhr)) {
					return;
				}
				if (xhr) {
					var mt = xhr.getResponseHeader('Content-Type');
					if (mt.indexOf('text/plain') >= 0 || mt.indexOf('octet-stream') >= 0) {
						f.p(r);
						cb(null, f);
						return;
					} else if (mt.indexOf('json') >= 0) {
						// TODO : handle JSON data using name matching
					}
				}
				// TODO : htmlDataAdjust processes the entire fragment response-
				// should only adjust the desired fragment

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
					if (ha && ha == f.t) {
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
						hf.p(hr);
						cb($h, f);
						return;
					}
				}
				// process non-head tags the normal JQuery way
				// (links need to be converted via raw results to
				// prevent warnings)
				var $c = $('<results>' + htmlDataAdjust(t, f, r) + '</results>');
				var fs = $c.find(f.s);
				if (fs.length <= 0) {
					fs = $c.filter(f.s);
					if (fs.length <= 0) {
						t.addError('No matching results for ' + f.toString()
								+ ' in\n' + r, f);
						cb(null, f);
						return;
					}
				}
				fs.each(function() {
					var $cf = $(this);
					$cf.find('script').each(function() {
						doScript(f, $cf, $(this), cb);
					});
					if ($cf.is('script')) {
						doScript(f, $cf, $cf, cb);
					} else {
						f.p($cf);
					}
					cb($cf, f);
				});
			}
			function lfg(pf, $fl, cb) {
				var f = null;
				try {
					f = new Frag(pf, $s, $fl, t);
					cb = typeof cb === 'function' ? cb : function(){};
					broadcast(opts.eventFragChain, opts.eventFragBeforeLoad, t,
							f);
					if (f.cancelled) {
						cb(null, f);
						return;
					}
					if (t.addFrag(f)) {
						var adone = function(r, status, xhr) {
							var frgs = t.getFrags(f.u);
							for (var i=0; i<frgs.length; i++) {
								lcont(frgs[i], cb, r, status, xhr);
							}
						};
						if (f.u == opts.selfRef) {
							adone($('html').html(), 'same-template');
							return;
						}
						// use ajax vs load w/content target for more granular control
						$.ajax({
							url: f.u,
							type: f.m,
							cache: opts.ajaxCache
						}).done(adone).fail(function(xhr, ts, e) {
							var frgs = t.getFrags(f.u);
							for (var i=0; i<frgs.length; i++) {
								t.addError('Error at ' + f.toString() + ': ' + ts + '- ' + e, f);
								if (!hndlFunc(f, cb, null, ts, xhr, e)) {
									cb(null, f);
								}
							}
						});
					}
				} catch (e) {
					t.addError('Error at ' + (f ? f.toString() : Frag) + ': ' + e, f);
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
				var $fs = t.isScopeSelect && $f.is(t.scope) ? $f : $f.find(tsel.selector);
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
			inheritRef : 'inherit',
			fragSep : '::',
			fragExtensionAttr : 'data-thx-frag-extension',
			fragAttrs : [ 'data-thx-fragment', 'th\\:fragment', 'data-th-fragment' ],
			includeAttrs : [ 'data-thx-include', 'th\\:include', 'data-th-include' ],
			replaceAttrs : [ 'data-thx-replace', 'th\\:replace', 'data-th-replace' ],
			urlAttrs : [ 'href', 'src' ],
			inculdeGetAttrs : [ 'data-thx-include-get' ],
			replaceGetAttrs : [ 'data-thx-replace-get' ],
			updateGetAttrs : [ 'data-thx-update-get' ],
			inculdePostAttrs : [ 'data-thx-include-post' ],
			replacePostAttrs : [ 'data-thx-replace-post' ],
			updatePostAttrs : [ 'data-thx-update-post' ],
			inculdePutAttrs : [ 'data-thx-include-put' ],
			replacePutAttrs : [ 'data-thx-replace-put' ],
			updatePutAttrs : [ 'data-thx-update-put' ],
			inculdeDeleteAttrs : [ 'data-thx-include-delete' ],
			replaceDeleteAttrs : [ 'data-thx-replace-delete' ],
			updateDeleteAttrs : [ 'data-thx-update-delete' ],
			contextPathAttr : 'data-thx-context-path',
			fragListenerAttr : 'data-thx-onfrag',
			fragsListenerAttr : 'data-thx-onfrags',
			fragHeadAttr : 'data-thx-head-frag',
			regexFragName : /^[_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*$/,
			regexFunc : /.+?\(/i,
			regexFileExtension : /[^\/?#]+(?=$|[?#])/,
			regexScriptTags : /<script[^>]*>([\\S\\s]*?)<\/script>/img,
			regexIanaProtocol : /^(([a-z]+)?:|\/\/|#)/i,
			regexFileTransForProtocolRelative : /^(file:?)/i,
			regexAbsPath : /^\/|(\/[^\/]*|[^\/]+)$/g,
			regexFuncArgs : /(('|").*?('|")|[^('|"),\s]+)(?=\s*,|\s*$)/g,
			regexFuncArgReplace : /['"]/g,
			eventIsBroadcast : true,
			eventFragChain : 'frag',
			eventFragsChain : 'frags',
			eventFragBeforeLoad : 'beforeload.thx.frag',
			eventFragBeforeDom : 'beforedom.thx.frag',
			eventFragAfterDom : 'afterdom.thx.frag',
			eventFragLoad : 'load.thx.frag',
			eventFragsLoad : 'load.thx.frags',
			actionLoadFrags : 'frags.load',
			actionNavRegister : 'nav.register',
			actionNavResolve : 'nav.resolve'
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
				// make sure the root document has navigation capabilities
				$p[NS]('nav.resolve');
				if (!getPreLoadAttr(FRAGS_LOAD_DEFERRED_LOAD_ATTR)) {
					// auto-process the fragments
					$p[NS]('frags.load');
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