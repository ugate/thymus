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

	var cmds = [];
	var commitMsg = process.env.TRAVIS_COMMIT_MESSAGE;
	var releaseVer = '';
	var chgLogRtn = '';
	var authorsRtn = '';
	var commitDistBrch = '';
	var pushDistBrch = '';

	// Capture commit message
	if (!commitMsg) {
		cmds.push(new Command(
			"git show -s --format=%B " + process.env.TRAVIS_COMMIT + " | tr -d '\\n'",
			function(rtn, cnt) {
				commitMsg = rtn;
				releaseVer = extractCommitMsgVer(commitMsg);
			}
		));
	} else {
		releaseVer = extractCommitMsgVer(commitMsg);
	}

	// Generate change log for release using all messages since last
	// tag/release
	cmds.push(new Command(
		'git log `git describe --tags --abbrev=0`..HEAD --pretty=format:"  * %s"',
		function (rtn, cnt) {
			chgLogRtn = rtn;
		}, chgLog, true, true
	));

	// Generate list of authors/contributors since last tag/release
	cmds.push(new Command(
		'git log --all --format="%aN <%aE>" | sort -u',
		function (rtn, cnt) {
			authorsRtn = rtn;
		}, authors, true
	));

	// Commit local release destination changes
	cmds.push(new Command(
		'git add --all ' + destDir + ' && git commit -m "' + commitMsg + '"',
		function (rtn, cnt) {
			commitDistBrch = rtn;
		}
	));

	// Push release changes
	cmds.push(new Command(
		'git subtree push --prefix ' + destDir + ' origin ' + destBranch,
		function (rtn, cnt) {
			pushDistBrch = rtn;
		}
	));

	// Tag release
	cmds.push(new Command(
		function () {
			return 'git tag -a ' + releaseVer + ' -m "' + chgLogRtn +'"';
		},
		function (rtn, cnt) {
			grunt.log.writeln('Released: ' + releaseVer + ' from subtree ' + destDir 
					+ ' under ' + destBranch);
			done();
		}
	));
	
	// execute commands
	execAsync(cmds);

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
		var execCmd = cmd.getCmd.call(cmd);
		grunt.log.writeln(execCmd);
		exec(execCmd, function(e, stdout, stderr) {
			if (e) {
				var em = 'Unable to execute "' + execCmd
						+ '" for commit number '
						+ process.env.TRAVIS_COMMIT + ':\n  ' + stderr;
				grunt.log.error(em);
				grunt.log.error(e);
				if (cmd.retryCount == 0
						&& stderr.indexOf(".git/index.lock': File exists") >= 0) {
					// TODO : possible git issue with lock
					cmd.retryCount++;
					cmds.unshift(new Command('rm -f ./.git/index.lock'));
					cmds.unshift(cmd);
					execAsync(cmds);
				} else {
					cmds = [];
					done(cmd.nofail === 'true');
				}
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
					grunt.file.write(destDir + '/' + cmd.wpath, rtn);
				}
				if (typeof cmd.cb === 'function') {
					if (cmd.cb.call(cmd, rtn, ca.length) === true) {
						return;
					}
				}
				execAsync(cmds);
			}
		});
	}

	/**
	 * Extracts a release version from a commit message
	 * 
	 * @param commitMsg
	 *            the commit message to extract the release version from
	 */
	function extractCommitMsgVer(commitMsg, validate) {
		var v = '';
		if (commitMsg) {
			grunt.log.writeln('Commit message: ' + commitMsg);
			var rv = commitMsg
					.match(/released?\s*v(\d+\.\d+\.\d+(?:-alpha(?:\.\d)?|-beta(?:\.\d)?)?)/im);
			if (rv.length > 1) {
				v = rv[1];
				// TODO : verify commit message release version is less than
				// current version using "git describe --abbrev=0 --tags"
				grunt.log.writeln('Preparing release: ' + v);
			}
		} else if (validate) {
			grunt.log.error('Unable to capture commit message to check for release: ' 
					+ process.env.TRAVIS_COMMIT + ' commit message: ' + commitMsg);
			cmds = [];
			done(false);
		}
		return v;
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
		this.retryCount = 0;
	}
};