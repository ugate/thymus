		/**
		 * Broadcasts a fragment(s) event
		 * 
		 * @param evt
		 *            the event to broadcast (should contain a
		 *            <code>source</code> or <code>scope</code> property
		 *            that will contain the element to trigger the event)
		 * @param ecb
		 *            a callback function for handling errors
		 * @returns true when the event has requested to prevent the default
		 *          action
		 */
		function broadcastFragEvent(evt, ecb) {
			var el = null;
			try {
				el = evt.sourceEvent ? $(evt.sourceEvent.target)
						: evt.source ? evt.source : evt.target ? evt.target
								: evt.actionScope;
				// TODO : audio/video custom event trigger will cause media to
				// refresh
				if (el.is('video') || el.is('audio')) {
					el = el.parent();
				}
				try {
					el.trigger(evt);
				} catch (e) {
					ecb('Error triggering fragment event '
							+ (evt ? evt.type + ' ' + evt : 'unknown event'),
							el, e);
				}
				var sfc = script && evt.chain === opts.eventFragChain ? propAttr(
						script, opts.fragListenerAttr)
						: null;
				var sfsc = script && evt.chain === opts.eventFragsChain ? propAttr(
						script, opts.fragsListenerAttr)
						: null;
				if (sfc || sfsc) {
					var fs = sfc ? sfc : sfsc;
					if (fs) {
						try {
							var f = new Func(opts, fs, evt);
							if (f.isValid) {
								var rr = f.run(el);
								if (rr.result == false) {
									evt.preventDefault();
									evt.stopPropagation();
								}
							}
						} catch (e) {
							ecb('Error in ' + fs + ' ' + (evt ? evt : ''), el,
									e);
						}
					}
				}
				return evt.isDefaultPrevented();
			} catch (e) {
				ecb('Error broadcasting fragment event for '
						+ (evt ? evt.type + ' ' + evt : 'unknown event'), el, e);
			}
			return false;
		}

		/**
		 * Broadcasts a JQuery event
		 * 
		 * @param chain
		 *            the event chain
		 * @param type
		 *            the type of event
		 * @param t
		 *            the {FragsTrack} used (if any)
		 * @param f
		 *            the {Frag} the event is being issued for (if any)
		 */
		function broadcast(chain, type, t, f) {
			if (!opts.eventIsBroadcast) {
				return;
			}
			function fire() {
				var evt = chain == opts.eventFragChain ? genFragEvent(type, t,
						f) : genFragsEvent(chain, type, t);
				return broadcastFragEvent(evt, function(msg, el, e) {
					// error may never reach listener- try to log it
					var fmsg = msg + ' for ' + (f || t);
					t.addError(fmsg, f, e);
					log(fmsg, e);
				});
			}
			if (chain == opts.eventFragChain || chain == opts.eventFragsChain) {
				var bhttp = type == opts.eventFragsBeforeHttp
						|| type == opts.eventFragBeforeHttp;
				if (f) {
					if (!f.frp.pathSiphon()) {
						t.addError('Invalid URL for ' + f.toString(), f);
						f.cancelled = true;
						if (bhttp) {
							fire();
						}
					} else if (f) {
						f.cancelled = fire();
					}
					if (f.cancelled) {
						t.ccnt++;
					}
				} else if (bhttp) {
					t.cancelled = fire();
				} else {
					fire();
				}
			}
		}

		/**
		 * Generates a fragment JQuery event
		 * 
		 * @param type
		 *            the type of fragment event
		 * @param t
		 *            the {FragsTrack} used
		 * @param f
		 *            the {Frag} the event is being issued for
		 * @returns a fragment JQuery event
		 */
		function genFragEvent(type, t, f) {
			var e = $.Event(type);
			addFragProps(e, t, f);
			e.type = type;
			return e;
		}

		/**
		 * Generates a fragments JQuery event
		 * 
		 * @param chain
		 *            the chaining designation for the event
		 * @param type
		 *            the type of fragments event
		 * @param t
		 *            the {FragsTrack} used
		 * @returns a fragments JQuery event
		 */
		function genFragsEvent(chain, type, t) {
			var e = $.Event(type);
			e.chain = chain;
			e.sourceEvent = t.siphon.sourceEvent;
			e.action = t.action;
			e.frags = type == opts.eventFragsLoad ? t.genFragObjs() : undefined;
			e.fragAdjustments = t.adjustments;
			e.fragCancelCount = t.ccnt;
			e.fragCount = t.cnt;
			e.actionScope = t.actionScope;
			e.searchScope = t.searchScope;
			e.destScope = t.destScope;
			e.errors = t.getErrors();
			e.loadTime = t.elapsedTime(e.timeStamp);
			e.log = function(m, l) {
				log(m ? m : '', l, this);
			};
			e.toFormattedString = function() {
				return lbls('event chain', e.chain, 'sourceEvent',
						e.sourceEvent, 'action', e.action, 'fragCancelCount',
						e.fragCancelCount, 'fragCount', e.fragCount,
						'actionScope', e.actionScope, 'searchScope',
						e.searchScope, 'destScope', e.destScope, 'errors',
						e.errors, 'loadTime', e.loadTime);
			};
			return e;
		}