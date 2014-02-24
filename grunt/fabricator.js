/**
 * Reference source for project relative paths/files as well as JS concatenation
 * processing using the following include syntax within a script source file:
 * <p>
 * <b><code>&#47;*!include [PATH] *&#47;</code></b>
 * </p>
 * Where <b><code>[PATH]</code></b> is the path to the JS script that will
 * replace the inclusion expression.
 */
var fabricator = {
	basePath : '',
	mainScriptPath : 'js/lib/thx.js',
	distPath : 'dist/',
	distScriptPath : 'dist/js/',
	distDocsScriptPath : 'dist/docs/js/',
	devScriptPath : 'js/lib/',
	devDocsScriptPath : 'frags/docs/js/',
	devDocsCssPath : 'frags/docs/css/',
	jsFiles : 'js/**/*.js',
	testScriptPath : 'dist/js/test/',
	testMainFile : 'index.html',
	devDesignator : '-dev',
	distDesignator : '',
	processedIncludePaths : [],
	regexInclude : /\/\*\!@include([\s\S]*?)\*\//ig,
	regexSrc : /src\s*=\s*(?:"([^"]*)"|'([^']*)'|([\w\-.:]+))/img,
	processScriptIncludes : function(src, path, cb) {
		// deep script replace of JS inclusions
		var $$ = this;
		// use the path w/o file name
		path = path || $$.mainScriptPath;
		var pp = path.match(/^(.*[\\\/])/);
		pp = pp && pp.length > 0 ? pp[0] : '';
		var js = '';
		if (src) {
			// replace inclusions with the wrapped path (relative the the parent
			// path- if any)
			js = src.replace($$.regexInclude, function(m, p, offset, str) {
				var incPath = typeof p.trim === 'function' ? p.trim() : p
						.replace(/^\s+|\s+$/g, '');
				incPath = pp + incPath;
				var rslt = $$.getScriptInclude.call($$, path, incPath, cb);
				$$.processedIncludePaths.push(incPath);
				return $$.processScriptIncludes(rslt, incPath, cb);
			});
		} else if ($$.processedIncludePaths.length == 0) {
			// first call will not have an existing source
			path = $$.basePath
					+ ($$.basePath.lastIndexOf('/') == $$.basePath.length - 1 ? path
							: '/' + path);
			$$.processedIncludePaths.push(path);
			js = $$.processScriptIncludes($$.getScriptInclude.call($$, null,
					path, cb), path, cb);
		}
		return js + '\n\n';
	},
	getScriptInclude : function(parentPath, incPath, cb) {
		// synchronously capture the raw script source via callback or HTTP
		// request
		var rslt = '';
		if (typeof cb === 'function') {
			rslt = cb.call(this, parentPath, incPath);
		} else {
			$.ajax({
				url : incPath,
				dataType : 'text',
				async : false,
				cache : false
			}).done(function(r, status, xhr) {
				rslt = r;
			}).fail(
					function fail(xhr, ts, e) {
						rslt = '/*\nFailed to include ' + incPath
								+ '\n Error: ' + ts + ': ' + e.message;
						throw e;
					});
		}
		return rslt;
	},
	replaceSrciptTagSrcById : function(id, htmlStr, cb, envDesignator) {
		if (!htmlStr || !id) {
			return htmlStr;
		}
		// replaces any references to a script tags source attribute
		var $$ = this;
		var scrPaths = $$.getScriptPath(id, envDesignator);
		// replace any script tags with the specified ID
		return htmlStr.replace(new RegExp('<script[^>]*id=["\']?' + id
				+ '["\']?[^>]*>(?:[\S\s]*?)<\/script>', 'img'), function(
				scrMatch, offset, scrStr) {
			// replace the matched script tag with the required attribute
			// changes
			var scr = scrMatch.replace($$.regexSrc,
					function(srcMatch, srcDoubleQuote, srcSingleQuote,
							srcNoQuote, offset, srcStr) {
						// replace the source attribute with one that specific
						// to the specified environment
						var src = srcDoubleQuote || srcSingleQuote
								|| srcNoQuote;
						var to = scrPaths.to;
						if ((m = src.match(/(?:\.{1,2}\/)+/)).length) {
							to = m[0] + to;
						}
						src = srcMatch.replace(src, to);
						return src;
					});
			if (typeof cb === 'function') {
				cb(scrMatch, scr);
			}
			return scr;
		});
	},
	getScriptPath : function(id, envDesignator) {
		// returns from/to paths for a specified environment
		var $$ = this;
		var isDist = envDesignator !== $$.devDesignator;
		return {
			from : ep(id, !isDist),
			to : ep(id, isDist)
		};
		function ep(f, isDist) {
			return (isDist ? $$.distScriptPath : $$.devScriptPath) + f
					+ (isDist ? $$.distDesignator : $$.devDesignator) + '.js';
		}
	}
};
if (typeof module !== 'undefined' && module.exports) {
	module.exports = fabricator;
}
//# sourceURL=fabricator.js
