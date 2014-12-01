"use strict";
/*jshint -W068 */
var through2 = require("through2");
var gutil = require("gulp-util");
var PluginError = gutil.PluginError;
var path = require("path");
var _ = require("lodash");
var fs = require("fs");
var vfs = require("vinyl-fs");
var md5 = require("MD5");

module.exports = function (options) {
  options = _.defaults(options || {},{
    jsvar: "PRELOADER",
    rev: false,
    reduceRev: function(filename) {
      return filename.replace(/([^\.]+)\.(.+)/, "$2");
    },
    inline:null,
    script:null,
    scriptPath:null,
    md5: true
  });
  if(!options.scriptPath){
    options.scriptPath = options.script;
  }

  var templatePath = path.join(__dirname, "template", "inject.min.js");

  var buffer = {};

  function processData(file, enc, next){
    if (file.isNull()) {
      /*jshint validthis:true */
      this.push(file); // pass along
      return next();
    }
    if (file.isStream()) {
      /*jshint validthis:true */
      this.emit("error", new PluginError("gulp-image-preload", "Streaming not supported"));
      return next();
    }
    var filename = file.relative;
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
    /*jshint validthis:true */
    var self = this;
    var content = JSON.stringify(buffer);

    var rx = /<[ ]*\/[ ]*head[ ]*>/;
    var rxClean = /<!--[ ]*preloader:js[ ]*-->.+<!--[ ]*endpreloader:js[ ]*-->/;

    var through2_processTemplate = through2.obj(function(buffer, enc, next){
      if(!buffer.isBuffer()){
        self.emit("error", new PluginError("gulp-image-preload", "Need buffer in load template"));
      }
      var fileData = buffer.contents.toString();
      fileData = fileData.replace(/window\.PRELOADER[ ]*=/, "");
      var script = "window." + options.jsvar + " = " + fileData + "; window." + options.jsvar + "=window." + options.jsvar + "(" + content + ");";
      this.push(new Buffer(script));
      next();
    });

    var createScript = false;
    var through2_finalize = through2.obj(function(buffer, type, next){
      if(type !== "buffer"){
        self.emit("error", new PluginError("gulp-image-preload", "Need buffer in load template"));
      }
      var result;
      if(options.script){
        if(!createScript){
          createScript = true;
          if(options.md5){
            var hash = md5(buffer).slice(0,6);
            options.scriptPath = options.scriptPath.replace(/([^\/]+)\.js$/, hash + ".$1.js");
          }
          var scriptFile = new gutil.File({
            cwd:"",
            base:"",
            path: options.scriptPath,
            contents: buffer
          });
          self.push(scriptFile);
        }
        result = "<!--preloader:js--><script src=\'" + options.scriptPath + "\'></script><!--endpreloader:js--></head>";
      } else {
        result = "<!--preloader:js--><script> " + buffer.toString() + " </script><!--endpreloader:js--></head>";
      }

      if(options.inline){
        inline_script.call(this, options.inline, result, function(){
          next();
        });
      } else if(!options.script) {
        self.push(buffer);
        next();
        finish();
      } else {
        next();
        finish();
      }
    }, function(next){
      next();
      finish();
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

            self.push(newFile);
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
