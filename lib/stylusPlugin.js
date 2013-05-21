var stylus  = require('stylus'),
      path  = require('path'),
        fs  = require('fs'),
     Batch  = require('batch'),
     debug  = require('debug')('component:stylusPlugin'),
      read  = fs.readFileSync;

var stylusPlugin = module.exports = function stylusPlugin(builder) {
  debug('Loading Stylus Plugin');
  builder.hook('before styles', function(pkg, next) {
    var styles = pkg.config.styles;
    if (!styles) return next();

    var stylusFiles = styles.filter(function(file) { return path.extname(file) == '.styl';});

    if(!stylusFiles.length) return next();

    batch = new Batch();

    stylusFiles.forEach(function(styl) {
      debug("Compiling File: " + styl);
      batch.push(function(done) {
        // Load info about the file
        var filePath = pkg.path(styl),
            contents = read(filePath, 'utf-8');
            file     = path.basename(styl, '.styl') + '.css';

        // Set some options
        var options = {
          filename: filePath,
          compress: stylusPlugin.compress,
           firebug: stylusPlugin.firebug,
           linenos: stylusPlugin.linenos,
           paths: [process.cwd()].concat(stylusPlugin.paths),
           'include css': stylusPlugin.includeCSS
        };

        var renderer = stylus(contents, options);

        stylusPlugin.plugins.forEach(function(plugin) {
          renderer.use(plugin);
        });

        stylusPlugin.imports.forEach(function(file) {
          renderer.import(file);
        });

        renderer.render(function(err, css) {
          if(err) {
            debug('Got Error');
            debug(err);
            done(err);
          } else {
            pkg._files[styl] = css;
            done();
          }
        });
      });
    });

    batch.end(next);
  });
};

stylusPlugin.compress = false;
stylusPlugin.linenos = false;
stylusPlugin.firebug = false;
stylusPlugin.imports = [];
stylusPlugin.includeCSS = true;
stylusPlugin.paths = [];
stylusPlugin.plugins = [];