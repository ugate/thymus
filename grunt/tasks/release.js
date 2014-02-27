'use strict';

var shell = require('shelljs');

/**
 * When a commit message contains "release v" followed by a version number
 * (major.minor.patch) a tagged release will be issued
 * 
 * @param grunt
 *            the grunt instance
 */
module.exports = function(grunt) {

	var commitNum = '';
	var commitMsg = '';

	grunt.registerTask('release',
			'Release bundle using commit message (if present)', function() {
				var options = this.options({
					src : process.cwd(),
					destBranch : 'gh-pages',
					destDir : 'dist',
					chgLog : 'HISTORY.md',
					authors : 'AUTHORS.md'
				});
				release.call(this, options);
			});

	/**
	 * Checks for release commit message and performs release
	 * 
	 * @param options
	 *            the grunt options
	 */
	function release(options) {
		var releaseVer = '';
		var chgLogRtn = '';
		var authorsRtn = '';

		// Capture commit message
		commitNum = process.env.TRAVIS_COMMIT;
		commitMsg = process.env.TRAVIS_COMMIT_MESSAGE;
		if (!commitMsg) {
			// TODO : the following can be removed once
			// https://github.com/travis-ci/travis-ci/issues/965 is resolved
			commitMsg = runCmd("git show -s --format=%B " + commitNum
					+ " | tr -d '\\n'");
			if (!commitMsg) {
				grunt.log.error('Error capturing commit message for '
						+ commitNum);
				return;
			}
		}
		grunt.log.writeln('Commit message: ' + commitMsg);
		releaseVer = extractCommitMsgVer(commitMsg, true);
		if (!releaseVer) {
			return;
		}

		// TODO : the following can be removed once
		// https://github.com/travis-ci/travis-ci/issues/2002 is resolved
		grunt.log
				.writeln(runCmd('git submodule add https://github.com/apenwarr/git-subtree.git subtree'));

		// TODO : verify commit message release version is less than
		// current version using "git describe --abbrev=0 --tags"
		grunt.log.writeln('Preparing release: ' + releaseVer);

		// Set identity
		runCmd('git config --global user.email "travis@travis-ci.org"');
		runCmd('git config --global user.name "Travis"');

		// Generate change log for release using all messages since last
		// tag/release
		chgLogRtn = runCmd(
				'git log `git describe --tags --abbrev=0`..HEAD --pretty=format:"  * %s"',
				options.destDir + '/' + options.chgLog, false, true);

		// Generate list of authors/contributors since last tag/release
		authorsRtn = runCmd('git log --all --format="%aN <%aE>" | sort -u',
				options.destDir + '/' + options.authors, true);

		// Commit local release destination changes
		runCmd('git add --all ' + options.destDir + ' && git commit -m "'
				+ commitMsg + '"');

		// Push release changes
		runCmd('git subtree push --prefix ' + options.destDir + ' origin '
				+ options.destBranch);

		// Tag release
		runCmd('git tag -a ' + releaseVer + ' -m "' + chgLogRtn + '"');
		grunt.log.writeln('Released: ' + releaseVer + ' from subtree '
				+ options.destDir + ' under ' + options.destBranch);
	}

	/**
	 * Executes a shell command
	 * 
	 * @param cmd
	 *            the command string to execute
	 * @param wpath
	 *            the optional path/file to write the results to
	 * @param nofail
	 *            true to prevent throwing an error when the command fails to
	 *            execute
	 * @param nodups
	 *            true to remove duplicate entry lines from results
	 */
	function runCmd(cmd, wpath, nofail, nodups) {
		grunt.log.writeln(cmd);
		var rtn = shell.exec(cmd, {
			silent : true
		});
		if (rtn.code !== 0) {
			var e = 'Error "' + rtn.code + '" for commit number ' + commitNum
					+ ' ' + rtn.output;
			if (nofail) {
				grunt.log.error(e);
				return;
			}
			throw new Error(e);
		}
		var output = rtn.output;
		if (output && nodups) {
			// remove duplicate lines
			var rs = output.match(/[^\r\n]+/g);
			if (rs && rs.length > 1) {
				var no = '';
				var ll = '';
				for (var i = 0; i < rs.length; i++) {
					if (rs[i] != ll) {
						no += (rs[i] + '\n');
					}
					ll = rs[i];
				}
				if (no) {
					output = no;
				}
			}
		}
		if (output && wpath) {
			grunt.file.write(wpath, output);
		}
		return output;
	}

	/**
	 * Extracts a release version from a commit message
	 * 
	 * @param commitMsg
	 *            the commit message to extract the release version from
	 */
	function extractCommitMsgVer(commitMsg) {
		var v = '';
		if (commitMsg) {
			var rv = commitMsg
					.match(/released?\s*v(\d+\.\d+\.\d+(?:-alpha(?:\.\d)?|-beta(?:\.\d)?)?)/im);
			if (rv.length > 1) {
				v = rv[1];
			}
		}
		return v;
	}
};