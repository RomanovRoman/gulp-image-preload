var should = require('should');
var through2 = require('through2');
var imagepreload = require('../');
var gutil = require('gulp-util');
var fs = require('fs');
var path_join = require('path').join;
var vfs = require('vinyl-fs');

var deleteFolderRecursive = function(path) {
    var files = [];
    if( fs.existsSync(path) ) {
        files = fs.readdirSync(path);
        files.forEach(function(file,index){
            var curPath = path + "/" + file;
            if(fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};

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
    it('emptyFile',function(done){
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
    it('fail stream',function(done){
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

    it('test simple output',function(done){
      var pattern = path_join(__dirname, "fixtures/*.jpeg");
      vfs
        .src(pattern)
        .pipe(imagepreload())
        .pipe(through2.obj(function(file, enc, next){
          var info = file.toString();
          should.exist(info);          
          should.exist(info.indexOf("window.PRELOADER") > 0 , 'window.PRELOADER');
          should.exist(info.indexOf('cat1.jpeg') > 0, 'cat1.jpeg');
          should.exist(info.indexOf('123.cat2.jpeg') > 0, '123.cat2.jpeg');
          next();
        }, function(){
          done();
        }));
    });
    it('test custom output {jsvar}',function(done){
      var pattern = path_join(__dirname, "fixtures/*.jpeg");
      vfs
        .src(pattern)
        .pipe(imagepreload({
          jsvar:"PRELOADER2"
        }))
        .pipe(through2.obj(function(file, enc, next){
          var info = file.toString();
          should.exist(info);          
          should.exist(info.indexOf("window.PRELOADER2") > 0 );
          should.exist(info.indexOf('cat1.jpeg') > 0);
          should.exist(info.indexOf('123.cat2.jpeg') > 0);
          next();
        }, function(next){
          next();
          done();
        }));
    });
    it('test custom output {rev}',function(done){
      var pattern = path_join(__dirname, "fixtures/*.jpeg");
      vfs
        .src(pattern)
        .pipe(imagepreload({
          rev:true
        }))
        .pipe(through2.obj(function(file, enc, next){
          var info = file.toString();
          should.exist(info);          
          should.exist(info.indexOf("window.PRELOADER") > 0 );
          should.exist(info.indexOf('cat1.jpeg') > 0);
          should.exist(info.indexOf('"cat2.jpeg":"123.cat2.jpeg"') > 0);
          next();
        }, function(next){
          next();
          done();
        }));
    });
    it('test custom output {injectFiles}',function(done){
      var pattern = path_join(__dirname, "fixtures", "*.*");
      var counts = 0;
      vfs
        .src(pattern)
        .pipe(imagepreload({
          inline:[
            path_join(__dirname, 'fixtures', 'index.html'),
            path_join(__dirname, 'fixtures', 'index2.html'),
          ]
        }))
        .pipe(through2.obj(function(file, enc, next){
          counts++;
          var info = file.contents.toString();
          should.exist(info);
          should.exist(info.indexOf('<!--preloader:js-->') > 0 );
          should.exist(info.indexOf('<!--endpreloader:js-->') > 0 );
          should.exist(info.indexOf('</head>') > 0 );
          should.exist(info.indexOf("window.PRELOADER") > 0 );
          should.exist(info.indexOf('cat1.jpeg') > 0);
          should.exist(info.indexOf('"cat2.jpeg":"123.cat2.jpeg"') > 0);
          next();
        }, function(next){
          should.equal(counts,2);
          next();
          done();
        }));
    });
    it('test custom create new files',function(done){
      var pattern = path_join(__dirname, "fixtures", "*.jpeg");
      var dest = path_join(__dirname, "../tmp");
      deleteFolderRecursive(dest);
      vfs
        .src(pattern)
        .pipe(imagepreload({ 
          inline:path_join(__dirname, 'fixtures', 'index.html')
        }))
        .pipe(vfs.dest(dest))
        .on('end',function(){
          should.equal(fs.existsSync('tmp/index.html'), true, 'file not exist');
          done();
        });
    });
  });
});