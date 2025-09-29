const gulp = require('gulp');
const svgmin = require('gulp-svgmin');

gulp.task('build:icons', () => {
  return gulp
    .src(['nodes/**/*.svg', 'credentials/**/*.svg'])
    .pipe(svgmin())
    .pipe(gulp.dest('dist'));
});

gulp.task('default', gulp.series('build:icons'));
