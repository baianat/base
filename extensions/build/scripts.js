const fs = require('fs');
const path = require('path');
const uglify = require('uglify-js').minify;
const chalk = require('chalk');

const { rollup } = require('rollup');
const { script, extensions } = require('./config');

const isProduction = process.env.MODE === 'production';

async function buildScripts (format, ext) {
  console.log(chalk.cyan(`📦  Generating ${format} ${ext}...`));

  // get the rollup bundle.
  const bundle = await rollup({
    input: `${ext}/src/js/${ext}.js`,
    ...script.inputOptions
  });

  // pass the desired output config
  const { code } = await bundle.generate({
    format: format,
    name: `${ext.charAt(0).toUpperCase()}${ext.slice(1)}`,
    banner: script.banner
  });

  let fileName = `${ext}${format === 'es' ? '.esm' : ''}.js`;
  let filePath = path.join(`${ext}/dist/js`, fileName);

  // write the un-minified code.
  fs.writeFileSync(filePath, code);
  console.log(chalk.green(`👍  ${fileName}`));

  // write the minified code.
  if (!isProduction && format === 'umd') return;
  filePath = path.join(`${ext}/dist/js`, `${ext}.min.js`);
  fs.writeFileSync(filePath, uglify(code, script.uglifyOptions).code);
}

extensions.forEach(ext => {
  buildScripts('umd', ext);
  buildScripts('es', ext);
});

module.exports = { buildScripts };
