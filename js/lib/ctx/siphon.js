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