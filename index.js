var through2 = require('through2');
var gutil = require('gulp-util');
var PluginError = gutil.PluginError;
var path = require('path');
var _ = require('lodash');
var fs = require('fs');

module.exports = function (options) {
  options = _.defaults(options || {},{
    jsvar: "PRELOADER",
    injectFile: null,
    rev: false,
    reduceRev: function(filename) {
      return filename.replace(/([^\.]+)\.(.+)/, "$2");
    }
  });
  if (options.inlineLoad === null) {
    options.inlineLoad = options.inlineFile;
  }

  var buffer = {};

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
    var pieces = filename.split(path.sep);
    var pointer = _.reduce(pieces.slice(0, pieces.length - 1), (function(pointer, item) {
      return pointer[item] || (pointer[item] = {});
    }), buffer);
    filename = pieces[pieces.length - 1];
    var processFilename = options.rev ? options.reduceRev(filename) : filename;
    pointer[processFilename] = filename;
    next();
  }
  function endStream(){
    var self = this;
    var content = JSON.stringify(buffer);    
    fs.readFile("template/inject.min.js",function(err, data){
      if(!!err){
        return self.emit('error',err);
      }
      var fileData = data.toString();  
      fileData = fileData.replace(/window\.PRELOADER[ ]*=/, "");
      var script = "window." + options.jsvar + " = " + fileData + "; window." + options.jsvar + "=window." + options.jsvar + "(" + content + ");";
      var result = "<!--preloader:js--><script> " + script + " </script><!--endpreloader:js--></head>";
      if(options.injectFile === null){
        self.emit('data',result);
        self.emit('end');
      } else {
        var rx = /<[ ]*\/[ ]*head[ ]*>/;
        var rxClean = /<!--[ ]*preloader:js[ ]*-->.+<!--[ ]*endpreloader:js[ ]*-->/;
        fs.readFile(options.injectFile, function(err, buffer){          
          if(!!err){
            return self.emit('error',err);
          }
          var html =  buffer.toString();
          html = html.replace(rxClean, "");
          result = html.replace(rx, result);
          self.emit('data',result);
          self.emit('end');
        });
      }
    });
    
  }

  return through2.obj({}, processData, endStream);
};