var should = require('should');
var imagepreload = require('../');
var gutil = require('gulp-util');
var fs = require('fs');
var path_join = require('path').join;
var vfs = require('vinyl-fs');

function imageFile(imagename){
  var base = path_join(__dirname,"fixtures");
  var path = path_join(base, imagename);
  return new gutil.File({
    cwd: __dirname,
    base: base,
    path: path,
    contents: fs.readFileSync(path)
  })
}

describe('gulp-image-preload',function(){
  describe("imagepreload()",function(){
    xit('emptyFile',function(done){
      var stream = imagepreload();
      var emptyFile = {
        isNull: function(){ return true; }
      }
      stream.on("data",function(data){
        data.should.equal(emptyFile);
        done();
      })
      stream.write(emptyFile);
    });
    xit('fail stream',function(done){
      var stream = imagepreload()
      var streamFile = {
        isNull: function(){ return false; },
        isStream: function(){ return true; }
      };
      stream.on('error',function(err){
        err.message.should.equal("Streaming not supported");
        done();
      });
      stream.write(streamFile);
    });
    
    xit('test simple output',function(done){
      var pattern = path_join(__dirname, "fixtures/*.jpeg");
      vfs
        .src(pattern)
        .pipe(imagepreload())
        .on('data',function(info){          
          should.exist(info);
          should.equal(info.indexOf('<!--preloader:js-->'), 0);
          should.exist(info.indexOf('<!--endpreloader:js-->') > 0 );
          should.equal(info.indexOf('</head>'), info.length - 7);
          should.exist(info.indexOf("window.PRELOADER") > 0 );
          should.exist(info.indexOf('cat1.jpeg') > 0);
          should.exist(info.indexOf('123.cat2.jpeg') > 0);
        })
        .on('end', done);
    });
    xit('test custom output {jsvar}',function(done){
      var pattern = path_join(__dirname, "fixtures/*.jpeg");
      vfs
        .src(pattern)
        .pipe(imagepreload({
          jsvar:"PRELOADER2"
        }))
        .on('data',function(info){          
          should.exist(info);
          should.equal(info.indexOf('<!--preloader:js-->'), 0);
          should.exist(info.indexOf('<!--endpreloader:js-->') > 0 );
          should.equal(info.indexOf('</head>'), info.length - 7);
          should.exist(info.indexOf("window.PRELOADER2") > 0 );
          should.exist(info.indexOf('cat1.jpeg') > 0);
          should.exist(info.indexOf('123.cat2.jpeg') > 0);
        })
        .on('end', done);
    });
    xit('test custom output {rev}',function(done){
      var pattern = path_join(__dirname, "fixtures/*.jpeg");
      vfs
        .src(pattern)
        .pipe(imagepreload({
          rev:true
        }))
        .on('data',function(info){   
          should.exist(info);
          should.equal(info.indexOf('<!--preloader:js-->'), 0);
          should.exist(info.indexOf('<!--endpreloader:js-->') > 0 );
          should.equal(info.indexOf('</head>'), info.length - 7);
          should.exist(info.indexOf("window.PRELOADER") > 0 );
          should.exist(info.indexOf('cat1.jpeg') > 0);
          should.exist(info.indexOf('"cat2.jpeg":"123.cat2.jpeg"') > 0);
        })
        .on('end', done);
    });
    xit('test custom output {injectFile}',function(done){
      var pattern = path_join(__dirname, "fixtures/*.*");
      var counts = 0;
      vfs
        .src(pattern)
        .pipe(imagepreload())
        .on('data',function(file){   
          counts++;
          var info = file.contents.toString();
          should.exist(info);
          should.exist(info.indexOf('<!--preloader:js-->') > 0 );
          should.exist(info.indexOf('<!--endpreloader:js-->') > 0 );
          should.exist(info.indexOf('</head>') > 0 );
          should.exist(info.indexOf("window.PRELOADER") > 0 );
          should.exist(info.indexOf('cat1.jpeg') > 0);
          should.exist(info.indexOf('"cat2.jpeg":"123.cat2.jpeg"') > 0);
        })
        .on('end', function(){
          should.equal(counts,2);
          done();
        });
    });
    it('test custom create new files',function(done){
      var pattern = path_join(__dirname, "fixtures/*.*");
      var counts = 0;
      var dest = path_join(__dirname, "../tmp");

      vfs
        .src(pattern)
        .pipe(imagepreload())
        .pipe(vfs.dest(dest))
        .on('finish',done);
          
    });
  });  
});