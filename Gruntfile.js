/*!
 * thymus.js Gruntfile
 * http://thymusjs.org
 * Copyright 2013-present Akira LLC
 * Licensed under MIT (https://github.com/ugate/thymus/blob/master/LICENSE)
 */
module.exports = function(grunt) {
	'use strict';

	// Docs: https://saucelabs.com/docs/platforms/webdriver
	// Windows: Opera 15+ not currently supported by Sauce Labs
	// Mac: Opera not currently supported by Sauce Labs
	// Android: Chrome not currently supported by Sauce Labs
	// iOS: Chrome not currently supported by Sauce Labs
	var firefoxVersion = "26";
	var chromeVersion = "31";
	var safariVersion = "7";
	var ieVersion = "11";
	var windowsVersion = "Windows 8.1";
	var androidVersion = "4.0";
	var osxVersion = "OS X 10.9";
	var browsers = [ {
		browserName : "safari",
		version : safariVersion,
		platform : osxVersion
	}, {
		browserName : "googlechrome",
		version : chromeVersion,
		platform : osxVersion
	}, {
		browserName : "firefox",
		version : firefoxVersion,
		platform : osxVersion
	}, {
		browserName : "iphone",
		version : safariVersion,
		platform : osxVersion
	}, {
		browserName : "ipad",
		version : safariVersion,
		platform : osxVersion
	}, {
		browserName : "internet explorer",
		version : ieVersion,
		platform : windowsVersion
	}, {
		browserName : "internet explorer",
		version : "10",
		platform : "Windows 8"
	}, {
		browserName : "internet explorer",
		version : "9",
		platform : "Windows 7"
	}, {
		browserName : "opera",
		version : "12",
		platform : "Windows 7"
	}, {
		browserName : "googlechrome",
		version : chromeVersion,
		platform : windowsVersion
	}, {
		browserName : "firefox",
		version : firefoxVersion,
		platform : windowsVersion
	}, {
		browserName : "googlechrome",
		version : "30",
		platform : "Linux"
	}, {
		browserName : "firefox",
		version : firefoxVersion,
		platform : "Linux"
	}, {
		browserName : "android",
		version : androidVersion,
		platform : "Linux"
	} ];

	// Force use of Unix newlines
	grunt.util.linefeed = '\n';

	RegExp.quote = function(string) {
		return string.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&');
	};

	// Project configuration.
	grunt
			.initConfig({

				// Metadata.
				pkg : grunt.file.readJSON('package.json'),
				banner : '/*!\n'
						+ ' * thymus.js v<%= pkg.version %> (<%= pkg.homepage %>)\n'
						+ ' * Copyright 2013-<%= grunt.template.today("yyyy") %> <%= pkg.author %>\n'
						+ ' * Licensed under <%= _.pluck(pkg.licenses, "type") %> (<%= _.pluck(pkg.licenses, "url") %>)\n'
						+ ' */\n',
				jqueryCheck : 'if (typeof jQuery === \'undefined\') { throw new Error(\'thymus.js requires jQuery\') }\n\n',
				sourceFiles : 'js/*.js',

				// Task configuration.
				clean : {
					dist : [ 'dist', 'frags/docs/dist' ]
				},

				concat : {
					options : {
						banner : '<%= banner %>\n<%= jqueryCheck %>',
						stripBanners : false
					},
					thymus : {
						// src : [ 'js/frags.js', 'js/events.js',
						// 'js/context.js', 'js/siphons.js',
						// 'js/plugin.js', 'js/util.js' ],
						src : [ 'js/thymus.js' ],
						dest : 'dist/js/<%= pkg.name %>.js'
					}
				},

				uglify : {
					options : {
						report : 'min'
					},
					thymus : {
						options : {
							banner : '<%= banner %>'
						},
						src : '<%= concat.thymus.dest %>',
						dest : 'dist/js/<%= pkg.name %>.min.js'
					},
					docsJs : {
						options : {
							preserveComments : 'some'
						},
						src : [ 'frags/docs/js/app.js',
								'frags/docs/js/loader.js' ],
						dest : 'frags/docs/js/docs.min.js'
					}
				},

				copy : {
					docs : {
						expand : true,
						cwd : './dist',
						src : [ '{css,js}/*.min.*', 'css/*.map' ],
						dest : 'frags/docs/dist'
					}
				},

				qunit : {
					// options : {
					// inject : 'js/test/unit/phantom.js'
					// },
					files : 'js/test/*.html'
				},

				connect : {
					server : {
						options : {
							port : 3000,
							base : '.',
							hostname : 'thymusjs-test-host'
						}
					}
				},

				watch : {
					src : {
						files : '<%= sourceFiles %>',
						tasks : [ 'qunit' ]
					},
					test : {
						files : '<%= sourceFiles %>',
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
							urls : [ 'http://<%= connect.server.options.hostname %>:<%= connect.server.options.port %>/js/test/index.html' ],
							tags : [ process.env.TRAVIS_BRANCH,
									process.env.TRAVIS_REPO_SLUG,
									process.env.TRAVIS_BUILD_DIR ],
							browsers : browsers
						}
					}
				}
			});

	function GOpt(opt) {
		var ov = grunt.option(opt);
		this.set = function(val) {
			var nv = typeof val === 'undefined' ? ov : val;
			try {
				grunt.option(opt, nv);
			} catch (e) {
				grunt.log.writeln('Unable to set option: ' + opt
						+ ' to value: ' + nv);
			}
		};
	}
	// These plugins provide necessary tasks.
	for ( var key in grunt.file.readJSON("package.json").devDependencies) {
		if (key !== "grunt" && key.indexOf("grunt") === 0) {
			grunt.loadNpmTasks(key);
		}
	}

	// Test task.
	var testSubtasks = [];
	// Only run Sauce Labs tests if there's a Sauce access key
	if (typeof process.env.SAUCE_ACCESS_KEY !== 'undefined' &&
	// Skip Sauce if running a different subset of the test suite
	(!process.env.THX_TEST || process.env.THX_TEST === 'sauce-js-unit')) {
		testSubtasks.push('connect');
		// verbose will cause private key output
		testSubtasks.push({
			name : 'saucelabs-qunit',
			verbose : false
		});
	}
	grunt.registerTask('test', 'Run sub tests', function() {
		for (var i = 0; i < testSubtasks.length; i++) {
			var obj = typeof testSubtasks[i] === 'object' ? testSubtasks[i] : {
				name : typeof testSubtasks[i]
			};
			var opt = new GOpt('verbose');
			if (obj.verbose === false) {
				opt.set(false);
			}
			try {
				grunt.task.run(obj.name);
			} catch (e) {
				opt.set();
				throw e;
			}
			opt.set();
		}
	});

	// JS distribution task.
	// grunt.registerTask('dist-js', [ 'concat', 'uglify' ]);

	// Docs distribution task.
	// grunt.registerTask('dist-docs', 'copy:docs');

	// Full distribution task.
	// grunt.registerTask('dist', [ 'clean', 'dist-js', 'dist-docs' ]);

	// Default task.
	// grunt.registerTask('default', [ 'test', 'dist' ]);

	// Version numbering task.
	// grunt change-version-number --oldver=A.B.C --newver=X.Y.Z
	// This can be overzealous, so its changes should always be manually
	// reviewed!
	// grunt.registerTask('change-version-number', 'sed');
};