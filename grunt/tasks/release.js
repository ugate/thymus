/**
 * When a commit message contains "release v" followed by a version number
 * (major.minor.patch) a tagged release will be issued
 * 
 * @param grunt
 *            the grunt instance
 * @param src
 *            the source directory (default: CWD)
 * @param destBranch
 *            the origin (default: gh-pages)
 * @param destDir
 *            the directory to subtree (default: dist)
 * @param chgLog
 *            the optional change log file name to generate (default:
 *            HISTORY.md)
 * @param authors
 *            the optional authors file name to generate (default: AUTHORS.md)
 */
module.exports = function(grunt, src, destBranch, destDir, chgLog, authors) {
	'use strict';

	src = src || process.cwd();
	destBranch = destBranch || 'gh-pages';
	destDir = destDir || 'dist';
	chgLog = chgLog || 'HISTORY.md';
	authors = authors || 'AUTHORS.md';

	var shell = require('shelljs');
	var releaseVer = '';
	var chgLogRtn = '';
	var authorsRtn = '';

	// Capture commit message
	var commitMsg = process.env.TRAVIS_COMMIT_MESSAGE;
	if (!commitMsg) {
		commitMsg = runCmd("git show -s --format=%B "
				+ process.env.TRAVIS_COMMIT + " | tr -d '\\n'");
		if (!commitMsg) {
			grunt.log.error('Error capturing commit message for '
					+ process.env.TRAVIS_COMMIT);
			return;
		}
	}
	grunt.log.writeln('Commit message: ' + commitMsg);
	releaseVer = extractCommitMsgVer(commitMsg, true);
	if (!releaseVer) {
		return;
	}
	// TODO : verify commit message release version is less than
	// current version using "git describe --abbrev=0 --tags"
	grunt.log.writeln('Preparing release: ' + releaseVer);

	// Generate change log for release using all messages since last
	// tag/release
	chgLogRtn = runCmd(
			'git log `git describe --tags --abbrev=0`..HEAD --pretty=format:"  * %s"',
			chgLog, true);

	// Generate list of authors/contributors since last tag/release
	authorsRtn = runCmd('git log --all --format="%aN <%aE>" | sort -u', authors);

	// Commit local release destination changes
	if (runCmd('git add --all ' + destDir + ' && git commit -m "' + commitMsg
			+ '"') === undefined) {
		return;
	}

	// Push release changes
	if (runCmd('git subtree push --prefix ' + destDir + ' origin ' + destBranch) === undefined) {
		return;
	}

	// Tag release
	if (runCmd('git tag -a ' + releaseVer + ' -m "' + chgLogRtn + '"') === undefined) {
		return;
	}
	grunt.log.writeln('Released: ' + releaseVer + ' from subtree ' + destDir
			+ ' under ' + destBranch);

	/**
	 * Executes a shell command
	 * 
	 * @param cmd
	 *            the command string to execute
	 * @param wpath
	 *            the optional path/file to write the results to
	 * @param nodups
	 *            true to remove duplicate entry lines from results
	 */
	function runCmd(cmd, wpath, nodups) {
		var rtn = shell.exec(cmd, {
			silent : true
		});
		if (rtn.code !== 0) {
			grunt.log.error('Error "' + rtn.code + '" for commit number '
					+ process.env.TRAVIS_COMMIT + ' ' + rtn.output);
			return;
		}
		var output = rtn.output;
		if (output && nodups) {
			// remove duplicate lines
			var rs = output.split(/\r?\n/g);
			if (rs.length > 1) {
				output = '';
				var ll = '';
				for (var i = 0; i < rs.length; i++) {
					if (rs[i] != ll) {
						output += rs[i];
					}
					ll = rs[i];
				}
			}
		}
		if (output && wpath) {
			grunt.file.write(destDir + '/' + wpath, output);
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