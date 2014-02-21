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