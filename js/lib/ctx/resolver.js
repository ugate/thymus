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