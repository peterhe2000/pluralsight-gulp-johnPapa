module.exports = function () {
    var client = './src/client/';
    var clientApp = client + 'app/';
    var server = './src/server/';
    var temp = './.tmp/';
    var config = {
        /**
         * Files path
         */
        // all js to vet
        alljs: [
            './src/**/*.js',
            './*.js'
        ],
        build: './build/',
        client: client,
        css: temp + 'styles.css',
        fonts: './bower_components/font-awesome/fonts/**/*.*',
        html: clientApp +  '**/*.html',
        htmltemplates: clientApp +  '**/*.html',
        images: client + 'images/**/*.*',
        index: client + 'index.html',
        js: [
            clientApp + '**/*.module.js',
            clientApp + '**/*.js',
            '!' + clientApp + '**/*.spec.js' //exclude those files
        ],

        less: client + 'styles/styles.less',
        server: server,
        temp: temp,

        /**
         * template cache
         */
        templateCache:{
            file: 'templates.js',
            options: {
                module: 'app.core',
                standAlone: false,
                root: 'app/'
            }
        },
        /**
         * browser sync
         */
        browserReloadDelay:1000,
        /**
         * Bower and NPM locations
         */
        bower: {
            json: require('./bower.json'),
            directory: './bower_components/',
            ignorePath: '../..'
        },

        /**
         * Node settings
         */
        defaultPort: 7203,
        nodeServer: './src/server/app.js'
    };

    config.getWiredepDefaultOptions = function() {
        var options = {
            bowerJson: config.bower.json,
            directory: config.bower.directory,
            igonrePath: config.bower.igonrePath
        } ;
        return options;
    };

    return config;
};
