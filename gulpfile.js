var gulp=require('gulp');
var htmlmin=require('gulp-htmlmin');
var cssnano=require('gulp-cssnano');
var uglify=require('gulp-uglify');


//压缩HTML
gulp.task('html',function(){
     gulp.src('src/*.html')
     .pipe(htmlmin({
     	removeComments: true,//清除HTML注释
        collapseWhitespace: true,//压缩HTML
     }))
     .pipe(gulp.dest('dist'))
})
//压缩css
gulp.task('style',function(){
	gulp.src('src/css/*.css')
	.pipe(cssnano())
	.pipe(gulp.dest('dist/css'))
})
//压缩js
gulp.task('script',function(){
	gulp.src('src/js/*.js')
	.pipe(uglify())
	.pipe(gulp.dest('dist/js'))
})

gulp.task('dist',['html','style','script']);


var browserSync=require('browser-sync');
var reload=browserSync.reload;

gulp.task('server',function(){
	browserSync({
		server:{
			baseDir:'src'
		}
	});
	//要监听的文件，监听后刷新
	gulp.watch(['*.html','css/*.css','js/*.js'],{cwd:'src'},reload)
});


var babel=require('gulp-babel');
gulp.task('esTo',() =>{
	return gulp.src('./src/js/*.js')
	.pipe(babel({
		presets:['es2015']
	}))
	.pipe(gulp.dest('dist/js'))
})

//gulp.task('default',['watch'])
var imagemin = require('gulp-imagemin'),
    cache = require('gulp-cache'),
    notify = require("gulp-notify");
gulp.task('images', function() {
  return gulp.src('src/images/**/*')
    .pipe(cache(imagemin({ optimizationLevel: 3, progressive: true, interlaced: true })))
    .pipe(gulp.dest('dist/images'))
    .pipe(notify({ message: 'Images task complete' }));
});