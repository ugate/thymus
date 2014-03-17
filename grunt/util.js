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
	 * @param errorLogger
	 *            the function that will handle logging errors
	 * @param infoLogger
	 *            the function that will handle logging general information
	 * @param altMsg
	 *            an optional commit message to use instead of extracting one
	 * @param altNum
	 *            an optional commit number to use instead of extracting one
	 * @param altSlug
	 *            an optional slug to use instead of extracting one
	 * @param altBranch
	 *            an optional branch to use instead of the extracted one
	 * @param altBuildDir
	 *            an optional build directory to use instead of the extracted
	 *            one
	 * @param nofail
	 *            true to prevent failure when the commit message cannot be read
	 *            (otherwise an {Error} is thrown)
	 * @returns {Object} containing the commit number, message and version
	 */
	getCommit : function(errorLogger, infoLogger, altMsg, altNum, altSlug,
			altBranch, altBuildDir, nofail) {
		var logi = infoLogger || console.log;
		var loge = errorLogger || console.error;
		var br = altBranch || process.env.TRAVIS_BRANCH;
		var dr = altBuildDir || process.env.TRAVIS_BUILD_DIR;
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
				var e = new Error('Error "' + rtn.code + '" for commit number '
						+ cn + ' ' + rtn.output);
				if (nofail) {
					loge(e);
					return {
						error : e
					};
				}
				throw e;
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
		logi('Skipping "' + skps.join(',') + '" tasks');
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
			buildDir : dr,
			branch : br,
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
	 *            the function that will be used to log actions
	 */
	Tasks : function(commit, logger) {
		var log = logger || console.log;

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
				log('Skipping "' + task + '" task');
				return false;
			}
			log('Queuing "' + task + '" task');
			return this.tasks.push(task);
		};
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