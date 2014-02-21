	/**
	 * Initializes thymus.js plug-in and loads any fragments within the page
	 * 
	 * @param jqUrl
	 *            the URL used to load JQuery
	 */
	function init(jqUrl) {
		if ($.fn[NS] !== undefined) {
			return;
		}
		var script = $('#' + NS);
		if (!script) {
			throw new Error('No script found with ID: ' + NS);
		}
		var defs = {
			selfRef : 'this',
			ajaxCache : false,
			ajaxCrossDomain : false,
			ajaxTypeDefault : 'GET',
			inheritRef : 'inherit',
			pathSep : DFLT_PATH_SEP,
			paramSep : '&',
			agentSelSep : ',',
			resultSep : ',',
			destSep : ',',
			typeSep : '|',
			targetSep : '|',
			multiSep : '::',
			fragAttrs : [ 'data-thx-fragment', 'th\\:fragment',
					'data-th-fragment' ],
			includeAttrs : [ 'data-thx-include', 'th\\:include',
					'data-th-include' ],
			replaceAttrs : [ 'data-thx-replace', 'th\\:replace',
					'data-th-replace' ],
			urlAttrs : [ 'action', 'archive', 'background', 'cite', 'classid',
					'codebase', 'data', 'dynsrc', 'formaction', 'href', 'icon',
					'longdesc', 'lowsrc', 'manifest', 'poster', 'profile',
					'src', 'usemap' ],
			getAttrs : [ 'data-thx-get' ],
			postAttrs : [ 'data-thx-post' ],
			putAttrs : [ 'data-thx-put' ],
			deleteAttrs : [ 'data-thx-delete' ],
			getPathAttrs : [ 'data-thx-get-path' ],
			postPathAttrs : [ 'data-thx-post-path' ],
			putPathAttrs : [ 'data-thx-put-path' ],
			deletePathAttrs : [ 'data-thx-delete-path' ],
			getParamsAttrs : [ 'data-thx-get-params' ],
			postParamsAttrs : [ 'data-thx-post-params' ],
			putParamsAttrs : [ 'data-thx-put-params' ],
			deleteParamsAttrs : [ 'data-thx-delete-params' ],
			getResultAttrs : [ 'data-thx-get-result' ],
			postResultAttrs : [ 'data-thx-post-result' ],
			putResultAttrs : [ 'data-thx-put-result' ],
			deleteResultAttrs : [ 'data-thx-delete-result' ],
			getDestAttrs : [ 'data-thx-get-dest' ],
			postDestAttrs : [ 'data-thx-post-dest' ],
			putDestAttrs : [ 'data-thx-put-dest' ],
			deleteDestAttrs : [ 'data-thx-delete-dest' ],
			getTypeAttrs : [ 'data-thx-get-type' ],
			postTypeAttrs : [ 'data-thx-post-type' ],
			putTypeAttrs : [ 'data-thx-put-type' ],
			deleteTypeAttrs : [ 'data-thx-delete-type' ],
			getTargetAttrs : [ 'data-thx-get-target' ],
			postTargetAttrs : [ 'data-thx-post-target' ],
			putTargetAttrs : [ 'data-thx-put-target' ],
			deleteTargetAttrs : [ 'data-thx-delete-target' ],
			getAgentAttrs : [ 'data-thx-get-agent' ],
			postAgentAttrs : [ 'data-thx-post-agent' ],
			putAgentAttrs : [ 'data-thx-put-agent' ],
			deleteAgentAttrs : [ 'data-thx-delete-agent' ],
			getDelegateAttrs : [ 'data-thx-get-delegate' ],
			postDelegateAttrs : [ 'data-thx-post-delegate' ],
			putDelegateAttrs : [ 'data-thx-put-delegate' ],
			deleteDelegateAttrs : [ 'data-thx-delete-delegate' ],
			getWithAttrs : [ 'data-thx-get-with' ],
			postWithAttrs : [ 'data-thx-post-with' ],
			putWithAttrs : [ 'data-thx-put-with' ],
			deleteWithAttrs : [ 'data-thx-delete-with' ],
			fragExtensionAttr : 'data-thx-frag-extension',
			fragListenerAttr : 'data-thx-onfrag',
			fragsListenerAttr : 'data-thx-onfrags',
			fragHeadAttr : 'data-thx-head-frag',
			paramNameAttrs : [ 'name', 'id' ],
			readyStateDelay : 10,
			readyStateTimeout : 30000,
			regexFragName : /^[_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*$/,
			regexFunc : /^[_$a-zA-Z\xA0-\uFFFF].+?\(/i,
			regexFileName : /[^\/?#]+(?=$|[?#])/,
			regexTags : /<[a-z]+[^>]*>(?:[\S\s]*?)<\/(?:[\S\s]*?)[a-z]+>/i,
			regexScriptTags : /<script[^>]*>([\\S\\s]*?)<\/script>/img,
			regexAttrRelUrlSuffix : '\s*=\s*[\"|\\\'](?!(?:[a-z]+:)|/|#)(.*?)[\"|\\\']',
			regexAttrAnyUrlSuffix : '\s*=\s*[\\"|\'](.*?)[\\"|\']',
			regexIanaProtocol : /^(([a-z]+)?:|\/|#)/i,
			regexFileTransForProtocolRelative : /^(file:?)/i,
			regexAbsPath : REGEX_ABS_PATH,
			regexFuncArgs : /(('|").*?('|")|[^('|"),\s]+)(?=\s*,|\s*$)/g,
			regexFuncArgReplace : /['"]/g,
			regexDirectiveDelimiter : /->/g,
			regexParentChildDelimiter : /=>/g,
			regexSurrogateSiphon : /\?([^\?"']+?(?:(?:"|')[^"']*(?:"|')[^\?{}"']*)*)}/g, // /(?:\?{)((?:(?:\\.)?|(?:(?!}).))+)(?:})/g,
			regexNodeSiphon : /\|([^\|"']+?(?:(?:"|')[^"']*(?:"|')[^\|{}"']*)*)}/g,
			regexVarSiphon : /\$([^\$"']+?(?:(?:"|')[^"']*(?:"|')[^\${}"']*)*)}/g,
			regexVarNameVal : /((?:\\.|[^=,]+)*)=("(?:\\.|[^"\\]+)*"|(?:\\.|[^,"\\]+)*)/g,
			regexParamCheckable : /^(?:checkbox|radio)$/i,
			regexParamReplace : /\r?\n/g,
			regexDestTextOrAttrVal : /[^\x21-\x7E\s]+/g,
			regexFilterFindSplit : /\s+/,
			paramReplaceWith : '\r\n',
			resultWrapperTagName : DFTL_RSLT_NAME,
			eventIsBroadcast : true,
			eventFragChain : 'frag',
			eventFragsChain : 'frags',
			eventFragBeforeHttp : 'beforehttp.thx.frag',
			eventFragBeforeDom : 'beforedom.thx.frag',
			eventFragAfterDom : 'afterdom.thx.frag',
			eventFragLoad : 'load.thx.frag',
			eventFragsBeforeHttp : 'beforehttp.thx.frags',
			eventFragsLoad : 'load.thx.frags',
			actionLoadFrags : 'frags.load',
			actionNavRegister : 'nav.register',
			actionNavInvoke : 'nav.invoke',
			actionOptions : 'opts.get'
		};
		/**
		 * thymus.js plug-in action execution
		 * 
		 * @param a
		 *            the action object (or action string)
		 * @parma the options (relative to the context of the element(s) for
		 *        which the plug-in is being called from)
		 */
		$.fn[NS] = function(a, opts) {
			var o = $.extend({}, defs, opts);
			var x = null, xl = null;
			var s = this.selector;
			return this.each(function() {
				if (firstRun && rootRun && $.contains(document, this[0])) {
					// make sure the root document has navigation capabilities
					rootRun = false;
					$('html')[NS](o.actionNavRegister);
				}
				xl = $.data(this, NS);
				if (opts || !xl) {
					xl = x ? x : (x = new FragCtx(s, script, o));
					$.data(this, NS, xl);
				}
				xl.exec(a, this);
			});
		};
		$.fn[NS].defaults = defs;
		try {
			// TODO : better IE version detection
			ieVersion = (ieVersion = (navigator.userAgent || "")
					.match(/(?:(?:MSIE\s*)|(?:Trident.*rv:))(\d+\.?\d*)/i))
					&& ieVersion.length > 1 ? parseFloat(ieVersion[1], 10) : 0;
		} catch (e) {
			log('Unable to detect IE version: ', e);
		}

		try {
			isLinux = navigator.platform.toLowerCase().indexOf('linux') >= 0;
		} catch (e) {
			log('Unable to detect Linux: ', e);
		}

		/**
		 * Pre-loads any resources that may need to be present before fragments
		 * are processed
		 * 
		 * @param l
		 *            an optional link URL
		 * @param s
		 *            an optional script URL
		 * @param cb
		 *            the call back function
		 */
		function preloadResources(l, s, cb) {
			if (l) {
				$('<link type="text/css" href="' + l + '" rel="stylesheet" />')
						.appendTo('head');
			}
			if (s) {
				var su = getAppCtxRelPath(s, REGEX_ABS_PATH, DFLT_PATH_SEP);
				$.getScript(su).done(function(data, ts, jqxhr) {
					cb(su, data, ts, jqxhr, null);
				}).fail(function(jqxhr, ts, e) {
					cb(su, null, ts, jqxhr, e);
				});
			} else {
				cb(null, null, null, null);
			}
		}
		preloadResources(propAttr(script, FRAGS_PRE_LOAD_CSS_ATTR), propAttr(
				script, FRAGS_PRE_LOAD_JS_ATTR), function(s, d, ts, jqxhr, e) {
			if (e) {
				var ne = 'Unable to load "' + s + '" ' + e + ', status: ' + ts
						+ ', data: ' + d;
				log(ne, 1);
				throw new Error(ne);
			} else {
				var $p = $('html');
				if (!preLoadAttr(FRAGS_LOAD_DEFERRED_LOAD_ATTR)) {
					// auto-process the fragments
					$p[NS](defs.actionLoadFrags);
				}
			}
		});
	}

	/**
	 * Retrieves or assigns an elements attribute before loading has begun
	 * 
	 * @param a
	 *            the attribute to retrieve or assign
	 * @param d
	 *            the optional default value to return when the attribute cannot
	 *            be found
	 * @param v
	 *            the value to set (when invalid nothing will be set, but rather
	 *            the existing vlaue will be returned)
	 * @param e
	 *            the optional element to retrieve the attribute value from
	 *            (null/undefined will use script element)
	 */
	function preLoadAttr(a, d, e, v) {
		if (!e) {
			e = document.getElementById(NS);
			if (!e) {
				throw new Error('Missing script ID: ' + NS);
			}
		}
		if (v && e) {
			if (e.setAttribute) {
				e.setAttribute(a, v);
			} else {
				e.attributes[a].nodeValue = v;
			}
		}
		var r = e ? e.getAttribute ? e.getAttribute(a)
				: e.attributes[a].nodeValue : null;
		return d && !r ? d : r;
	}

	/**
	 * Preforms pre-initialization tasks like the capture setting of the
	 * <code>href</code> of the document's <code>base</code> to the path
	 * from the {BASE_PATH_ATTR} attribute and loading JQuery (if needed).
	 */
	function preInit() {
		updateUrls = true;
		basePath = preLoadAttr(BASE_PATH_ATTR);
		// var body = document.getElementsByTagName('body')[0];
		var base = document.getElementsByTagName('base')[0];
		var bp = base ? preLoadAttr('href', null, base) : null;
		var bpu = bp && basePath && bp.toLowerCase() != basePath.toLowerCase();
		var fbpu = ieVersion > 0 && ieVersion <= ieVersionCompliant;
		if (bpu) {
			// base is already processed at this point, need to manually handle
			// conversion of relative URLs to absolute paths
			log('Found base href="' + bp + '" while ' + NS + ' '
					+ BASE_PATH_ATTR + '="' + basePath
					+ '". Relative URLs will be updated via JQuery and may '
					+ 'not reflect the base tag href', 2);
			// update base href
			// preLoadAttr('href', null, base, basePath);
			// write base href
			// document.write('<base href="' + urlAdjust(basePath) + '" />');
		} else if (!basePath && !fbpu) {
			// some IE versions do not handle URLs from base properly
			updateUrls = false;
			basePath = bp;
		}
		if (!basePath) {
			updateUrls = false;
			throw new Error('Unable to capture ' + BASE_PATH_ATTR);
		}
		// initialize
		if (!$) {
			loadJQuery();
		} else {
			init(null);
		}
	}

	/**
	 * Loads JQuery using a value set with the {JQUERY_URL_ATTR} attribute or
	 * {JQUERY_DEFAULT_URL} when the {JQUERY_URL_ATTR} attribute is not defined
	 */
	function loadJQuery() {
		var su = preLoadAttr(JQUERY_URL_ATTR, JQUERY_DEFAULT_URL);
		var s = document.createElement('script');
		s.src = urlAdjust(su);
		s.type = 'text/javascript';
		s.onload = s.onreadystatechange = function() {
			if (!$
					&& (!this.readyState || this.readyState == 'loaded' || this.readyState == 'complete')) {
				$ = window.jQuery;
				init(s.src);
			}
		};
		s.src = su;
		document.getElementsByTagName('head')[0].appendChild(s);
	}

	// start thymus.js
	preInit();