'use strict';

var shell = require('shelljs');
var fs = require('fs');
var zlib = require('zlib');
var util = require('../util');
var regexLastVer = /v(?=[^v]*$).+/g;
var regexLines = /(\r?\n)/g;
var regexDupLines = /^(.*)(\r?\n\1)+$/gm;
var regexKey = /(https?:\/\/|:)+(?=[^:]*$)[a-z0-9]+(@)/gmi;
var regexHost = /^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i;
var gitHubHostname = 'github';
var gitHubRegexParam = /{(\?.+)}/;
var gitHubReleaseTagName = 'tag_name';
var gitHubReleaseUploadUrl = 'upload_url';
var gitHubReleaseCommitish = 'target_commitish';
var gitHubReleaseId = 'id';
var gitHubReleaseName = 'name';
var gitHubReleaseBody = 'body';
var gitHubReleaseDraftFlag = 'draft';
var gitHubReleasePreFlag = 'prerelease';
var gitHubReleaseErrors = 'errors';
var gitHubReleaseErrorMsg = 'message';

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
					chgLogLinePrefix : '  * ',
					chgLogRequired : true,
					authorsRequired : false,
					distAsset : true,
					distAssetFormat : 'zip',
					distAssetCompressRatio : 9,
					gitHostname : gitHubHostname
				});
				release(this, options);
			});

	/**
	 * When a release commit message is received a release is performed and a
	 * repository web site is published
	 * 
	 * @param task
	 *            the current running task instance
	 * @param options
	 *            the grunt options
	 */
	function release(task, options) {
		var logger = new util.Logger(grunt.log.writeln, grunt.log.error,
				grunt.log.warn);
		var chgLogRtn = '';
		var authorsRtn = '';
		var doneAsync = null;

		// Capture commit message
		commit = util.getCommit(logger, options.commitMessage);
		grunt.log.writeln('Commit message: ' + commit.message);
		if (!commit.version) {
			return;
		}

		// NOTE : clone depth needs to be high enough to capture details
		// gathered by GIT (see git depth option in .travis.yml)
		// TODO : verify release version using "semver"
		var lastVerTag = runCmd('git describe --abbrev=0 --tags').replace(
				regexLines, '');
		grunt.log.writeln('Preparing release: ' + commit.version
				+ ' (last release: ' + lastVerTag + ')');
		var useGitHub = options.gitHostname.toLowerCase() === gitHubHostname;
		var relMsg = commit.message + ' ' + util.skipRef('ci');

		// Generate change log for release using all messages since last
		// tag/release
		var chgLogPath = options.destDir + '/' + options.chgLog;
		chgLogRtn = runCmd('git --no-pager log ' + lastVerTag
				+ '..HEAD --pretty=format:"' + options.chgLogLinePrefix
				+ '%s" > ' + chgLogPath, null, false, chgLogPath);
		if (options.chgLogRequired && !validateFile(chgLogPath, logger)) {
			return done();
		}

		// Generate list of authors/contributors since last tag/release
		var authorsPath = options.destDir + '/' + options.authors;
		authorsRtn = runCmd('git log --all --format="%aN <%aE>" | sort -u > '
				+ authorsPath, null, false, authorsPath);
		if (options.authorsRequired && !validateFile(authorsPath, logger)) {
			return done();
		}

		// Setup
		var link = '${GH_TOKEN}@github.com/' + commit.slug + '.git';
		runCmd('git config --global user.email "travis@travis-ci.org"');
		runCmd('git config --global user.name "travis"');
		runCmd('git remote rm origin');
		runCmd('git remote add origin https://' + commit.username + ':' + link);
		// runCmd('git checkout master');

		// Commit changes to master (needed to generate archive asset)
		runCmd('git add --force ' + options.destDir);
		runCmd('git commit -q -m "' + relMsg + '"');
		// runCmd('git push -f origin master');

		// Create distribution assets
		var distAsset = commit.reponame + '-' + commit.version + '-dist.'
				+ options.distAssetFormat;
		runCmd('git archive -o ' + distAsset + ' --format='
				+ options.distAssetFormat + ' -'
				+ options.distAssetCompressRatio + ' HEAD:' + options.destDir);

		// Tag release
		grunt.log.writeln('Releasing ' + commit.versionTag + ' via '
				+ options.gitHostname);
		if (!useGitHub) {
			runCmd('git tag -f -a ' + commit.versionTag + ' -m "'
					+ chgLogRtn.replace(regexLines, '$1 \\') + '"');
			runCmd('git push -f origin ' + commit.versionTag);
			try {
				// TODO : upload asset?
				publish(function(step, o, e) {
					grunt.log.writeln('Rolling back ' + commit.versionTag
							+ ' release via ' + options.gitHostname);
					runCmd('git push --delete origin ' + commit.versionTag);
				}, done, options, link, commit);
			} catch (e) {
				logger.add(e);
				return done();
			}
		} else {
			// Release and distribute archive asset for tagged release
			// Need asynchronous processing from this point on
			doneAsync = task.async();
			releaseAndUploadAsset({
				path : distAsset,
				name : distAsset
			}, 'application/zip', util.getGitToken(), commit, chgLogRtn,
					options, logger, function(step, json, rb, e) {
						try {
							if (e.length) {
								logger.add('Failed to ' + step + ' '
										+ distAsset);
								done();
							} else if (json && json.state != 'uploaded') {
								logger.add(step + ' failed with state: '
										+ json.state);
								done();
							} else {
								grunt.log.writeln('Distributed/' + cf.state
										+ ' ' + distAsset + ' asset');
								publish(rb, done, options, link, commit);
							}
						} catch (e2) {
							logger.add(e2);
							done();
						}
					});
		}

		/**
		 * When running in asynchronous mode grunt will be notified the process
		 * is complete
		 * 
		 * @param passed
		 *            true when completed without error
		 * @returns the return value from grunt when running in asynchronous
		 *          mode, otherwise, the passed value
		 */
		function done() {
			logger.dump();
			if (doneAsync) {
				return doneAsync(logger.warnErrorCount() <= 0);
			} else if (!passed) {
				throw new Error('Release failed');
			}
			return true;
		}
	}

	/**
	 * Publish repository web site
	 * 
	 * @param rb
	 *            the rollback function to call when the publish fails
	 * @param done
	 *            the grunt done function
	 * @param options
	 *            the grunt options
	 * @param link
	 *            the link to the repository
	 * @param commit
	 *            the commit object the release is for (should have a valid ID)
	 */
	function publish(rb, done, logger, options, link, commit) {
		if (!commit.releaseId) {
			grunt.log.writeln('No release ID Skipping publishing to '
					+ options.destBranch);
			return;
		}
		try {
			runCmd('cd ..');
			runCmd('git clone --quiet --branch=' + options.destBranch
					+ ' https://' + link + ' ' + options.destBranch
					+ ' > /dev/null');
			runCmd('cd ' + options.destBranch);
			runCmd('git ls-files | xargs rm');
			// remove all tracked files runCmd('git commit -m "' + relMsg +
			// '"');

			runCmd('cp -a ../' + commit.reponame + '/' + options.destBranch
					+ '/*.');
			// runCmd('git checkout master -- ' + options.destDir);
			runCmd('git add -A');
			runCmd('git commit -m "' + relMsg + '"');
			runCmd('git push -f origin ' + options.destBranch + ' > /dev/null');

			done();
		} catch (e) {
			if (typeof rb === 'function') {
				rb(function(step, o, e2) {
					if (e2) {
						// rollback failed
						logger.add('Release rollback failed');
						logger.add(e);
						done();
					} else {
						done();
					}
				});
			} else {
				logger.add(e);
				done();
			}
		}
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
	 * @param dupsPath
	 *            path to the command output that will be read, duplicate entry
	 *            lines removed and re-written
	 */
	function runCmd(cmd, wpath, nofail, dupsPath) {
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
				logger.add(e);
				return;
			}
			throw grunt.util.error(e);
		}
		var output = rtn.output;
		if (output) {
			output = output.replace(regexKey, '$1[SECURE]$2');
		}
		if (output && wpath) {
			grunt.file.write(wpath, output);
		}
		if (dupsPath) {
			// remove duplicate lines
			if (!output) {
				output = grunt.file.read(dupsPath, {
					encoding : grunt.file.defaultEncoding
				});
			}
			if (output) {
				output = output.replace(regexDupLines, '$1');
				grunt.file.write(dupsPath, output);
			}
		}
		if (output) {
			grunt.log.writeln(output);
			return output;
		}
		return '';
	}

	/**
	 * Determines if a file has content and logs an error when the the file is
	 * empty
	 * 
	 * @param path
	 *            the path to the file
	 * @param logger
	 *            the {util.Logger} instance
	 * @returns true when the file contains data or the path is invalid
	 */
	function validateFile(path, logger) {
		var stat = path ? fs.statSync(path) : {
			size : 0
		};
		if (!stat.size) {
			logger.add('Failed to find any entries in "' + path
					+ '" (file size: ' + stat.size + ')');
			return false;
		}
		return true;
	}

	/**
	 * Tags/Releases from default branch (see
	 * http://developer.github.com/v3/repos/releases/#create-a-release ) and
	 * Uploads the file asset and associates it with a specified tagged release
	 * (see
	 * http://developer.github.com/v3/repos/releases/#upload-a-release-asset )
	 * 
	 * @param asset
	 *            an object containing a <code>path</code> and
	 *            <code>name</code> of the asset to be uploaded
	 * @param contentType
	 *            the content type of the file being uploaded
	 * @param authToken
	 *            the authorization token that will be used for uploading the
	 *            asset
	 * @param commit
	 *            the commit object the asset is for
	 * @param desc
	 *            release description (can be in markdown)
	 * @param options
	 *            the task options
	 * @param logger
	 *            the {util.Logger} instance
	 * @param cb
	 *            the call back function (passed parameters: the current task,
	 *            JSON response, error)
	 */
	function releaseAndUploadAsset(asset, contentType, authToken, commit, desc,
			options, logger, cb) {
		var step = 'release';
		if (!authToken) {
			cbi(null, grunt.util.error('Invalid authorization token'));
			return;
		}
		var data = '', data2 = '', rl = null, cf = null, called = false;
		// check if API responded with an error message
		function chk(o) {
			if (o[gitHubReleaseErrorMsg]) {
				throw new Error(JSON.stringify(o));
			}
			return o;
		}
		var json = {};
		json[gitHubReleaseTagName] = commit.versionTag;
		json[gitHubReleaseName] = commit.versionTag;
		json[gitHubReleaseBody] = desc;
		json[gitHubReleaseCommitish] = commit.number;
		json[gitHubReleasePreFlag] = commit.versionPrereleaseType != null;
		json = JSON.stringify(json);
		var fstat = asset && asset.path ? fs.statSync(asset.path) : {
			size : 0
		};
		var releasePath = '/repos/' + commit.slug + '/releases';
		var https = require('https');
		var opts = {
			hostname : 'api.github.com',
			port : 443,
			path : releasePath,
			method : 'POST'
		};
		opts.headers = {
			'User-Agent' : commit.slug,
			'Authorization' : 'token ' + process.env.GH_TOKEN,
			'Content-Type' : 'application/json',
			'Content-Length' : json.length
		};
		// post new tag/release
		var req = https.request(opts, function(res) {
			var sc = res.statusCode;
			res.on('data', function(chunk) {
				data += chunk;
			});
			res.on('end', function() {
				try {
					rl = chk(JSON.parse(data.replace(regexLines, ' ')));
					if (rl[gitHubReleaseTagName] == commit.versionTag) {
						commit.releaseId = rl[gitHubReleaseId];
						if (fstat.size <= 0) {
							cbi();
							return;
						}
						grunt.log.writeln('Uploading "' + asset.path
								+ '" release asset for ' + commit.versionTag
								+ ' via ' + options.gitHostname);
						step = 'upload asset';
						opts.method = 'POST';
						opts.path = rl[gitHubReleaseUploadUrl].replace(
								regexHost, function(m, h) {
									opts.hostname = h;
									return '/';
								});
						opts.path = opts.path.replace(gitHubRegexParam, '$1='
								+ (asset.name || commit.versionTag));
						opts.headers['Content-Type'] = contentType;
						opts.headers['Content-Length'] = fstat.size;
						var req2 = https.request(opts, function(res2) {
							res2.on('data', function(chunk) {
								data2 += chunk;
							});
							res2.on('end', function() {
								try {
									cf = chk(JSON.parse(data2.replace(
											regexLines, ' ')));
									try {
										cbi();
									} catch (e) {
										// consume
									}
								} catch (e) {
									cbi(e);
								}
							});
						});
						req2.on('error', function(e) {
							cbi(e);
						});
						streamWrite(req2, asset.path);
					} else {
						cbi('No tag found for ' + commit.versionTag + ' in '
								+ tags.join(','));
					}
				} catch (e) {
					cbi(e);
				}
			});
		});
		req.end(json);
		req.on('error', function(e) {
			cbi(e);
		});

		/**
		 * Handles callback once the release and asset upload completes or an
		 * error occurs during the process. When one or more error(s) are
		 * present and a prior tagged release has taken place, an attempt is
		 * made to rollback the release by removing the tagged release via the
		 * external GitHub API.
		 * 
		 * @param e
		 *            an error object or string when the callback is taking
		 *            place due to an error
		 */
		function cbi(e) {
			if (called) {
				return;
			}
			logger.add(e);
			var o = cf || rl;
			var rb = logger.warnErrorCount() && commit.releaseId;

			/**
			 * Rollback callback
			 * 
			 * @param fx
			 *            the callback function that will receive the last step
			 *            taken before the rollback (e.g. release, asset upload,
			 *            etc.) and the last received object from the external
			 *            API.
			 */
			function rbcb(fx) {
				try {
					if (!rb) {
						fx(step, om);
						return;
					}
					// rollback release
					grunt.log.writeln('Rolling back ' + commit.versionTag
							+ ' release via ' + options.gitHostname);
					opts.path = releasePath + '/' + commit.releaseId;
					opts.method = 'DELETE';
					opts.headers['Content-Type'] = undefined;
					opts.headers['Content-Length'] = undefined;
					req = https.request(opts, function(res) {
						res.on('end', function() {
							if (!called) {
								fx(step, o);
							}
						});
					});
					req.end();
					req.on('error', function(e2) {
						if (!called) {
							logger.add(e2);
							logger.add('Failed to rollback release ID '
									+ commit.releaseId);
							fx(step, o);
						}
					});
				} catch (e2) {
					if (!called) {
						logger.add(e2);
						logger.add('Failed to call rollback for release ID '
								+ commit.releaseId);
						fx(step, o);
					}
				}
			}
			try {
				cb(step, o, rbcb);
			} catch (e) {
				// consume
			}
			called = true;
		}
	}

	/**
	 * Writes file to the specified stream
	 * 
	 * @param stream
	 *            the stream to write to
	 * @param filePath
	 *            the file path to read from
	 */
	function streamWrite(stream, filePath) {
		var chunkSize = 64 * 1024;
		var bufSize = 64 * 1024;
		var bufPos = 0;
		var buf = new Buffer(bufSize);
		fs.createReadStream(filePath, {
			'flags' : 'r',
			'encoding' : 'binary',
			'mode' : 438, /* 0666 */
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