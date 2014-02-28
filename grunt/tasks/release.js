'use strict';

var shell = require('shelljs');
var util = require('../util');
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
		commit = util.getCommit(grunt, options.commitMessage);
		grunt.log.writeln('Commit message: ' + commit.message);
		if (!commit.version) {
			return;
		}

		// TODO : verify commit message release version is less than
		// current version using "git describe --abbrev=0 --tags"
		grunt.log.writeln('Preparing release: ' + commit.version);
		var relMsg = commit.message + ' ' + util.skipRef('ci');

		// Setup
		var link = '${GH_TOKEN}@github.com/' + commit.slug + '.git';
		runCmd('git config --global user.email "travis@travis-ci.org"');
		runCmd('git config --global user.name "travis"');
		runCmd('git remote rm origin');
		runCmd('git remote add origin https://' + commit.username + ':' + link);

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

		// Cleanup master
		// runCmd('git checkout master');
		// runCmd('git rm -r ' + options.destDir);
		// runCmd('git commit -m "Removing release directory"');
		runCmd('git add --force ' + options.destDir);
		runCmd('git commit --force -m "' + relMsg + '"');
		runCmd('git push --force origin master');

		// Tag release
		runCmd('git tag -a ' + commit.version + ' -m "' + chgLogRtn + '"');
		grunt.log.writeln('Released: ' + commit.version + ' in '
				+ options.destDir);

		// Publish site
		runCmd('git clone --quiet --branch=' + options.destBranch + ' https://'
				+ link + ' ' + options.destBranch + ' > /dev/null');
		runCmd('cd ' + options.destBranch);
		runCmd('git ls-files | xargs rm'); // remove all tracked files
		runCmd('git commit -m "' + relMsg + '"');

		runCmd('cp -a ../' + commit.reponame + '/' + options.destBranch + '/* .');
		//runCmd('git checkout master -- ' + options.destDir);
		runCmd('git add -A');
		runCmd('git commit -m "' + relMsg + '"');
		runCmd('git push -f origin ' + options.destBranch + ' > /dev/null');
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
		grunt.log.writeln(cmd);
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
		if (output && wpath) {
			grunt.file.write(wpath, output);
		}
		return output;
	}
};