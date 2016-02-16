var gulp = require('gulp');
var args = require('yargs').argv; // gulp for get command from command line.
var bowserSync = require('browser-sync');
//required a local file name 'gulp.config' so that we can use variables from diff files.
var config = require('./gulp.config')();
var del = require('del'); // del file library
var $ = require('gulp-load-plugins')({lazy: true});
var port = process.env.PORT || config.defaultPort; // Port put from command line or config default port

//var jshint = require('gulp-jshint'); // jshint
//var jscs = require('gulp-jscs'); // js color style
//var util = require('gulp-util'); //util for helper
//var gulpprint = require('gulp-print'); // gulp print
//var gulpif = require('gulp-if'); // gulp conditionly set thing in the string
//$.autoprefixer // vendor pre fix
//($.plumber())// great way to keep pipe working still and show error message
//$.inject// inject to index.html


// Gulp task manager.
//= gulp.task('help', function() {
// $.taskListing
// });

gulp.task('help', $.taskListing);

// Gulp default task
gulp.task('default', ['help']);

gulp.task('vet', function(){
    log('Analyzing source with JSHInt and JSCS');
    return gulp
        .src(config.alljs)
        .pipe($.if(args.verbose, $.print()))// args.verbose is command from command line.
        .pipe($.jscs())
        .pipe($.jshint())
        .pipe($.jshint.reporter('jshint-stylish', {verbose:true}))
        .pipe($.jshint.reporter('fail'));
});

gulp.task('styles', ['clean-styles'], function(){
    log('Compiling Less --> CSS');
    return gulp
        .src(config.less)
        .pipe($.plumber())
        .pipe($.less())
        //.on('error', errorlogger)//ON is matching particular event.
        .pipe($.autoprefixer({browsers: ['Last 2 version', '> 5%']}))
        .pipe(gulp.dest(config.temp));
});

gulp.task('fonts', ['clean-fonts'], function(){
    log('Copying fonts');
    return gulp
        .src(config.fonts)
        .pipe(gulp.dest(config.build + 'fonts'));
});

gulp.task('images', ['clean-images'], function(){
    log('Copying and compressing the images');
    return gulp
        .src(config.images)
        .pipe($.imagemin({optimizationLevel:4}))
        .pipe(gulp.dest(config.build + 'images'));
});

gulp.task('clean', function(){
    var delConfig = [].concat(config.build, config.temp);
    log('cleaning: ' + $.util.colors.blue(delConfig));
    return del(delConfig);
});

gulp.task('clean-fonts', function(){
    log('clean-fonts');
    var files = config.build + 'fonts/**/*.*';
    return clean(files);
});

gulp.task('clean-images', function(){
    log('clean-styles');
    var files = config.build + 'images/**/*.*';
    return clean(files);
});

gulp.task('clean-styles', function(){
    log('clean-styles');
    var files = config.temp + '**/*.css';
    return clean(files);
});

gulp.task('clean-code', function(){
    log('clean-code');
    var files =  [].concat(
        config.temp + '**/*.js',
        config.build + '**/*.html',
        config.build + 'js/**/*.js'
    );
    return clean(files);
});

// Gulp $templatecache
gulp.task('templatecache', ['clean-code'],function(){
    log('Creating Angularjs $templatecache');
    return gulp
        .src(config.htmltemplates)
        .pipe($.minifyHtml({empty:true}))
        //made gulp-angular-templatecache to $.angularTemplatecache
        .pipe($.angularTemplatecache(
            config.templateCache.file,
            config.templateCache.options
            ))
        .pipe(gulp.dest(config.temp));
});

gulp.task('less-watcher', function(){
    log('less-watcher');
    gulp.watch([config.less], ['styles']);
});

gulp.task('wiredep', function(){
    log('Wire up the bower css js and our app js into the html');
    var options = config.getWiredepDefaultOptions();
    var wiredep = require('wiredep').stream;

    return gulp
        .src(config.index)
        .pipe(wiredep(options))
        .pipe($.inject(gulp.src(config.js)))
        .pipe(gulp.dest(config.client));
});

gulp.task('inject', ['wiredep', 'styles', 'templatecache'], function(){
    log('Wire up the app css into the html, and call wiredep');
    var options = config.getWiredepDefaultOptions();
    var wiredep = require('wiredep').stream;

    return gulp
        .src(config.index)
        .pipe($.inject(gulp.src(config.css)))
        .pipe(gulp.dest(config.client));
});

gulp.task('optimize', ['inject'], function(){
    log('optimizing the javascript, css, html');
    var useref = $.useref({searchPath: ['.tmp', 'src' , './bower_components']});
    var templateCache = config.temp + config.templateCache.file;
    return gulp
        .src(config.index)
        .pipe($.plumber())
        //TODO process
        .pipe($.inject(gulp.src(templateCache, {read: false}), {
            starttag: '<!-- inject:templates:js -->'
        }))
        .pipe(useref)
        .pipe($.debug())
        .pipe(gulp.dest(config.build));
});

gulp.task('server-build', ['optimize'], function(){
    server(false);
});

gulp.task('server-dev', ['inject'], function(){
    server(true);
});

function server(isDev){
    log('Wire up the app css into the html, and call wiredep');
    var nodeOptions = {
        script: config.nodeServer,
        delayTime:1,
        env:{
            'PORT': port,
            'NODE_ENV': isDev? 'dev': 'build'
        },
        watch: [config.server]
    };
    return $.nodemon(nodeOptions)
        //During the restart event of server, run 'Vet' task
        .on('restart', ['vet'], function(ev) {
            log('*** nodemon restarted');
            log('file changed on restart:\n' + ev);
            setTimeout(function(){
                bowserSync.notify('reloading now ...');
                bowserSync.reload({stream: false});
            }, config.browserReloadDelay);
        })
        .on('start', function() {
            log('*** nodemon started');
            // Note: Not working for windows
            startBrowserSync(isDev);
        })
        .on('crash', function() {
            log('*** nodemon crashed: script crashed for some reason');
        })
        .on('exit', function() {
            log('*** nodemon exited cleanly');
        });
}

function changeEvent(event) {
    var srcPattern = new RegExp('/.*(?=/' + config.source + ')/');
    log('File ' + event.path.replace(srcPattern, '') + ' ' + event.type );
}

function startBrowserSync(isDev) {
    //Automate browser loading.
    if(args.nosync || bowserSync.active){
        return;
    }

    log('Starting browser-sync on port ' + port);

    if(isDev)
    {
        gulp.watch([config.less], ['styles'])
            .on('change', function(event) {
                changeEvent(event);
            });
    }
    else
    {
        gulp.watch([config.less, config.js, config.html], ['optimize', browserSync.reload])
            .on('change', function(event) {
                changeEvent(event);
            });
    }

    var options = {
        proxy: 'localhost:' + port,
        port: 3000,
        files: isDev? [
                config.client + '**/*.*',
                '!' + config.less,
                config.temp + '**/*.css'
            ]: [],
        ghostMode: {
            clicks: true,
            location: false,
            forms: true,
            scroll: true
        },
        injectChanges: true,
        logFileChanges: true,
        logLevel: 'debug',
        logPrefix: 'gulp-patterns',
        notify: true,
        reloadDelay: 0 //1000
    };
    bowserSync(options);
}


////////////

function errorlogger(error){
    log('*** Start of Error ***');
    log(error);
    log('*** End of Error ***');
    this.emit('end');
}

function clean(path){
    log('Cleaning: ' + $.util.colors.blue(path));
    return del(path);
}

function log(msg){
    if (typeof(msg) === 'object'){
        for (var item in msg){
            if (msg.hasOwnProperty(item)){
                $.util.log($.util.colors.yellow(msg[item]));
            }
        }
    }
    else
    {
        $.util.log($.util.colors.yellow(msg));
    }
}
