	/**
	 * Navigation options
	 * 
	 * @constructor
	 * @param type
	 *            the navigation type {ASYNC} or {SYNC} delimited by the
	 *            specified separator, with global inclusion type
	 * @param typeSep
	 *            the separator to extract the type of the navigation options
	 * @param target
	 *            the window target delimited by the specified separator, with
	 *            the optional window options
	 * @param targetSep
	 *            the separator to extract the target of the navigation options
	 */
	function NavOptions(type, typeSep, target, targetSep) {
		var $$ = this;
		var win = null, rcnt = 0;
		var ptype = type ? splitWithTrim(type, typeSep) : [ ASYNC ];
		$$.isAsync = ptype[0].toLowerCase() == SYNC ? false : true;
		var forceType = ptype.length > 1;
		ptype = forceType ? ptype[1].toLowerCase() : TDFLT;
		$$.target = target ? splitWithTrim(target, targetSep) : [ '_self' ];
		$$.options = $$.target.length > 1 ? $$.target[1] : undefined;
		$$.history = $$.target.length > 2 ? $$.target[2] : undefined;
		$$.target = $$.target[0];
		$$.reuseMax = 1;
		$$.reuse = function() {
			return rcnt < $$.reuseMax ? ++rcnt : 0;
		};
		$$.isFullPageSync = function() {
			return !$$.isAsync && ptype == TTRAN;
		};
		$$.type = function(nt) {
			if (!forceType && nt) {
				ptype = nt;
			}
			return ptype;
		};
		$$.getWin = function(loc, delay, timeout, dfx, lfx) {
			function opt() {
				var w = getWinHandle();
				var oe = null, ol = w.location.href, ohn = w.location.hostname;
				var $f = loc instanceof $ && loc.is('form') ? loc : null;
				if ($f) {
					$('body', w.document).append($f);
				}
				if (dfx) {
					dfx.call();
				}
				if (lfx) {
					var li = 0;
					function onOff(on) {
						// do not cache window/document handles (IE may throw
						// Permission Denied)
						var wh = getWinHandle();
						var $t = $f || $(wh);
						var e = null;
						if (li == 0) {
							// TODO : for some reason Linux wont fire unload (tested on chrome)
							e = ieVersion > 0 || isLinux ? 'ready' : $f ? 'submit' : 'unload';
						} else if (li == 1) {
							e = 'ready'; //e = ieVersion > 0 ? 'ready' : 'load';
							$t = $(wh);
						}
						if (!e) {
							return;
						}
						if (on) {
							if (e == 'ready') {
								// wait for the document to complete loading
								wait(delay, timeout, getWinHandle, function(cnt, e) {
									oe();
								});
							} else {
								$t.on(e, oe);
							}
						} else {
							try {
								$t.off(e, oe);
							} catch (e) {
								// ignore
							}
							li++;
						}
					}
					oe = function() {
						onOff();
						// wait for location to change before listening for
						// ready/load state or it will never fire
						wait(delay, timeout, null, function(cnt, e) {
							if (e) {
								lfx.call(e);
								return;
							}
							try {
								var w = getWinHandle();
								if (ohn && ohn != w.location.hostname) {
									// different host will not trigger load
									// event- best effort exhausted
									lfx.call();
									return true;
								}
								if (ol != w.location.href) {
									oe = function() {
										onOff();
										lfx.call();
									};
									onOff(true);
									return true;
								}
							} catch (e2) {
								lfx.call(e2);
							}
						});
					};
					onOff(true);
				}
				if ($f) {
					$f.submit();
				}
			}
			function getWinHandle(wr) {
				var w = wr || window;
				if ($$.target != '_self') {
					var tn = $$.target.charAt(0) == '_' ? $$.target
							.substring(1) : $$.target;
					w = w[tn];
				}
				return w;
			}
			try {
				if (!win && $$.type == '_blank' && !loc) {
					win = window.open('about:blank', $$.target, $$.options,
							$$.history);
					win.document.write('<html><body></body></html>');
					opt();
					return win;
				} else if (!win) {
					win = getWinHandle(win);
				}
				if (typeof loc === 'string') {
					// opening window using the specified location (works with
					// same window navigation as well)
					win = window.open(loc, $$.target, $$.options, $$.history);
					opt();
				} else if (loc) {
					opt();
				}
			} catch (e) {
				if (lfx) {
					lfx.call(win, null, e);
				}
			}
			return win;
		};
		$$.toString = function() {
			return lbls('object', $$.constructor.name, 'type', $$.type(),
					'forceType', forceType, 'target', $$.target, 'options',
					$$.options, 'history', $$.history);
		};
	}