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
const beautify = require('gulp-beautify');
const uglify = require('gulp-uglify');
const jade = require('gulp-jade');
const cleanCSS = require('gulp-clean-css');
const babel = require('gulp-babel');
const requirejs = require('requirejs');
const sass = require('gulp-sass');

gulp.task('clean-dirs', ['clean-public']);
gulp.task('clean-public', cb => fs.removeAsync('public'));

gulp.task('create-dirs', ['create-build-dir', 'create-public-dir']);
gulp.task('create-build-dir', cb => fs.mkdirpAsync('_build'));
gulp.task('create-public-dir', cb => fs.mkdirpAsync('public'));

gulp.task('build:transform', () => {
    return gulp.src('src/**/*.js')
        .pipe(babel({
            moduleIds: true,
            ignore: "vendor/"
        }))

        .pipe(gulp.dest('_build'));
});

gulp.task('build:compile', ['build:transform'], () => {
    requirejs.optimize({
        baseUrl: './_build',
        name: '../node_modules/almond/almond',
        include: 'tastyplug',
        insertRequire: ['tastyplug'],
        optimize:'none',
        out: 'public/tastyplug.js',
        wrap: true,
    })
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


gulp.task('minify', () => {
    return gulp.src('public/tastyplug.js')
        .pipe(uglify())
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
    return gulp.src(['extensions/userscript/tastyplug.meta.js', 'public/tastyplug.js'])
        .pipe(template(pkg))
        .pipe(concat('tastyplug.user.js'))
        .pipe(gulp.dest('public/'));
});


gulp.task('web_extension-build', ['chrome-build', 'firefox-build']);
gulp.task('web_extension', ['web_extension-meta', 'web_extension-icons', 'web_extension-src']);

gulp.task('web_extension-meta', () => {
    return gulp.src(['extensions/loader.js', 'build/bootstrap.js', 'extensions/manifest.json'])
        .pipe(template(pkg))
        .pipe(gulp.dest('build/extension/'))
});
gulp.task('web_extension-icons', () => {
    return gulp.src([ 'images/icon*.png' ])
        .pipe(gulp.dest('build/extension/images'))
});
gulp.task('web_extension-src', () => {
    return gulp.src([ 'build/tastyplug.core.js', 'src/lib/jquery-ui.custom.js'])
        .pipe(gulp.dest('build/extension/'))
});

gulp.task('chrome-build', () => {
    return gulp.src('build/extension/**')
        .pipe(zip('tastyplug.chrome.zip'))
        .pipe(gulp.dest('build/dist'));
});

gulp.task('firefox-build', () => {
    return gulp.src('build/extension/*')
        .pipe(zip('tastyplug.firefox-unsigned.xpi'))
        .pipe(gulp.dest('build/dist'));
});

gulp.task('site', ['site-base', 'site-styles']);
gulp.task('site-base', () => {
    return gulp.src('site/*')
        .pipe(gulp.dest('public/'));
});
gulp.task('site-styles', () => {
    return gulp.src(['site/styles/normalize.css', 'site/styles/skeleton.css', 'site/styles/hint.css'])
        .pipe(concat('site.css'))
        .pipe(cleanCSS())
        .pipe(gulp.dest('public/styles'))
});

gulp.task('default', cb => {
    runseq('clean-dirs', 'create-dirs', 'build', [/*'minify', */'userscript'/*, 'web_extension'*/], ['site'/*, 'web_extension-build'*/], cb);
});
