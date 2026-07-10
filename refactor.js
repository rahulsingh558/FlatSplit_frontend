const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.js')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
let changed = 0;

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let original = content;
  
  // Replace single quotes: 'http://localhost:5000/api/...' -> `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/...`
  content = content.replace(/'http:\/\/localhost:5000([^']*)'/g, '`${process.env.NEXT_PUBLIC_API_URL || \'http://localhost:5000\'}$1`');
  
  // Replace template literals: `http://localhost:5000/api/...` -> `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/...`
  content = content.replace(/`http:\/\/localhost:5000([^`]*)`/g, '`${process.env.NEXT_PUBLIC_API_URL || \'http://localhost:5000\'}$1`');
  
  if (content !== original) {
    fs.writeFileSync(f, content);
    console.log('Updated: ' + f);
    changed++;
  }
});
console.log('Total files updated: ' + changed);
