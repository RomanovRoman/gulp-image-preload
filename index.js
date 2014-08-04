var through2 = require('through2');
var gutil = require('gulp-util');
var PluginError = gutil.PluginError;
var path = require('path');
var _ = require('lodash');
var fs = require('fs');

module.exports = function (options) {
  options = _.defaults(options || {},{
    jsvar: "PRELOADER",
    injectFile: function(filename){
      return /\.html$/.test(filename);
    },
    rev: false,
    reduceRev: function(filename) {
      return filename.replace(/([^\.]+)\.(.+)/, "$2");
    },
    output:null
  });
  if (options.inlineLoad === null) {
    options.inlineLoad = options.inlineFile;
  }

  var buffer = {};
  var injectFiles = [];  

  function processData(file, enc, next){
    var self = this;
    if (file.isNull()) {
      this.push(file); // pass along
      return next();
    }
    if (file.isStream()) {
      this.emit('error', new PluginError('gulp-image-preload', 'Streaming not supported'));
      return next();
    }
    var filename = path.normalize(file.path);
    if(options.injectFile(filename)){
      injectFiles.push(file);
      return next();
    }
    var pieces = filename.split(path.sep);
    var pointer = _.reduce(pieces.slice(0, pieces.length - 1), (function(pointer, item) {
      return pointer[item] || (pointer[item] = {});
    }), buffer);
    filename = pieces[pieces.length - 1];
    var processFilename = options.rev ? options.reduceRev(filename) : filename;
    pointer[processFilename] = filename;
    next();
  }
  function endStream(next){
    var self = this;
    var content = JSON.stringify(buffer);
    
    fs.readFile("template/inject.min.js",function(err, data){
      if(!!err){
        self.emit('error',err);
        return next();
      }
      var fileData = data.toString();
      fileData = fileData.replace(/window\.PRELOADER[ ]*=/, "");
      var script = "window." + options.jsvar + " = " + fileData + "; window." + options.jsvar + "=window." + options.jsvar + "(" + content + ");";
      var result = "<!--preloader:js--><script> " + script + " </script><!--endpreloader:js--></head>";
      if(!injectFiles.length){
        var newFile = new gutil.File({            
          path: options.output,
          contents: new Buffer(result)
        });
        self.push(newFile);
        next();
      } else {
        var rx = /<[ ]*\/[ ]*head[ ]*>/;
        var rxClean = /<!--[ ]*preloader:js[ ]*-->.+<!--[ ]*endpreloader:js[ ]*-->/;
        injectFiles.forEach(function(file){
          var html = file.contents.toString();
          html = html.replace(rxClean, "");
          html = html.replace(rx, result);
          var newFile = new gutil.File({
            cwd: file.cwd,
            base: file.base,
            path: file.path,
            contents: new Buffer(html)
          });          
          self.push(newFile);
        });
        next();
      }
    });
  }

  return through2.obj(processData, endStream);
};