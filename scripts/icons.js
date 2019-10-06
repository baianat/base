const fs = require('fs');
const path = require('path');
const iconsFolder = 'src/icons'
let icons = {};

readDirFiles(iconsFolder);
fs.writeFileSync('dist/icons.json', JSON.stringify(icons));

function readDirFiles (dirPath) {
  fs.readdirSync(dirPath, { withFileTypes: true }).forEach(file => {
    const currentPath = path.join(dirPath, file.name)
    if(file.isDirectory()) {
      return readDirFiles(currentPath);
    }
    generateSVG(dirPath, file.name);
  });
}

function generateSVG (dir, file) {
  const fileName = file;
  const filePath = path.join(dir, fileName);
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const dirArray = dir.toLowerCase().split('/');
  const type = dirArray.pop();
  const category = dirArray.pop();
  const name = fileName.split('.')[0];
  const svgName = name.replace(/[ _]/g, '-').toLowerCase();

  // join all svg paths in one compound path
  const pathRegEx = /[^i]d="(.[^\/><]+)"/g;
  let svgPaths = [];
  let temp;
  while ((temp = pathRegEx.exec(fileContent)) !== null) {
    svgPaths.push(temp[1]);
  }
  svgPaths = svgPaths.join('');

  if (!icons[svgName]) {
    icons[svgName] = {
      category,
      tags: [category],
      [type]: svgPaths
    }
    return;
  }
  icons[svgName][type] = svgPaths;
}
