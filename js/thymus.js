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
var Thymus = {};
Thymus.JQUERY_DEFAULT_URL = '//code.jquery.com/jquery.min.js';
Thymus.DEFAULT_FRAG_ATTR = 'data-thx-fragment';
Thymus.DEFAULT_INC_ATTR = 'data-thx-include';
Thymus.DEFAULT_REP_ATTR = 'data-thx-replace';
Thymus.DEFAULT_SEP = '::';
Thymus.ID = 'thymusScript';
Thymus.SELF = 'this';
Thymus.CONTEXT_PATH_ATTR = 'data-thx-context-path';
Thymus.JQUERY_URL_ATTR = 'data-thx-jquery-url';
Thymus.FRAG_COMPLETE_ATTR = 'data-thx-onfragcomplete';
Thymus.FRAGS_COMPLETE_ATTR = 'data-thx-onfragscomplete';
Thymus.FRAG_HEAD_ATTR = 'data-thx-head-frag';
Thymus.FRAG_ATTR = 'data-thx-fragment-attr';
Thymus.FRAG_INC_ATTR = 'data-thx-include-attr';
Thymus.FRAG_REP_ATTR = 'data-thx-replace-attr';
Thymus.FRAG_SEP_ATTR = 'data-thx-separator';
Thymus.FRAG_EXT_ATTR = 'data-thx-frag-extension';
Thymus.THYMELEAF_FRAG_ATTR = 'th\\:fragment';
Thymus.THYMELEAF_INC_ATTR = 'th\\:include';
Thymus.THYMELEAF_REP_ATTR = 'th\\:replace';
Thymus.THYMELEAF_FRAG_ATTR_ALT = 'data-th-fragment';
Thymus.THYMELEAF_INC_ATTR_ALT = 'data-th-include';
Thymus.THYMELEAF_REP_ATTR_ALT = 'data-th-replace';
Thymus.jqueryLoaded = false;
Thymus.pageLoaded = false;
Thymus.fragmentsLoaded = false;
Thymus.EVENT_NAME = 'event';
Thymus.ieVersion = 0;
Thymus.ieNoHeadStripVer = 9;
Thymus.REGEX_UNI = /^[_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*$/;
Thymus.REGEX_FUNC = /.+?\(/i;
Thymus.REGEX_EXTENSION = /[^\/?#]+(?=$|[?#])/;
Thymus.REGEX_SCRIPTS = /<script[^>]*>([\\S\\s]*?)<\/script>/img;
Thymus.REGEX_HREF = /\shref=[\"|'](.*?)[\"|']/ig;
Thymus.REGEX_SRC = /\ssrc=[\"|'](.*?)[\"|']/ig;
Thymus.REGEX_PROTOCOL = /^(([a-z]+)?:|\/\/|#)/i;
Thymus.REGEX_PROTOCOL_FILE = /^(file:?)/i;
Thymus.REGEX_ROOT_PATH = /^\/|(\/[^\/]*|[^\/]+)$/g;
Thymus.REGEX_ARGS = /(('|").*?('|")|[^('|"),\s]+)(?=\s*,|\s*$)/g;
/**
 * Gets a JQuery handle to the current script
 */
Thymus.getScript = function() {
	return $('#' + Thymus.ID);
};
/**
 * Gets an attribute of the current script
 * 
 * @param attr
 *            the attribute to extract
 */
Thymus.getScriptAttr = function(attr) {
	if (!attr) {
		return null;
	}
	var $s = Thymus.getScript();
	if ($s && $s.length > 0) {
		return $s.attr(attr);
	}
};
/**
 * Gets the context path used to resolve paths to fragments and URLs within
 * href/src/etc. attributes contained in fragments
 */
Thymus.getScriptContextPath = function() {
	var c = Thymus.getScriptAttr(Thymus.CONTEXT_PATH_ATTR);
	if (!c) {
		c = '/';
	}
	// capture the absolute URL relative to the defined context path attribute
	// value
	c = Thymus.absolutePath(c, window.location.href);
	c += c.lastIndexOf('/') != c.length - 1 ? '/' : '';
	return c;
};
/**
 * Gets a template JQuery selector
 * 
 * @param a
 *            the of array of template attributes (matches any)
 * @param v
 *            the optional attribute value to match in the array
 * @returns JQuery selector
 */
Thymus.getThxSel = function(a, v) {
	var r = '';
	var as = $.isArray(a) ? a : [ a ];
	for ( var i = 0; i < as.length; i++) {
		r += (i > 0 ? ',' : '') + '[' + as[i] + (v ? '="' + v + '"' : '') + ']';
	}
	return r;
};
/**
 * Gets an include/replace JQuery selector
 * 
 * @returns JQuery selector
 */
Thymus.getIncRepSel = function() {
	return Thymus.getThxSel(Thymus.INC_REP_ATTRS);
};
/**
 * Retrieves the JQuery selector for capturing a fragments content
 * 
 * @param v
 *            the value to get the selector for
 * @returns JQuery selector
 */
Thymus.getFragFromSel = function(v) {
	var s = $.trim(v);
	var hf = s && Thymus.REGEX_UNI.test(s);
	s = s + (hf ? ','
		+ Thymus.getThxSel(Thymus.FRAG_ATTRS, s) : '');
	return {
		s : s,
		hasFrag : hf
	};
};
/**
 * Gets a file name
 * 
 * @param url
 *            the URL to get the file file name from
 * @returns the file name for the supplied URL (or empty when not present)
 */
Thymus.getFile = function(url) {
	var f = '';
	if (url) {
		var fs = url.match(Thymus.REGEX_EXTENSION);
		if (fs && fs.length > 0) {
			f = fs[0];
		}
	}
	return f;
};
/**
 * Gets a file extension from a URL
 * 
 * @param url
 *            the URL to get the file extension from
 * @returns the file extension for the supplied URL (or empty when not present)
 */
Thymus.getFileExtension = function(url) {
	var x = Thymus.getFile(url);
	if (x) {
		x = x.split('.');
		if (x.length > 1) {
			x = '.' + x[x.length - 1];
		}
	}
	return x;
};
/**
 * Extracts a fragment/include/replacement attribute from a given element. When
 * the element is the thymus script then an attempt will be made to pull
 * the <code>Thymus.FRAG_HEAD_ATTR</code> attribute off the script and
 * extract the specified attribute from that value.
 * 
 * @param $f
 *            the element to extract the attribute from
 * @param attr
 *            the attribute to extract
 */
Thymus.getFragAttr = function($f, attrs) {
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
	if ($f.prop('id') == Thymus.ID) {
		// when the attribute is used on the current script tag then pull the
		// attribute off the script and extract the
		// fragment/include/replacement
		var fa = $f.attr(Thymus.FRAG_HEAD_ATTR);
		if (fa) {
			var fas = fa.split('=');
			if (fas.length == 2) {
				return ga(fas[0]) ? fas[1] : null;
			} else {
				throw new Error(Thymus.ID + ' has invalid atrtribute ' + 
						Thymus.FRAG_HEAD_ATTR + '="' + 
						fa + '" for ' + attr);
			}
		}
	} else {
		return ga();
	}
};
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
Thymus.loadFragments = function(selector, func) {
	var $s = $(selector);
	var ext = Thymus.FRAG_EXT ? Thymus.FRAG_EXT : Thymus.getFileExtension(location.href);
	var Frag = function($fl) {
		// use the fragment value as the attribute key to use as the replacement/include
		this.r = false;
		this.a = Thymus.getFragAttr($fl, Thymus.INC_ATTRS);
		if (!this.a) {
			this.a = Thymus.getFragAttr($fl, Thymus.REP_ATTRS);
			this.r = true;
		}
		this.a = this.a ? this.a.split(Thymus.FRAG_SEP) : null;
		this.u = this.a && this.a.length > 0 ? $.trim(this.a[0]) : null;
		this.t = this.a && this.a.length > 1 ? $.trim(this.a[1]) : null;
		if (this.u && this.u.length > 0
				&& this.u.toLowerCase() != Thymus.SELF.toLowerCase()) {
			if (ext && this.u.indexOf('.') < 0) {
				this.u += ext;
			}
			this.u = Thymus.absolutefragPath(this.u);
		} else if (this.t && this.t.length > 0) {
			this.u = Thymus.SELF;
		}
		this.func = this.t ? new Thymus.Func(this.t) : null;
		var fso = this.t ? Thymus.getFragFromSel(this.t) : null;
		this.s = fso ? fso.s : null;
		this.hf = fso ? fso.hasFrag : true;
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
			return 'Fragment -> type: ' + (this.r ? 'subsitution"' : 'include"')
					+ ', URL: ' + this.u + ', target: ' + this.t + ', select: '
					+ this.s;
		};
	};
	var FragCompleteEvent = function(t, f) {
		this.fragCount = t.cnt;
		this.fragCurrTotal = t.len;
		this.fragUrl = f ? f.u : undefined;
		this.fragTarget = f ? f.func && f.func.isValid ? f.func.run : f.t
				: undefined;
		this.source = f ? f.rs ? f.rs : f.el : undefined;
		this.error = f ? f.e : undefined;
		this.scope = $s;
		this.log = function() {
			Thymus.log(this);
		};
		this.toFormattedString = function() {
			return '[Fragment Complete Event, fragCount: ' + this.fragCount
					+ ', fragCurrTotal: ' + this.fragCurrTotal + ', URL: '
					+ this.url + ', element: ' + this.element + ', error: '
					+ this.error + ']';
		};
	};
	var Track = function() {
		this.cnt = 0;
		this.len = 0;
		var c = [];
		this.addFrag = function(f) {
			if (c[f.u]) {
				c[f.u][c[f.u].length] = f;
				return false;
			} else {
				c[f.u] = [f];
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
	};
	var t = new Track();
	var done = function(t, f) {
		if (t.cnt > t.len) {
			t.addError('Expected ' + t.len + ' fragments, but recieved ' + t.cnt, f);
		}
		Thymus.fireEvent(Thymus.FRAG_COMPLETE, Thymus.EVENT_NAME, 
				new FragCompleteEvent(t, f));
		if (t.cnt >= t.len) {
			if (typeof func === 'function') {
				func($s, t.cnt, t.getErrors());
			}
		}
	};
	var lcont = function(f, cb, r, status, xhr) {
		if (f.func && f.func.run()) {
			cb(null, f);
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
			var ha = Thymus.getFragAttr($hr, Thymus.FRAG_ATTRS);
			if (ha && ha == f.t) {
				hr = hr.replace(/div/g, 'head');
				hr = r.substring(r.indexOf(hr) + hr.length, r.indexOf(he));
				var $h = $('head');
				hr = Thymus.linksToAbsolute(hr);
				var scs = hr.match(Thymus.REGEX_SCRIPTS);
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
		var $c = $('<results>' + Thymus.linksToAbsolute(r) + '</results>');
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
				if (f.u == Thymus.SELF) {
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
						cb(null, f);
					}
				});
			}
		} catch (e) {
			t.addError('Error at ' + f.toString() + ': ' + e, f);
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
		var pf = Thymus.getFragAttr($head, Thymus.INC_ATTRS);
		if (!pf) {
			pf = Thymus.getFragAttr($head, Thymus.REP_ATTRS);
		}
		if (!pf) {
			t.len++;
			lfc(Thymus.getScript());
		}
	}
	// recursivly process all the includes/replacements
	lfi = function($f, f) {
		var $fs = $f.find(Thymus.FRAG_TO_SELECT);
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
/**
 * Generates an absolute fragment path based upon the script context path attribute
 * 
 * @param fragPath
 *            the fragment path
 */
Thymus.absolutefragPath = function(fragPath) {
	var c = Thymus.getScriptContextPath();
	return Thymus.absolutePath(fragPath, c);
};
/**
 * Updates href/src/etc. URLs to reflect the fragment location based upon the
 * defined script context path
 * 
 * @param s
 *            the source element or HTML to update
 * @returns when the source is a string the result will return the source with
 *          formatted URL references otherwise, a JQuery source object will be
 *          returned
 */
Thymus.linksToAbsolute = function(s) {
	var c = Thymus.getScriptContextPath();
	var rel = function(p) {
		return p.indexOf('.') != 0 && p.indexOf('/') != 0 ? c + 'fake.htm' : c;
	};
	if (typeof s === 'string') {
		s = s.replace(Thymus.REGEX_HREF, function(m, url) {
			return ' href="' + Thymus.absolutePath(url, c) + '"';
		});
		s = s.replace(Thymus.REGEX_SRC, function(m, url) {
			return ' src="' + Thymus.absolutePath(url, c) + '"';
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
				return Thymus.absolutePath(path, rel(path));
			});
		});
		return $s;
	}
};
/**
 * Converts a relative path to an absolute path
 * 
 * @param relPath
 *            the relative path to convert
 * @param absPath
 *            the absolute path to do the conversion from
 * @returns the absolute path version of the relative path in relation to the
 *          provided absolute path (or just the supplied relative path when it's
 *          really an absolute path)
 */
Thymus.absolutePath = function(relPath, absPath) {
	var absStack, relStack, i, d;
	relPath = relPath || '';
	if (Thymus.REGEX_PROTOCOL.test(relPath)) {
		return Thymus.urlAdjust(relPath);
	}
	absPath = absPath ? absPath.replace(Thymus.REGEX_ROOT_PATH, '') : '';
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
};
/**
 * Navigates to the specified URL (converting it to it's absolute counterpart
 * when needed)
 * 
 * @param relPath
 *            the relative path to convert
 */
Thymus.nav = function(relPath) {
	var url = Thymus.absolutefragPath(relPath);
	document.location.href = url;
};
/**
 * Performs any URL adjustments that may be needed for proper resolution
 */
Thymus.urlAdjust = function(url) {
	return Thymus.PROTOCOL_FOR_FILE && url.indexOf('//') == 0 ? Thymus.PROTOCOL_FOR_FILE
			+ url
			: url;
};
/**
 * Function constructor
 * 
 * @param fs
 *            function string (can contain arguments)
 * @param am
 *            an associative array with the key/index relative to an argument
 *            name and the value as the argument value
 * @param nn
 *            true to exclude running of functions where the supplied function
 *            string is not surrounded in parenthesis
 * @returns {Thymus.Func}
 */
Thymus.Func = function(fs, am, nn) {
	try {
		var f = !nn && typeof window[fs] === 'function' ? window[fn] : undefined;
		var a = null;
		if (!f) {
			var fn = Thymus.REGEX_FUNC.exec(fs);
			if (fn) {
				fn = fn[0];
				if (fn) {
					a = fs.substring(fn.length, fs.lastIndexOf(')'));
				}
				fn = fs.split('(')[0];
				if (typeof window[fn] === 'function') {
					f = window[fn];
					if (a && a.length > 0) {
						a = a.match(Thymus.REGEX_ARGS);
						for (var i=0; i<a.length; i++) {
							if (am && am[a[i]]) {
								a[i] = am[a[i]];
							}
						}
					}
				}
			}
		}
		this.isValid = typeof f === 'function';
		this.run = function() {
			if (this.isValid) {
				if (a && a.length > 0) {
					f.apply(undefined, a);
				} else {
					f.call(undefined);
				}
				return true;
			}
			return false;
		};
	} catch (e) {
		var x = '';
		if (am) {
			for ( var k in am) {
				x += k + '=' + am[k] + ',';
			}
		}
		Thymus.log('Error in '
			+ fs + ' '
			+ (x.length > 1 ? '[' + x.substring(0, x.length - 2)
					+ ']' : '') + ': ' + e);
	}
};
/**
 * Fires an event
 * 
 * @param ft
 *            the function string to call
 * @param pn
 *            the parameter name to pass (optional)
 * @param pv
 *            the parameter value to pass (optional)
 */
Thymus.fireEvent = function(ft, pn, pv) {
	try {
		if (ft) {
			var am = [];
			if (pn) {
				am[pn] = pv;
			}
			var f = new Thymus.Func(ft, am);
			if (f.run) {
				f.run();
			}
		}
	} catch (e) {
		Thymus.log('Error in ' + ft + ' ' + (pv ? pv : '') + ': ' + e);
	}
};
/**
 * When available, logs a message to the console
 * 
 * @param m
 *            the message to log
 */
Thymus.log = function(m) {
	if (m && typeof window.console !== 'undefined'
			&& typeof window.console.log !== 'undefined') {
		window.console.log(Thymus.ieVersion <= 0 || Thymus.ieVersion > 9 ? m
				: typeof m.toFormattedString === 'function' ? m
						.toFormattedString() : m);
	}
};
/**
 * Loads JQuery if it hasn't been loaded yet
 * 
 * @param url
 *            the URL to the JQuery script
 * @param cb
 *            an optional callback function that will called when JQuery has
 *            been loaded
 */
Thymus.loadJQuery = function(url, cb) {
	if (typeof jQuery === 'undefined' || typeof $ === 'undefined') {
		var s = document.createElement('script');
		s.src = Thymus.urlAdjust(url);
		var head = document.getElementsByTagName('head')[0];
		s.onload = s.onreadystatechange = function() {
			if (!Thymus.jqueryLoaded
					&& (!this.readyState || this.readyState == 'loaded' || 
							this.readyState == 'complete')) {
				try {
					Thymus.jqueryLoaded = true;
					if (typeof cb === 'function') {
						cb();
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
		Thymus.jqueryLoaded = true;
		if (typeof cb === 'function') {
			cb();
		}
	}
};
/**
 * Initializes the global parameters and verfifies/loads JQuery using the URL
 * from the <code>Thymus.JQUERY_URL_ATTR</code> attribute that should
 * reside on the <code>Thymus.ID</code> script.
 */
Thymus.load = function() {
	function initStriptValues() {
		var sh = document.getElementById(Thymus.ID);
		if (!sh) {
			throw new Error('Missing script ID: ' + Thymus.ID);
		}
		function getAttr(e, a, d) {
			var r = e ? e.getAttribute ? e.getAttribute(a) : e.attributes[a].nodeValue : null;
			return d && !r ? d : r;
		}
		var url = getAttr(sh, Thymus.JQUERY_URL_ATTR, Thymus.JQUERY_DEFAULT_URL);
		Thymus.FRAGS_COMPLETE = getAttr(sh, Thymus.FRAGS_COMPLETE_ATTR);
		Thymus.FRAG_COMPLETE = getAttr(sh, Thymus.FRAG_COMPLETE_ATTR);
		Thymus.FRAG = getAttr(sh, Thymus.FRAG_ATTR, Thymus.DEFAULT_FRAG_ATTR);
		Thymus.FRAG_INC = getAttr(sh, Thymus.FRAG_INC_ATTR,
				Thymus.DEFAULT_INC_ATTR);
		Thymus.FRAG_REP = getAttr(sh, Thymus.FRAG_REP_ATTR,
				Thymus.DEFAULT_REP_ATTR);
		Thymus.FRAG_ATTRS = [ Thymus.FRAG, Thymus.THYMELEAF_FRAG_ATTR,
				Thymus.THYMELEAF_FRAG_ATTR_ALT ];
		Thymus.INC_ATTRS = [ Thymus.FRAG_INC, Thymus.THYMELEAF_INC_ATTR,
				Thymus.THYMELEAF_INC_ATTR_ALT ];
		Thymus.REP_ATTRS = [ Thymus.FRAG_REP, Thymus.THYMELEAF_REP_ATTR,
				Thymus.THYMELEAF_REP_ATTR_ALT ];
		Thymus.INC_REP_ATTRS = Thymus.INC_ATTRS.concat(Thymus.REP_ATTRS);
		Thymus.FRAG_SEP = getAttr(sh, Thymus.FRAG_SEP_ATTR, Thymus.DEFAULT_SEP);
		Thymus.FRAG_EXT = getAttr(sh, Thymus.FRAG_EXT_ATTR);
		Thymus.PROTOCOL_FOR_FILE = Thymus.REGEX_PROTOCOL_FILE
				.test(location.protocol) ? 'http:' : null;
		with (document.createElement('b')) {
			id = 4;
			while (innerHTML = '<!--[if gt IE ' + ++id + ']>1<![endif]-->', innerHTML > 0);
			Thymus.ieVersion = id > 5 ? +id : 0;
		}
		return url;
	}
	var FragsCompleteEvent = function($s, c, e) {
		this.fragCount = c;
		this.scope = $s;
		this.errors = e;
		this.log = function() {
			Thymus.log(this);
		};
		this.toFormattedString = function() {
			return '[Fragments Complete Event, fragCount: ' + this.fragCount
					+ ', errors: ' + this.e + ']';
		};
	};
	Thymus.loadJQuery(initStriptValues(), function() {
		//caching should be disabled for ajax responses
		$.ajaxSetup({
			cache : false
		});
		var load = function() {
			Thymus.FRAG_TO_SELECT = Thymus.getIncRepSel();
			Thymus.loadFragments('html', function($s, cnt, ea) {
				// now that all of the includes/replacements have been
				// loaded we need to execute any inititialization that may
				// be defined in the script definition of the page
				Thymus.fireEvent(Thymus.FRAGS_COMPLETE, Thymus.EVENT_NAME, 
						new FragsCompleteEvent($s, cnt, ea));
			});
		};
		if (document.readyState !== 'complete') {
			$(document).ready(function() {
				load();
			});
		} else {
			load();
		}
	});
};
/**
 * Start up
 */
Thymus.startUp = function() {
	if (!window.thymusDeferLoad) {
		Thymus.load();
	}
};
Thymus.startUp();