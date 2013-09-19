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
	var scriptSourceId = 'thymusScript';
	var JQUERY_URL_ATTR = 'data-thx-jquery-url';
	var JQUERY_DEFAULT_URL = '//code.jquery.com/jquery.min.js';
	var FRAGS_LOAD_DEFERRED_LOAD_ATTR = 'data-thx-deferred-load';
	var ieVersion = 0;

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
	 * thymus.js context constructor
	 * 
	 * @constructor
	 * @param jqUrl
	 *            the URL used to load JQuery
	 * @param opts the JQuery options used 
	 */
	function FragCtx(jqUrl, opts) {
		var script = $('#' + scriptSourceId);
		var scriptFragsComplete = script ? script
				.attr(opts.fragsCompleteAttr) : null;
		var scriptFragComplete = script ? script
				.attr(opts.fragCompleteAttr) : null;
		var fragAttrs = [ opts.fragAttr, opts.thymeleafFragAttr,
				opts.thymeleafFragAltAttr ];
		var includeAttrs = [ opts.includeAttr, opts.thymeleafIncludeAttr,
				opts.thymeleafIncludeAltAttr ];
		var replaceAttrs = [ opts.replaceAttr, opts.thymeleafReplaceAttr,
				opts.thymeleafReplaceAltAttr ];
		var includeReplaceAttrs = includeAttrs.concat(replaceAttrs);
		var protocolForFile = opts.regexFileTransForProtocolRelative
				.test(location.protocol) ? 'http:' : null;
		var fragSelector = getThxSel(includeReplaceAttrs, null);

		/**
		 * Updates href/src/etc. URLs to reflect the fragment location based upon
		 * the defined script context path
		 * 
		 * @param s
		 *            the source element or HTML to update
		 * @returns when the source is a string the result will return the source
		 *          with formatted URL references otherwise, a JQuery source object
		 *          will be returned
		 */
		function linksToAbsolute(s) {
			var c = getScriptCxtPath();
			var rel = function(p) {
				return p.indexOf('.') != 0 && p.indexOf('/') != 0 ? c + 'fake.htm' : c;
			};
			if (typeof s === 'string') {
				s = s.replace(opts.regexHrefAttrs, function(m, url) {
					return ' href="' + absolutePath(url, c) + '"';
				});
				s = s.replace(opts.regexSrcAttrs, function(m, url) {
					return ' src="' + absolutePath(url, c) + '"';
				});
				return s;
			} else {
				var $s = $(s);
				$s.find(':not([href*="://"],[href^="//"],[href^="mailto:"],[href^="#"],[href^="javascript:"],' + 
						'[src*="://"],[src^="//"],[src^="data:"])').each(function() {
					var $e = $(this);
					var a = $e.attr('href') ? 'href' : 'src';
					$e.attr(a, function(i, path) {
						if (!path) {
							return path;
						}
						return absolutePath(path, rel(path));
					});
				});
				return $s;
			}
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
		 * Generates an absolute fragment path based upon the script context path attribute
		 * 
		 * @param fragPath
		 *            the fragment path
		 */
		function absolutefragPath(fragPath) {
			var c = getScriptCxtPath();
			return absolutePath(fragPath, c);
		};

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
			if ($f.prop('id') == scriptSourceId) {
				// when the attribute is used on the current script tag then pull the
				// attribute off the script and extract the
				// fragment/include/replacement
				var fa = $f.attr(opts.fragHeadAttr);
				if (fa) {
					var fas = fa.split('=');
					if (fas.length == 2) {
						return ga(fas[0]) ? fas[1] : null;
					} else {
						throw new Error(scriptSourceId + ' has invalid atrtribute ' + 
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
			s = s + (hf ? ',' + getThxSel(fragAttrs, s) : '');
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
		 * Gets the context path used to resolve paths to fragments and URLs within
		 * href/src/etc. attributes contained in fragments
		 */
		function getScriptCxtPath() {
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
		 * Fires an event
		 * 
		 * @param ft
		 *            the function string to call
		 * @param evt
		 *            the event to fire
		 */
		function fireEvent(ft, evt) {
			try {
//				$(t).trigger({
//					type : 'load.thx.' + type,
//					thx : evt
//				});
				if (ft) {
					var f = new Func(ft);
					if (f.isValid) {
						f.run({
							event: evt
						});
					}
				}
			} catch (e) {
				log('Error in ' + ft + ' ' + (evt ? evt : '') + ': ' + e);
			}
		}

		/**
		 * Function constructor
		 * 
		 * @constructor
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
		function Func(fs, am, nn) {
			try {
				var f = !nn && typeof window[fs] === 'function' ? window[fn] : undefined;
				var a = null;
				this.isValid = typeof f === 'function';
				this.setArgs = function(nam) {
					if (this.isValid) {
						if (a && a.length > 0) {
							for (var i=0; i<a.length; i++) {
								if (nam && nam[a[i]]) {
									a[i] = nam[a[i]];
								}
							}
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
							if (a && a.length > 0) {
								if (nam) {
									this.setArgs(nam);
								}
								f.apply(thisArg, a);
							} else {
								f.call(thisArg);
							}
							return true;
						} catch (e) {
							log('Error while calling ' + fs + ' ' + amts(am)
									+ ': ' + e);
						}
					}
					return false;
				};
			} catch (e) {
				log('Error in ' + fs + ' ' + amts(am) + ': ' + e);
			}
		}

		/**
		 * {Frag} tracking mechanism to handle multiple {Frag}s
		 * 
		 * @constructor
		 */
		function FragsTrack() {
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
		 * @param $fl
		 *            the fragment loaded from source DOM element
		 */
		function Frag($fl) {
			// use the fragment value as the attribute key to use as the
			// replacement/include
			this.r = false;
			this.a = getFragAttr($fl, includeAttrs);
			if (!this.a) {
				this.a = getFragAttr($fl, replaceAttrs);
				this.r = true;
			}
			this.a = this.a ? this.a.split(opts.fragSep) : null;
			this.u = this.a && this.a.length > 0 ? $.trim(this.a[0]) : null;
			this.t = this.a && this.a.length > 1 ? $.trim(this.a[1]) : null;
			if (this.u && this.u.length > 0
					&& this.u.toLowerCase() != opts.selfRef.toLowerCase()) {
				var fileExt = script ? script.attr(opts.fragExtensionAttr) : '';
				var fragFileExt = fileExt ? fileExt.toLowerCase() == opts.inheritRef ? getFileExt(location.href)
						: fileExt
						: '';
				if (fragFileExt && this.u.indexOf('.') < 0) {
					this.u += fragFileExt;
				}
				this.u = absolutefragPath(this.u);
			} else if (this.t && this.t.length > 0) {
				this.u = opts.selfRef;
			}
			this.func = this.t ? new Func(this.t, null, true) : null;
			if (this.t) {
				var fpts = opts.regexFunc.exec(this.t);
				if (fpts) {
					this.t = fpts[0];
				}
			}
			var fso = this.t ? getFragFromSel(this.t) : null;
			this.s = fso ? fso.s : null;
			this.hf = fso ? fso.hasFragAttr : true;
			this.el = $fl;
			this.rs = null;
			this.e = null;
			this.p = function(x) {
				if (this.r) {
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
				} else {
					this.el.append(x);
				}
			};
			this.toString = function() {
				return 'Fragment -> type: '
						+ (this.r ? 'subsitution"' : 'include"') + ', URL: '
						+ this.u + ', target: ' + this.t + ', select: ' + this.s;
			};
		}

		/**
		 * {Frag} complete event issued when an individual {Frag} has completed an
		 * attempt to load
		 * 
		 * @constructor
		 * @param $s
		 *            the scope of the event
		 * @param t
		 *            the {FragsTrack} used
		 * @param f
		 *            the {Frag} the event is being issued for
		 */
		function FragCompleteEvent($s, t, f) {
			this.fragCount = t.cnt;
			this.fragCurrTotal = t.len;
			this.fragUrl = f ? f.u : undefined;
			this.fragTarget = f ? f.func && f.func.isValid ? f.func.run : f.t
					: undefined;
			this.source = f ? f.rs ? f.rs : f.el : undefined;
			this.error = f ? f.e : undefined;
			this.scope = $s;
			this.log = function() {
				log(this);
			};
			this.toFormattedString = function() {
				return '[Fragment Complete Event, fragCount: ' + this.fragCount
						+ ', fragCurrTotal: ' + this.fragCurrTotal + ', URL: '
						+ this.url + ', element: ' + this.element + ', error: '
						+ this.error + ']';
			};
		}

		/**
		 * {Frag}s complete event broadcast when an all {Frag}s in an issued batch
		 * have completed an attempt to load
		 * 
		 * @constructor
		 * @param $s
		 *            the scope of the event
		 * @param c
		 *            the number of {Frag}s where an atempt was made to load
		 * @param e
		 *            an array of errors (if any)
		 */
		function FragsCompleteEvent($s, c, e) {
			this.fragCount = c;
			this.scope = $s;
			this.errors = e;
			this.log = function() {
				log(this);
			};
			this.toFormattedString = function() {
				return '[Fragments Complete Event, fragCount: ' + this.fragCount
						+ ', errors: ' + this.e + ']';
			};
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
		 * @param func
		 *            the callback function that will be called when all fragments have
		 *            been loaded (parameters: the original root element, the number of
		 *            fragments processed)
		 */
		this.loadFragments = function(selector, func) {
			var $s = $(selector);
			var t = new FragsTrack();
			function done(t, f) {
				if (t.cnt > t.len) {
					t.addError('Expected ' + t.len + ' fragments, but recieved ' + t.cnt, f);
				}
				fireEvent(scriptFragComplete, new FragCompleteEvent($s, t, f));
				if (t.cnt >= t.len) {
					if (typeof func === 'function') {
						func($s, t.cnt, t.getErrors());
					}
					fireEvent(scriptFragsComplete, new FragsCompleteEvent($s,
							t.cnt, t.getErrors()));
				}
			}
			function hndlFunc(f, cb, r, status, xhr, e) {
				if (f.func && f.func.isValid) {
					f.func.run({
						handle : {
							source : f.el,
							type : f.r ? 'replace' : 'include',
							data : r,
							status : status,
							xhr : xhr,
							error : e,
							process : function(x) {
								f.p(x ? x : r);
							}
						}
					});
					cb(null, f);
					return true;
				}
				return false;
			}
			var lcont = function(f, cb, r, status, xhr) {
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
				var doScript = function($p, $x) {
					if (!$p.is($x)) {
						$x.remove();
					}
					var url = $x.prop('src');
					if (url && url.length > 0) {
						t.len++;
						var sf = new Frag($x);
						sf.u = url;
						sf.t = $p;
						if (url.indexOf('data:text/javascript,') >= 0) {
							$('<script>' + url.substr('data:text/javascript,'.length) + 
									'</script>').appendTo($p);
							cb(null, sf);
							return;
						}
						$.getScript(url).done(function(data, textStatus, jqxhr) {
							if (jqxhr.status != 200) {
								t.addError(jqxhr.status + ': ' + 
										textStatus + ' URL="' + url + '"', sf);
							}
							cb($p, sf);
						}).fail(function(xhr, ts, e) {
							t.addError('Error at ' + sf.toString() + ': ' + 
									ts + '- ' + e, sf);
							cb(null, sf);
						});
					}
				};
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
					var ha = getFragAttr($hr, fragAttrs);
					if (ha && ha == f.t) {
						hr = hr.replace(/div/g, 'head');
						hr = r.substring(r.indexOf(hr) + hr.length, r.indexOf(he));
						var $h = $('head');
						hr = linksToAbsolute(hr);
						var scs = hr.match(opts.regexScriptTags);
						if (scs) {
							$.each(scs, function(i, sc) {
								doScript($h, $(sc));
								hr = hr.replace(sc, '');
							});
						}
						$h.append(hr);
						cb($h, f);
						return;
					}
				}
				// process non-head tags the normal JQuery way
				// (links need to be converted via raw results to
				// prevent warnings)
				var $c = $('<results>' + linksToAbsolute(r) + '</results>');
				var fs = $c.find(f.s);
				if (fs.length <= 0) {
					t.addError('No matching results for ' + f.toString()
							+ ' in\n' + r, f);
					cb(null, f);
					return;
				}
				fs.each(function() {
					var $cf = $(this);
					$cf.find('script').each(function() {
						doScript($cf, $(this));
					});
					if (!$cf.is('script')) {
						f.p($cf);
					} else {
						doScript($cf, $cf);
					}
					cb($cf, f);
				});
			};
			var lfi = null;
			var lfg = function($fl, cb) {
				var f = null;
				try {
					f = new Frag($fl);
					cb = typeof cb === 'function' ? cb : function(){};
					if (!f.u) {
						t.addError('Invalid URL for ' + f.toString(), f);
						cb(null, f);
						return;
					}
					if (t.addFrag(f)) {
						var done = function(r, status, xhr) {
							var frgs = t.getFrags(f.u);
							for (var i=0; i<frgs.length; i++) {
								lcont(frgs[i], cb, r, status, xhr);
							}
						};
						if (f.u == opts.selfRef) {
							done($('html').html(), 'same-template');
							return;
						}
						// use get vs load w/content target for more granular control
						$.ajax({
							url: f.u
						}).done(done).fail(function(xhr, ts, e) {
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
				return f;
			};
			var lfc = null;
			lfc = function($fl) {
				lfg($fl, function($cf, f) {
					t.cnt++;
					// process any nested fragments
					if ($cf) {
						lfi($cf, f);
					} else {
						done(t, f);
					}
				});
			};
			// IE strips any attributes in the HEAD tag so we use the thymus script
			// attribute to capture HEAD includes/replacements (if defined)
			var $head = $('head');
			if ($head && $head.length > 0) {
				var pf = getFragAttr($head, includeAttrs);
				if (!pf) {
					pf = getFragAttr($head, replaceAttrs);
				}
				if (!pf) {
					t.len++;
					lfc(script);
				}
			}
			// recursivly process all the includes/replacements
			lfi = function($f, f) {
				var $fs = $f.find(fragSelector);
				t.len += $fs.length;
				$fs.each(function() {
					lfc($(this));
				});
				if (t.cnt > 0 || ($fs.length == 0 && t.cnt == 0)) {
					done(t, f);
				}
			};
			// make initial call
			lfi($s);
		};
	}

	/**
	 * Initializes thymus.js plug-in and loads any fragments within the page
	 * 
	 * @param jqUrl
	 *            the URL used to load JQuery
	 */
	function init(jqUrl) {
		$.fn.thymus = function(a, options) {
			var o = $.extend({}, $.fn.thymus.defaults, options);
			thx = new FragCtx(jqUrl, o);
			return this.each(function() {
				if (a === 'load.fragments') {
					thx.loadFragments(this, function($s, fc, es) {
						// respect any named anchors
						var i = location.href.lastIndexOf('#');
						if (i >= 0) {
							location.href = location.href.substring(i);
						}
					});
				} else if (a === 'nav.href') {
					// Navigates to the specified URL (converting it to it's
					// absolute counterpart when needed)
					if (o.path) {
						var url = absolutefragPath(o.path);
						document.location.href = url;
					} else {
						log('No path supplied for: thymus(' + a + ', {path: ???})');
					}
				}
			});
		};
		$.fn.thymus.defaults = {
			selfRef : 'this',
			inheritRef : 'inherit',
			fragSep : '::',
			fragExtensionAttr : 'data-thx-frag-extension',
			fragAttr : 'data-thx-fragment',
			includeAttr : 'data-thx-include',
			replaceAttr : 'data-thx-replace',
			contextPathAttr : 'data-thx-context-path',
			fragCompleteAttr : 'data-thx-onfragcomplete',
			fragsCompleteAttr : 'data-thx-onfragscomplete',
			fragHeadAttr : 'data-thx-head-frag',
			thymeleafFragAttr : 'th\\:fragment',
			thymeleafFragAltAttr : 'data-th-fragment',
			thymeleafIncludeAttr : 'th\\:include',
			thymeleafIncludeAltAttr : 'data-th-include',
			thymeleafReplaceAttr : 'th\\:replace',
			thymeleafReplaceAltAttr : 'data-th-replace',
			regexFragName : /^[_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*$/,
			regexFunc : /.+?\(/i,
			regexFileExtension : /[^\/?#]+(?=$|[?#])/,
			regexScriptTags : /<script[^>]*>([\\S\\s]*?)<\/script>/img,
			regexHrefAttrs : /\shref=[\"|'](.*?)[\"|']/ig,
			regexSrcAttrs : /\ssrc=[\"|'](.*?)[\"|']/ig,
			regexIanaProtocol : /^(([a-z]+)?:|\/\/|#)/i,
			regexFileTransForProtocolRelative : /^(file:?)/i,
			regexAbsPath : /^\/|(\/[^\/]*|[^\/]+)$/g,
			regexFuncArgs : /(('|").*?('|")|[^('|"),\s]+)(?=\s*,|\s*$)/g
		};
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
		var d = getPreLoadAttr(FRAGS_LOAD_DEFERRED_LOAD_ATTR);
		if (!d) {
			$('html').thymus('load.fragments');
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
			e = document.getElementById(scriptSourceId);
			if (!e) {
				throw new Error('Missing script ID: ' + scriptSourceId);
			}
		}
		var r = e ? e.getAttribute ? e.getAttribute(a) : e.attributes[a].nodeValue : null;
		return d && !r ? d : r;
	}

	// verfifies/loads JQuery using the URL (if needed)
	var jqueryLoaded = typeof $ === 'function';
	if (!jqueryLoaded) {
		(function(jqUrl, cb) {
			if (typeof $ === 'undefined') {
				var s = document.createElement('script');
				s.src = urlAdjust(jqUrl);
				var head = document.getElementsByTagName('head')[0];
				s.onload = s.onreadystatechange = function() {
					if (!jqueryLoaded
							&& (!this.readyState || this.readyState == 'loaded' || 
									this.readyState == 'complete')) {
						try {
							jqueryLoaded = true;
							if (typeof cb === 'function') {
								cb(jqUrl);
							}
						} finally {
							// script tag disposal
							s.onload = s.onreadystatechange = null;
							head.removeChild(s);
						}
					}
				};
				head.appendChild(s);
			} else {
				jqueryLoaded = true;
				if (typeof cb === 'function') {
					cb(jqUrl);
				}
			}
		})(getPreLoadAttr(JQUERY_URL_ATTR,
				JQUERY_DEFAULT_URL), function(jqUrl) {
			// caching should be disabled for ajax responses
			$.ajaxSetup({
				cache : false
			});
			if (document.readyState !== 'complete') {
				$(document).ready(function() {
					init(jqUrl);
				});
			} else {
				init(jqUrl);
			}
		});
	}
})();