/**
 * When a commit message contains "release v" followed by a version number
 * (major.minor.patch) a tagged release will be issued
 * 
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
module.exports = function(src, destBranch, destDir, chgLog, authors) {
	'use strict';

	var grunt = this;

	grunt.log.writeln('Currently running the "release" task.');

	src = src || process.cwd();
	destBranch = destBranch || 'gh-pages';
	destDir = destDir || 'dist';
	chgLog = chgLog || 'HISTORY.md';
	authors = authors || 'AUTHORS.md';

	var exec = require('child_process').exec;

	// When a commit message contains "release v" followed by a version number
	// (major.minor.path) push release and
	var commitMsg = process.env.TRAVIS_COMMIT_MESSAGE;
	if (typeof commitMsg === 'undefined') {
		// TODO : the following can be removed once
		// https://github.com/travis-ci/travis-ci/issues/965 is resolved
		commitMsg = execOut('git show -s --format=%B '
				+ process.env.TRAVIS_COMMIT + ' | tr -d \'\n\'');
	}
	if (commitMsg) {
		grunt.log.writeln('Commit message: ' + commitMsg);
		var releaseVer = commitMsg
				.match(/release v(\d+\.\d+\.\d+(?:-alpha(?:\.\d)?|-beta(?:\.\d)?)?/im); 
		if (releaseVer.length) {
			releaseVer = releaseVer[0];
			grunt.log.writeln('Preparing release: ' + releaseVer);
			
			// Generate change log for release using all messages since last tag/release
			var chgLog = execOut(
					'git log `git describe --tags --abbrev=0`..HEAD --pretty=format:"  * %s"',
					opts.chgLog, true, true);

			// Generate list of authors/contributors since last tag/release
			var authors = execOut(
					'git log --all --format="%aN <%aE>" | sort -u', opts.authors, true);

			// Commit local release destination changes
			var commitDistBrch = execOut(
					'git add --all ' + opts.destDir + ' && git commit -m "' + commitMsg + '"');

			// Push release changes
			var pushRelease = execOut(
					'git subtree push --prefix ' + opts.destDir + ' origin ' + opts.destBranch);

			// Push release changes
			var pushRelease = execOut(
					'git tag -a ' + releaseVer + ' -m "' + chgLog +'"');
			
			grunt.log.writeln('Released: ' + releaseVer + ' from subtree ' + opts.destDir 
					+ ' under ' + opts.destBranch);
		}
	}

	/**
	 * Execution With error
	 */
	function execOut(cmd, wpath, nofail, nodups) {
		var rtn = '';
		exec(cmd, function(e, stdout, stderr) {
			if (e) {
				var em = 'Unable to execute "' + cmd + '" for commit number ' 
							+ process.env.TRAVIS_COMMIT + ':\n  ' + stderr;
				var log = nofail ? grunt.warn : grunt.fail;
				log(em);
				log(e);
			} else {
				rtn = stdout;
				if (rtn && nodups) {
					var rs = rtn.split(/\r?\n/g);
					if (rs.length > 1) {
						rtn = '';
						var ll = '';
						for (var i=0; i<rs.length; i++) {
							if (rs[i] != ll) {
								rtn += rs[i];
							}
							ll = rs[i];
						}
					}
				}
				if (rtn && wpath) {
					grunt.file.write(opts.destDir + wpath, rtn);
				}
			}
		});
		return rtn;
	}
};