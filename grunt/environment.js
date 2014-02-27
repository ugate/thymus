'use strict';

var regexRelease = /released?\s*v(\d+\.\d+\.\d+(?:-alpha(?:\.\d)?|-beta(?:\.\d)?)?)/mi;
var regexSkips = /\[\s?skip\s+.+\]/gmi;

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
	 * @param nofail
	 *            true
	 * @returns {Object} containing the commit number, message and version
	 */
	getCommit : function(grunt, altMsg, altNum, nofail) {
		var cn = altNum || process.env.TRAVIS_COMMIT;
		var cm = altMsg || process.env.TRAVIS_COMMIT_MESSAGE;
		var v = null;
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
			var rv = cm.match(regexRelease);
			if (rv.length > 1) {
				v = rv[1];
			}
			var s = cm.match(regexSkips);
			if (s) {
				skps = s;
			}
		}
		return {
			number : cn,
			message : cm,
			version : v,
			skips : skps
		};
	},

	/**
	 * Task array that takes into account possible skip options
	 * 
	 * @param skips
	 *            the array of tasks to skip
	 */
	Tasks : function(skips) {

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
			if (skips && skips.indexOf(task) >= 0) {
				return false;
			}
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
	}
};