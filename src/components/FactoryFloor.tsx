import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { AppCoreState, ProductionTask, ProductionLog, ShoppingList, Invoice, AppAccountingRecord, InvoiceItem, AppAuthSession, AppCatalogItem as FinalProduct } from '../lib/types';
import { 
  Layers as FactoryIcon, 
  Calculator, 
  AlertTriangle, 
  CheckCircle, 
  Package, 
  TrendingUp, 
  DollarSign, 
  X, 
  Play, 
  Clock, 
  History, 
  ShoppingCart, 
  Printer, 
  ArrowLeft, 
  Check,
  ChevronRight,
  Boxes,
  FileDown,
  Pencil,
  Truck,
  FileText
} from 'lucide-react';
import { formatCurrency, formatQuantity } from '../lib/format';

interface Props {
  state: AppCoreState;
  setState: React.Dispatch<React.SetStateAction<AppCoreState>>;
  hideNumbers: boolean;
  user: AppAuthSession;
  addLog: (action: string, details?: string) => void;
}

interface Requirement {
  inventoryId: string;
  name: string;
  required: number;
  available: number;
  unit: string;
  cost: number;
  category: 'food' | 'pre-production' | 'non-food';
}

type View = 'calculator' | 'in-production' | 'history' | 'shopping';

export default function FactoryFloor({ state, setState, hideNumbers, user, addLog }: Props) {
  const [productionPlan, setProductionPlan] = useState<Record<string, number>>({});
  const [activeView, setActiveView] = useState<View>('calculator');
  const [promptModal, setPromptModal] = useState<{
    show: boolean;
    title: string;
    value: string;
    placeholder: string;
    onConfirm: (val: string) => void;
  } | null>(null);

  const updateQuantity = (productId: string, qty: number) => {
    setProductionPlan(prev => ({ ...prev, [productId]: Math.max(0, qty) }));
  };

  const pseudoProducts: Partial<FinalProduct>[] = useMemo(() => [
    {
       id: 'i_prepared_dough',
       name: 'تجهيز عجينة جاهزة (كيلو)', 
       piecesCount: 0,
       doughWeightPerPiece: 0,
       doughComponents: [{ doughId: 'dr_1', quantityGram: 1000 }],
       addons: [],
       piecesComponents: []
    },
    {
       id: 'i_frozen_30',
       name: 'إنتاج حبات كوكيز مجمدة (32 جرام)',
       piecesCount: 1,
       doughWeightPerPiece: 26,
       fillingWeightPerPiece: 6,
       doughComponents: [],
       addons: [{ inventoryId: 'i_10', quantity: 0.006 }], 
       piecesComponents: []
    },
    {
       id: 'i_frozen_25',
       name: 'إنتاج حبات كوكيز مجمدة (24 جرام)',
       piecesCount: 1,
       doughWeightPerPiece: 20,
       fillingWeightPerPiece: 4,
       doughComponents: [],
       addons: [{ inventoryId: 'i_10', quantity: 0.004 }], 
       piecesComponents: []
    }
  ], []);

  const allAvailableProductsForPlan = useMemo(() => [...state.products, ...pseudoProducts] as FinalProduct[], [state.products, pseudoProducts]);

  const hasPlan = (Object.values(productionPlan) as number[]).some(v => v > 0);

  const calculation = useMemo(() => {
    const hasPlanInternal = (Object.values(productionPlan) as number[]).some(v => v > 0);
    const requirementsMap: Record<string, number> = {};
    const productCosts: Record<string, number> = {};
    let totalPlanCost = 0;
    
    interface DoughSummary { productName: string, consumedWeight: number, missingWeight: number, pieceWeight: number, producedPieces: number, missingPieces: number };
    const doughSummaries: DoughSummary[] = [];

    // Virtual inventory to track consumption during calculation
    const virtualInventory = { ...state.inventory.reduce((acc, item) => ({ ...acc, [item.id]: item.quantity }), {} as Record<string, number>) };

    const allProducts = allAvailableProductsForPlan;

    Object.entries(productionPlan).forEach(([productId, countValue]) => {
      const count = countValue as number;
      if (count <= 0) return;

      const product = allProducts.find(p => p.id === productId);
      if (!product) return;

      let productUnitCost = 0;
      let productConsumedDough = 0;
      let productMissingDough = 0;

      // Helper to calculate total cost contributed by a dough weight (scales ingredients cost)
      const getDoughMaterialsCost = (doughId: string, weight: number) => {
        const recipe = state.doughRecipes.find(dr => dr.id === doughId);
        if (!recipe) return 0;
        const factor = weight / recipe.yieldWeightGram;
        return recipe.ingredients.reduce((acc, ing) => {
          const item = state.inventory.find(i => i.id === ing.inventoryId);
          return acc + (item ? (ing.quantity * factor * item.unitCost) : 0);
        }, 0);
      };

      // Helper to handle dough requirement (either produced or direct)
      const processDoughRequirement = (doughId: string, weightNeeded: number, forceRaw: boolean = false) => {
        if (weightNeeded <= 0) return;

        const inventoryDoughId = 'i_prepared_dough';
        const invItem = state.inventory.find(i => i.id === inventoryDoughId);
        const isKg = invItem?.unit === 'kg';
        const availableGrams = isKg ? (virtualInventory[inventoryDoughId] || 0) * 1000 : (virtualInventory[inventoryDoughId] || 0);
        
        const consumedGrams = forceRaw ? 0 : Math.min(weightNeeded, availableGrams);
        const consumedInventoryUnits = isKg ? consumedGrams / 1000 : consumedGrams;
        
        virtualInventory[inventoryDoughId] -= consumedInventoryUnits;
        requirementsMap[inventoryDoughId] = (requirementsMap[inventoryDoughId] || 0) + consumedInventoryUnits;
        
        productConsumedDough += consumedGrams;

        // Cost of consumed prepared dough
        productUnitCost += getDoughMaterialsCost(doughId, consumedGrams) / count;

        const remainingGrams = weightNeeded - consumedGrams;
        if (remainingGrams > 0) {
          productMissingDough += remainingGrams;
          // Need to make from raw materials
          const recipe = state.doughRecipes.find(dr => dr.id === doughId);
          if (recipe) {
            const factor = remainingGrams / recipe.yieldWeightGram;
            recipe.ingredients.forEach(ing => {
              const item = state.inventory.find(i => i.id === ing.inventoryId);
              const needed = ing.quantity * factor;
              requirementsMap[ing.inventoryId] = (requirementsMap[ing.inventoryId] || 0) + needed;
              virtualInventory[ing.inventoryId] -= needed;
              if (item) productUnitCost += (ing.quantity * factor / count) * item.unitCost;
            });
          }
        }
      };

      // --- SUBSTITUTION HIERARCHY LOGIC ---
      
      const frozenPart = (product.piecesComponents || []).find(pc => pc.inventoryId.startsWith('i_frozen')) || 
                        product.addons.find(a => a.inventoryId.startsWith('i_frozen'));
      
      let scalingFactorForFilling = 1;
      let missingPieces = 0;
      let totalPiecesNeeded = 0;
      
      let explicitDoughWeight = product.doughWeightPerPiece;
      let explicitPiecesCount = product.piecesCount;
      
      if (frozenPart) {
        totalPiecesNeeded = explicitPiecesCount ? (explicitPiecesCount * count) : (('quantity' in frozenPart) ? (frozenPart.quantity || 0) : 0) * count;
        const pieceId = frozenPart.inventoryId;
        const doughId = ('doughId' in frozenPart) ? frozenPart.doughId : 'dr_1';
        let weightPerPiece = explicitDoughWeight || (('weightPerPieceGram' in frozenPart) ? frozenPart.weightPerPieceGram : (pieceId.includes('30') ? 26 : 20));
        if (!explicitDoughWeight) {
           if (pieceId.includes('30') && weightPerPiece === 30) weightPerPiece = 26;
           if (pieceId.includes('25') && weightPerPiece === 25) weightPerPiece = 20;
        }

        const availablePieces = Math.max(0, virtualInventory[pieceId] || 0);
        const consumedPieces = Math.min(totalPiecesNeeded, availablePieces);

        // Consume pieces
        virtualInventory[pieceId] -= consumedPieces;
        requirementsMap[pieceId] = (requirementsMap[pieceId] || 0) + consumedPieces;
        
        // Add cost for consumed pieces
        productUnitCost += getDoughMaterialsCost(doughId, consumedPieces * weightPerPiece) / count;

        missingPieces = totalPiecesNeeded - consumedPieces;

        // Filling is only needed for the portion that IS NOT frozen pieces
        scalingFactorForFilling = totalPiecesNeeded > 0 ? (missingPieces / totalPiecesNeeded) : 1;
      }

      // 2. Process the Dough Requirement (Cascades to Raw)
      if (product.doughComponents && product.doughComponents.length > 0 && !explicitDoughWeight) {
        // If doughComponents explicitly specified, we scale them by our missing factor (if any frozen pieces were attempted)
        // If no frozen pieces exist, scalingFactorForFilling is 1
        product.doughComponents.forEach(dc => {
           const needed = dc.quantityGram * count * scalingFactorForFilling;
           if (needed > 0) {
              const forceRaw = productId === 'i_prepared_dough';
              processDoughRequirement(dc.doughId, needed, forceRaw);
           }
        });
      } else if (missingPieces > 0 && frozenPart) {
        // No explicit dough fallback in product, implicitly fall back based on missing pieces weight
        const doughId = ('doughId' in frozenPart) ? (frozenPart.doughId || 'dr_1') : 'dr_1';
        let weightPerPiece = explicitDoughWeight || (('weightPerPieceGram' in frozenPart) ? (frozenPart.weightPerPieceGram || 26) : (frozenPart.inventoryId.includes('30') ? 26 : 20));
        if (!explicitDoughWeight) {
           if (frozenPart.inventoryId.includes('30') && weightPerPiece === 30) weightPerPiece = 26;
           if (frozenPart.inventoryId.includes('25') && weightPerPiece === 25) weightPerPiece = 20;
        }
        processDoughRequirement(doughId, missingPieces * weightPerPiece);
      } else if (explicitPiecesCount && explicitDoughWeight && !frozenPart) {
         // No frozen piece component registered, just straight dough calculation
         const doughId = 'dr_1';
         processDoughRequirement(doughId, explicitPiecesCount * explicitDoughWeight * count);
      }

      // 3. Process Addons (Categorized)
      product.addons.forEach(addon => {
        if (addon.inventoryId.startsWith('i_frozen')) return; // Already handled above

        const isFilling = addon.inventoryId === 'i_10' || addon.inventoryId.includes('حشوة') || addon.inventoryId.includes('دهن');
        let needed = 0;
        
        if (isFilling && product.fillingWeightPerPiece && explicitPiecesCount) {
             // Explicitly provided filling config
             needed = product.fillingWeightPerPiece * explicitPiecesCount * count * scalingFactorForFilling;
        } else {
             needed = isFilling ? (addon.quantity * count * scalingFactorForFilling) : (addon.quantity * count);
        }
        
        if (needed > 0) {
          requirementsMap[addon.inventoryId] = (requirementsMap[addon.inventoryId] || 0) + needed;
          virtualInventory[addon.inventoryId] -= needed;
          
          const item = state.inventory.find(i => i.id === addon.inventoryId);
          if (item) productUnitCost += (needed / count) * item.unitCost;
        }
      });

      if (productConsumedDough > 0 || productMissingDough > 0) {
        // Determine the piece weight for the summary
        const doughConfig = (product.doughComponents || [])[0];
        let piecesPerBox = explicitPiecesCount || 0;
        if (!piecesPerBox) {
           if (product.name.includes('15')) piecesPerBox = 15;
           else if (product.name.includes('5') || product.name.includes('4+1')) piecesPerBox = 5;
           else if (frozenPart && ('quantity' in frozenPart) && frozenPart.quantity) piecesPerBox = frozenPart.quantity;
        }
        
        let weightPerPiece = explicitDoughWeight || 0;
        if (!weightPerPiece) {
            if (frozenPart && 'weightPerPieceGram' in frozenPart) {
               weightPerPiece = frozenPart.weightPerPieceGram;
               if (frozenPart.inventoryId.includes('30') && weightPerPiece === 30) weightPerPiece = 26;
               if (frozenPart.inventoryId.includes('25') && weightPerPiece === 25) weightPerPiece = 20;
            } else if (doughConfig && piecesPerBox) {
               weightPerPiece = doughConfig.quantityGram / piecesPerBox;
            } else {
               weightPerPiece = 26; // sensible fallback
            }
        }
        
        if (weightPerPiece > 0 && productId !== 'i_prepared_dough') {
           doughSummaries.push({
             productName: product.name,
             consumedWeight: productConsumedDough,
             missingWeight: productMissingDough,
             pieceWeight: weightPerPiece,
             producedPieces: productConsumedDough / weightPerPiece,
             missingPieces: productMissingDough / weightPerPiece
           });
        }
      }

      productCosts[productId] = productUnitCost * count;
      totalPlanCost += productUnitCost * count;
    });

    const requirementDetails: Requirement[] = state.inventory
      .map((item) => {
        const required = requirementsMap[item.id] || 0;
        return {
          inventoryId: item.id,
          name: item.name,
          required,
          available: item.quantity,
          unit: item.unit,
          cost: item.unitCost * required,
          category: item.category as 'food' | 'pre-production' | 'non-food'
        };
      })
      .filter(r => hasPlanInternal ? r.required > 0 : true);

    const internalGoodIds = ['i_frozen_30', 'i_frozen_25', 'i_prepared_dough'];
    
    return {
      requirements: requirementDetails,
      shortages: requirementDetails.filter(r => r.available < r.required && !internalGoodIds.includes(r.inventoryId)),
      totalCost: totalPlanCost,
      productCosts,
      doughSummaries
    };
  }, [productionPlan, state.products, state.doughRecipes, state.inventory]);

  const handleStartProduction = () => {
    if (calculation.shortages.length > 0) return;

    const newTask: ProductionTask = {
      id: `pt_${Date.now()}`,
      plan: { ...productionPlan },
      totalCost: calculation.totalCost,
      createdAt: new Date().toISOString()
    };
    
    setState(prev => ({
      ...prev,
      productionQueue: [newTask, ...prev.productionQueue],
      inventory: prev.inventory.map(item => {
        const need = calculation.requirements.find(r => r.inventoryId === item.id);
        return need ? { ...item, quantity: Math.max(0, item.quantity - need.required) } : item;
      })
    }));

    addLog('بدء أمر إنتاج', `تم البدء في إنتاج مجموعة منتجات بتكلفة ${calculation.totalCost} د.أ`);

    setProductionPlan({});
    setActiveView('in-production');
  };

  const handleFinishProduction = (task: ProductionTask) => {
    const log: ProductionLog = {
      id: `pl_${Date.now()}`,
      plan: task.plan,
      startedAt: task.createdAt,
      finishedAt: new Date().toISOString()
    };
    
    setState(prev => {
       // Only pre-production "pseudo-products" increase inventory (e.g. frozen pieces, raw dough)
       // Final boxes aren't stored in inventory arrays, they're produced directly for sale.
       let newInventory = [...prev.inventory];
       
       Object.entries(task.plan).forEach(([productId, qty]) => {
          if (productId === 'i_frozen_30' || productId === 'i_frozen_25') {
             newInventory = newInventory.map(inv => inv.id === productId ? { ...inv, quantity: inv.quantity + qty } : inv);
          } else if (productId === 'i_prepared_dough') {
             // qty is in 'kilograms', but inventory 'i_prepared_dough' is in 'gram'
             const grams = qty * 1000;
             newInventory = newInventory.map(inv => inv.id === productId ? { ...inv, quantity: inv.quantity + grams } : inv);
          }
       });

       return {
         ...prev,
         productionQueue: prev.productionQueue.filter(t => t.id !== task.id),
         productionHistory: [log, ...prev.productionHistory],
         inventory: newInventory
       };
    });
    addLog('إكمال أمر إنتاج', `اكتمل إنتاج المهمة ${task.id}`);
  };

  const handleCreateShoppingList = () => {
    if (calculation.shortages.length === 0) return;

    const newList: ShoppingList = {
      id: `sl_${Date.now()}`,
      items: calculation.shortages.map(s => {
        // Find primary supplier for this item
        const primarySupplier = state.profiles.find(p => 
          p.type === 'supplier' && 
          p.supplierStatus === 'primary' && 
          p.supplierItems?.some(si => si.inventoryId === s.inventoryId)
        );

        return {
          inventoryId: s.inventoryId,
          name: s.name,
          quantityNeeded: s.required - s.available,
          unit: s.unit,
          supplierId: primarySupplier?.id
        };
      }),
      createdAt: new Date().toISOString()
    };

    setState(prev => ({
      ...prev,
      shoppingLists: [newList, ...prev.shoppingLists]
    }));
    addLog('توليد قائمة مشتريات', `إنشاء قائمة لـ ${calculation.shortages.length} مادة ناقصة`);
    setActiveView('shopping');
  };

  const handleDeleteShoppingList = (listId: string) => {
    setState(prev => ({
      ...prev,
      shoppingLists: prev.shoppingLists.filter(l => l.id !== listId)
    }));
  };

  const updateShoppingItemQuantity = (listId: string, inventoryId: string, qty: number | undefined) => {
    setState(prev => ({
      ...prev,
      shoppingLists: prev.shoppingLists.map(list => {
        if (list.id !== listId) return list;
        return {
          ...list,
          items: list.items.map(item => {
            if (item.inventoryId !== inventoryId) return item;
            
            // Auto-calculate price if a known supplier is selected
            let newPrice = item.actualPrice;
            if (item.supplierId && item.supplierId !== 'OTHER') {
              const supplier = prev.profiles.find(p => p.id === item.supplierId);
              const sItem = supplier?.supplierItems?.find(si => si.inventoryId === inventoryId);
              if (sItem && sItem.quantity > 0) {
                const q = qty ?? item.quantityNeeded;
                newPrice = (sItem.price / sItem.quantity) * q;
              }
            }

            return { ...item, actualQuantity: qty, actualPrice: newPrice };
          })
        };
      })
    }));
  };

  const toggleShoppingItemSkip = (listId: string, inventoryId: string) => {
    setState(prev => ({
      ...prev,
      shoppingLists: prev.shoppingLists.map(list => {
        if (list.id !== listId) return list;
        return {
          ...list,
          items: list.items.map(item => 
            item.inventoryId === inventoryId ? { ...item, skipped: !item.skipped } : item
          )
        };
      })
    }));
  };

  const updateShoppingItemSupplier = (listId: string, inventoryId: string, supplierId: string, supplierName?: string) => {
    setState(prev => ({
      ...prev,
      shoppingLists: prev.shoppingLists.map(list => {
        if (list.id !== listId) return list;
        return {
          ...list,
          items: list.items.map(item => {
            if (item.inventoryId !== inventoryId) return item;

            // Auto-calculate price based on new supplier
            let newPrice = item.actualPrice;
            
            if (supplierId && supplierId !== 'OTHER') {
              const supplier = prev.profiles.find(p => p.id === supplierId);
              const sItem = supplier?.supplierItems?.find(si => si.inventoryId === inventoryId);
              if (sItem && sItem.quantity > 0) {
                const q = item.actualQuantity ?? item.quantityNeeded;
                newPrice = (sItem.price / sItem.quantity) * q;
              } else {
                // If the selected supplier doesn't have an established price, 
                // we reset it only if it was previously auto-calculated or zero
                if (!item.actualPrice || item.supplierId) {
                  newPrice = 0;
                }
              }
            } else if (supplierId === 'OTHER') {
              // When switching to 'OTHER', we keep the current price if any, 
              // otherwise let user enter it.
            } else {
              // No supplier selected
              newPrice = undefined;
            }

            return { ...item, supplierId, supplierName: supplierName || undefined, actualPrice: newPrice };
          })
        };
      })
    }));
  };

  const updateShoppingItemNote = (listId: string, inventoryId: string, note: string) => {
    setState(prev => ({
      ...prev,
      shoppingLists: prev.shoppingLists.map(list => {
        if (list.id !== listId) return list;
        return {
          ...list,
          items: list.items.map(item =>
            item.inventoryId === inventoryId ? { ...item, note } : item
          )
        };
      })
    }));
  };

  const updateShoppingItemPrice = (listId: string, inventoryId: string, price: number | undefined) => {
    setState(prev => ({
      ...prev,
      shoppingLists: prev.shoppingLists.map(list => {
        if (list.id !== listId) return list;
        return {
          ...list,
          items: list.items.map(item =>
            item.inventoryId === inventoryId ? { ...item, actualPrice: price } : item
          )
        };
      })
    }));
  };

  const handleMarkSupplied = (listId: string) => {
    const list = state.shoppingLists.find(l => l.id === listId);
    if (!list) return;

    // Filter items: those that were purchased (not skipped)
    const purchasedItems = list.items.filter(item => !item.skipped);
    const skippedItems = list.items.filter(item => !!item.skipped);

    if (purchasedItems.length === 0) {
      if (skippedItems.length === 0) {
        setState(prev => ({ ...prev, shoppingLists: prev.shoppingLists.filter(l => l.id !== listId) }));
      }
      return;
    }

    // Group purchased items by supplier for processing, but create a single invoice
    const now = new Date().toISOString();
    const invoiceId = `inv_pur_${Date.now()}`;
    
    const invoiceItems: InvoiceItem[] = purchasedItems.map(item => {
      const qty = Number(item.actualQuantity ?? item.quantityNeeded);
      let totalVal = item.actualPrice;
      if (totalVal === undefined || totalVal === 0) {
        const invItem = state.inventory.find(i => i.id === item.inventoryId);
        totalVal = qty * (invItem?.unitCost || 0);
      }
      
      const supplier = state.profiles.find(p => p.id === item.supplierId);
      const supplierName = item.supplierName || supplier?.name || 'مورد غير معروف';

      return {
        id: item.inventoryId,
        name: item.name,
        quantity: qty,
        unit: item.unit,
        price: totalVal / qty,
        total: totalVal,
        supplierName: supplierName,
        note: item.note
      };
    });

    const totalAmount = invoiceItems.reduce((sum, i) => sum + i.total, 0);

    const invoice: Invoice = {
      id: invoiceId,
      type: 'purchase',
      items: invoiceItems,
      totalAmount,
      date: now,
      issuer: user.name as 'محمد' | 'عبيدة',
      description: `شراء مواد - قائمة مشتريات ${list.id}`
    };

    const transaction: AppAccountingRecord = {
      id: `t_pur_${Date.now()}`,
      date: now.split('T')[0],
      type: 'purchase',
      amountJOD: totalAmount,
      description: `فاتورة شراء مجمعة - قائمة ${list.id}`,
      relatedInvoiceId: invoiceId,
      responsibleId: user.name as 'محمد' | 'عبيدة',
      fundSource: 'project'
    };

    setState(prev => ({
      ...prev,
      inventory: prev.inventory.map(invItem => {
        const supplied = purchasedItems.find(i => i.inventoryId === invItem.id);
        if (supplied) {
          const qty = Number(supplied.actualQuantity ?? supplied.quantityNeeded);
          // Update unit cost based on new purchase if price is available
          let newUnitCost = invItem.unitCost;
          if (supplied.actualPrice && qty > 0) {
            newUnitCost = supplied.actualPrice / qty;
          }
          return { 
            ...invItem, 
            quantity: Number(invItem.quantity) + qty,
            unitCost: newUnitCost,
            priceHistory: [...(invItem.priceHistory || []), { date: now.split('T')[0], price: newUnitCost }]
          };
        }
        return invItem;
      }),
      invoices: [invoice, ...prev.invoices],
      transactions: [transaction, ...prev.transactions],
      shoppingLists: skippedItems.length === 0 
        ? prev.shoppingLists.filter(l => l.id !== listId)
        : prev.shoppingLists.map(l => l.id === listId ? { ...l, items: skippedItems.map(si => ({ ...si, skipped: false })) } : l)
    }));
  };

  const handleDownloadPDF = async (listId: string) => {
    const element = document.getElementById(`shopping-list-${listId}`);
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            * {
              color-scheme: light !important;
            }
            /* Force basic colors for html2canvas compatibility with Tailwind v4 */
            .text-indigo-600 { color: #4f46e5 !important; }
            .text-rose-600 { color: #e11d48 !important; }
            .text-emerald-600 { color: #059669 !important; }
            .text-slate-900 { color: #0f172a !important; }
            .text-slate-800 { color: #1e293b !important; }
            .text-slate-500 { color: #64748b !important; }
            .text-slate-400 { color: #94a3b8 !important; }
            .bg-indigo-600 { background-color: #4f46e5 !important; }
            .bg-rose-600 { background-color: #e11d48 !important; }
            .bg-emerald-600 { background-color: #059669 !important; }
            .bg-slate-900 { background-color: #0f172a !important; }
            .bg-slate-50 { background-color: #f8fafc !important; }
            .bg-slate-100 { background-color: #f1f5f9 !important; }
            .border-slate-100 { border-color: #f1f5f9 !important; }
            .border-slate-200 { border-color: #e2e8f0 !important; }
            .border-slate-900 { border-color: #0f172a !important; }
            .print-hide-element, .print\\:hidden { display: none !important; }
          `;
          clonedDoc.head.appendChild(style);

          const clonedElement = clonedDoc.getElementById(`shopping-list-${listId}`);
          if (clonedElement) {
            // Hide inputs and show their values instead for PDF
            const inputs = clonedElement.querySelectorAll('input');
            inputs.forEach(input => {
              const span = clonedDoc.createElement('span');
              span.innerText = input.value;
              span.className = 'font-black text-slate-900 text-xl';
              input.parentNode?.replaceChild(span, input);
            });
          }
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`قائمة_مشتريات_${listId}.pdf`);
    } catch (error) {
      console.error('PDF Generation failed:', error);
      window.print();
    }
  };

  const frozenReqs = calculation.requirements.filter(r => r.category === 'pre-production' && r.inventoryId !== 'i_prepared_dough');
  const doughReqs = calculation.requirements.filter(r => r.inventoryId === 'i_prepared_dough');
  const rawReqs = calculation.requirements.filter(r => r.category === 'food');
  const nonFoodReqs = calculation.requirements.filter(r => r.category === 'non-food');

  return (
    <div className="space-y-6">
      {/* Prompt Modal */}
      {promptModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-right" dir="rtl">
              <h3 className="text-lg font-black text-slate-800 mb-4">{promptModal.title}</h3>
              <input
                type="text"
                value={promptModal.value}
                onChange={(e) => setPromptModal({ ...promptModal, value: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans"
                placeholder={promptModal.placeholder}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') promptModal.onConfirm(promptModal.value);
                }}
              />
            </div>
            <div className="flex border-t border-slate-100" dir="rtl">
              <button 
                onClick={() => setPromptModal(null)}
                className="flex-1 py-4 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-colors border-l border-slate-100"
              >
                إلغاء
              </button>
              <button 
                onClick={() => promptModal.onConfirm(promptModal.value)}
                className="flex-1 py-4 text-sm font-bold text-indigo-600 hover:bg-indigo-50 transition-colors"
              >
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <FactoryIcon className="text-indigo-600" size={28} />
            صالة الإنتاج
          </h2>
          <p className="text-slate-500 font-medium">إدارة عمليات التصنيع والاحتياجات المخزنية</p>
        </div>
        
        <div className="bg-white p-1.5 rounded-2xl border border-slate-200 flex gap-1 shadow-sm overflow-x-auto no-scrollbar">
          {[
            { id: 'calculator', label: 'حاسبة الإنتاج', icon: Calculator },
            { id: 'in-production', label: 'قيد الإنتاج', icon: Clock, count: state.productionQueue.length },
            { id: 'history', label: 'سجل الاكتمال', icon: History },
            { id: 'shopping', label: 'قائمة المشتريات', icon: ShoppingCart }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id as View)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap font-bold text-sm ${
                activeView === tab.id 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`px-2 py-0.5 rounded-lg text-[10px] ${activeView === tab.id ? 'bg-white text-indigo-600' : 'bg-indigo-100 text-indigo-600'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-[600px]">
        {activeView === 'calculator' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 sticky top-24">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Calculator size={20} className="text-indigo-600" />
                    تخطيط الكميات
                  </h3>
                  {hasPlan && (
                    <button onClick={() => setProductionPlan({})} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                      <X size={20} />
                    </button>
                  )}
                </div>
                
                <div className="space-y-4">
                  {state.products.map(product => (
                    <div key={product.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 group focus-within:border-indigo-300 transition-all">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-bold text-slate-700">{product.name}</label>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          value={productionPlan[product.id] || ''}
                          onChange={(e) => updateQuantity(product.id, parseInt(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full bg-white border border-slate-200 rounded-xl pl-16 pr-4 py-2.5 font-black text-slate-900 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">بوكس</span>
                      </div>
                    </div>
                  ))}

                  <div className="mt-6 pt-4 border-t border-slate-100">
                    <h4 className="text-sm font-bold text-slate-400 mb-4 px-2">إنتاج مباشر (عجائن وحبات)</h4>
                    <div className="space-y-4">
                      {pseudoProducts.map(product => (
                        <div key={product.id} className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 group focus-within:border-indigo-300 transition-all">
                          <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-bold text-indigo-900">{product.name}</label>
                          </div>
                          <div className="relative">
                            <input
                              type="number"
                              value={productionPlan[product.id] || ''}
                              onChange={(e) => updateQuantity(product.id, parseInt(e.target.value) || 0)}
                              placeholder="0"
                              className="w-full bg-white border border-indigo-200 rounded-xl pl-16 pr-4 py-2.5 font-black text-indigo-900 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-indigo-400 pointer-events-none">
                               {product.id === 'i_prepared_dough' ? 'كيلو' : 'حبة'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {hasPlan && (
                  <div className="mt-8 pt-6 border-t border-slate-100 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-bold text-sm">التكلفة المتوقعة</span>
                      <span className="text-lg font-black text-indigo-600">{formatCurrency(calculation.totalCost, hideNumbers)}</span>
                    </div>
                    
                    {calculation.shortages.length > 0 ? (
                      <button 
                        onClick={handleCreateShoppingList}
                        className="w-full bg-rose-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all flex items-center justify-center gap-2"
                      >
                        <ShoppingCart size={20} />
                        تجهيز قائمة المشتريات
                      </button>
                    ) : (
                      <button 
                        onClick={handleStartProduction}
                        className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                      >
                        <Play size={20} />
                        بدء الإنتاج الآن
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              {!hasPlan ? (
                <div className="bg-white rounded-[2rem] p-16 border-2 border-dashed border-slate-200 flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 mb-6">
                    <FactoryIcon size={40} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">ابدأ التخطيط للإنتاج</h3>
                  <p className="text-slate-500 max-w-sm">أدخل الكميات المطلوبة ليتم حساب استهلاك المواد الأولية وتحديد النواقص.</p>
                </div>
              ) : (
                <>
                  {calculation.shortages.length > 0 ? (
                    <div className="bg-rose-50 border border-rose-100 rounded-3xl p-6 flex items-start gap-5">
                      <div className="bg-rose-500 text-white p-3 rounded-2xl shadow-lg shadow-rose-200 shrink-0">
                        <AlertTriangle size={24} />
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-rose-900 mb-1">نقص في المواد ({calculation.shortages.length})</h4>
                        <p className="text-rose-700 font-medium font-sans">لا يوجد رصيد كافٍ في المخزون لبدء الإنتاج.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 flex items-start gap-5">
                      <div className="bg-emerald-500 text-white p-3 rounded-2xl shadow-lg shadow-emerald-200 shrink-0">
                        <CheckCircle size={24} />
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-emerald-900 mb-1">المواد متوفرة بكثرة</h4>
                        <p className="text-emerald-700 font-medium">لديك ما يكفي من الخامات لتنفيذ هذه العملية فوراً.</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-6">
                    {/* Flow Summary */}
                    <div className="flex items-center gap-4 text-sm font-bold justify-center bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                      {frozenReqs.length > 0 && (
                        <>
                           <div className={`flex items-center gap-2 ${frozenReqs.every(r => r.available >= r.required) ? 'text-emerald-700' : 'text-rose-700'}`}>
                             <span>إنتاج مسبق (عدا العجينة)</span>
                             {frozenReqs.every(r => r.available >= r.required) ? <CheckCircle size={16} /> : <X size={16} />}
                           </div>
                           <div className="h-0.5 w-8 bg-slate-200"></div>
                        </>
                      )}
                      
                      {doughReqs.length > 0 && (
                        <>
                           <div className={`flex items-center gap-2 ${doughReqs.every(r => r.available >= r.required) ? 'text-emerald-700' : 'text-rose-700'}`}>
                             <span>عجينة جاهزة</span>
                             {doughReqs.every(r => r.available >= r.required) ? <CheckCircle size={16} /> : <X size={16} />}
                           </div>
                           <div className="h-0.5 w-8 bg-slate-200"></div>
                        </>
                      )}
                      
                      <div className={`flex items-center gap-2 ${rawReqs.every(r => r.available >= r.required) ? 'text-emerald-700' : 'text-rose-700'}`}>
                        <span>مواد أولية</span>
                        {rawReqs.every(r => r.available >= r.required) ? <CheckCircle size={16} /> : <X size={16} />}
                      </div>
                    </div>

                    {[ 
                      { title: 'إنتاج مسبق', data: frozenReqs },
                      { title: 'عجينة جاهزة', data: doughReqs },
                      { title: 'المواد الأولية', data: rawReqs },
                      { title: 'التغليف ومواد أخرى', data: nonFoodReqs }
                    ].filter(section => section.data.length > 0).map((section, idx) => (
                      <div key={idx} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-50 bg-slate-50/50">
                          <h3 className="font-black text-slate-800 flex items-center gap-2 text-sm">
                            <Package size={16} className="text-indigo-600" />
                            {section.title}
                          </h3>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-right">
                            <thead>
                              <tr className="bg-white">
                                <th className="py-3 px-6 text-slate-400 font-bold text-[10px] uppercase tracking-widest">المادة</th>
                                <th className="py-3 px-6 text-slate-400 font-bold text-[10px] uppercase tracking-widest">الكمية المطلوبة</th>
                                <th className="py-3 px-6 text-slate-400 font-bold text-[10px] uppercase tracking-widest">المتوفر</th>
                                <th className="py-3 px-6 text-slate-400 font-bold text-[10px] uppercase tracking-widest">الحالة</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {section.data.map(req => (
                                <tr key={req.inventoryId}>
                                  <td className="py-3 px-6 font-bold text-slate-800 text-sm">{req.name}</td>
                                  <td className="py-3 px-6 font-black text-indigo-600 text-sm">{formatQuantity(req.required, false)} {req.unit}</td>
                                  <td className="py-3 px-6 font-medium text-slate-500 text-sm">{formatQuantity(req.available, false)} {req.unit}</td>
                                  <td className="py-3 px-6">
                                    {req.available >= req.required ? (
                                      <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">متوفر</span>
                                    ) : (
                                      <span className="bg-rose-100 text-rose-700 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">نقص</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {section.title === 'عجينة جاهزة' && calculation.doughSummaries && calculation.doughSummaries.length > 0 && (
                          <div className="p-4 bg-amber-50/50 border-t border-amber-100/50 text-sm">
                            <h4 className="font-bold text-amber-800 mb-3 text-xs uppercase tracking-widest flex items-center gap-2">
                               <CheckCircle size={14} /> توضيح الإنتاج والعجينة (الكميات بالغرام):
                            </h4>
                            <ul className="space-y-3">
                              {calculation.doughSummaries.map((ds, idx) => (
                                <li key={idx} className="bg-white p-3 rounded-xl border border-amber-100 shadow-sm">
                                  <div className="font-black text-slate-800 mb-1">{ds.productName} <span className="text-slate-400 font-medium text-xs">({Math.round(ds.pieceWeight)}غ/حبة)</span></div>
                                  <div className="space-y-1.5 pr-2 border-r-2 border-amber-200 mt-2">
                                    {ds.consumedWeight > 0 && (
                                      <div className="text-emerald-700 text-xs font-bold flex items-start gap-1.5">
                                        <span className="shrink-0 mt-0.5">•</span>
                                        <span>
                                          العجينة المتوفرة حالياً <strong>({formatQuantity(ds.consumedWeight, false)} غرام)</strong> تكفي لتجهيز <strong className="bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-900">{Math.floor(ds.producedPieces)}</strong> حبة.
                                        </span>
                                      </div>
                                    )}
                                    {ds.missingWeight > 0 && (
                                      <div className="text-rose-700 text-xs font-bold flex items-start gap-1.5">
                                        <span className="shrink-0 mt-0.5">•</span>
                                        <span>
                                          ينقصك <strong>({formatQuantity(ds.missingWeight, false)} غرام)</strong> عجينة، لإنتاج <strong className="bg-rose-100 px-1.5 py-0.5 rounded text-rose-900">{Math.ceil(ds.missingPieces)}</strong> حبة.<br/>
                                          <span className="text-slate-500 font-medium mt-1 inline-block">سيتم احتساب خلطة العجينة الخاصة بها ضمن قائمة "المواد الأولية".</span>
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {activeView === 'in-production' && (
          <div className="space-y-6">
            <h3 className="text-xl font-black text-slate-900">عمليات قيد التصنيع</h3>
            {state.productionQueue.length === 0 ? (
              <div className="bg-white rounded-[2rem] p-16 border border-slate-100 text-center">
                <Clock className="mx-auto text-slate-300 mb-4" size={48} />
                <p className="text-slate-500 font-bold">لا يوجد مهام حالية</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {state.productionQueue.map(task => (
                  <div key={task.id} className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black">P</div>
                        <div>
                          <p className="text-[10px] font-black text-indigo-500 uppercase">بدأ التوقيت</p>
                          <p className="font-bold text-slate-900 tracking-tighter">{new Date(task.createdAt).toLocaleTimeString('ar-JO')}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 mb-8">
                        {Object.entries(task.plan).map(([pid, qty]) => {
                           const count = qty as number;
                           return count > 0 && <div key={pid} className="flex justify-between text-sm font-bold text-slate-600">
                             <span>{state.products.find(p => p.id === pid)?.name}</span>
                             <span>{count}</span>
                           </div>
                        })}
                    </div>
                    <button onClick={() => handleFinishProduction(task)} className="w-full bg-slate-900 text-white py-3 rounded-2xl font-black flex items-center justify-center gap-2">
                       <Check size={18} /> تم الإنتاج
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeView === 'history' && (
           <div className="space-y-6">
              <h3 className="text-xl font-black text-slate-900">سجل عمليات الإنتاج</h3>
              <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                <table className="w-full text-right">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="py-4 px-6 text-xs font-black text-slate-400">التاريخ</th>
                      <th className="py-4 px-6 text-xs font-black text-slate-400">المنتجات</th>
                      <th className="py-4 px-6 text-xs font-black text-slate-400">المدة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.productionHistory.map(log => (
                      <tr key={log.id} className="border-t border-slate-50">
                        <td className="py-4 px-6 font-bold">{new Date(log.finishedAt).toLocaleDateString('ar-JO')}</td>
                        <td className="py-4 px-6 text-sm">
                           {Object.entries(log.plan).map(([pid, qty]) => {
                             const count = qty as number;
                             return count > 0 && <span key={pid} className="block">{state.products.find(p => p.id === pid)?.name} ({count})</span>
                           })}
                        </td>
                        <td className="py-4 px-6 font-medium text-slate-500">{Math.round((new Date(log.finishedAt).getTime() - new Date(log.startedAt).getTime()) / 60000)} دقيقة</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
           </div>
        )}

        {activeView === 'shopping' && (
           <div className="space-y-6">
              <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-100 shadow-sm print:hidden">
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <ShoppingCart className="text-rose-500" size={24} />
                  إدارة المشتريات والنواقص
                </h3>
              </div>

              {state.shoppingLists.length === 0 ? (
                <div className="bg-white rounded-[2rem] p-16 border border-slate-100 text-center">
                  <ShoppingCart className="mx-auto text-slate-200 mb-4" size={64} />
                  <p className="text-slate-400 font-bold">لا يوجد قوائم مشتريات حالياً</p>
                </div>
              ) : (
                state.shoppingLists.map(list => (
                  <div key={list.id} id={`shopping-list-${list.id}`} className="bg-white rounded-[2rem] border-2 border-slate-100 p-8 shadow-sm space-y-8 relative group print:p-0 print:border-none print:shadow-none break-inside-avoid">
                     <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                       <div className="flex gap-4">
                         <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 shrink-0">
                           <ShoppingCart size={28} />
                         </div>
                         <div>
                           <h4 className="text-2xl font-black text-slate-900 mb-1">قائمة طلب مواد</h4>
                           <div className="flex items-center gap-3 text-slate-400 text-sm font-bold">
                             <span className="flex items-center gap-1"><Clock size={14} /> {new Date(list.createdAt).toLocaleString('ar-JO')}</span>
                             <span className="flex items-center gap-1"><Package size={14} /> {list.items.length} أصناف</span>
                           </div>
                         </div>
                       </div>
                       
                       <div className="flex gap-2 print:hidden print-hide-element">
                         <button 
                           onClick={() => handleDownloadPDF(list.id)} 
                           className="bg-slate-100 text-slate-700 px-5 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-slate-200 transition-all border border-slate-200"
                         >
                            <FileDown size={18} /> تحميل PDF
                         </button>
                         <button 
                           onClick={() => handleMarkSupplied(list.id)}
                           className="bg-emerald-600 text-white px-5 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                         >
                            <Check size={18} /> تم التوريد
                         </button>
                         <button 
                           onClick={() => handleDeleteShoppingList(list.id)}
                           className="bg-white text-rose-600 px-5 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-rose-50 transition-all border-2 border-rose-100"
                         >
                            <X size={18} /> حذف
                         </button>
                       </div>
                     </div>
  
                     <div className="border-t-2 border-slate-900 pt-6">
                        <table className="w-full text-right">
                          <thead>
                            <tr className="text-slate-400">
                              <th className="pb-4 font-black text-xs uppercase tracking-widest px-4">الصنف والمورد</th>
                              <th className="pb-4 font-black text-xs uppercase tracking-widest px-4">النقص الفعلي</th>
                              <th className="pb-4 font-black text-xs uppercase tracking-widest px-4">تفاصيل الشراء</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {list.items.map(item => {
                              const suppliersForItem = state.profiles.filter(p => 
                                p.type === 'supplier' && p.supplierItems?.some(si => si.inventoryId === item.inventoryId)
                              );
                              
                              return (
                                <tr key={item.inventoryId} className={`group/row hover:bg-slate-50 transition-colors ${item.skipped ? 'opacity-50 grayscale' : ''}`}>
                                  <td className="py-5 px-4">
                                    <div className="flex flex-col gap-2">
                                      <div className="flex items-center gap-3">
                                          <div 
                                            onClick={() => toggleShoppingItemSkip(list.id, item.inventoryId)}
                                            className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-all duration-300 print:hidden relative ${
                                              item.skipped ? 'bg-rose-500' : 'bg-slate-200'
                                            }`}
                                            title={item.skipped ? 'تم استبعاد الصنف (لم يتم الشراء)' : 'نشط (سيتم الشراء في حال التوريد)'}
                                          >
                                            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${item.skipped ? 'translate-x-6' : 'translate-x-0'}`} />
                                          </div>
                                          <span className="font-bold text-slate-800 text-lg">{item.name}</span>
                                      </div>
                                      
                                      <div className="print:hidden flex items-center gap-2">
                                        <select
                                          value={item.supplierId || ''}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === 'OTHER') {
                                              setPromptModal({
                                                show: true,
                                                title: 'أدخل اسم المورد الجديد',
                                                placeholder: 'اسم المورد...',
                                                value: '',
                                                onConfirm: (name) => {
                                                  updateShoppingItemSupplier(list.id, item.inventoryId, 'OTHER', (name && name.trim()) || 'مورد خارجي');
                                                  setPromptModal(null);
                                                }
                                              });
                                            } else {
                                              updateShoppingItemSupplier(list.id, item.inventoryId, val);
                                            }
                                          }}
                                          disabled={item.skipped}
                                          className="text-[10px] font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-500 focus:ring-1 focus:ring-indigo-500 outline-none disabled:opacity-50"
                                        >
                                          <option value="">-- اختر مورد المادة --</option>
                                          {suppliersForItem.map(sup => (
                                            <option key={sup.id} value={sup.id}>
                                              {sup.name} {sup.supplierStatus === 'primary' ? '(أساسي)' : '(احتياطي)'}
                                            </option>
                                          ))}
                                          <option value="OTHER"> + مورد آخر (إدخال يدوي) </option>
                                        </select>
                                        <button
                                          onClick={() => {
                                            setPromptModal({
                                              show: true,
                                              title: 'أدخل ملاحظة',
                                              placeholder: 'الملاحظة هنا...',
                                              value: item.note || '',
                                              onConfirm: (note) => {
                                                updateShoppingItemNote(list.id, item.inventoryId, note);
                                                setPromptModal(null);
                                              }
                                            });
                                          }}
                                          className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition-colors"
                                          title="إضافة ملاحظة"
                                        >
                                          <FileText size={14} className={item.note ? "text-amber-500" : "text-slate-400"} />
                                        </button>
                                        {item.supplierId === 'OTHER' && (
                                          <div className="flex items-center gap-1">
                                            <span className="text-[10px] font-black text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                              {item.supplierName}
                                            </span>
                                            <button 
                                              onClick={() => {
                                                setPromptModal({
                                                  show: true,
                                                  title: 'تعديل اسم المورد',
                                                  placeholder: 'اسم المورد...',
                                                  value: item.supplierName || '',
                                                  onConfirm: (name) => {
                                                    if (name && name.trim()) {
                                                      updateShoppingItemSupplier(list.id, item.inventoryId, 'OTHER', name.trim());
                                                    }
                                                    setPromptModal(null);
                                                  }
                                                });
                                              }}
                                              className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition-colors"
                                              title="تعديل الاسم"
                                            >
                                              <Pencil size={10} />
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                      <div className="hidden print:block text-xs font-bold text-slate-400">
                                        المورد: {item.supplierName || state.profiles.find(p => p.id === item.supplierId)?.name || 'غير محدد'}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-5 px-4">
                                    <div className="font-black text-rose-600 text-xl leading-tight">
                                      {formatQuantity(item.quantityNeeded, false)} {item.unit}
                                    </div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">المطلوب تأمينه</div>
                                  </td>
                                  <td className="py-5 px-4 print:hidden">
                                    <div className="flex flex-col gap-3">
                                      <div className="flex items-center gap-2">
                                        <div className="relative flex-1">
                                          <label className="block text-[10px] font-bold text-slate-400 mb-1">الكمية المشتراة</label>
                                          <input
                                            type="number"
                                            value={item.actualQuantity ?? ''}
                                            placeholder={formatQuantity(item.quantityNeeded, false)}
                                            step="0.0001"
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              const numVal = val === '' ? undefined : parseFloat(val);
                                              if (numVal !== undefined && numVal < 0) return;
                                              updateShoppingItemQuantity(list.id, item.inventoryId, numVal);
                                            }}
                                            disabled={item.skipped}
                                            className={`w-full border-2 rounded-xl px-3 py-2 font-black text-sm transition-all placeholder:text-slate-300 ${
                                              item.skipped 
                                                ? 'bg-slate-100 border-slate-100 text-slate-400 cursor-not-allowed'
                                                : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'
                                            }`}
                                          />
                                          <span className="absolute left-3 bottom-2.5 text-[10px] font-bold text-slate-400 pointer-events-none uppercase">{item.unit}</span>
                                        </div>
                                        
                                        <div className="relative flex-1">
                                          <label className="block text-[10px] font-bold text-slate-400 mb-1">
                                            {item.supplierId === 'OTHER' ? 'التكلفة الجديدة للكمية' : 'إجمالي التكلفة'}
                                          </label>
                                          <input
                                            type="number"
                                            value={item.actualPrice !== undefined ? item.actualPrice.toFixed(3) : ''}
                                            placeholder="0.00"
                                            step="0.001"
                                            readOnly={item.supplierId !== 'OTHER' && !!item.supplierId}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              const numVal = val === '' ? undefined : parseFloat(val);
                                              if (numVal !== undefined && numVal < 0) return;
                                              updateShoppingItemPrice(list.id, item.inventoryId, numVal);
                                            }}
                                            disabled={item.skipped}
                                            className={`w-full border-2 rounded-xl px-3 py-2 font-black text-sm transition-all placeholder:text-slate-300 ${
                                              item.skipped 
                                                ? 'bg-slate-100 border-slate-100 text-slate-400 cursor-not-allowed'
                                                : (item.supplierId !== 'OTHER' && !!item.supplierId)
                                                  ? 'bg-slate-100 border-slate-100 text-slate-500 cursor-default'
                                                  : 'bg-emerald-50 border-emerald-100 text-emerald-900 focus:border-emerald-500'
                                            }`}
                                          />
                                          <span className="absolute left-3 bottom-2.5 text-[10px] font-bold text-emerald-400 pointer-events-none uppercase font-sans">JOD</span>
                                        </div>
                                      </div>
                                      
                                      {(item.actualQuantity || 0) > 0 && (item.actualPrice || 0) > 0 && (
                                        <div className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg flex items-center justify-between">
                                          <span>سعر الوحدة المحتسب:</span>
                                          <span className="font-mono">{formatCurrency((item.actualPrice || 0) / (item.actualQuantity || 1), false)} / {item.unit}</span>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="hidden print:table-cell py-5 px-4">
                                     <div className="font-black text-slate-900 text-xl">
                                      {formatQuantity(item.actualQuantity ?? item.quantityNeeded, false)} {item.unit}
                                    </div>
                                    {item.actualPrice && (
                                      <div className="text-sm font-bold text-emerald-600">
                                        التكلفة: {formatCurrency(item.actualPrice, false)}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                     </div>

                     <div className="pt-6 mt-6 border-t border-slate-50 flex justify-between text-xs font-bold text-slate-300 uppercase print:hidden">
                        <span>الرقم المرجعي: {list.id}</span>
                        <span>مخبز كوكيز لاند - نظام إدارة الإنتاج</span>
                     </div>
                  </div>
                ))
              )}
           </div>
        )}
      </div>
    </div>
  );
}
