'use strict';

var browsers = require('./grunt/browsers');
var fabricator = require('./grunt/fabricator');
var util = require('./grunt/util');
fabricator.basePath = '.';

module.exports = function(grunt) {

	// Force use of Unix newlines
	grunt.util.linefeed = '\n';
	RegExp.quote = function(string) {
		return string.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&');
	};

	var pkg = grunt.file.readJSON('package.json');
	grunt
			.initConfig({
				pkg : pkg,
				banner : '/*!\n'
						+ ' * <%= pkg.name %>.js v<%= pkg.version %> (<%= pkg.homepage %>)\n'
						+ ' * Copyright 2013-<%= grunt.template.today("yyyy") %> <%= pkg.author %>\n'
						+ ' * Licensed under <%= _.pluck(pkg.licenses, "type") %> (<%= _.pluck(pkg.licenses, "url") %>)\n'
						+ ' */\n',
				sourceFiles : 'js/*.js',

				// Task configuration

				clean : {
					dist : [ fabricator.distPath ]
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
							banner : '<%= banner %>',
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
						src : [ '**/**/*.{htm,html,css,js,md,png,jpg,gif,ico}',
								'!**/{node_modules,lib,grunt}/**',
								'!Gruntfile.js' ],
						dest : fabricator.distPath,
						options : {
							mode : true,
							process : function(contents, path) {
								// use distribution packaged script
								if (typeof contents === 'string') {
									return fabricator.replaceSrciptTagSrcById(
											pkg.name, contents, function(from,
													to) {
												grunt.log.writeln('\nUpdated\n'
														+ from + '\nto:\n' + to
														+ '\nfor: ' + path);
											});
								}
								return contents;
							}
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

	// Retrieve commit details
	var logger = new util.Logger(grunt.log.writeln, grunt.log.error,
			grunt.log.error);
	var commit = util.getCommit(logger);

	// Load tasks from package
	for ( var key in grunt.file.readJSON('package.json').devDependencies) {
		if (key !== 'grunt' && key.indexOf('grunt') === 0) {
			grunt.loadNpmTasks(key);
		}
	}
	// load project tasks
	grunt.loadTasks('grunt/tasks');

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
	grunt.registerTask('includes', 'Process JS inclusions',
			function() {
				grunt.log.writeln('Processing script includes');
				var incCnt = 0;
				var script = fabricator.processScriptIncludes(null, null,
						function(parentPath, incPath) {
							incCnt++;
							return grunt.file.read(incPath);
						});
				var banner = grunt.template.process('<%= banner %>');
				var js = fabricator.distScriptPath + pkg.name + '.js';
				grunt.file.write(js, banner + script);
				grunt.log.writeln('Generated ' + js + ' from ' + incCnt
						+ ' inclusions');
			});

	// Build tasks
	var buildTasks = new util.Tasks(commit, logger);
	buildTasks.add('clean');
	buildTasks.add('includes');
	buildTasks.add('copy:dist');
	buildTasks.add('uglify:js');
	buildTasks.add('uglify:docs');
	buildTasks.add('connect');
	buildTasks.add('qunit');
	buildTasks.add('saucelabs-qunit');
	buildTasks.add('release');
	grunt.registerTask('test', buildTasks.tasks);

	// Default tasks
	grunt.registerTask('default', [ 'test' ]);
};