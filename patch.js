const fs = require('fs');
let code = fs.readFileSync('src/pages/Profile.tsx', 'utf8');

if (!code.includes('getAppConfig')) {
  code = code.replace(
    "import { createPortal } from 'react-dom';",
    "import { createPortal } from 'react-dom';\nimport { getAppConfig } from '../lib/demoDataHelper';"
  );
}

if (!code.includes('const [appConfigState, setAppConfigState]')) {
  code = code.replace(
    "const [marketingForm, setMarketingForm] = useState({",
    "const [appConfigState, setAppConfigState] = useState<any>({});\n\n  useEffect(() => {\n    getAppConfig().then(config => setAppConfigState(config));\n  }, []);\n\n  const [marketingForm, setMarketingForm] = useState({"
  );
}

fs.writeFileSync('src/pages/Profile.tsx', code);
