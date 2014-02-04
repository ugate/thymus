/*!
 * thymus.js Gruntfile
 * http://thymusjs.org
 * Copyright 2013-present Akira LLC
 * Licensed under MIT (https://github.com/ugate/thymus/blob/master/LICENSE)
 */
//module.exports = function(grunt) {
//  grunt.initConfig({
//    connect: {
//      server: {
//        options: {
//          base: "",
//          port: 9999
//        }
//      }
//    },
//    watch: {}
//  });
//
//  // Loading dependencies
//  for (var key in grunt.file.readJSON("package.json").devDependencies) {
//    if (key !== "grunt" && key.indexOf("grunt") === 0) grunt.loadNpmTasks(key);
//  }
//
//  grunt.registerTask("dev", ["connect", "watch"]);
//};
module.exports = function(grunt) {
	'use strict';

	// Force use of Unix newlines
	grunt.util.linefeed = '\n';

	RegExp.quote = function(string) {
		return string.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&');
	};

	//var updateShrinkwrap = require('./test-infra/shrinkwrap.js');

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

				// Task configuration.
				clean : {
					dist : [ 'dist', 'docs/dist' ]
				},

				jshint : {
					options : {
						jshintrc : 'js/.jshintrc'
					},
					grunt : {
						src : [ 'Gruntfile.js' ]
					},
					src : {
						src : 'js/*.js'
					},
					test : {
						src : 'js/test/unit/*.js'
					},
					assets : {
						src : []
					}
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
						dest : 'docs/assets/js/docs.min.js'
					}
				},

				copy : {
					fonts : {
						expand : true,
						src : 'fonts/*',
						dest : 'dist/'
					},
					docs : {
						expand : true,
						cwd : './dist',
						src : [ '{css,js}/*.min.*', 'css/*.map' ],
						dest : 'frags/docs/dist'
					}
				},

				qunit : {
					options : {
						inject : 'js/tests/unit/phantom.js'
					},
					files : 'js/tests/*.html'
				},

				connect : {
					server : {
						options : {
							port : 3000,
							base : '.'
						}
					}
				},

				jekyll : {
					docs : {}
				},

				validation : {
					options : {
						charset : 'utf-8',
						doctype : 'HTML5',
						failHard : true,
						reset : true,
						relaxerror : [
								'Bad value X-UA-Compatible for attribute http-equiv on element meta.',
								'Element img is missing required attribute src.' ]
					},
					files : {
						src : '_gh_pages/**/*.html'
					}
				},

				watch : {
					src : {
						files : '<%= jshint.src.src %>',
						tasks : [ 'jshint:src', 'qunit' ]
					},
					test : {
						files : '<%= jshint.test.src %>',
						tasks : [ 'jshint:test', 'qunit' ]
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
							concurrency : 10,
							urls : [ 'http://127.0.0.1:3000/js/test/index.html' ],
							browsers : grunt.file
									.readYAML('test-infra/sauce_browsers.yml')
						}
					}
				},

				exec : {
					npmUpdate : {
						command : 'npm update'
					},
					npmShrinkWrap : {
						command : 'npm shrinkwrap --dev'
					}
				}
			});

	// These plugins provide necessary tasks.
	require('load-grunt-tasks')(grunt, {
		scope : 'devDependencies'
	});

	// Docs HTML validation task
	grunt.registerTask('validate-html', [ 'jekyll', 'validation' ]);

	// Test task.
	var testSubtasks = [];
	// Skip core tests if running a different subset of the test suite
	if (!process.env.THX_TEST || process.env.THX_TEST === 'core') {
		testSubtasks = testSubtasks.concat([ 'dist-css', 'csslint', 'jshint',
				'jscs', 'qunit', 'build-customizer-html' ]);
	}
	// Skip HTML validation if running a different subset of the test suite
	if (!process.env.THX_TEST || process.env.THX_TEST === 'validate-html') {
		testSubtasks.push('validate-html');
	}
	// Only run Sauce Labs tests if there's a Sauce access key
	if (typeof process.env.SAUCE_ACCESS_KEY !== 'undefined' &&
	// Skip Sauce if running a different subset of the test suite
	(!process.env.THX_TEST || process.env.THX_TEST === 'sauce-js-unit')) {
		testSubtasks.push('connect');
		testSubtasks.push('saucelabs-qunit');
	}
	grunt.registerTask('test', testSubtasks);

	// JS distribution task.
	grunt.registerTask('dist-js', [ 'concat', 'uglify' ]);

	// Docs distribution task.
	grunt.registerTask('dist-docs', 'copy:docs');

	// Full distribution task.
	grunt.registerTask('dist', [ 'clean', 'dist-js', 'dist-docs' ]);

	// Default task.
	grunt.registerTask('default', [ 'test', 'dist' ]);

	// Version numbering task.
	// grunt change-version-number --oldver=A.B.C --newver=X.Y.Z
	// This can be overzealous, so its changes should always be manually
	// reviewed!
	grunt.registerTask('change-version-number', 'sed');
};