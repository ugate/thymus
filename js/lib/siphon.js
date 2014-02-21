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