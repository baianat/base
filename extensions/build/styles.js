const fs = require('fs');
const chalk = require('chalk');
const stylus = require('stylus');
const path = require('path');
const uglifycss = require('uglifycss');
const autoprefixer = require('autoprefixer-stylus');

const { extensions } = require('./config');

const isProduction = process.env.MODE === 'production';

function buildStyles () {
  extensions.forEach(extension => {
    console.log(chalk.cyan(`📦  Generating ${extension} Stylesheets...`));
    const app = fs.readFileSync(`${extension}/src/stylus/app.styl`, 'utf8');
    stylusToCSS(app, extension);
  });
}

function stylusToCSS (styl, ext) {
  stylus(styl)
    .import('/node_modules/@baianat/base.framework/src/stylus/util/_index')
    .import('_assets/stylus/mini-normalize')
    .include(`${ext}/src/stylus`)
    .use(autoprefixer({ browsers: ['last 5 version'] }))
    .render((err, css) => {
      if (err) {
        throw err;
      }
      const filePath = path.join(`${ext}/dist/css`, `${ext}.css`);
      console.log(`${chalk.green(`👍  ${ext}.css`)}`);
      fs.writeFileSync(filePath, css);

      if (!isProduction) return;
      const minPath = path.join(`${ext}/dist/css`, `${ext}.min.css`);
      const uglifiedCss = uglifycss.processString(css);
      fs.writeFileSync(minPath, uglifiedCss);
    });
}

module.exports = { stylusToCSS };

buildStyles();
