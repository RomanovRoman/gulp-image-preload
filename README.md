gulp-image-preload
==================

Gulp task for generate js file with list of image resourse

=======
[![Build Status](https://travis-ci.org/lexich/gulp-image-preload.png?branch=master)](https://travis-ci.org/lexich/gulp-image-preload)

## Install

```
npm install gulp-image-preload --save-dev
```

## Usage
```javascript
var imagepreload = require('gulp-image-preload');

gulp.task('imagepreload', function () {
  gulp.src('image/**/*.{png,jpg,gif,jpeg}')
    .pipe(imagepreload({
        inline: "html/index.html"
    }))
    .pipe(gulp.dest('html/'));
});
```


## Options

#### jsvar
Type: String Default value: PRELOADER

This is name of global js variable which will be integrated to *.html document "window.PRELOADER"

#### rev
Type: String Default value: false

If you use functionality like plugin gulp-rev, set value true and processing filepath by function `options.reduceRev` which reduce revision


#### reduceRev
Type: Function

Function which reduce revision from file path while processin tree of files

#### inline
Html documents are used for inject preloader script

#### script
Type: String Default value: null
If you want inject file automaticly, script inline in html tag

#### scriptPath
Type: String Default value: null
Path of options.script to inline script to html document

#### md5
Type: Boolean Default value: true
add revision to name of options.script file

## License

(MIT License)

Copyright (c) 2014 Plus 3 Network dev@plus3network.com

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

