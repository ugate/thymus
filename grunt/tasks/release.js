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

	grunt.log.writeln('Currently running the "release" task.');

	src = src || process.cwd();
	destBranch = destBranch || 'gh-pages';
	destDir = destDir || 'dist';
	chgLog = chgLog || 'HISTORY.md';
	authors = authors || 'AUTHORS.md';

	var exec = require('child_process').exec;
	var done = this.async();

	var commitMsg = process.env.TRAVIS_COMMIT_MESSAGE;
	if (typeof commitMsg === 'undefined') {
		// TODO : the following can be removed once
		// https://github.com/travis-ci/travis-ci/issues/965 is resolved
		execAsync(new Command(
			"git show -s --format=%B " + process.env.TRAVIS_COMMIT + " | tr -d '\\n'",
			function(rtn) {
				release(rtn);
			}
		));
	} else {
		release(commitMsg);
	}

	/**
	 * Processes release task using the commit message as a trigger
	 * 
	 * @param commitMsg
	 *            the current commit message
	 */
	function release(commitMsg) {
		if (commitMsg) {
			grunt.log.writeln('Commit message: ' + commitMsg);
			var releaseVer = commitMsg
					.match(/release v(\d+\.\d+\.\d+(?:-alpha(?:\.\d)?|-beta(?:\.\d)?)?/im); 
			if (releaseVer.length) {
				releaseVer = releaseVer[0];
				grunt.log.writeln('Preparing release: ' + releaseVer);
				var cmds = [];
				var chgLog = '';
				var authors = '';
				var commitDistBrch = '';
				var pushDistBrch = '';

				// Generate change log for release using all messages since last
				// tag/release
				cmds.push(new Command(
					'git log `git describe --tags --abbrev=0`..HEAD --pretty=format:"  * %s"',
					function (rtn, cnt) {
						chgLog = rtn;
					}, opts.chgLog, true, true
				));

				// Generate list of authors/contributors since last tag/release
				cmds.push(new Command(
					'git log --all --format="%aN <%aE>" | sort -u',
					function (rtn, cnt) {
						authors = rtn;
					}, opts.authors, true
				));

				// Commit local release destination changes
				cmds.push(new Command(
					'git add --all ' + opts.destDir + ' && git commit -m "' + commitMsg + '"',
					function (rtn, cnt) {
						commitDistBrch = rtn;
					}
				));

				// Push release changes
				cmds.push(new Command(
					'git subtree push --prefix ' + opts.destDir + ' origin ' + opts.destBranch,
					function (rtn, cnt) {
						pushDistBrch = rtn;
					}
				));

				// Tag release
				cmds.push(new Command(
					function () {
						return 'git tag -a ' + releaseVer + ' -m "' + chgLog +'"';
					},
					function (rtn, cnt) {
						grunt.log.writeln('Released: ' + releaseVer + ' from subtree ' + opts.destDir 
								+ ' under ' + opts.destBranch);
						done();
					}
				));
				
				// execute commands
				execAsync(cmds);
			}
		} else {
			grunt.warn('Unable to capture commit message to check for release: ' 
					+ process.env.TRAVIS_COMMIT + ' commit message: ' + commitMsg);
			done(false);
		}
	}

	/**
	 * Command for execution
	 * 
	 * @param getCmd
	 *            the command string or function that will return a command
	 *            string
	 * @param cb
	 *            the function call back when the command completes
	 * @param wpath
	 *            the optional path/file to write the results to
	 * @param nofail
	 *            true to just log errors, else fail when an error occurs
	 * @param nodups
	 *            true to remove duplicate entry lines from results
	 */
	function Command(getCmd, cb, wpath, nofail, nodups) {
		this.getCmd = typeof getCmd === 'function' ? getCmd : function() {
			return getCmd;
		};
		this.cb = cb;
		this.wpath = wpath;
		this.nofail = nofail;
		this.nodups = nodups;
	}

	/**
	 * Executes an array of {Command}
	 * 
	 * @param cmds
	 *            the array of {Command} or (a single {Command})
	 */
	function execAsync(cmds) {
		var ca = cmds instanceof Command ? [ cmds ] : cmds;
		if (!ca.length) {
			return;
		}
		var cmd = ca.shift();
		exec(cmd.getCmd.call(cmd), function(e, stdout, stderr) {
			if (e) {
				var em = 'Unable to execute "' + cmd.getCmd.call(cmd) + '" for commit number ' 
							+ process.env.TRAVIS_COMMIT + ':\n  ' + stderr;
				var log = cmd.nofail ? grunt.log : grunt.fail;
				log(em);
				log(e);
				done(false);
			} else {
				var rtn = stdout;
				if (rtn && cmd.nodups) {
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
				if (rtn && cmd.wpath) {
					grunt.file.write(opts.destDir + cmd.wpath, rtn);
				}
				if (typeof cmd.cb === 'function') {
					cmd.cb.call(cmd, rtn, ca.length);
				}
				execAsync(cmds);
			}
		});
	}
};