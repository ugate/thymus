		/**
		 * Gets a file extension from a URL
		 * 
		 * @param url
		 *            the URL to get the file extension from
		 * @returns the file extension for the supplied URL (or empty when not
		 *          present)
		 */
		function getFileExt(url) {
			var x = getFile(url);
			if (x) {
				x = x.split('.');
				x = x.length > 1 ? '.' + x[x.length - 1] : '';
			}
			return x;
		}

		/**
		 * Gets a file name
		 * 
		 * @param url
		 *            the URL to get the file file name from
		 * @returns the file name for the supplied URL (or empty when not
		 *          present)
		 */
		function getFile(url) {
			var f = '';
			if (url) {
				var fs = url.match(opts.regexFileName);
				if (fs && fs.length > 0) {
					f = fs[0];
				}
			}
			return f;
		}

		/**
		 * Checks whether or not the passed element should be admitted for value
		 * inclusion
		 * 
		 * @param $el
		 *            the element to check for a exclusion on
		 * @returns true when the element is disabled or is deemed checkable,
		 *          but is not checked
		 */
		function isExcludedVal($el) {
			return $el.is(':disabled')
					|| (!$el.is(':checked')
							&& propAttr($el, 'nodeName').toLowerCase() == 'input' && opts.regexParamCheckable
							.test(propAttr($el, 'type')));
		}

		/**
		 * Extracts a cumulative string of input value(s) and/or text of the
		 * containing elements
		 * 
		 * @param $el
		 *            the element(s) to get the value(s) and/or text
		 * @param d
		 *            the optional delimiter that will separate each value/text
		 * @returns cumulative string of input value(s) and/or text
		 */
		function getTextVals($el, d) {
			var t = '';
			var e = null;
			var v = null;
			if ($el instanceof $) {
				$el.each(function(i, r) {
					e = $(r);
					if (e.is(':input') && !e.is(':button')) {
						v = !isExcludedVal(e) ? e.val() : '';
					} else {
						v = e.text().replace(opts.regexDestTextOrAttrVal, '');
					}
					t += (t && d ? d : '') + (v ? v : '');
				});
			}
			return t;
		}

		/**
		 * Adjusts a path to conform to the specified context (if needed) and
		 * applies the provided file extension (or inherits the current pages
		 * file extension)
		 * 
		 * @param c
		 *            the context path
		 * @param p
		 *            the path to adjust
		 * @param x
		 *            the file extension to apply
		 */
		function adjustPath(c, p, x) {
			x = x && p.lastIndexOf(opts.pathSep) != (p.length - 1) ? x
					.toLowerCase() == opts.inheritRef ? getFileExt(location.href)
					: getFileExt(p) ? '' : x
					: '';
			if (x) {
				var pi = p.indexOf('?');
				if (pi >= 0) {
					p = p.substring(0, pi) + x + p.substring(pi);
				} else {
					p += x;
				}
			}
			p = absoluteUrl(p, c);
			return p;
		}

		/**
		 * Converts a relative URL to an absolute URL
		 * 
		 * @param relPath
		 *            the relative path to convert
		 * @param absPath
		 *            the absolute path to do the conversion from
		 * @returns the absolute path version of the relative path in relation
		 *          to the provided absolute path (or just the supplied relative
		 *          path when it's really an absolute path)
		 */
		function absoluteUrl(relPath, absPath) {
			return absolutePath(relPath, absPath, opts.regexAbsPath,
					opts.pathSep, bypassPath);
		}

		/**
		 * Bypasses a path when the path is determined to be an IANA protocol
		 * 
		 * @param p
		 *            the path to check for bypass
		 * @returns the bypass path (or null when no bypass is needed)
		 */
		function bypassPath(p) {
			return opts.regexIanaProtocol.test(p) ? urlAdjust(p,
					protocolForFile) : null;
		}

		/**
		 * Gets an attribute of the current script
		 * 
		 * @param attr
		 *            the attribute to extract
		 */
		function getScriptAttr(attr) {
			if (!attr) {
				return null;
			}
			var $s = script;
			if ($s && $s.length > 0) {
				return propAttr($s, attr);
			}
		}