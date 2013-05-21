var stylus  = require('stylus'),
      path  = require('path'),
     Batch  = require('batch'),
     debug  = require('debug')('chameleon:stylusPlugin'),
         _  = require('lodash'),
  readFile  = require('fs').readFileSync;
 writeFile  = require('fs').writeFileSync;

var stylusPlugin = module.exports = function stylusPlugin(builder) {
  debug('Loading Stylus Plugin');
  builder.hook('before styles', function(pkg, next) {

    // If this is not root package
    if (!pkg.root) {
      // Remove non-root Stylus files form .styles array
      pkg.config.styles = pkg.config.styles.filter(function(file) { 
        return path.extname(file) !== '.styl';
      });
      return next();
    }

    var styles = pkg.config.styles;
    // If it has no .styles files
    if (!styles) return next();
    var stylusFiles = styles.filter(function(file) { 
      return path.extname(file) == '.styl';
    });
    // If there are no Stylus files in .styles
    if (!stylusFiles.length) return next();

    // Parse .styles in dependecies for Stylus files
    var deps = _.keys(pkg.config.dependencies);
    if (deps.length) {
      depsDirs = deps.map(function(gitPath){
          return 'components/'+ gitPath.replace('/','-')+'/';
      });

      var depsStylusFiles = [];
      depsDirs.forEach(function(depsDir){
          cpntJson = JSON.parse(readFile(depsDir+'component.json'));
          cpntStylusFiles = cpntJson.styles.filter(function(file) { 
              return path.extname(file) == '.styl';
            });
          cpntStylusFiles = cpntStylusFiles.map(function(file){
            debug("Importing File: " + depsDir + file);
            depsStylusFiles.push(depsDir + file);
          });
      });
      // Pass dependencies stylus files to import
      stylusPlugin.imports = depsStylusFiles;
    }

    batch = new Batch();
    stylusFiles.forEach(function(styl) {
      debug("Compiling File: " + styl);
      batch.push(function(done) {
        // Load info about the file
        var filePath = pkg.path(styl),
            contents = readFile(filePath, 'utf-8');
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