'use strict';

var exec = require('child_process').exec;

/**
 * Releases
 * 
 * @param process
 * @param grunt
 */
module.exports = function(grunt) {

	grunt.registerTask('release', 'Release', function() {
		grunt.log.writeln('Currently running the "release" task.');

		var options = this.options({
			src : process.cwd(),
			destBranch : 'gh-pages',
			destDir : 'dist',
			chgLog : 'HISTORY.md',
			authors : 'AUTHORS.md'
		});

		// When a commit message contains "release v" followed by a version number
		// (major.minor.path) push release and
		var commitMsg = process.env.TRAVIS_COMMIT_MESSAGE;
		if (typeof commitMsg === 'undefined') {
			// TODO : the following can be removed once
			// https://github.com/travis-ci/travis-ci/issues/965 is resolved
			commitMsg = execRslt('git show -s --format=%B ' 
									+ process.env.TRAVIS_COMMIT 
									+ ' | tr -d \'\n\'', 
								 'Unable to capture commit message for commit number '
									+ process.env.TRAVIS_COMMIT);
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
						options.chgLog, true, true);

				// Generate list of authors/contributors since last tag/release
				var authors = execOut(
						'git log --all --format="%aN <%aE>" | sort -u', options.authors, true);

				// Commit local release destination changes
				var commitDistBrch = execOut(
						'git add --all ' + options.destDir + ' && git commit -m "' + commitMsg + '"');

				// Push release changes
				var pushRelease = execOut(
						'git subtree push --prefix ' + options.destDir + ' origin ' + options.destBranch);

				// Push release changes
				var pushRelease = execOut(
						'git tag -a ' + releaseVer + ' -m "' + chgLog +'"');
				
			}
		}

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
						grunt.file.write(options.destDir + wpath, rtn);
					}
				}
			});
			return rtn;
		}
	});
};