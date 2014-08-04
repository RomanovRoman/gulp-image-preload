var through2 = require('through2');
var gutil = require('gulp-util');
var PluginError = gutil.PluginError;
var path = require('path');
var _ = require('lodash');
var fs = require('fs');
var vfs = require('vinyl-fs');

module.exports = function (options) {
  options = _.defaults(options || {},{
    jsvar: "PRELOADER",
    rev: false,
    reduceRev: function(filename) {
      return filename.replace(/([^\.]+)\.(.+)/, "$2");
    },
    dest:null
  });
  if (options.inlineLoad === null) {
    options.inlineLoad = options.inlineFile;
  }

  var templatePath = path.join(__dirname, 'template', 'inject.min.js');

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

  function endStream(finish){
    var self = this;
    var content = JSON.stringify(buffer);

    var rx = /<[ ]*\/[ ]*head[ ]*>/;
    var rxClean = /<!--[ ]*preloader:js[ ]*-->.+<!--[ ]*endpreloader:js[ ]*-->/;

    var through2_processTemplate = through2.obj(function(buffer, enc, next){
      if(!buffer.isBuffer()){
        self.emit('error', new PluginError('gulp-image-preload', 'Need buffer in load template'));
      }
      var fileData = buffer.contents.toString();
      fileData = fileData.replace(/window\.PRELOADER[ ]*=/, "");
      var script = "window." + options.jsvar + " = " + fileData + "; window." + options.jsvar + "=window." + options.jsvar + "(" + content + ");";
      this.push(new Buffer(script));
      next();
    });

    var through2_finalize = through2.obj(function(buffer, type, next){      
      if(type != 'buffer'){
        self.emit('error', new PluginError('gulp-image-preload', 'Need buffer in load template'));
      }
      if(options.dest === null){
        self.push(buffer);
        next();
        finish();
      } else {        
        var script = buffer.toString();
        var result = "<!--preloader:js--><script> " + script + " </script><!--endpreloader:js--></head>";
        inline_script.call(this, options.dest, result, function(){
          next();
          finish();
        });        
      }
    });

    function inline_script(src, script, finish){
      //receive paths of processing scripts
      //and modify their contents
      vfs.src(src).pipe(
        through2.obj(
          function(file, enc, next)
          {
            var html = file.contents.toString();
            html = html.replace(rxClean, "");
            html = html.replace(rx, script);

            var newFile = new gutil.File({
              cwd: file.cwd,
              base: file.base,
              path: file.path,
              contents: new Buffer(html)
            });

            self.push(file);
            next();
          }, 
          function(next)
          {
            next();
            finish();
          }
        )
      );
    }
    vfs.src([templatePath])
      .pipe(through2_processTemplate)
      .pipe(through2_finalize);
  }



  return through2.obj(processData, endStream);
};