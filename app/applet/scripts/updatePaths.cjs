const fs = require('fs');
const path = require('path');

const paths = JSON.parse(fs.readFileSync('/tmp/authenticPaths.json', 'utf8'));
const targetFile = path.resolve(__dirname, '../src/data/banglaCharacters.ts');
let file = fs.readFileSync(targetFile, 'utf8');

let updated = 0;
for (const [id, pathData] of Object.entries(paths)) {
  const regex = new RegExp("(id:\\s*'" + id + "',[\\s\\S]*?referenceSvgPath:\\s*')[^']*(')");
  if (regex.test(file)) {
    file = file.replace(regex, "$1" + pathData + "$2");
    updated++;
  } else {
    console.warn('Could not find id:', id);
  }
}

fs.writeFileSync(targetFile, file, 'utf8');
console.log('Successfully updated characters count in banglaCharacters.ts:', updated);
