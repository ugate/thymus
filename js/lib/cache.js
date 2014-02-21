	/**
	 * JQuery node cache that utilizes <code>JQuery.add</code> with
	 * <code>null</code> handling
	 * 
	 * @constructor
	 * @param c
	 *            the optional initial cache element
	 */
	function JqCache(c) {
		var $$ = this;
		var $c = c;
		$$.cache = function($x) {
			if ($x instanceof $) {
				if ($c instanceof $) {
					$c = $c.add($x);
				} else {
					$c = $x;
				}
			}
			return $c;
		};
		$$.clear = function(n) {
			$c = null;
			return n ? $$ : null;
		};
	}

	/**
	 * A {JqCache} variant used for <code>JQuery.append</code>,
	 * <code>JQuery.replace</code> or any other manipulation operation
	 * 
	 * @constructor
	 * @param $dc
	 *            the optional initial destination cache element
	 * @param r
	 *            the optional initial origin/result cache element or text
	 */
	function ManipCache($dc, r) {
		var $$ = this;
		var dc = new JqCache($dc);
		var rc = new JqCache(r);
		$$.detachCache = new JqCache();
		$$.rsltCache = function(r) {
			return rc.cache(r instanceof $ ? r
					: typeof r === 'object' ? $(r) : r);
		};
		$$.destCache = function($dc) {
			return dc.cache($dc);
		};
		$$.manip = function(ia, alt) {
			var $d = dc.cache();
			var $r = rc.cache();
			if ($d && $r) {
				// don't use wrapper in destinations
				$r = $r.is(DFTL_RSLT_NAME) ? $r.contents() : $r;
				var f = typeof alt === 'function' ? function(i, r) {
					return alt($d, $r, i, this);
				} : null;
				if (typeof ia === 'function') {
					ia($d, $r);
				} else if (ia) {
					$d.append(f ? f : alt ? alt : $r);
				} else {
					// detach in order to keep event propigation
					var drwArgs = f ? f : alt ? alt : $r;
					if ($.isArray(drwArgs)) {
						detachReplaceWith.apply($d, drwArgs);
					} else {
						detachReplaceWith.call($d, drwArgs);
					}
					$$.detachCache.cache($d);
				}
				return $r;
			}
			return null;
		};
		$$.clear = function(n) {
			dc = dc.clear(n);
			rc = rc.clear(n);
			return n ? $$ : null;
		};
	}

	/**
	 * A {ManipCache} variant used for <code>JQuery.append</code> or
	 * <code>JQuery.replaceWith</code> caching that span separate <b>node</b>
	 * and <b>attribute</b> scopes
	 * 
	 * @constructor
	 * @param ia
	 *            true for append, false for replace
	 * @param ndc
	 *            the optional node destination cache
	 * @param nrc
	 *            the optional node origin/result cache
	 * @param adc
	 *            the optional attribute destination cache
	 * @param arc
	 *            the optional attribute origin/result cache
	 */
	function ManipsCache(ia, ndc, nrc, adc, arc) {
		var $$ = this;
		var nc = new ManipCache(ndc, nrc);
		var ac = new ManipCache(adc, arc);
		var dc = null;
		var altnc = [];
		var rc = null;
		function alt(arr, x, fx) {
			if (arr && x && typeof fx === 'function') {
				// result unique to destination
				var uc = {
					x : x,
					fx : fx
				};
				arr.push(uc);
			}
		}
		function has(arr, x) {
			if (x && x.length > 0) {
				for (var i = 0; i < arr.length; i++) {
					var m = arr[i].x;
					if (m.is(x)) {
						return arr[i].fx;
					}
				}
			}
			return null;
		}
		$$.rsltCache = function(rc) {
			return nc.rsltCache(rc);
		};
		$$.destCache = function($dc, altr) {
			alt(altnc, $dc, altr);
			return nc.destCache($dc);
		};
		$$.detachCache = function() {
			return dc;
		};
		$$.manips = function(n) {
			rc = rc ? rc : new JqCache();
			// when there are no alternatives we can perform the normal
			// append/replaceWith operations- otherwise, we need to handle the
			// results individually in order to apply the destination specific
			// results
			var $r = rc.cache(nc.manip(ia, altnc.length > 0 ? function($ds,
					$rs, i, d) {
				var $d = $(d);
				var fx = has(altnc, $d);
				if (fx) {
					// let the alternative function determine results
					return fx($d, $rs);
				} else {
					// TODO : should be a way to tell JQuery append/replaceWith
					// not to clone- we need to always clone nodes to prevent
					// movement to other destinations (JQuery already does this
					// with append/replaceWith, except for the last node)
					return $rs.clone(true, true);
				}
			} : null));
			dc = nc.detachCache;
			rc = rc.clear(n);
			$$.clear(n);
			return $r;
		};
		$$.clear = function(n) {
			nc = nc ? nc.clear(n) : n ? new ManipCache() : null;
			ac = ac ? ac.clear(n) : n ? new ManipCache() : null;
			rc = rc ? rc.clear(n) : n ? new ManipCache() : null;
			return n ? $$ : null;
		};
	}

	/**
	 * A {ManipsCache} variant used for <code>JQuery.append</code> and
	 * <code>JQuery.replaceWith</code> operations caching
	 * 
	 * @constructor
	 */
	function AppReplCache() {
		var $$ = this;
		var ach = new ManipsCache(true);
		var rch = new ManipsCache(false);
		var dc = null;
		var ich = [];
		function manips($r, c, n) {
			return $r ? $r.add(c.manips(n)) : c.manips(n);
		}
		$$.detachCache = function() {
			return dc;
		};
		$$.rsltCache = function(ia, rc, solo) {
			if (solo) {
				// the result is destination specific
				var rdc = new ManipsCache(ia);
				rdc.rsltCache(rc);
				ich[ich.length] = rdc;
				return rdc.rsltCache();
			} else {
				return (ia ? ach : rch).rsltCache(rc);
			}
		};
		$$.destCache = function(ia, $dc, altr, rc) {
			if (rc) {
				for (var i = 0; i < ich.length; i++) {
					if (rc.is(ich[i].rsltCache())) {
						return ich[i].destCache($dc, altr);
					}
				}
			} else {
				return (ia ? ach : rch).destCache($dc, altr);
			}
		};
		$$.appendReplaceAll = function(n) {
			var $r = null;
			for (var i = 0; i < ich.length; i++) {
				$r = manips($r, ich[i], n);
			}
			$r = manips($r, ach, n);
			$r = manips($r, rch, n);
			dc = rch.detachCache();
			$$.clear(n);
			return $r;
		};
		$$.clear = function(n) {
			ach = ach ? ach.clear(n) : n ? new ManipsCache(true) : null;
			rch = rch ? rch.clear(n) : n ? new ManipsCache(false) : null;
			ich = n ? [] : null;
			return n ? $$ : null;
		};
	}

	/**
	 * Detach version of JQuery's replaceWith
	 */
	function detachReplaceWith() {
		var	args = jQuery.map(this, function(elem) {
			return [ elem.nextSibling, elem.parentNode ];
		}), i = 0;
		this.domManip(arguments, function(elem) {
			var next = args[i++], parent = args[i++];
			if (parent) {
				if (next && next.parentNode !== parent) {
					next = this.nextSibling;
				}
				jQuery(this).detach();
				parent.insertBefore(elem, next);
			}
		}, true);
		return i ? this : this.detach();
	}