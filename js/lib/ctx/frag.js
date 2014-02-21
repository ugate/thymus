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