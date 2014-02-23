/*!
 * thymus.js Gruntfile
 * http://thymusjs.org
 * Copyright 2013-present Akira LLC
 * Licensed under MIT (https://github.com/ugate/thymus/blob/master/LICENSE)
 */
var exec = require('child_process').exec;
var browsers = require('./grunt/browsers');
var fabricator = require('./grunt/fabricator');
fabricator.basePath = '.';

module.exports = function(grunt) {
	'use strict';

	// Force use of Unix newlines
	grunt.util.linefeed = '\n';
	RegExp.quote = function(string) {
		return string.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&');
	};
	
	var release = require('./grunt/tasks/release');
	var pkg = grunt.file.readJSON('package.json');
	grunt
			.initConfig({
				pkg : pkg,
				banner : '/*!\n'
						+ ' * <%= pkg.name %>.js v<%= pkg.version %> (<%= pkg.homepage %>)\n'
						+ ' * Copyright 2013-<%= grunt.template.today("yyyy") %> <%= pkg.author %>\n'
						+ ' * Licensed under <%= _.pluck(pkg.licenses, "type") %> (<%= _.pluck(pkg.licenses, "url") %>)\n'
						+ ' */\n',
				jqueryCheck : 'if (typeof jQuery === \'undefined\') { throw new Error(\'<%= pkg.name %>.js requires jQuery\') }\n\n',
				sourceFiles : 'js/*.js',

				// Task configuration.
				clean : {
					dist : [ fabricator.distScriptPath, fabricator.distDocsPath ]
				},

				uglify : {
					options : {
						report : 'min'
					},
					js : {
						options : {
							banner : '<%= banner %>'
						},
						src : fabricator.distScriptPath + pkg.name + '.js',
						dest : fabricator.distScriptPath + pkg.name + '.min.js'
					},
					docs : {
						options : {
							preserveComments : 'some'
						},
						src : [ fabricator.devDocsScriptPath + 'app.js',
								fabricator.devDocsScriptPath + 'loader.js' ],
						dest : fabricator.distDocsScriptPath + 'docs.min.js'
					}
				},

				copy : {
					dist : {
						expand : true,
						src : [ '**!(node_modules)/*.{htm,html,css,md,png,ico}' ],
						dest : fabricator.distDocsPath,
						process : function(contents, path) {
							// use distribution packaged script
							if (typeof contents === 'string') {
								return fabricator.replaceSrciptTagSrcById(
										grunt.config.pkg.name, contents);
							}
							return contents;
						}
					}
				},

				qunit : {
					// options : {
					// inject : 'js/test/unit/phantom.js'
					// },
					// files : 'js/test/*.html'
					all : {
						options : {
							urls : [ 'http://<%= connect.server.options.hostname %>:<%= connect.server.options.port %>/'
									+ fabricator.testScriptPath
									+ fabricator.testMainFile ]
						}
					}
				},

				connect : {
					server : {
						options : {
							port : 3000,
							base : '.',
							hostname : pkg.name + '-test-host'
						}
					}
				},

				watch : {
					src : {
						files : fabricator.jsFiles,
						tasks : [ 'qunit' ]
					},
					test : {
						files : fabricator.jsFiles,
						tasks : [ 'qunit' ]
					}
				},

				sed : {
					versionNumber : {
						pattern : (function() {
							var old = grunt.option('oldver');
							return old ? RegExp.quote(old) : old;
						})(),
						replacement : grunt.option('newver'),
						recursive : true
					}
				},

				'saucelabs-qunit' : {
					all : {
						options : {
							build : process.env.TRAVIS_JOB_ID,
							testname : process.env.TRAVIS_BUILD_NUMBER,
							concurrency : 10,
							urls : [ 'http://<%= connect.server.options.hostname %>:<%= connect.server.options.port %>/'
									+ fabricator.testScriptPath
									+ fabricator.testMainFile ],
							tags : [ process.env.TRAVIS_BRANCH,
									process.env.TRAVIS_REPO_SLUG,
									process.env.TRAVIS_BUILD_DIR ],
							browsers : browsers
						}
					}
				}
			});

	// Load tasks from package
	for ( var key in grunt.file.readJSON('package.json').devDependencies) {
		if (key !== 'grunt' && key.indexOf('grunt') === 0) {
			grunt.loadNpmTasks(key);
		}
	}

	// suppress "key" options in verbose mode
	var writeflags = grunt.log.writeflags;
	grunt.log.writeflags = function(obj, prefix) {
		if (typeof obj === 'object' && obj && obj.key) {
			var obj2 = JSON.parse(JSON.stringify(obj));
			obj2.key = '[SECURE]';
			return writeflags(obj2, prefix);
		}
		return writeflags(obj, prefix);
	};

	// Custom tasks
	grunt.registerTask('includes', 'Process JS inclusions', function() {
		grunt.log.writeln('Currently running the "default" task.');
		var script = fabricator.processScriptIncludes(null, null, function(
				parentPath, incPath) {
			return grunt.file.read(incPath);
		});
		grunt.file.write(fabricator.distScriptPath + pkg.name + '.js', script);
	});

	// Test tasks
	// TODO : move includes/copy
	var testSubtasks = [ /* 'clean', */'includes', 'copy:dist', 'connect',
			'qunit' ];
	// Only run Sauce Labs tests if there's a Sauce access key
	if (typeof process.env.SAUCE_ACCESS_KEY !== 'undefined' &&
	// Skip Sauce if running a different subset of the test suite
	(!process.env.THX_TEST || process.env.THX_TEST === 'sauce-js-unit')) {
		testSubtasks.push('saucelabs-qunit');
	}
	grunt.registerTask('test', testSubtasks);

	// Distribution tasks
	var distSubtasks = [ 'uglify:js', 'uglyfy:docs', 'release' ];

	// When a commit message contains "release v" followed by a version number
	// (major.minor.path) push release and
	var commitMsg = process.env.TRAVIS_COMMIT_MESSAGE;
	if (typeof process.env.TRAVIS_COMMIT_MESSAGE === 'undefined') {
		// TODO : the following can be removed once
		// https://github.com/travis-ci/travis-ci/issues/965 is resolved
		exec('git show -s --format=%B ' + process.env.TRAVIS_COMMIT
				+ ' | tr -d \'\n\'', function(e, stdout, stderr) {
			if (e) {
				var em = 'Unable to capture commit message for commit number '
						+ process.env.TRAVIS_COMMIT + ':\n  ' + stderr;
				grunt.warn(em);
				grunt.warn(e);
			} else {
				grunt.log.writeln('Commit message: ' + stdout);
			}
		});
	}
	if (commitMsg) {
		var releaseVer = commitMsg
				.match(/release v(\d+\.\d+\.\d+(?:-alpha(?:\.\d)?|-beta(?:\.\d)?)?/im);
		if (releaseVer.length) {
			// TODO : release task - distSubtasks.push('');
		}
	}
	grunt.registerTask('dist', distSubtasks);

	// Default tasks
	grunt.registerTask('default', [ 'test', 'dist' ]);

	// Version numbering task.
	// grunt change-version-number --oldver=A.B.C --newver=X.Y.Z
	// This can be overzealous, so its changes should always be manually
	// reviewed!
	// grunt.registerTask('change-version-number', 'sed');
};