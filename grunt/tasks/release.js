'use strict';

var shell = require('shelljs');
var fs = require('fs');
var zlib = require('zlib');
var util = require('../util');
var regexLastVer = /v(?=[^v]*$).+/g;
var regexLines = /\r?\n/g;
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
					distAsset : true,
					gitHostname : gitHubHostname
				});
				var done = this.async();
				try {
					release.call(this, done, options);
				} catch (e) {
					done(e);
				}
			});

	/**
	 * When a release commit message is received a release is performed and a
	 * repository web site is published
	 * 
	 * @param done
	 *            the grunt done function
	 * @param options
	 *            the grunt options
	 */
	function release(done, options) {
		var chgLogRtn = '';
		var authorsRtn = '';

		// Capture commit message
		commit = util.getCommit(grunt, options.commitMessage);
		grunt.log.writeln('Commit message: ' + commit.message);
		if (!commit.version) {
			return;
		}

		// NOTE : clone depth needs to be high enough to capture details
		// gathered by GIT (see depth option in .travis.yml)
		// TODO : verify release version is less than last release version
		var lastVerTag = runCmd('git describe --abbrev=0 --tags').replace(
				regexLines, '');
		grunt.log.writeln('Preparing release: ' + commit.version
				+ ' (last release: ' + lastVerTag + ')');
		var relMsg = commit.message + ' ' + util.skipRef('ci');

		// Generate change log for release using all messages since last
		// tag/release
		var chgLogPath = options.destDir + '/' + options.chgLog;
		chgLogRtn = runCmd('git --no-pager log ' + lastVerTag
				+ '..HEAD --pretty=format:"  * %s" > ' + chgLogPath, null,
				false, chgLogPath);

		// Generate list of authors/contributors since last tag/release
		var authorsPath = options.destDir + '/' + options.authors;
		authorsRtn = runCmd('git log --all --format="%aN <%aE>" | sort -u > '
				+ authorsPath, null, false, authorsPath);

		// Setup
		var link = '${GH_TOKEN}@github.com/' + commit.slug + '.git';
		runCmd('git config --global user.email "travis@travis-ci.org"');
		runCmd('git config --global user.name "travis"');
		runCmd('git remote rm origin');
		runCmd('git remote add origin https://' + commit.username + ':' + link);
		// runCmd('git checkout master');

		// Commit changes to master
		runCmd('git add --force ' + options.destDir);
		runCmd('git commit -m "' + relMsg + '"');
		// runCmd('git push -f origin master');

		// Create distribution assets
		var distAsset = commit.reponame + '-' + commit.version + '-dist.zip';
		runCmd('git archive -v -o ' + distAsset + ' --format=zip HEAD '
				+ options.destDir);

		// Tag release
		if (options.gitHostname.toLowerCase() !== gitHubHostname) {
			runCmd('git tag -f -a ' + commit.versionTag + ' -m "' + chgLogRtn
					+ '"');
			runCmd('git push -f origin ' + commit.versionTag);
			try {
				// TODO : upload asset?
				publish(function(step, o, e) {
					// rollback
					runCmd('git push --delete origin ' + commit.versionTag);
				}, done, options, link, commit);
			} catch (e) {
				grunt.log.error(e);
				done(false);
			}
		} else {
			// Distribute archive asset for tagged release
			grunt.log.writeln('Uploading "' + distAsset
					+ '" release asset for ' + commit.versionTag);
			releaseAndUploadAsset(distAsset, 'application/zip', util
					.getGitToken(), commit, chgLogRtn, options, function(step,
					json, rb, e) {
				try {
					if (e.length) {
						grunt.log.error(new Error('Failed to ' + step + ' '
								+ distAsset));
						for (var i = 0; i < e.length; i++) {
							grunt.log.error(e[i]);
						}
						done(false);
					} else if (json && json.state != 'uploaded') {
						grunt.log.error(new Error(step + ' failed with state: '
								+ json.state));
						done(false);
					} else {
						grunt.log.writeln('Distributed/' + cf.state + ' '
								+ distAsset + ' asset');
						publish(rb, done, options, link, commit);
					}
				} catch (e2) {
					grunt.log.error(e2);
					done(false);
				}
			});
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
	function publish(rb, done, options, link, commit) {
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
						grunt.log.error(new Error('Release rollback failed'));
						for (var i = 0; i < e2.length; i++) {
							grunt.log.error(e2[i]);
						}
						grunt.log.error(e);
						done(false);
					} else {
						done();
					}
				});
			} else {
				grunt.log.error(e);
				done(false);
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
				grunt.log.error(e);
				return;
			}
			throw grunt.util.error(e);
		}
		var output = rtn.output;
		if (output && wpath) {
			grunt.file.write(wpath, output);
		}
		if (dupsPath) {
			// remove duplicate lines
			output = grunt.file.read(dupsPath, {
				encoding : grunt.file.defaultEncoding
			}).replace(regexDupLines, '$1');
			grunt.file.write(dupsPath, output);
		}
		if (output) {
			grunt.log.writeln(output.replace(regexKey, '$1[SECURE]$2'));
		}
		return output || '';
	}

	/**
	 * Tags/Releases from default branch (see
	 * http://developer.github.com/v3/repos/releases/#create-a-release ) and
	 * Uploads the file asset and associates it with a specified tagged release
	 * (see
	 * http://developer.github.com/v3/repos/releases/#upload-a-release-asset )
	 * 
	 * @param filePath
	 *            the path to the file that will be added
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
	 * @param cb
	 *            the call back function (passed parameters: the current task,
	 *            JSON response, error)
	 */
	function releaseAndUploadAsset(filePath, contentType, authToken, commit,
			desc, options, cb) {
		var step = 'release';
		if (!authToken) {
			cbi(null, grunt.util.error('Invalid authorization token'));
			return;
		}
		var data = '', data2 = '', rl = null, cf = null, called = false, errors = [];
		// check if API responded with an error message
		function chk(o) {
			if (o[gitHubReleaseErrorMsg]) {
				throw new Error(o[gitHubReleaseErrorMsg]);
			}
			return o;
		}
		// set new release API parameters
		var params = new util.UrlParams(grunt, gitHubReleaseTagName,
				commit.versionTag, gitHubReleaseName, commit.versionTag,
				gitHubReleaseBody, desc, gitHubReleaseCommitish, commit.number,
				gitHubReleasePreFlag, commit.preReleaseType != null);
		var fstat = fs.statSync(filePath);
		var releasePath = '/repos/' + commit.slug + '/releases';
		var https = require('https');
		var opts = {
			hostname : 'api.github.com',
			port : 443,
			path : releasePath + params.get(),
			method : 'POST'
		};
		opts.headers = {
			'User-Agent' : commit.slug,
			'Authorization' : 'token ' + process.env.GH_TOKEN
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
						commit.releaseId = cf[gitHubReleaseId];
						if (!filePath) {
							cbi();
							return;
						}
						// upload asset
						step = 'upload asset';
						opts.method = 'POST';
						opts.path = rl[gitHubReleaseUploadUrl].replace(
								regexHost, function(m, h) {
									opts.hostname = h;
									return '/';
								});
						opts.path = opts.path.replace(gitHubRegexParam, '$1='
								+ commit.versionTag);
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
						streamWrite(req2, filePath);
					} else {
						cbi('No tag found for ' + commit.versionTag + ' in '
								+ tags.join(','));
					}
				} catch (e) {
					cbi(e);
				}
			});
		});
		req.end();
		req.on('error', function(e) {
			cbi(e);
		});

		/**
		 * Handles callback once the release and asset upload completes or an
		 * error occurs during the process. When one or more errors are present
		 * and a prior tagged release has taken place, an attempt is made to
		 * rollback the release by removing the tagged release via the external
		 * GitHub API.
		 * 
		 * @param e
		 *            an error object or string when the callback is taking
		 *            place due to an error
		 */
		function cbi(e) {
			if (called) {
				return;
			}
			if (e) {
				errors.unshift(typeof e === 'string' ? new Error(e) : e);
			}
			var o = cf || rl;
			var rb = errors.length && commit.releaseId;

			/**
			 * Rollback callback
			 * 
			 * @param fx
			 *            the callback function that will receive the last step
			 *            taken before the rollback (e.g. release, asset upload,
			 *            etc.), the last received object from the external API
			 *            and an array of errors that prevented the rollback (if
			 *            any).
			 */
			function rbcb(fx) {
				var rberrors = [];
				try {
					if (!rb) {
						fx(step, om, rberrors);
						return;
					}
					// rollback release
					opts.path = releasePath + '/' + commit.releaseId;
					opts.method = 'DELETE';
					req = https.request(opts, function(res) {
						res.on('end', function() {
							if (!called) {
								fx(step, o, rberrors);
							}
						});
					});
					req.end();
					req.on('error', function(e2) {
						if (!called) {
							rberrors.unshift(e2);
							rberrors.unshift(new Error(
									'Failed to rollback release ID '
											+ commit.releaseId));
							fx(step, o, rberrors);
						}
					});
				} catch (e2) {
					if (!called) {
						rberrors.unshift(e2);
						rberrors.unshift(new Error(
								'Failed to call rollback for release ID '
										+ commit.releaseId));
						fx(step, o, rberrors);
					}
				}
			}
			try {
				cb(step, o, rbcb, errors);
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