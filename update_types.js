const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

const newTypes = `export interface StoryConfig {
  id: string;
  title: string;
  imageUrl: string;
  link?: string;
  active: boolean;
}

`;

code = code + '\n' + newTypes;

fs.writeFileSync('src/types.ts', code);
