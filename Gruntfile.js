module.exports = function (grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        library: grunt.file.readJSON('bower.json'),
        concat: {
            options: {
                separator: ''
            },
            library: {
                src: [
                    'src/prefix.js',
                    'src/module.js',
                    'src/dependency-drawing.js',
                    'src/**/*.js',
                    'src/suffix.js'
                ],
                dest: '<%= library.name %>.js'
            }
        },
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> <%= pkg.version %> */'
            },
            jid: {
                files: {
                    '<%= library.name %>.min.js': ['<%= concat.library.dest %>']
                }
            }
        },
        jshint: {
            beforeConcat: {
                src: ['gruntfile.js', '<%= library.name %>/**/*.js']
            },
            afterConcat: {
                src: [
                    '<%= concat.library.dest %>'
                ]
            },
            options: {
                // options here to override JSHint defaults
                globals: {
                    jQuery: true,
                    console: true,
                    module: true,
                    document: true,
                    angular: true
                },
                globalstrict: false
            }
        },
        watch: {
            options: {
                livereload: true
            },
            files: [
                'Gruntfile.js',
                'src/**/*'
            ],
            tasks: ['default', 'karma:unit:run']
        },
        karma: {
            options: {
                configFile: "karma.conf.js",
            },
            unit: {
                background: true
            },
            once: {
                singleRun: true,
                reporters: ['dots']
            },
            jenkins: {
                singleRun: true,
                reporters: ['junit']
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-karma');

    grunt.registerTask('default', ['jshint:beforeConcat', 'concat', 'jshint:afterConcat', 'uglify']);
    grunt.registerTask('live', ['default', 'karma:unit:start', 'karma:unit:run', 'watch']);

};
