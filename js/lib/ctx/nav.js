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