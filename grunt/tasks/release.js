'use strict';

var shell = require('shelljs');
var fs = require('fs');
var zlib = require('zlib');
var util = require('../util');
var regexDupLines = /^(.*)(\r?\n\1)+$/gm;
var regexKey = /(https?:\/\/|:)+(?=[^:]*$)[a-z0-9]+(@)/gmi;
var regexHost = /^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i;

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
					authors : 'AUTHORS.md',
					distAsset : true
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

		// Create distribution assets
		var distAsset = commit.reponame + '-' + commit.version + '-dist.zip';
		runCmd('git archive -v -o ' + distAsset + ' --format=zip '
				+ options.destDir + '/');

		// Generate change log for release using all messages since last
		// tag/release
		var chgLogPath = options.destDir + '/' + options.chgLog;
		chgLogRtn = runCmd('git --no-pager log ' + commit.versionTag
				+ '..HEAD --pretty=format:"  * %s" > ' + chgLogPath, null,
				false, true, chgLogPath);

		// Generate list of authors/contributors since last tag/release
		var authorsPath = options.destDir + '/' + options.authors;
		authorsRtn = runCmd('git log --all --format="%aN <%aE>" | sort -u > '
				+ authorsPath, null, true, false, authorsPath);

		// Setup
		var link = '${GH_TOKEN}@github.com/' + commit.slug + '.git';
		runCmd('git config --global user.email "travis@travis-ci.org"');
		runCmd('git config --global user.name "travis"');
		runCmd('git remote rm origin');
		runCmd('git remote add origin https://' + commit.username + ':' + link);
		runCmd('git checkout master');

		// Commit changes to master
		// runCmd('git add --force ' + options.destDir);
		// runCmd('git commit -m "' + relMsg + '"');
		// runCmd('git push -f origin master');

		// Tag release
		runCmd('git tag -f -a ' + commit.versionTag + ' -m "' + chgLogRtn + '"');
		runCmd('git push -f origin ' + commit.versionTag);
		grunt.log.writeln('Released: ' + commit.version + ' in '
				+ options.destDir);

		// Distribute archive asset for tagged release
		var done = this.async();
		uploadDistAsset(distAsset, commit, options, function(json, e) {
			if (e) {
				grunt.log.error(grunt.util.error('Failed to upload asset '
						+ distAsset, e));
			} else if (cf.state != 'uploaded') {
				e = grunt.util.error('Asset upload failed with state: '
						+ cf.state);
				grunt.log.error(e);
			} else {
				grunt.log.writeln('Distributed/' + cf.state + ' ' + distAsset
						+ ' asset');
			}
			done(e);
		});

		// Publish site
		/*
		 * runCmd('cd ..'); runCmd('git clone --quiet --branch=' +
		 * options.destBranch + ' https://' + link + ' ' + options.destBranch + ' >
		 * /dev/null'); runCmd('cd ' + options.destBranch); runCmd('git ls-files |
		 * xargs rm'); // remove all tracked files runCmd('git commit -m "' +
		 * relMsg + '"');
		 * 
		 * runCmd('cp -a ../' + commit.reponame + '/' + options.destBranch + '/*
		 * .'); // runCmd('git checkout master -- ' + options.destDir);
		 * runCmd('git add -A'); runCmd('git commit -m "' + relMsg + '"');
		 * runCmd('git push -f origin ' + options.destBranch + ' > /dev/null');
		 */
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
		if (output) {
			grunt.log.writeln(output.replace(regexKey, '$1[SECURE]$2'));
		}
		return output;
	}

	/**
	 * Uploads the file asset and associates it with a specified tagged release
	 * see http://developer.github.com/v3/repos/releases/#upload-a-release-asset
	 * 
	 * @param filePath
	 *            the path to the file that will be added
	 * @param commit
	 *            the commit the asset is for
	 * @param options
	 *            the task options
	 * @param cb
	 *            the call back function (passed parameters: JSON response,
	 *            error)
	 */
	function uploadDistAsset(filePath, commit, options, cb) {
		var https = require('https');
		var opts = {
			hostname : 'api.github.com',
			port : 443,
			path : '/repos/' + commit.slug + '/releases',
			method : 'GET'
		};
		var req = https.request(opts, function(res) {
			var sc = res.statusCode;
			res.on('data', function(d) {
				var rls = null, rl = null;
				try {
					rls = JSON.parse(d);
					for ( var i = 0; i < rls.length; i++) {
						if (rls[i].tag_name == commit.versionTag) {
							// upload asset
							rl = rls[i];
							opts.method = 'POST';
							opts.path = rl.upload_url.replace(regexHost,
									function(m, h) {
										opts.hostname = h;
										return '/';
									});
							opts.path = opts.path.replace(/{(\?.+)}/, '$1='
									+ commit.versionTag);
							opts.headers = {
								'Content-Type' : 'application/zip'
							};
							var req2 = https.request(opts, function(res2) {
								res.on('data', function(d2) {
									var cf = null;
									try {
										cf = JSON.parse(d2);
										try {
											cb(cf);
										} catch (e) {
											// consume
										}
									} catch (e) {
										cb(cf || rl, e);
									}
								});
							});
							req2.on('error', function(e) {
								cb(rl, e);
							});
							reqWrite(req2, filePath);
							break;
						}
					}
				} catch (e) {
					cb(rl || rls, e);
				}
			});
		});
		req.end();
		req.on('error', function(e) {
			cb(null, e);
		});
	}

	/**
	 * Writes file to the specified stream
	 * 
	 * @param stream
	 *            the stream to write to
	 * @param filePath
	 *            the file path to read from
	 */
	function reqWrite(stream, filePath) {
		var chunkSize = 64 * 1024;
		var bufSize = 64 * 1024;
		var bufPos = 0;
		var buf = new Buffer(bufSize);
		fs.createReadStream(filePath, {
			'flags' : 'r',
			'encoding' : 'binary',
			'mode' : '\0666',
			'bufferSize' : chunkSize
		}).addListener("data", function(chunk) {
			// Since this is binary data, we cat use String.prototype.length We
			// *WANT* the number of chars, since node uses UTF-16 for bin data
			// meaning one byte bin data = one char = two bytes.
			var bufNextPos = bufPos + chunk.length;
			if (bufNextPos == bufSize) {
				buf.write(chunk, 'binary', bufPos);
				stream.write(buf);
				bufPos = 0;
			} else {
				buf.write(chunk, 'binary', bufPos);
				bufPos = bufNextPos;
			}
		}).addListener("close", function() {
			if (bufPos != 0) {
				stream.write(buf.slice(0, bufPos));
				stream.end();
			} else {
				stream.close();
			}
		});
	}
};