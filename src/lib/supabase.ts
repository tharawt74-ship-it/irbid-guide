import { createClient } from '@supabase/supabase-js';
import { AppCoreState, AppBusinessEntity, AppStockItem, Invoice, AppDoughFormula, AppCatalogItem, ActivityLog, TrashItem } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yzcqziwezuqivlsgaufh.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6Y3F6aXdlenVxaXZsc2dhdWZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MjgyMDYsImV4cCI6MjA5NDEwNDIwNn0.Fed9Qof3aVqU0MS0MclQLx9IgVjJHdJL0FZTpoZR598';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Generic CRUD
export const fetchTable = async <T>(tableName: string): Promise<T[]> => {
  const { data, error } = await supabase.from(tableName).select('*');
  if (error) {
    console.error(`Error fetching ${tableName}:`, error);
    return [];
  }
  return data as T[];
};

export const upsertData = async (tableName: string, data: any) => {
  const { error } = await supabase.from(tableName).upsert(data);
  if (error) {
      console.error(`Error upserting to ${tableName}:`, JSON.stringify(error, null, 2));
      throw error;
  }
};

export const deleteData = async (tableName: string, id: string) => {
  const { error } = await supabase.from(tableName).delete().eq('id', id);
  if (error) console.error(`Error deleting from ${tableName}:`, error);
};

export const saveStateToSupabase = async (state: AppCoreState) => {
  try {
    const promises = [
      ...state.profiles.map(item => upsertData('profiles', item)),
      ...state.inventory.map(item => upsertData('inventory', item)),
      ...state.doughRecipes.map(item => upsertData('dough_recipes', item)),
      ...state.products.map(item => upsertData('products', item)),
      ...state.invoices.map(item => upsertData('invoices', item)),
    ];
    await Promise.all(promises);
  } catch (err) {
    console.error('Error saving state to Supabase:', err);
  }
};

// Specific loaders for full state sync
export const loadFullState = async (): Promise<Partial<AppCoreState>> => {
    const [profiles, inventory, doughRecipes, products, invoices] = await Promise.all([
        fetchTable<AppBusinessEntity>('profiles'),
        fetchTable<AppStockItem>('inventory'),
        fetchTable<AppDoughFormula>('dough_recipes'),
        fetchTable<AppCatalogItem>('products'),
        fetchTable<Invoice>('invoices'),
    ]);
    
    return {
        profiles,
        inventory,
        doughRecipes,
        products,
        invoices
    };
};
