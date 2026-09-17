import fs from 'fs';
const content = fs.readFileSync('src/App.tsx', 'utf-8');
const newContent = content.replace(/\s*\}\)\(\)\}\}/g, '');
fs.writeFileSync('src/App.tsx', newContent);
console.log('Replaced all });');
