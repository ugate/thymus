+function($) {
	var NS = displayName = 'thymus';
	var DFLT_PATH_SEP = '/';
	var REGEX_ABS_PATH = /([^:]\/|\\)(?:\/|\\)+/;
	var REGEX_ABS_SPLIT = /\?|#/;
	var REGEX_CDATA = /<!\[CDATA\[(?:.|\r\n|\n|\r)*?\]\]>/ig;
	var DATA_JS = 'data:text/javascript,';
	var JQUERY_URL_ATTR = 'data-thx-jquery-url';
	var JQUERY_DEFAULT_URL = 'http://code.jquery.com/jquery.js';
	var FRAGS_LOAD_DEFERRED_LOAD_ATTR = 'data-thx-deferred-load';
	var BASE_PATH_ATTR = 'data-thx-base-path';
	var FRAGS_PRE_LOAD_CSS_ATTR = 'data-thx-preload-css';
	var FRAGS_PRE_LOAD_JS_ATTR = 'data-thx-preload-js';
	var DFTL_RSLT_NAME = NS + '-results';
	var VARS_ATTR_TYPE = 'with';
	var DOM_ATTR_TYPES = [ 'type', 'params', 'path', 'result', 'dest', 'target',
			'delegate', VARS_ATTR_TYPE ];
	var DOM_ATTR_AGENT = 'agent';
	var HTTP_METHODS = [ 'GET', 'POST', 'DELETE', 'PUT' ];
	var DTEXT = 'text';
	var DHTML = 'html';
	var ASYNC = 'async';
	var SYNC = 'sync';
	var URL_ATTR = 'urlattr';
	var TTRAN = 'transfer';
	var TATTR = 'attribute';
	var TINC = 'include';
	var TREP = 'replace';
	var TUPD = 'update';
	var TYPES_PPU = [ URL_ATTR, TATTR, TINC, TREP, TUPD ];
	var TDFLT = TINC;
	var eventFuncs = {};
	var eventFuncCnt = 0;
	var isLinux = false;
	var ieVersion = 0;
	var ieVersionCompliant = 9;
	var basePath = null;
	var updateUrls = false;
	var firstRun = true;
	var rootRun = true;

	if (typeof $ === 'undefined') {
		throw new Error('jQuery is required for ' + NS);
	}

	/*!@include	cache.js */
	/*!@include event.js */
	/*!@include nav.js */
	/*!@include path.js */
	/*!@include siphon.js */
	/*!@include ctx/ctx.js */
	/*!@include util.js */
	/*!@include plugin.js */
}(window.jQuery);