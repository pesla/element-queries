module.exports = function (grunt) {
	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		requirejs: {
			mysourcemapped: {
				options: {
					baseUrl : '.',
					name: 'src/element-queries',
					out: 'dist/element-queries.min.js',
					paths: {
						'domready': 'vendor/domready/ready',
						'detect-resize': 'src/detect-resize'
					},
					removeCombined: true,
					uglify2: {
						warnings: true,
						mangle: true
					},
					optimize: 'uglify2',
					generateSourceMaps: true,
					preserveLicenseComments: false,
					useSourceUrl: false
				}
			}
		}
	});

	// Load the plugin that provides the 'uglify' task.
	grunt.loadNpmTasks('grunt-contrib-requirejs');

	// Default task(s).
	grunt.registerTask('default', ['requirejs']);
};