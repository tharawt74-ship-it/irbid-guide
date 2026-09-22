import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { db } from './firebase';
import { TerminalItem, RouteItem, TaxiItem, TransportationItem } from '../types';

export const DEFAULT_TERMINALS: TerminalItem[] = [
  {
    id: 'amman-new',
    type: 'terminal',
    name: 'مجمع عمان الجديد (مجمع إربد الرئيسي)',
    location: 'جنوب مدينة إربد - بالقرب من دوار الثقافة وشبكة الطرق الرئيسية',
    description: 'أكبر مجمع حافلات وسرفيس في إربد، المنفذ الرئيسي للسفر بين إربد والعاصمة عمان وباقي محافظات المملكة.',
    destinationTypes: ['عمان', 'الزرقاء', 'المفرق', 'جرش', 'السلط', 'جامعة العلوم والتكنولوجيا'],
    order: 1,
    destinations: [
      { name: 'عمان (مجمع الشمال - صويلح / العبدلي)', vehicleType: 'حافلات كوستر / باصات كبيرة / سرفيس', approxFare: '1.25 - 1.80 د.أ', duration: '50 - 65 دقيقة', frequency: 'كل 5 - 10 دقائق' },
      { name: 'الزرقاء (مجمع الزرقاء الجديد)', vehicleType: 'باصات كوستر', approxFare: '1.40 د.أ', duration: '50 دقيقة', frequency: 'كل 15 دقيقة' },
      { name: 'جامعة العلوم والتكنولوجيا الاردنية (JUST)', vehicleType: 'باصات مخصصة لطلاب الجامعات', approxFare: '0.45 - 0.60 د.أ', duration: '20 - 25 دقيقة', frequency: 'مستمر طوال اليوم الدراسي' },
      { name: 'جرش (مجمع جرش)', vehicleType: 'باصات كوستر / سرفيس', approxFare: '0.75 د.أ', duration: '25 - 30 دقيقة', frequency: 'كل 15 دقيقة' },
      { name: 'المفرق', vehicleType: 'باصات كوستر', approxFare: '1.10 د.أ', duration: '40 دقيقة', frequency: 'كل 20 دقيقة' },
      { name: 'السلط / مادبا', vehicleType: 'باصات سفر مباشرة', approxFare: '1.75 - 2.00 د.أ', duration: '60 - 75 دقيقة', frequency: 'حسب الجدول الإرشادي' },
    ]
  },
  {
    id: 'north',
    type: 'terminal',
    name: 'مجمع الشمال (مجمع إربد الشمالي)',
    location: 'شمال إربد - بالقرب من شارع فلسطين وجامعة اليرموك (البوابة الشمالية)',
    description: 'المجمع المخصص لنقل الركاب والطلاب بين إربد ولواء الرمثا، وقرى شمال إربد وجامعة اليرموك.',
    destinationTypes: ['الرمثا', 'جامعة اليرموك', 'قوائم قرى شمال إربد'],
    order: 2,
    destinations: [
      { name: 'الرمثا (وسط الرمثا / المجمع القديم)', vehicleType: 'باصات كوستر / سرفيس خط أحمر', approxFare: '0.50 د.أ', duration: '15 - 20 دقيقة', frequency: 'كل 5 دقائق' },
      { name: 'قرى الرمثا والبويضة', vehicleType: 'باصات سرفيس', approxFare: '0.45 - 0.60 د.أ', duration: '20 دقيقة', frequency: 'كل 15 دقيقة' },
      { name: 'حريما، السيلة، وخرجا', vehicleType: 'باصات كوستر', approxFare: '0.55 د.أ', duration: '25 دقيقة', frequency: 'كل 20 دقيقة' },
      { name: 'جامعة اليرموك (خط دائري مجمع الشمال - البوابة الشمالية)', vehicleType: 'سرفيس داخلي', approxFare: '0.30 د.أ', duration: '5 - 10 دقائق', frequency: 'مستمر' }
    ]
  },
  {
    id: 'aghwar',
    type: 'terminal',
    name: 'مجمع الأغوار (القديم والجديد)',
    location: 'غرب مدينة إربد - شارع الأغوار',
    description: 'نقطة الانطلاق الرئيسية نحو مناطق الأغوار الشمالية، الشونة الشمالية، دير علا، ودير أبي سعيد.',
    destinationTypes: ['الشونة الشمالية', 'دير علا', 'الكورة / دير أبي سعيد', 'الشارع الغربي'],
    order: 3,
    destinations: [
      { name: 'الشونة الشمالية والمشارع', vehicleType: 'باصات كوستر', approxFare: '0.70 - 0.90 د.أ', duration: '35 - 45 دقيقة', frequency: 'كل 15 دقيقة' },
      { name: 'دير أبي سعيد (لواء الكورة)', vehicleType: 'باصات سرفيس وكوستر', approxFare: '0.65 د.أ', duration: '30 - 40 دقيقة', frequency: 'كل 10 دقائق' },
      { name: 'دير علا وسد الملك طلال', vehicleType: 'باصات كوستر خط مباشر', approxFare: '1.20 د.أ', duration: '50 - 60 دقيقة', frequency: 'كل 30 دقيقة' },
      { name: 'كفر أسد وصيدور', vehicleType: 'سرفيس كوستر', approxFare: '0.45 د.أ', duration: '20 دقيقة', frequency: 'كل 15 دقيقة' }
    ]
  }
];

export const DEFAULT_ROUTES: RouteItem[] = [
  {
    id: 'route-1',
    type: 'route',
    name: 'خط جامعة اليرموك - وسط البلد - دوار القبة',
    code: 'خط 1 - سرفيس أبيض',
    stops: ['مجمع عمان الجديد', 'شارع الجامعة', 'البوابة الجنوبية (اليرموك)', 'دوار القبة', 'وسط البلد (شارع السينما)'],
    fare: '0.35 د.أ',
    time: 'من 06:30 ص حتى 10:00 م',
    order: 1
  },
  {
    id: 'route-2',
    type: 'route',
    name: 'خط الحصن - الصريح - مجمع عمان',
    code: 'خط 4 - سرفيس كابريس/كوستر',
    stops: ['مجمع عمان الجديد', 'دوار الثقافة', 'الصريح (المثلث)', 'وسط الحصن', 'كلية الحصن الجامعية'],
    fare: '0.40 د.أ',
    time: 'من 06:00 ص حتى 09:30 م',
    order: 2
  },
  {
    id: 'route-3',
    type: 'route',
    name: 'خط الحي الشرقي - المستشفى التخصصي - مستشفى البديعة',
    code: 'خط 8 - باصات حمراء ودائرية',
    stops: ['وسط البلد', 'دوار النسيم', 'الحي الشرقي', 'مستشفى إربد التخصصي', 'حي الروضة'],
    fare: '0.35 د.أ',
    time: 'من 07:00 ص حتى 09:00 م',
    order: 3
  },
  {
    id: 'route-4',
    type: 'route',
    name: 'خط الحي الغربي - مستشفى الأميرة بسمة',
    code: 'خط 12 - سرفيس',
    stops: ['وسط البلد', 'شارع حوارة', 'الحي الغربي', 'مستشفى الأميرة بسمة التعليمي'],
    fare: '0.35 د.أ',
    time: 'من 06:30 ص حتى 09:30 م',
    order: 4
  },
  {
    id: 'route-5',
    type: 'route',
    name: 'خط جامعة العلوم والتكنولوجيا (طلاب وصحافة)',
    code: 'خط الحافلات الجامعية السريعة',
    stops: ['مجمع عمان الجديد', 'دوار الثقافة', 'طريق الرمثا الدولي', 'مجمع الكليات - جامعة التكنولوجيا'],
    fare: '0.50 - 0.65 د.أ',
    time: 'من 07:00 ص حتى 06:00 م (أيام الدوام الجامعي)',
    order: 5
  },
  {
    id: 'route-6',
    type: 'route',
    name: 'خط إيدون - مستشفى الراهبات الوردية',
    code: 'خط 15 - سرفيس',
    stops: ['مجمع عمان', 'شارع الراهبات', 'إيدون وسط البلد', 'مستشفى الراهبات الوردية'],
    fare: '0.40 د.أ',
    time: 'من 06:30 ص حتى 09:00 م',
    order: 6
  }
];

export const DEFAULT_TAXIS: TaxiItem[] = [
  {
    id: 'taxi-1',
    type: 'taxi',
    name: 'التاكسي الأصفر والتكسي المميز في إربد',
    categoryType: 'تاكسي جوال تقليدي / العداد',
    description: 'التاكسي الأصفر متوفر بكثرة في كافة شوارع إربد الرئيسية ومجمعات الحافلات. فتحة العداد تبدأ من 0.35 د.أ.',
    badge: 'الأكثر انتشاراً',
    order: 1
  },
  {
    id: 'taxi-2',
    type: 'taxi',
    name: 'تطبيقات التاكسي والتوصيل الذكي (Uber / Careem / Jeeny)',
    categoryType: 'تطبيق هاتف ذكي',
    description: 'تعمل التطبيقات الذكية بكفاءة عالية في مدينة إربد والمناطق المجاورة، وتعتبر الخيار المفضل للتنقل المريح والآمن.',
    badge: 'طلب عبر التطبيق',
    order: 2
  },
  {
    id: 'taxi-3',
    type: 'taxi',
    name: 'مكاتب تاكسي إربد المركزية (طلب هاتفي)',
    categoryType: 'مكاتب طلب تاكسي بالهاتف',
    phone: '02-724-4444 / 02-727-8888',
    description: 'يمكنك الاتصال بطلب تاكسي ليصلك لموقعك داخل أي حي في إربد.',
    badge: 'حجز بالهاتف',
    order: 3
  }
];

export async function fetchTransportation(): Promise<{
  terminals: TerminalItem[];
  routes: RouteItem[];
  taxis: TaxiItem[];
}> {
  if (!db) {
    return {
      terminals: DEFAULT_TERMINALS,
      routes: DEFAULT_ROUTES,
      taxis: DEFAULT_TAXIS
    };
  }

  try {
    const transportCol = collection(db, 'transportation');
    const snapshot = await getDocs(transportCol);

    // If never initialized in Firestore, populate default items in memory without attempting writes
    if (snapshot.empty) {
      let isInitialized = false;
      try {
        const configDoc = await getDoc(doc(db, 'settings', 'transportationConfig'));
        isInitialized = configDoc.exists() && !!configDoc.data()?.initialized;
      } catch {
        // If settings read fails or not permitted, assume not initialized
      }

      if (!isInitialized) {
        // Return default items in memory without attempting write/seed (read-only for visitors)
        return {
          terminals: DEFAULT_TERMINALS,
          routes: DEFAULT_ROUTES,
          taxis: DEFAULT_TAXIS
        };
      }
      // If already initialized before, respect the empty state (user deliberately deleted all)
      return { terminals: [], routes: [], taxis: [] };
    }

    const terminals: TerminalItem[] = [];
    const routes: RouteItem[] = [];
    const taxis: TaxiItem[] = [];

    snapshot.forEach((docSnap) => {
      const data = { id: docSnap.id, ...docSnap.data() } as any;
      if (data.type === 'terminal') {
        terminals.push(data as TerminalItem);
      } else if (data.type === 'route') {
        routes.push(data as RouteItem);
      } else if (data.type === 'taxi') {
        taxis.push(data as TaxiItem);
      }
    });

    // Sort by order or name
    terminals.sort((a, b) => (a.order || 99) - (b.order || 99));
    routes.sort((a, b) => (a.order || 99) - (b.order || 99));
    taxis.sort((a, b) => (a.order || 99) - (b.order || 99));

    return { terminals, routes, taxis };
  } catch (error: any) {
    if (error?.code === 'permission-denied' || error?.message?.includes('Missing or insufficient permissions')) {
      console.info("Transportation Firestore note: using local transportation defaults.");
    } else {
      console.warn('Could not fetch transportation from Firestore, falling back to defaults:', error);
    }
    return {
      terminals: DEFAULT_TERMINALS,
      routes: DEFAULT_ROUTES,
      taxis: DEFAULT_TAXIS
    };
  }
}

/**
 * Seeds default transportation data into Firestore and marks it initialized
 */
export async function seedTransportationDefaults(): Promise<void> {
  if (!db) return;

  // 1. Terminals
  for (const terminal of DEFAULT_TERMINALS) {
    const docRef = doc(db, 'transportation', terminal.id);
    await setDoc(docRef, { ...terminal, createdAt: Date.now() }, { merge: true });
  }

  // 2. Routes
  for (const route of DEFAULT_ROUTES) {
    const docRef = doc(db, 'transportation', route.id);
    await setDoc(docRef, { ...route, createdAt: Date.now() }, { merge: true });
  }

  // 3. Taxis
  for (const taxi of DEFAULT_TAXIS) {
    const docRef = doc(db, 'transportation', taxi.id);
    await setDoc(docRef, { ...taxi, createdAt: Date.now() }, { merge: true });
  }

  // Mark initialized in settings
  await setDoc(doc(db, 'settings', 'transportationConfig'), {
    initialized: true,
    lastUpdated: Date.now()
  }, { merge: true });
}

/**
 * Saves (creates or updates) a transportation item in Firestore
 */
export async function saveTransportationItem(
  item: Partial<TransportationItem> & { type: 'terminal' | 'route' | 'taxi'; name: string },
  id?: string
): Promise<string> {
  if (!db) throw new Error('Database not connected');

  const payload: any = {
    ...item,
    updatedAt: Date.now()
  };

  if (id) {
    await updateDoc(doc(db, 'transportation', id), payload);
    return id;
  } else {
    payload.createdAt = Date.now();
    const docRef = await addDoc(collection(db, 'transportation'), payload);
    return docRef.id;
  }
}

/**
 * Permanently deletes a transportation item from Firestore
 */
export async function deleteTransportationItem(id: string): Promise<void> {
  if (!db) throw new Error('Database not connected');
  await deleteDoc(doc(db, 'transportation', id));
}
