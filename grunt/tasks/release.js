'use strict';

var shell = require('shelljs');
var envl = require('../environment');
var regexVer = /%VERSION%/gmi;
var regexDupLines = /^(.*)(\r?\n\1)+$/gm;

/**
 * When a commit message contains "release v" followed by a version number
 * (major.minor.patch) a tagged release will be issued
 * 
 * @param grunt
 *            the grunt instance
 */
module.exports = function(grunt) {

	var commit = null;

	grunt.registerTask('release',
			'Release bundle using commit message (if present)', function() {
				var options = this.options({
					src : process.cwd(),
					commitMessage : '',
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
		var chgLogRtn = '';
		var authorsRtn = '';

		// Capture commit message
		commit = envl.getCommit(grunt, options.commitMessage);
		grunt.log.writeln('Commit message: ' + commit.message);
		if (!commit.version) {
			return;
		}

		// TODO : verify commit message release version is less than
		// current version using "git describe --abbrev=0 --tags"
		grunt.log.writeln('Preparing release: ' + commit.version);
		var relMsg = commit.message + ' ' + envl.skipRef('ci');

		// Set identity
		runCmd('git config --global user.email "travis@travis-ci.org"');
		runCmd('git config --global user.name "Travis"');

		// Generate change log for release using all messages since last
		// tag/release
		var chgLogPath = options.destDir + '/' + options.chgLog;
		chgLogRtn = runCmd(
				'git --no-pager log `git describe --tags --abbrev=0`..HEAD --pretty=format:"  * %s" > '
						+ chgLogPath, null, false, true, chgLogPath);

		// Generate list of authors/contributors since last tag/release
		var authorsPath = options.destDir + '/' + options.authors;
		authorsRtn = runCmd('git log --all --format="%aN <%aE>" | sort -u > '
				+ authorsPath, null, true, false, authorsPath);

		// Commit local release destination changes
		runCmd('git add --force ' + options.destDir);
		runCmd('git commit -m "' + relMsg + '" -- ' + options.destDir);

		// Checkout destination branch
		runCmd('git checkout -b ' + options.destBranch);
		runCmd({
			shell : 'rm',
			args : [ '-rf', '*' ]
		});
		runCmd('git checkout -b master -- ' + options.destDir);
		runCmd('git add --force ' + options.destDir);
		runCmd('git commit -m "' + relMsg + '"');
		runCmd('git push ' + options.destBranch);

		// Cleanup master
		// runCmd('git checkout master');
		// runCmd('git rm -r ' + options.destDir);
		// runCmd('git commit -m "Removing release directory"');
		runCmd('git push -b master');

		// Tag release
		runCmd('git tag -a ' + commit.version + ' -m "' + chgLogRtn + '"');
		grunt.log.writeln('Released: ' + commit.version + ' from '
				+ options.destDir + ' to ' + options.destBranch);
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
	 * @param shortlog
	 *            true to log only the length of the output
	 * @param dupsPath
	 *            path to the command output that will be read, duplicate entry
	 *            lines removed and re-written
	 */
	function runCmd(cmd, wpath, nofail, shortlog, dupsPath) {
		grunt.log.writeln('>> ' + cmd);
		var rtn = null;
		if (typeof cmd === 'string') {
			rtn = shell.exec(cmd, {
				silent : true
			});
		} else {
			rtn = shell[cmd.shell].apply(shell, cmd.args);
		}
		if (rtn.code !== 0) {
			var e = 'Error "' + rtn.code + '" for commit number '
					+ commit.number + ' ' + rtn.output;
			if (nofail) {
				grunt.log.error(e);
				return;
			}
			throw grunt.util.error(e);
		}
		var output = rtn.output;
		if (dupsPath) {
			// remove duplicate lines
			output = grunt.file.read(dupsPath).replace(regexDupLines, '$1');
			grunt.file.write(dupsPath, output);
		}
		grunt.log.writeln('<< '
				+ (shortlog === true || !output.length ? output.length
						+ ' characters' : output));
		if (output && wpath) {
			grunt.file.write(wpath, output);
		}
		return output;
	}
};