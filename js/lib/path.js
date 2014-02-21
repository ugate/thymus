	/**
	 * Converts a relative path to an absolute path
	 * 
	 * @param relPath
	 *            the relative path to convert
	 * @param absPath
	 *            the absolute path to do the conversion from
	 * @param rxAbsPath
	 *            the regular expression that will be used to replace the
	 *            absolute path with
	 * @param pathSep
	 *            the path separator to use during conversion
	 * @param bypassFunc
	 *            a function that will return a path when absolute path
	 *            resolution needs to be bypassed (returns <code>null</code>
	 *            to resolve)
	 * @returns the absolute path version of the relative path in relation to
	 *          the provided absolute path (or just the supplied relative path
	 *          when it's really an absolute path)
	 */
	function absolutePath(relPath, absPath, rxAbsPath, pathSep, bypassFunc) {
		// TODO : combine multiple regular expressions
		var absStack, relStack, i, d;
		relPath = relPath || '';
		if (typeof bypassFunc === 'function') {
			var vp = bypassFunc(relPath);
			if (vp) {
				return vp;
			}
		}
		// remove query parameters, hashes and duplicate slashes
		absPath = absPath ? absPath.split(REGEX_ABS_SPLIT)[0].replace(
				rxAbsPath, '$1') : '';
		absStack = absPath ? absPath.split(pathSep) : [];
		if (absStack.length > 0
				&& absStack[absStack.length - 1].indexOf('.') > -1) {
			// remove file name
			absStack.pop();
		}
		relStack = relPath.split(pathSep);
		for (i = 0; i < relStack.length; i++) {
			d = relStack[i];
			if (!d || d == '.') {
				continue;
			}
			if (d == '..') {
				if (absStack.length) {
					absStack.pop();
				}
			} else {
				absStack.push(d);
			}
		}
		absPath = absStack.join(pathSep);
		return absPath ? absPath.replace(rxAbsPath, '$1') : absPath;
	}

	/**
	 * Gets the context path used to resolve paths to fragments and URLs within
	 * href/src/etc. attributes contained in fragments
	 * 
	 * @param rxAbsPath
	 *            the regular expression that will be used to replace the
	 *            absolute path with
	 * @param pathSep
	 *            the path separator to use during conversion
	 * @param bypassFunc
	 *            a function that will return a path when absolute path
	 *            resolution needs to be bypassed (returns <code>null</code>
	 *            to resolve)
	 * @returns the application context path
	 */
	function getAppCtxPath(rxAbsPath, pathSep, bypassFunc) {
		var c = basePath;
		if (!c) {
			c = pathSep;
		}
		// capture the absolute URL relative to the defined context path
		// attribute value
		c = absolutePath(c, window.location.href, rxAbsPath, pathSep,
				bypassFunc);
		c += c.lastIndexOf(pathSep) != c.length - 1 ? pathSep : '';
		return c;
	}

	/**
	 * Converts a relative path into an absolute path
	 * 
	 * @param relPath
	 *            the relative path
	 * @param rxAbsPath
	 *            the regular expression that will be used to replace the
	 *            absolute path with
	 * @param pathSep
	 *            the path separator to use during conversion
	 * @param bypassFunc
	 *            a function that will return a path when absolute path
	 *            resolution needs to be bypassed (returns <code>null</code>
	 *            to resolve)
	 */
	function getAppCtxRelPath(relPath, rxAbsPath, pathSep, bypassFunc) {
		return absolutePath(relPath, getAppCtxPath(rxAbsPath, pathSep),
				rxAbsPath, pathSep, bypassFunc);
	}