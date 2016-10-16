const concat = require('gulp-concat');
const del = require('del');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs-extra'));
const gulp = require('gulp');
const pkg = require('./package.json');
const rename = require('gulp-rename');
const runseq = require('run-sequence');
const template = require('gulp-template');
const zip = require('gulp-zip');
const debug = require('gulp-debug');
const replace = require('gulp-replace');
const beautify = require('gulp-jsbeautifier');
const uglify = require('gulp-uglify');
const jade = require('gulp-jade');
const cleanCSS = require('gulp-clean-css');
const babel = require('gulp-babel');
const rjs = require('requirejs');
const sass = require('gulp-sass');

gulp.task('clean-dirs', ['clean-public', 'clean-dist']);
gulp.task('clean-public', cb => fs.removeAsync('public'));
gulp.task('clean-dist', cb => fs.removeAsync('dist'));

gulp.task('create-dirs', ['create-temp-build-dir', 'create-temp-extension-dir', 'create-dist-dir','create-public-dir']);
gulp.task('create-temp-build-dir', cb => fs.mkdirpAsync('_build'));
gulp.task('create-temp-extension-dir', cb => fs.mkdirpAsync('_extension'));
gulp.task('create-dist-dir', cb => fs.mkdirpAsync('dist'));
gulp.task('create-public-dir', cb => fs.mkdirpAsync('public'));

gulp.task('build:transform', () => {
    return gulp.src('src/**/*.js')
        .pipe(babel({
            moduleIds: true,
            ignore: "vendor/"
        }))
        .pipe(gulp.dest('_build'));
});

gulp.task('build:bundle', ['build:transform'], cb => {
    rjs.optimize({
        baseUrl: './_build',
        name: '../node_modules/almond/almond',
        include: 'tastyplug',
        insertRequire: ['tastyplug'],
        optimize:'none',
        wrap: true,
        out(tastyplug) {
            fs.writeFileAsync('public/tastyplug.js', tastyplug)
                .then(cb)
                .catch(e => {
                    console.error('Can\'t write tastyplug file.');
                    console.error(e.stack);
                    process.exit(1);
                });
        }
    });
});

gulp.task('build:compile', ['build:bundle'], () => {
    gulp.src('public/tastyplug.js')
        .pipe(template(pkg))
        .pipe(gulp.dest('public/'))
});

gulp.task('build:assets', ['build:assets:static', 'build:assets:sass']);

gulp.task('build:assets:static', () => {
    return gulp.src(['assets/**/*', '!assets/**/*.scss'])
        .pipe(gulp.dest('public/'));
});

gulp.task('build:assets:sass', () => {
    return gulp.src('assets/**/*.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(gulp.dest('public/'))
});

gulp.task('build', ['build:compile', 'build:assets'], cb => fs.removeAsync('_build'));


gulp.task('beautify', () => {
    return gulp.src(['public/**/*.js', 'public/**/*.css', 'public/**/*.html'])
        .pipe(beautify())
        .pipe(gulp.dest('public/'));
});


gulp.task('minify', ['minify:js', 'minify:css']);
gulp.task('minify:js', () => {
    return gulp.src('public/**/*.js')
        .pipe(uglify())
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest('public/'));
});

gulp.task('minify:css', () => {
    return gulp.src('public/**/*.css')
        .pipe(cleanCSS())
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest('public/'));
});


gulp.task('userscript', ['userscript-meta', 'userscript-user']);
gulp.task('userscript-meta', () => {
    return gulp.src(['extensions/userscript/tastyplug.meta.js'])
        .pipe(template(pkg))
        .pipe(rename('tastyplug.meta.js'))
        .pipe(gulp.dest('public/'));
});

gulp.task('userscript-user', () => {
    return gulp.src(['extensions/userscript/tastyplug.meta.js', 'public/tastyplug.min.js'])
        .pipe(template(pkg))
        .pipe(concat('tastyplug.user.js'))
        .pipe(gulp.dest('public/'));
});


gulp.task('web_extensions', () => {
    runseq(
        ['web_extension-meta', 'web_extension-icons', 'web_extension-src'],
        ['chrome-build', 'firefox-build'],
        cb => fs.removeAsync('_extension'))
});

gulp.task('web_extension-meta', () => {
    return gulp.src(['extensions/loader.js', 'extensions/manifest.json'])
        .pipe(template(pkg))
        .pipe(gulp.dest('_extension/'))
});
gulp.task('web_extension-icons', () => {
    return gulp.src([ 'public/images/icons/icon*.png' ])
        .pipe(gulp.dest('_extension/images'))
});
gulp.task('web_extension-src', () => {
    return gulp.src('public/tastyplug.js')
        .pipe(gulp.dest('_extension/'))
});

gulp.task('chrome-build', () => {
    return gulp.src('_extension/**')
        .pipe(zip('tastyplug.chrome.zip'))
        .pipe(gulp.dest('dist/'));
});

gulp.task('firefox-build', () => {
    return gulp.src('_extension/*')
        .pipe(zip('tastyplug.firefox-unsigned.xpi'))
        .pipe(gulp.dest('dist/'));
});

gulp.task('site', ['site-base', 'site-styles']);
gulp.task('site-base', () => {
    return gulp.src('site/*')
        .pipe(gulp.dest('public/'));
});
gulp.task('site-styles', () => {
    return gulp.src(['site/styles/normalize.css', 'site/styles/skeleton.css', 'site/styles/hint.css'])
        .pipe(concat('site.css'))
        .pipe(gulp.dest('public/styles'))
});

gulp.task('default', cb => {
    runseq(
        'clean-dirs', 'create-dirs',
        ['build', 'site'],
        'beautify',
        ['minify', 'userscript', 'web_extensions'],
        cb
    );
});
