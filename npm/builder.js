'use strict';
module.exports = Builder;

const fs = require('fs');
const log = require('bestikk-log');
const bfs = require('bestikk-fs');
const archiver = require('archiver');

function Builder () {
}

Builder.prototype.uncommentFontsImport = function () {
  const path = 'app/css/themes/asciidoctor.css';
  let data = fs.readFileSync(path, 'utf8');
  log.debug('Uncomment fonts @import in asciidoctor.css');
  data = data.replace(/\/\*(@import "[^"]+";)\*\//g, '$1');
  fs.writeFileSync(path, data, 'utf8');
};

// REMIND: Fixed in Asciidoctor.js 1.5.6
Builder.prototype.fixTimezone = function () {
  const path = 'app/js/vendor/asciidoctor.js';
  var data = fs.readFileSync(path, 'utf8');
  log.debug('Backport https://github.com/opal/opal/issues/539');
  data = data.replace(/string\.match\(\/\\\(\[\^\)\]\+\\\)\/\)\[0\]\.match\(\/\[A-Z\]\/g\)\.join\(''\);/g, 'string.match(/\\((.+)\\)(?:\\s|$)/)[1];');
  fs.writeFileSync(path, data, 'utf8');
};

Builder.prototype.replaceImagesURL = function () {
  const themesNamesWithImages = ['github', 'golo', 'maker', 'riak'];
  function replaceURL (themeName) {
    const path = `app/css/themes/${themeName}.css`;
    var data = fs.readFileSync(path, 'utf8');
    log.debug(`Replace images url in ${themeName}.css`);
    data = data.replace(/url\('\.\.\/images\/([^']+)'/, 'url(\'../../img/themes/$1\'');
    fs.writeFileSync(path, data, 'utf8');
  }
  themesNamesWithImages.forEach(replaceURL);
};

Builder.prototype.clean = function () {
  log.task('clean');
  log.debug('remove dist directory');
  bfs.removeSync('dist');
  bfs.mkdirsSync('dist');
};

Builder.prototype.compress = function () {
  log.task('compress');
  const outputPath = 'dist/asciidoctor-browser-extension.zip';
  const output = fs.createWriteStream(outputPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  output.on('close', function () {
    log.debug(outputPath + ' ' + archive.pointer() + ' total bytes written');
  });

  archive.on('warning', function (err) {
    if (err.code === 'ENOENT') {
      log.warn('archiver warning: ' + err);
    } else {
      throw err;
    }
  });

  archive.on('error', function (err) {
    throw err;
  });

  archive.pipe(output);

  archive.file('LICENSE');
  archive.file('README.adoc');
  archive.file('changelog.adoc');
  archive.directory('app/', false);
  archive.finalize();
};

Builder.prototype.copy = function () {
  log.task('copy vendor resources');
  // JavaScript files
  bfs.copySync('node_modules/asciidoctor.js/dist/asciidoctor.js', 'app/js/vendor/asciidoctor.js');
  bfs.copySync('node_modules/jquery/dist/jquery.min.js', 'app/js/vendor/jquery.min.js');
  bfs.copySync('node_modules/bootstrap/dist/js/bootstrap.min.js', 'app/js/vendor/bootstrap.min.js');
  bfs.copySync('node_modules/chartist/dist/chartist.min.js', 'app/js/vendor/chartist.min.js');
  // Stylesheets
  bfs.copySync('node_modules/asciidoctor.js/dist/css/asciidoctor.css', 'app/css/themes/asciidoctor.css');
  bfs.copySync('node_modules/bootstrap/dist/css/bootstrap.min.css', 'app/css/bootstrap.min.css');
  bfs.copySync('node_modules/font-awesome/css/font-awesome.min.css', 'app/css/font-awesome.min.css');
  // Web Fonts
  bfs.copySync('node_modules/font-awesome/fonts/fontawesome-webfont.woff2', 'app/fonts/fontawesome-webfont.woff2');
};

Builder.prototype.dist = function () {
  this.clean();
  this.copy();
  this.uncommentFontsImport();
  this.fixTimezone();
  this.replaceImagesURL();
  this.compress();
};
