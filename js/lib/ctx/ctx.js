	/**
	 * thymus.js context constructor
	 * 
	 * @constructor
	 * @param selector
	 *            the JQuery selector responsible for the fragment context
	 * @param script
	 *            the thymus.js script handle
	 * @param opts
	 *            the JQuery options used
	 */
	function FragCtx(selector, script, opts) {

		var ctx = this;
		ctx.opts = opts;
		var includeReplaceAttrs = opts.includeAttrs.concat(opts.replaceAttrs);
		var protocolForFile = opts.regexFileTransForProtocolRelative
				.test(location.protocol) ? 'http:' : null;
		// construct the JQuery selector that will identify what fragments to
		// load
		var domAttrs = opts.getAttrs.concat(opts.postAttrs.concat(opts.putAttrs
				.concat(opts.deleteAttrs)));
		var fragSelector = genAttrSelect(includeReplaceAttrs, null, null);
		fragSelector = (fragSelector ? fragSelector + ',' : '')
				+ genAttrSelect(domAttrs, 'load', '*');
		var urlAttrs = genAttrQueries(opts.urlAttrs, 'GET', URL_ATTR,
				opts.regexAttrRelUrlSuffix);
		var getAttrs = genAttrQueries(opts.getAttrs, 'GET', TDFLT,
				opts.regexAttrAnyUrlSuffix);
		var postAttrs = genAttrQueries(opts.postAttrs, 'POST', TDFLT,
				opts.regexAttrAnyUrlSuffix);
		var putAttrs = genAttrQueries(opts.putAttrs, 'PUT', TDFLT,
				opts.regexAttrAnyUrlSuffix);
		var deleteAttrs = genAttrQueries(opts.deleteAttrs, 'DELETE', TDFLT,
				opts.regexAttrAnyUrlSuffix);
	
		/**
		 * Executes a {FragCtx} action
		 * 
		 * @param a
		 *            the action object (or string defining the action name)
		 *            that will be executed
		 * @param el
		 *            the element that initiated the the execution (when not
		 *            present the parent element will be used)
		 */
		ctx.exec = function(a, el) {
			// validate/set action scope properties
			function scp(a, sel) {
				sc(a, 'selector', sel);
				sc(a, 'searchScope');
				sc(a, 'destScope');
			}
			// validate/set action scope property
			function sc(a, p, alt) {
				a[p] = a[p] ? a[p] instanceof $ && a[p].length > 0 ? a[p]
						: $(a[p]) : $(alt);
				if (a[p].length <= 0) {
					a[p] = null;
				}
			}
			a = typeof a === 'object' ? a : {
				action : a
			};
			var hf = eventFuncs[a.action];
			if (hf && typeof hf.f === 'function') {
				// directly invoke action as a function
				hf.f(el);
			} else if (a.action === opts.actionLoadFrags) {
				// force selector to the parent in order to ensure plugin
				// selection scope
				a.selector = el;
				scp(a, el);
				loadFragments(a.action, a.selector, a.searchScope, a.destScope,
						fragSelector, null, null);
			} else if (a.action === opts.actionNavInvoke) {
				if (!a.pathSiphon) {
					log('No path specified for ' + a.action, 1);
					return;
				}
				a.method = a.method ? a.method : opts.ajaxTypeDefault;
				var no = new NavOptions(a.typeSiphon, opts.typeSep,
						a.targetSiphon, opts.targetSep);
				if (!no.isFullPageSync()) {
					// partial page update
					scp(a, el);
					loadFragments(a.action, a.selector, a.searchScope,
							a.destScope, a, no, null);
				} else {
					// full page transfer
					scp(a, el);
					var t = new FragsTrack(a.action, a.selector, a.searchScope,
							a.destScope, a);
					var f = new Frag(null, t.actionScope, t);
					f.nav(no);
				}
			} else if (a.action === opts.actionNavRegister) {
				// convert URLs (if needed) and register event driven templating
				scp(a, el);
				var t = new FragsTrack(a.action, a.selector, a.searchScope,
						a.destScope, {});
				var f = new Frag(null, t.actionScope, t);
				htmlDomAdjust(t, f, t.actionScope, true);
			} else if (a.action === opts.actionOptions) {
				return opts;
			} else {
				throw new Error('Invalid action: ' + a.action);
			}
		};

		/*!@include	event.js */
		/*!@include frag.js */
		/*!@include nav.js */
		/*!@include resolver.js */
		/*!@include siphon.js */
		/*!@include util.js */
	}