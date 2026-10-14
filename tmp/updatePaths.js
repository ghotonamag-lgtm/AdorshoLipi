const fs = require('fs');
const paths = JSON.parse(fs.readFileSync('/tmp/authenticPaths.json', 'utf8'));
let file = fs.readFileSync('/src/data/banglaCharacters.ts', 'utf8');

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

fs.writeFileSync('/src/data/banglaCharacters.ts', file, 'utf8');
console.log('Successfully updated characters count in banglaCharacters.ts:', updated);
