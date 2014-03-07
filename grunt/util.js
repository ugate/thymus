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
	 * @param grunt
	 *            the grunt instance
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
	getCommit : function(grunt, altMsg, altNum, altSlug, nofail) {
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
					grunt.log.error(e);
					return {
						error : e
					};
				}
				throw grunt.util.error(e);
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
		grunt.log.writeln('Skipping "' + skps.join(',') + '" tasks');
		var sls = sl ? sl.split('/') : [];
		function versionArray(str) {
			var v = [], rv = cm ? cm.match(regexRelease) : [];
			v.push(rv.length > 1 ? rv[1] : '');
			v.push(rv.length > 2 ? rv[2] : '');
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
			versionType : v[0],
			version : v[1],
			versionTag : v[2],
			versionMajor : v[3],
			versionMinor : v[4],
			versionPatch : v[5],
			versionPrereleaseType : v[6],
			versionPrerelease : v[7],
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
	 * @param grunt
	 *            the grunt instance
	 * @param commit
	 *            the object returned from {getCommit} that contains the array
	 *            of tasks to skip
	 */
	Tasks : function(grunt, commit) {

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
				grunt.log.writeln('Skipping "' + task + '" task');
				return false;
			}
			grunt.log.writeln('Queuing "' + task + '" task');
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