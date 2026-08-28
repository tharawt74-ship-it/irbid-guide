const fs = require('fs');

let code = fs.readFileSync('src/contexts/SystemSettingsContext.tsx', 'utf8');

// replace DEFAULT_NEIGHBORHOODS with import from lib/categories
code = code.replace(
  /import \{ BUSINESS_CATEGORIES \} from '\.\.\/lib\/categories';/,
  "import { BUSINESS_CATEGORIES, IRBID_REGIONS_CATEGORIZED, IrbidAreaGroup } from '../lib/categories';"
);

// remove const DEFAULT_NEIGHBORHOODS = [...]
code = code.replace(
  /const DEFAULT_NEIGHBORHOODS = \[\s*[\s\S]*?\];/m,
  ""
);

// replace in Context interface
code = code.replace(
  /neighborhoods: string\[\];/,
  "neighborhoods: IrbidAreaGroup[];"
);
code = code.replace(
  /addNeighborhood: \(item: string\) => Promise<void>;/,
  "updateNeighborhoods: (groups: IrbidAreaGroup[]) => Promise<void>;"
);
code = code.replace(
  /deleteNeighborhood: \(item: string\) => Promise<void>;/,
  ""
);

// replace in state init
code = code.replace(
  /const \[neighborhoods, setNeighborhoods\] = useState<string\[\]>\(DEFAULT_NEIGHBORHOODS\);/,
  "const [neighborhoods, setNeighborhoods] = useState<IrbidAreaGroup[]>(IRBID_REGIONS_CATEGORIZED);"
);

// replace add/delete functions
code = code.replace(
  /const addNeighborhood = async \([\s\S]*?await saveAllToFirestore\(\{ neighborhoods: updated \}\);\s*\};/g,
  `const updateNeighborhoods = async (groups: IrbidAreaGroup[]) => {
    setNeighborhoods(groups);
    await saveAllToFirestore({ neighborhoods: groups });
  };`
);

code = code.replace(
  /const deleteNeighborhood = async \([\s\S]*?await saveAllToFirestore\(\{ neighborhoods: updated \}\);\s*\};/g,
  ""
);

// replace in context provider value
code = code.replace(
  /addNeighborhood,/,
  "updateNeighborhoods,"
);
code = code.replace(
  /deleteNeighborhood,/,
  ""
);

fs.writeFileSync('src/contexts/SystemSettingsContext.tsx', code);
