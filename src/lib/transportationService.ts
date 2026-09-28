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

export const DEFAULT_TERMINALS: TerminalItem[] = [];
export const DEFAULT_ROUTES: RouteItem[] = [];
export const DEFAULT_TAXIS: TaxiItem[] = [];

export async function fetchTransportation(): Promise<{
  terminals: TerminalItem[];
  routes: RouteItem[];
  taxis: TaxiItem[];
}> {
  if (!db) {
    return { terminals: [], routes: [], taxis: [] };
  }

  try {
    const transportCol = collection(db, 'transportation');
    const snapshot = await getDocs(transportCol);

    if (snapshot.empty) {
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

    terminals.sort((a, b) => (a.order || 99) - (b.order || 99));
    routes.sort((a, b) => (a.order || 99) - (b.order || 99));
    taxis.sort((a, b) => (a.order || 99) - (b.order || 99));

    return { terminals, routes, taxis };
  } catch (error: any) {
    console.warn('Could not fetch transportation from Firestore:', error);
    return { terminals: [], routes: [], taxis: [] };
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
