import fs from 'fs';

let code = fs.readFileSync('src/pages/Pricing.tsx', 'utf8');

if (!code.includes('getAppConfig')) {
  code = code.replace(
    "import { isMedicalBusiness } from '../lib/medicalHelper';",
    "import { isMedicalBusiness } from '../lib/medicalHelper';\nimport { getAppConfig } from '../lib/demoDataHelper';"
  );
}

// Check if MARKETING_SERVICES_DATA is already inside Pricing
if (!code.includes('const getMarketingServicesData = (config: any) => [')) {
  // Move it to a function
  code = code.replace(
    'const MARKETING_SERVICES_DATA = [',
    'const getMarketingServicesData = (config: any) => ['
  );
  code = code.replace(
    "price: '29 د.أ / أسبوع',",
    "price: `${config?.priceHomepageBanner ?? 29} د.أ / أسبوع`,"
  );
  code = code.replace(
    "price: '19 د.أ / أسبوع',",
    "price: `${config?.priceSponsored ?? 19} د.أ / أسبوع`,"
  );
  code = code.replace(
    "price: '15 د.أ / إشعار',",
    "price: `${config?.pricePushNotifications ?? 15} د.أ / إشعار`,"
  );
  
  code = code.replace(
    'const MEDICAL_MARKETING_SERVICES_DATA = [',
    'const getMedicalMarketingServicesData = (config: any) => ['
  );

  if (!code.includes('const [appConfigState, setAppConfigState]')) {
    code = code.replace(
      'export function Pricing() {',
      'export function Pricing() {\n  const [appConfigState, setAppConfigState] = React.useState<any>({});\n\n  React.useEffect(() => {\n    getAppConfig().then(config => setAppConfigState(config));\n  }, []);\n\n  const MARKETING_SERVICES_DATA = getMarketingServicesData(appConfigState);\n  const MEDICAL_MARKETING_SERVICES_DATA = getMedicalMarketingServicesData(appConfigState);\n'
    );
  }
}

fs.writeFileSync('src/pages/Pricing.tsx', code);
