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

gulp.task('clean-dirs', ['clean-build', 'clean-public']);
gulp.task('clean-build', cb => fs.removeAsync('build'));
gulp.task('clean-public', cb => fs.removeAsync('public'));

gulp.task('create-dirs', ['create-build-dir', 'create-public-dir']);
gulp.task('create-build-dir', cb => fs.mkdirpAsync('build'));
gulp.task('create-public-dir', cb => fs.mkdirpAsync('public'));


gulp.task('build', ['build-core', 'build-loader', 'build-bootstrap', 'build-lib']);

gulp.task('build-bootstrap', () => {
    return gulp.src('src/bootstrap.js')
        .pipe(beautify())
        .pipe(gulp.dest('build/'));
});

gulp.task('build-core', () => {
    return gulp.src('src/core.js')
        .pipe(template(pkg))
        .pipe(beautify())
        .pipe(rename('tastyplug.core.js'))
        .pipe(gulp.dest('build/'))
});

gulp.task('build-loader', () => {
    return gulp.src('src/loader.template.js')
        .pipe(template(pkg))
        .pipe(beautify())
        .pipe(rename('tastyplug.js'))
        .pipe(gulp.dest('build/'))
});

gulp.task('build-lib', () => {
    return gulp.src('src/lib/*')
        .pipe(gulp.dest('build/'));
});

gulp.task('build-tastyplug', () => {
    return gulp.src('src/loader.template.js', 'src/core.js')
        .pipe(template())
        .pipe(template(pkg))
        .pipe(beautify({indentSize: 2}))
        .pipe(rename('tastyplug.js'))
        .pipe(gulp.dest('build/'));
});

gulp.task('minify', () => {
    return gulp.src('build/*.js')
        .pipe(uglify())
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest('build/'));
});

gulp.task('userscript', ['userscript-meta', 'userscript-user']);


gulp.task('userscript-meta', () => {
    return gulp.src(['extensions/userscript/tastyplug.meta.js'])
        .pipe(template(pkg))
        .pipe(rename('tastyplug.meta.js'))
        .pipe(gulp.dest('build/userscript'));
});

gulp.task('userscript-user', () => {
    return gulp.src(['extensions/userscript/tastyplug.meta.js', 'extensions/userscript/loader.template.js'])
        .pipe(template(pkg))
        .pipe(concat('tastyplug.user.js'))
        .pipe(gulp.dest('build/userscript'));
});

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

gulp.task('bookmark', () => {
    return gulp.src('extensions/userscript/loader.js')
});
gulp.task('web_extension-build', ['chrome-build', 'firefox-build']);
gulp.task('web_extension', ['web_extension-meta', 'web_extension-icons', 'web_extension-src']);

gulp.task('site', ['site-html', 'site-dist', 'site-images', 'site-userscript', 'site-style', 'site-assets']);
gulp.task('site-html', () => {
    return gulp.src('site/*.jade')
        .pipe(jade())
        .pipe(gulp.dest('public/'));
});

gulp.task('site-dist', () => {
    return gulp.src('build/*.js')
        .pipe(gulp.dest('public/'));
});

gulp.task('site-images', () => {
    return gulp.src('images/*')
        .pipe(gulp.dest('public/images/'));
});

gulp.task('site-style', () => {
    return gulp.src('site/style/*.css')
        .pipe(cleanCSS())
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest('public/style/'));
});

gulp.task('site-userscript', () => {
    return gulp.src('build/userscript/*.js')
        .pipe(gulp.dest('public/'));
});

gulp.task('site-assets', () => {
    return gulp.src('site/assets/*')
        .pipe(gulp.dest('public/'));
});


gulp.task('default', cb => {
    runseq('clean-dirs', 'create-dirs', 'build', ['minify', 'userscript', 'web_extension', 'bookmark'], ['site', 'web_extension-build'], cb);
});
