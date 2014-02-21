	/**
	 * DOM event function that allows listener updates and on/off options
	 * 
	 * @constructor
	 * @param pel
	 *            the parent element that
	 * @param el
	 *            the element that will be broadcasting the event
	 * @param en
	 *            the event name
	 * @param m
	 *            the HTTP method
	 * @param del
	 *            an optional event delegate selector
	 * @param fx
	 *            the function that will be executed when an incoming event is
	 *            received (parameters: current parent element, reference to the
	 *            DOM event function)
	 * @param rfx
	 *            an optional function that will be called once the event has
	 *            completed
	 */
	function DomEventFunc(pel, el, en, m, del, fx, rfx) {
		var $el = $(el);
		var $pel = $(pel);
		var func = fx;
		var event = en;
		function on(evt) {
			var rtn = func($pel, $(this), evt);
			if (typeof rfx === 'function') {
				rfx(rtn, evt);
			}
		}
		this.update = function(pel, en, fx, add) {
			$pel = pel ? $(pel) : $pel;
			func = fx || func;
			if ((en && en != event) || add == false) {
				$el.off(event, del, on);
				event = en || event;
			}
			if (add == true) {
				$el.on(event, del, on);
			}
		};
		this.isMatch = function(m, el) {
			return this.getMethod() == m && this.getElement().is(el);
		};
		this.getElement = function() {
			return $el;
		};
		this.getEvent = function() {
			return event;
		};
		this.getMethod = function() {
			return m;
		};
		this.update(null, null, null, true);
	}

	/**
	 * Adds or updates an event function that will execute the supplied function
	 * when the specified DOM event occurs
	 * 
	 * @param ctx
	 *            the {FragCtx}
	 * @param a
	 *            the action
	 * @param m
	 *            the HTTP method
	 * @param pel
	 *            the parent element
	 * @param el
	 *            the element the event is for
	 * @param evt
	 *            the event name
	 * @param del
	 *            an optional event delegate selector
	 * @param fx
	 *            the function to execute when the event occurs (when the
	 *            function returns <code>true</code> the event listener will
	 *            be turned off)
	 */
	function addOrUpdateEventFunc(ctx, a, m, pel, el, evt, del, fx) {
		var en = getEventName(evt, false);
		if (el) {
			// prevent duplicating event listeners
			for ( var k in eventFuncs) {
				if (eventFuncs[k].isMatch(m, el)
						&& eventFuncs[k].getEvent() == en) {
					eventFuncs[k].update(pel, null, fx, null);
					return true;
				}
			}
			var fn = a + '.' + m + ++eventFuncCnt;
			var ev = null;
			function fxCheck(rmv) {
				if (rmv === true) {
					eventFuncs[fn].update(null, null, null, false);
					eventFuncs[fn] = null;
				}
			}
			eventFuncs[fn] = new DomEventFunc(pel, el, en, m, del, fx, fxCheck);
			eventFuncs[fn].getElement().on('remove', del, function() {
				fxCheck(true);
			});
		} else {
			throw new Error('Cannot register "' + en
					+ '" event for function action "' + fx
					+ '" on element(s) from selector "' + selector
					+ '" prior to being added to the DOM');
			// possible memory leaks may occur on the HTTP functions
			// when dealing with raw data replacements that are removed
			// from the DOM at a later time- currently not being used
			// ev = ' ' + getEventName(evt, true) + '="' + '$(\'' + selector
			// + '\').' + NS + '(\'' + fn + '\',this)"';
		}
		return {
			funcName : fn,
			eventAttrValue : ev,
			eventName : en
		};
	}

	/**
	 * Gets a normalized event name
	 * 
	 * @param n
	 *            the raw event name
	 * @param u
	 *            true to use the "on" prefix
	 */
	function getEventName(n, u) {
		return n && n.toLowerCase().indexOf('on') == 0 ? u ? n : n.substr(2)
				: u ? 'on' + n : n;
	}