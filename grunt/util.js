'use strict';

var regexRelease = /(released?)\s*(v)((\d+)\.(\d+)\.(\d+)(?:-(alpha|beta|rc?)(?:\.?(\d+))?)?)/mi;
var regexSkips = /\[\s?skip\s+(.+)\]/gmi;

/**
 * Environmental utility
 */
module.exports = {

	/**
	 * Gets the current commit details
	 * 
	 * @param logger
	 *            the {Logger} instance
	 * @param altMsg
	 *            an optional commit message to use instead of extracting one
	 * @param altNum
	 *            an optional commit number to use instead of extracting one
	 * @param altSlug
	 *            an optional slug to use instead of extracting one
	 * @param nofail
	 *            true
	 * @returns {Object} containing the commit number, message and version
	 */
	getCommit : function(logger, altMsg, altNum, altSlug, nofail) {
		var cn = altNum || process.env.TRAVIS_COMMIT;
		var cm = altMsg || process.env.TRAVIS_COMMIT_MESSAGE;
		var sl = altSlug || process.env.TRAVIS_REPO_SLUG;
		if (!cm) {
			// TODO : the following can be removed once
			// https://github.com/travis-ci/travis-ci/issues/965 is resolved
			var shell = require('shelljs');
			var rtn = shell.exec("git show -s --format=%B " + cn
					+ " | tr -d '\\n'", {
				silent : true
			});
			if (rtn.code !== 0) {
				var e = 'Error "' + rtn.code + '" for commit number ' + cn
						+ ' ' + rtn.output;
				if (nofail) {
					logger.add(e);
					return {
						error : e
					};
				}
				throw logger.dump(e);
			}
			cm = rtn.output;
		}
		var skps = [];
		if (cm) {
			// extract skip tasks in format: [skip someTask]
			cm.replace(regexSkips, function(m, t, c, s) {
				skps.push(t);
			});
		}
		logger.info('Skipping "' + skps.join(',') + '" tasks');
		var sls = sl ? sl.split('/') : [];
		function versionArray(str) {
			var v = [], rv = cm ? cm.match(regexRelease) : [];
			v.push(rv.length > 1 ? rv[1] : '');
			v.push(rv.length > 2 ? rv[2] : '');
			v.push(rv.length > 3 ? rv[3] : '');
			v.push(rv.length > 3 ? rv[2] + rv[3] : '');
			v.push(rv.length > 4 ? parseInt(rv[4]) : 0);
			v.push(rv.length > 5 ? parseInt(rv[5]) : 0);
			v.push(rv.length > 6 ? parseInt(rv[6]) : 0);
			v.push(rv.length > 7 ? rv[7] : '');
			v.push(rv.length > 8 ? parseInt(rv[8]) : 0);
			return v;
		}
		var v = versionArray(cm);
		return {
			number : cn,
			message : cm,
			versionLabel : v[0],
			versionType : v[1],
			version : v[2],
			versionTag : v[3],
			versionMajor : v[4],
			versionMinor : v[5],
			versionPatch : v[6],
			versionPrereleaseType : v[7],
			versionPrerelease : v[8],
			slug : sl,
			username : sls.length ? sls[0] : '',
			reponame : sls.length > 1 ? sls[1] : '',
			skips : skps
		};
	},

	/**
	 * Task array that takes into account possible skip options
	 * 
	 * @constructor
	 * @param commit
	 *            the object returned from {getCommit} that contains the array
	 *            of tasks to skip
	 * @param logger
	 *            the {Logger} instance
	 */
	Tasks : function(commit, logger) {

		/**
		 * Tasks array (should call tasks.add to push)
		 */
		this.tasks = [];

		/**
		 * Adds a task if the task is not in the skip tasks
		 * 
		 * @param task
		 *            the task to add
		 * @returns the index of the added task or false when the task should be
		 *          skipped
		 */
		this.add = function(task) {
			var noSauce = task == 'saucelabs-qunit'
					&& (typeof process.env.SAUCE_ACCESS_KEY === 'undefined' || (process.env.THX_TEST && process.env.THX_TEST != task));
			if (noSauce || (commit.skips && commit.skips.indexOf(task) >= 0)) {
				logger.info('Skipping "' + task + '" task');
				return false;
			}
			logger.info('Queuing "' + task + '" task');
			return this.tasks.push(task);
		};
	},

	/**
	 * Logger utility
	 * 
	 * @constructor
	 * @param logger
	 *            the informational logging function
	 * @param warnLogger
	 *            the warning function
	 * @param errorLogger
	 *            the error function
	 */
	Logger : function(logger, warnLogger, errorLogger) {
		var errors = [];
		var info = logger || console.log;
		var warn = warnLogger || console.warn;
		var error = errorLogger || console.error;

		/**
		 * Adds a warning/error to the stack
		 * 
		 * @param e
		 *            the warning/error to add (string or {Error} object)
		 * @param isWarn
		 *            true to indicate warning
		 */
		this.add = function(e, isWarn) {
			var eo = gen(e, isWarn);
			return eo ? errors.unshift(eo) : -1;
		};

		/**
		 * Logs a informational message
		 * 
		 * @param m
		 *            the message to log
		 */
		this.info = function(m) {
			info(m);
		};

		/**
		 * Dumps either the specified error or the cached errors to the logger
		 * 
		 * @param e
		 *            an optional error to dump (null dumps current
		 *            error/warning cached stack)
		 * @param isWarn
		 *            true dumps only warnings, false dumps only errors,
		 *            undefined dumps everything
		 */
		this.dump = function(e, isWarn) {
			e = gen(e, isWarn);
			var es = e ? [ e ] : errors;
			var all = typeof isWarn === 'undefined';
			for ( var i = 0; i < es.length; i++) {
				if (all || (isWarn && es[i].isWarn)) {
					warn(es[i].e);
					warn(es[i].stack);
				} else if (all || (!isWarn && !es[i].isWarn)) {
					error(es[i].e);
					error(es[i].stack);
				}
			}
			return e ? e.e : null;
		};

		/**
		 * @returns the number of added warnings/errors
		 */
		this.warnErrorCount = function() {
			return errors.length;
		};

		/**
		 * Generates an {Error} object
		 * 
		 * @param e
		 *            the {Error} or error string
		 * @returns an object with an {Error} and warning flag
		 */
		function gen(e, isWarn) {
			var eo = null;
			if (e instanceof Error) {
				eo = e;
			} else if (typeof e === 'string') {
				eo = new Error(e);
			}
			return eo ? {
				e : gen(e),
				isWarn : isWarn
			} : null;
		}
	},

	/**
	 * Generates a "skip" reference that can be used in a commit message to skip
	 * a specified task
	 * 
	 * @param task
	 *            the task name
	 * @returns the skip reference
	 */
	skipRef : function(task) {
		return task ? '[skip ' + task + ']' : task;
	},

	/**
	 * @returns the GIT authentication token
	 */
	getGitToken : function() {
		return process.env.GH_TOKEN;
	}
};