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
Thymus.DEFAULT_FRAG_ATTR = 'data-th-fragment';
Thymus.DEFAULT_INC_ATTR = 'data-th-include';
Thymus.DEFAULT_SUB_ATTR = 'data-th-substitute';
Thymus.DEFAULT_SEP = '::';
Thymus.ID = 'thymusScript';
Thymus.CONTEXT_PATH_ATTR = 'data-th-context-path';
Thymus.JQUERY_URL_ATTR = 'data-th-jquery-url';
Thymus.INIT_ATTR = 'data-th-onfragsloaded';
Thymus.FRAG_HEAD_ATTR = 'data-th-head-frag';
Thymus.FRAG_ATTR = 'data-th-fragment-attr';
Thymus.FRAG_INC_ATTR = 'data-th-include-attr';
Thymus.FRAG_SUB_ATTR = 'data-th-substitute-attr';
Thymus.FRAG_SEP_ATTR = 'data-th-separator';
Thymus.FRAG_EXT_ATTR = 'data-th-frag-extension';
Thymus.ENGINE_ATTR = 'data-th-engine';
Thymus.THYMELEAF = 'thymeleaf';
Thymus.THYMELEAF_FRAG_ATTR = 'th\\:fragment';
Thymus.THYMELEAF_INC_ATTR = 'th\\:include';
Thymus.THYMELEAF_SUB_ATTR = 'th\\:substituteby';
Thymus.ENGINE = null;
Thymus.FRAG = null;
Thymus.FRAG_INC = null;
Thymus.FRAG_SUB = null;
Thymus.FRAG_TO_SELECT = null;
Thymus.FRAG_SEP = null;
Thymus.FRAG_EXT = null;
Thymus.PROTOCOL_FOR_FILE = null;
Thymus.SCRIPT_INIT = null;
Thymus.jqueryLoaded = false;
Thymus.pageLoaded = false;
Thymus.fragmentsLoaded = false;
Thymus.ieVersion = 0;
Thymus.ieNoHeadStripVer = 9;
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
 * Retrieves the JQuery selector for capturing a fragments content
 */
Thymus.getFragFromSel = function(v) {
	return '[' + Thymus.FRAG + '="' + $.trim(v) + '"]';
};
/**
 * Gets a file extension from a URL
 */
Thymus.getFile = function(url) {
	var f = '';
	if (url) {
		var fs = url.match(/[^\/?#]+(?=$|[?#])/);
		if (fs && fs.length > 0) {
			f = fs[0];
		}
	}
	return f;
};
/**
 * Gets a file extension from a URL
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
 * Extracts a fragment/include/substitution attribute from a given element. When
 * the element is the thymus script then an attempt will be made to pull
 * the <code>Thymus.FRAG_HEAD_ATTR</code> attribute off the script and
 * extract the specified attribute from that value.
 * 
 * @param $f
 *            the element to extract the attribute from
 * @param attr
 *            the attribute to extract
 */
Thymus.getFragAttr = function($f, attr) {
	if ($f.prop('id') == Thymus.ID) {
		// when the attribute is used on the current script tag then pull the
		// attribute off the script and extract the
		// fragment/include/substitution
		var fa = $f.attr(Thymus.FRAG_HEAD_ATTR);
		if (fa) {
			var fas = fa.split('=');
			if (fas.length == 2) {
				return attr.replace('\\', '') == fas[0] ? fas[1] : null;
			} else {
				throw new Error(Thymus.ID + ' has invalid atrtribute ' + 
						Thymus.FRAG_HEAD_ATTR + '="' + 
						fa + '" for ' + attr);
			}
		}
	} else {
		return $f.attr(attr.replace('\\', ''));
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
	var Track = function() {
		this.cnt = 0;
		this.len = 0;
		var e = '';
		this.addError = function(em) {
			e += (e.length > 0 ? ',' : '') + em;
			return e;
		};
		this.getError = function() {
			return e;
		};
	};
	var t = new Track();
	var ext = Thymus.FRAG_EXT ? Thymus.FRAG_EXT : Thymus.getFileExtension(location.href);
	var Frag = function($fl) {
		// use the fragment value as the attribute key to use as the replacement/include
		this.r = false;
		this.a = Thymus.getFragAttr($fl, Thymus.FRAG_INC);
		if (!this.a) {
			this.a = Thymus.getFragAttr($fl, Thymus.FRAG_SUB);
			this.r = true;
		}
		this.a = this.a ? this.a.split(Thymus.FRAG_SEP) : null;
		this.u = this.a && this.a.length > 0 ? $.trim(this.a[0]) : null;
		this.t = this.a && this.a.length > 1 ? $.trim(this.a[1]) : null;
		if (ext && this.u && this.u.indexOf('.') < 0) {
			this.u += ext;
		}
		if (this.u && this.u.length > 0) {
			this.u = Thymus.absolutefragPath(this.u);
		}
		this.s = this.t ? Thymus.getFragFromSel(this.t) : null;// + ' > *';
		this.toString = function() {
			return '--> Fragment ' + (this.r ? 'subsitution' : 'include')
					+ ' | url: ' + this.u + ' | target: ' + this.t
					+ ' | search: ' + this.s + ' :: ';
		};
	};
	var done = function(t) {
		if (t.cnt == t.len) {
			if (t.getError().length > 0) {
				throw new Error(t.getError());
			}
			if (typeof func === 'function') {
				func($s, t.cnt);
			}
		} else if (t.cnt > t.len) {
			throw new Error('Expected ' + t.len + ' fragments, but recieved ' + t.cnt);
		}
	};
	var lfi = null;
//	var lfl = function($fl, func) {
//		var f = new Frag($fl);
//		$fl.load(f.u + ' ' + f.s, function(rt, stat, req) {
//			if (stat != 'success') {
//				alert('Unable to load (' + stat + '): ' + f.u + f.s);
//				return;
//			}
//			t.cnt++;
//			var $ne = $fl.find(f.s);
//			if ($ne.length > 0) {
//				if (f.r) {
//					$fl.replaceWith($ne);
//				}
//				// process nested fragments
//				lfi($ne);
//			}
//		});
//		return f;
//	};
	var lfg = function($fl, cb) {
		var f = new Frag($fl);
		cb = typeof cb === 'function' ? cb : function(){};
		if (!f.u) {
			t.addError('Invalid URL for ' + f.toString());
			cb(null, f);
			return;
		}
		$.get(f.u, null, function(r) {
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
				var ha = $hr.attr(Thymus.FRAG.replace('\\', ''));
				if (ha && ha == f.t) {
					hr = hr.replace(/div/g, 'head');
					hr = r.substring(r.indexOf(hr) + hr.length, r.indexOf(he));
					// TODO : strip out script tags and load them dynamically 
					// to capture completion/error/etc.
					// /<script[^>]*>([\\S\\s]*?)<\/script>/img
					var $h = $('head');
					hr = Thymus.linksToAbsolute(hr);
					$h.append(hr);
					cb($h, f);
					return;
				}
			}
			// process non-head tags the normal JQuery way
			// (links need to be converted via raw results to
			// prevent warnings)
			var $c = $(Thymus.linksToAbsolute(r));
			var fs = $c.filter(f.s);
			if (fs.length <= 0) {
				t.addError('No matching results for ' + f.toString()
						+ ' in\n' + r);
				cb(null, f);
				return;
			}
			fs.each(function() {
				var $cf = $(this);
				//Thymus.linksToAbsolute($cf);
				var doScript = function($x) {
					if (!$cf.is($x)) {
						$x.remove();
					}
					var url = $x.prop('src');
					if (url && url.length > 0) {
						t.len++;
						$.getScript(url, function(data, textStatus, jqxhr) {
							cb($cf, f);
							if (jqxhr.status != 200) {
								throw new Error(jqxhr.status + ': ' + 
										textStatus + ' URL="' + url + '"');
							}
						});
					}
				};
				$cf.find('script').each(function() {
					doScript($(this));
				});
				if (!$cf.is('script')) {
					if (f.r) {
						$fl.replaceWith($cf);
					} else {
						$fl.append($cf);
					}
				} else {
					doScript($cf);
				}
				cb($cf, f);
			});
		}, 'html').fail(function(jqXhr, ts, e) {
			t.addError('Error at ' + f.toString() + ': ' + ts + '- ' + e);
		});
		return f;
	};
	var lfc = null;
	lfc = function($fl) {
		lfg($fl, function($cf, f) {
			t.cnt++;
			// process any nested fragments
			if ($cf) {
				lfi($cf);
			} else {
				done(t);
			}
		});
		//lfl($fl, new Frag($fl), t);
	};
	// IE strips any attributes in the HEAD tag so we use the thymus script
	// attribute to capture HEAD includes/substitutions (if defined)
	var $head = $('head');
	if ($head && $head.length > 0) {
		var pf = $head.attr(Thymus.FRAG_INC.replace('\\', ''));
		if (!pf) {
			pf = $head.attr(Thymus.FRAG_SUB.replace('\\', ''));
		}
		if (!pf) {
			t.len++;
			lfc(Thymus.getScript());
		}
	}
	// recursivly process all the includes/substitutions
	lfi = function($f) {
		var $fs = $f.find(Thymus.FRAG_TO_SELECT);
		t.len += $fs.length;
		$fs.each(function() {
			lfc($(this));
		});
		done(t);
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
		s = s.replace(/\shref=[\"|'](.*?)[\"|']/ig, function(m, url) {
			return ' href="' + Thymus.absolutePath(url, c) + '"';
		});
		s = s.replace(/\ssrc=[\"|'](.*?)[\"|']/ig, function(m, url) {
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
	if (/^(([a-z]+)?:|\/\/|#)/i.test(relPath)) {
		return Thymus.urlAdjust(relPath);
	}
	absPath = absPath ? absPath.replace(/^\/|(\/[^\/]*|[^\/]+)$/g, '') : '';
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
Thymus.startUp = function() {
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
		Thymus.SCRIPT_INIT = getAttr(sh, Thymus.INIT_ATTR);
		Thymus.ENGINE = getAttr(sh, Thymus.ENGINE_ATTR);
		Thymus.FRAG = getAttr(sh, Thymus.FRAG_ATTR,
				Thymus.ENGINE == Thymus.THYMELEAF ? Thymus.THYMELEAF_FRAG_ATTR
						: Thymus.DEFAULT_FRAG_ATTR);
		Thymus.FRAG_INC = getAttr(sh, Thymus.FRAG_INC_ATTR,
				Thymus.ENGINE == Thymus.THYMELEAF ? Thymus.THYMELEAF_INC_ATTR
						: Thymus.DEFAULT_INC_ATTR);
		Thymus.FRAG_SUB = getAttr(sh, Thymus.FRAG_SUB_ATTR,
				Thymus.ENGINE == Thymus.THYMELEAF ? Thymus.THYMELEAF_SUB_ATTR
						: Thymus.DEFAULT_SUB_ATTR);
		Thymus.FRAG_SEP = getAttr(sh, Thymus.FRAG_SEP_ATTR, Thymus.DEFAULT_SEP);
		Thymus.FRAG_EXT = getAttr(sh, Thymus.FRAG_EXT_ATTR);
		Thymus.FRAG_TO_SELECT = '[' + Thymus.FRAG_INC + '],[' + 
			Thymus.FRAG_SUB + ']';
		Thymus.PROTOCOL_FOR_FILE = /^(file:?)/i.test(location.protocol) ? 'http:' : null;
		with (document.createElement('b')) {
			id = 4;
			while (innerHTML = '<!--[if gt IE ' + ++id + ']>1<![endif]-->', innerHTML > 0);
			Thymus.ieVersion = id > 5 ? +id : 0;
		}
		return url;
	}
	Thymus.loadJQuery(initStriptValues(), function() {
		//caching should be disabled for ajax responses
		$.ajaxSetup({
			cache : false
		});
		var load = function() {
			Thymus.loadFragments('html', function($s, cnt) {
				if (Thymus.SCRIPT_INIT) {
					// now that all of the includes/substitutions have been
					// loaded we need to execute any inititialization that may
					// be defined in the script definition of the page
					var fa = Thymus.SCRIPT_INIT.split('(');
					var fn = fa.shift();
					if (typeof window[fn] === 'function') {
						var f = window[fn];
						if (fa.length > 0) {
							var p = fa.join('(');
							f.apply(undefined, p.split(','));
						} else {
							f();
						}
					}

				}
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
Thymus.startUp();
