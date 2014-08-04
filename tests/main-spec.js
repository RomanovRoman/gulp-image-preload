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

var TMP = path_join(__dirname, "../tmp");

describe('gulp-image-preload',function(){
  describe("imagepreload()",function(){
    beforeEach(function(){
      deleteFolderRecursive(TMP);
    });
    afterEach(function(){
      deleteFolderRecursive(TMP);
    });
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
          info.should.be.hmtl;
          info.should.containEql("window.PRELOADER");
          info.should.containEql('cat1.jpeg');
          info.should.containEql('123.cat2.jpeg');
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
          info.should.be.html;
          info.should.containEql("window.PRELOADER2");
          info.should.containEql('cat1.jpeg');
          info.should.containEql('123.cat2.jpeg');
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
          info.should.be.html;
          info.should.containEql("window.PRELOADER");
          info.should.containEql('cat1.jpeg');
          info.should.containEql('"cat2.jpeg":"123.cat2.jpeg"');
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
          info.should.be.html;

          info.should.containEql('<!--preloader:js-->');
          info.should.containEql('<!--endpreloader:js-->');
          info.should.containEql('</head>');
          info.should.containEql("window.PRELOADER");
          info.should.containEql('cat1.jpeg');
          info.should.containEql('"123.cat2.jpeg":"123.cat2.jpeg"');

          next();
        }, function(next){
          should.equal(counts,2);
          next();
          done();
        }));
    });
    it('test custom create new files',function(done){
      var pattern = path_join(__dirname, "fixtures", "*.jpeg");
      var dest = TMP;
      vfs.src(pattern)
        .pipe(imagepreload({
          inline:path_join(__dirname, 'fixtures', 'index.html')
        }))
        .pipe(vfs.dest(dest))
        .on('end',function(){
          should.equal(fs.existsSync('tmp/index.html'), true, 'file tmp/index.html not exist');
          done();

        });
    });
    it('test create script file which integrates to another',function(done){
      var pattern = path_join(__dirname, "fixtures", "*.jpeg");
      var dest = TMP;

      vfs.src(pattern)
        .pipe(imagepreload({
          inline:path_join(__dirname, 'fixtures', 'index.html'),
          script:"test.js"
        }))
        .pipe(vfs.dest(dest))
        .on('end',function(){
          should.equal(fs.existsSync('tmp/index.html'), true, 'file tmp/index.html not exist');
          should.equal(fs.existsSync('tmp/test.js'), true, 'file tmp/test.js not exist');
          var data2 = fs.readFileSync('tmp/test.js').toString();
          data2.should.containEql("window.PRELOADER");

          var data1 = fs.readFileSync('tmp/index.html').toString();
          data1.should.containEql("<script src='test.js'");
          done();
        });
    });
    it('test create script file without intergrates',function(done){
      var pattern = path_join(__dirname, "fixtures", "*.jpeg");
      var dest = TMP;

      vfs.src(pattern)
        .pipe(imagepreload({
          inline:null,
          script:"test.js"
        }))
        .pipe(vfs.dest(dest))
        .on('end',function(){          
          fs.existsSync('tmp/test.js').should.be.ok;
          var data2 = fs.readFileSync('tmp/test.js').toString();
          data2.should.containEql("window.PRELOADER");          
          done();
        });
    });
  });
});