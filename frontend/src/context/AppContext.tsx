import React, { createContext, useContext, useState, useEffect } from 'react';

// --- TYPES ---
export interface Product {
  id: number;
  name: string;
  barcode: string;
  category: string;
  price: number;
  cost_price: number;
  description: string;
  image_url?: string;
  min_stock_level: number;
  unit: string;
  current_stock: number;
  created_at: string;
}

export interface Sale {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  sale_price: number;
  total_amount: number;
  sale_date: string;
  created_at: string;
}

export interface InventoryLog {
  id: number;
  product_id: number;
  product_name: string;
  quantity_changed: number;
  change_type: 'IN' | 'OUT' | 'ADJUSTMENT';
  reason: string;
  timestamp: string;
}

export interface POItem {
  product_id: number;
  product_name: string;
  quantity: number;
  cost_price: number;
}

export interface PurchaseOrder {
  id: number;
  supplier: string;
  items: POItem[];
  total_amount: number;
  status: 'DRAFT' | 'ORDERED' | 'RECEIVED';
  created_at: string;
  received_at?: string;
}

export interface ForecastItem {
  date: string;
  predicted_quantity: number;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  text: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'staff';
}

interface AppContextType {
  products: Product[];
  sales: Sale[];
  inventoryLogs: InventoryLog[];
  purchaseOrders: PurchaseOrder[];
  currentUser: User | null;
  toasts: ToastMessage[];
  showToast: (type: ToastMessage['type'], text: string) => void;
  removeToast: (id: string) => void;
  
  // Actions
  login: (username: string, token: string, user: User) => void;
  logout: () => void;
  signup: (username: string, email: string, role: 'admin' | 'staff') => void;
  
  addProduct: (product: Omit<Product, 'id' | 'current_stock' | 'created_at'> & { initial_stock: number }) => void;
  updateProduct: (id: number, updates: Partial<Omit<Product, 'id' | 'current_stock' | 'created_at'>>) => void;
  deleteProduct: (id: number) => void;
  
  adjustStock: (productId: number, quantity: number, type: 'IN' | 'OUT' | 'ADJUSTMENT', reason: string) => void;
  recordSale: (items: { product_id: number; quantity: number; sale_price?: number }[]) => void;
  
  createPurchaseOrder: (supplier: string, items: { product_id: number; quantity: number }[]) => void;
  updatePOStatus: (id: number, status: 'ORDERED' | 'RECEIVED') => void;
  
  getForecast: (productId: number) => ForecastItem[];
  trainMLModel: (productId?: number) => Promise<void>;
  
  apiConnected: boolean;
  setApiConnected: (val: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Helper to format ISO Date to local-looking date-time string
const getNowISO = () => new Date().toISOString();

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('sk_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [apiConnected, setApiConnected] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Core Data States
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);

  // Show toast notification
  const showToast = (type: ToastMessage['type'], text: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // --- INITIALIZE SEED DATA (MOCK DATA FOR FULL DEMO INTEGRATION) ---
  useEffect(() => {
    // Version key — bump this whenever the seed data changes to force a refresh
    const DATA_VERSION = 'v2';
    const storedVersion = localStorage.getItem('sk_data_version');

    const savedProducts = localStorage.getItem('sk_products');
    const savedSales = localStorage.getItem('sk_sales');
    const savedLogs = localStorage.getItem('sk_logs');
    const savedPOs = localStorage.getItem('sk_pos');

    if (storedVersion === DATA_VERSION && savedProducts && savedSales && savedLogs && savedPOs) {

      setProducts(JSON.parse(savedProducts));
      setSales(JSON.parse(savedSales));
      setInventoryLogs(JSON.parse(savedLogs));
      setPurchaseOrders(JSON.parse(savedPOs));
    } else {
      // Create rich Indian Kirana mock data
      const ts = (daysAgo: number) => new Date(Date.now() - daysAgo * 24 * 3600 * 1000).toISOString();
      const initialProducts: Product[] = [
        // ── GROCERY ─────────────────────────────────────────────────────────
        { id: 1,  name: "Tata Salt 1kg",                    barcode: "8901058002315", category: "Grocery",       price: 28,   cost_price: 22,  description: "Iodized vacuum evaporated salt, the market leader.",                  min_stock_level: 30,  unit: "packets", current_stock: 180, created_at: ts(45) },
        { id: 2,  name: "Aashirvaad Chakki Atta 5kg",       barcode: "8901725181223", category: "Grocery",       price: 290,  cost_price: 250, description: "100% pure wheat flour milled using traditional stone process.",      min_stock_level: 15,  unit: "bags",    current_stock: 62,  created_at: ts(40) },
        { id: 3,  name: "India Gate Basmati Rice 5kg",       barcode: "8901063020014", category: "Grocery",       price: 480,  cost_price: 420, description: "Premium aged long-grain Basmati rice with rich aroma.",             min_stock_level: 12,  unit: "bags",    current_stock: 38,  created_at: ts(38) },
        { id: 4,  name: "Fortune Mustard Oil 1L",            barcode: "8906007281355", category: "Grocery",       price: 175,  cost_price: 150, description: "Kachi Ghani cold pressed mustard oil for traditional cooking.",      min_stock_level: 15,  unit: "bottles", current_stock: 44,  created_at: ts(35) },
        { id: 5,  name: "Saffola Gold Oil 1L",               barcode: "8901018100019", category: "Grocery",       price: 220,  cost_price: 190, description: "Blended edible oil with natural Oryzanol, good for heart.",         min_stock_level: 12,  unit: "bottles", current_stock: 28,  created_at: ts(33) },
        { id: 6,  name: "Tata Dal Chana 1kg",                barcode: "8901058010167", category: "Grocery",       price: 95,   cost_price: 78,  description: "Split chickpea lentils, rich in protein and fibre.",              min_stock_level: 20,  unit: "packets", current_stock: 75,  created_at: ts(30) },
        { id: 7,  name: "MDH Kitchen King Masala 100g",      barcode: "8906003781093", category: "Spices",        price: 72,   cost_price: 55,  description: "Authentic blend of 14 spices for rich Indian curries.",            min_stock_level: 20,  unit: "packets", current_stock: 90,  created_at: ts(28) },
        { id: 8,  name: "Everest Garam Masala 50g",          barcode: "8901012345678", category: "Spices",        price: 48,   cost_price: 36,  description: "Aromatic whole-spice blend for finishing curries.",               min_stock_level: 20,  unit: "packets", current_stock: 60,  created_at: ts(27) },
        { id: 9,  name: "Tata Sampann Turmeric 200g",        barcode: "8901058503015", category: "Spices",        price: 55,   cost_price: 40,  description: "Pure and natural high-curcumin turmeric powder.",                 min_stock_level: 20,  unit: "packets", current_stock: 85,  created_at: ts(25) },
        { id: 10, name: "Catch Red Chilli Powder 100g",       barcode: "8901223330127", category: "Spices",        price: 42,   cost_price: 30,  description: "Hot and bright red premium chilli powder.",                       min_stock_level: 20,  unit: "packets", current_stock: 55,  created_at: ts(23) },

        // ── DAIRY ───────────────────────────────────────────────────────────
        { id: 11, name: "Amul Butter 500g",                  barcode: "8901262010120", category: "Dairy",         price: 275,  cost_price: 240, description: "Delicious pasteurized butter made from pure milk fat.",            min_stock_level: 15,  unit: "packs",   current_stock: 8,   created_at: ts(30) },
        { id: 12, name: "Amul Taaza Toned Milk 1L",          barcode: "8901262000121", category: "Dairy",         price: 62,   cost_price: 54,  description: "Fresh pasteurized toned milk packed in hygienic tetra pack.",      min_stock_level: 30,  unit: "packets", current_stock: 45,  created_at: ts(7)  },
        { id: 13, name: "Nestle Dahi 400g",                  barcode: "8901058011027", category: "Dairy",         price: 45,   cost_price: 36,  description: "Smooth and creamy set curd, naturally rich in probiotics.",        min_stock_level: 20,  unit: "cups",    current_stock: 30,  created_at: ts(5)  },
        { id: 14, name: "Amul Processed Cheese 200g",        barcode: "8901262043418", category: "Dairy",         price: 135,  cost_price: 110, description: "Mild and creamy processed cheese slices.",                        min_stock_level: 10,  unit: "packs",   current_stock: 4,   created_at: ts(10) },

        // ── SNACKS ──────────────────────────────────────────────────────────
        { id: 15, name: "Parle-G Biscuit 150g",              barcode: "8901109001311", category: "Snacks",        price: 10,   cost_price: 8,   description: "India's favorite glucose biscuits, healthy and tasty.",           min_stock_level: 50,  unit: "packets", current_stock: 350, created_at: ts(30) },
        { id: 16, name: "Maggi 2-Min Noodles 70g",           barcode: "8901058895627", category: "Snacks",        price: 14,   cost_price: 11,  description: "The classic instant noodles with iconic masala flavour.",          min_stock_level: 40,  unit: "packets", current_stock: 0,   created_at: ts(30) },
        { id: 17, name: "Lays Classic Salted 26g",           barcode: "8901491120038", category: "Snacks",        price: 20,   cost_price: 15,  description: "Crispy potato chips with light salted flavour.",                  min_stock_level: 30,  unit: "packets", current_stock: 120, created_at: ts(14) },
        { id: 18, name: "Kurkure Masala Munch 90g",          barcode: "8901491100139", category: "Snacks",        price: 30,   cost_price: 23,  description: "Crunchy corn puffs with tangy masala flavour.",                   min_stock_level: 25,  unit: "packets", current_stock: 80,  created_at: ts(12) },
        { id: 19, name: "Britannia Good Day 150g",           barcode: "8901063013016", category: "Snacks",        price: 35,   cost_price: 27,  description: "Rich butter cashew cookies, a premium treat.",                   min_stock_level: 25,  unit: "packets", current_stock: 110, created_at: ts(20) },
        { id: 20, name: "Haldiram Bhujia 400g",              barcode: "8902519011044", category: "Snacks",        price: 120,  cost_price: 95,  description: "Authentic Rajasthani sev snack with premium spices.",             min_stock_level: 15,  unit: "packs",   current_stock: 42,  created_at: ts(18) },

        // ── BEVERAGES ───────────────────────────────────────────────────────
        { id: 21, name: "Tata Tea Gold 500g",                barcode: "8901058010020", category: "Beverages",     price: 210,  cost_price: 175, description: "Premium blended CTC tea with rich flavour and colour.",           min_stock_level: 20,  unit: "packs",   current_stock: 55,  created_at: ts(22) },
        { id: 22, name: "Bru Gold Instant Coffee 200g",      barcode: "8901030814559", category: "Beverages",     price: 295,  cost_price: 248, description: "Pure and rich instant coffee for a perfect brew.",                min_stock_level: 10,  unit: "jars",    current_stock: 18,  created_at: ts(20) },
        { id: 23, name: "Tropicana Orange Juice 1L",         barcode: "8901012551046", category: "Beverages",     price: 130,  cost_price: 105, description: "100% real fruit juice, no added sugar or preservatives.",         min_stock_level: 15,  unit: "cartons", current_stock: 24,  created_at: ts(8)  },
        { id: 24, name: "Red Bull Energy Drink 250ml",       barcode: "9002490100070", category: "Beverages",     price: 125,  cost_price: 100, description: "Vitalizes body and mind with B-vitamins and caffeine.",           min_stock_level: 12,  unit: "cans",    current_stock: 36,  created_at: ts(15) },

        // ── HOUSEHOLD ───────────────────────────────────────────────────────
        { id: 25, name: "Surf Excel Easy Wash 1kg",          barcode: "8901030753457", category: "Household",     price: 140,  cost_price: 115, description: "Superfine washing powder that removes tough stains.",             min_stock_level: 10,  unit: "packets", current_stock: 3,   created_at: ts(30) },
        { id: 26, name: "Vim Dishwash Bar 200g",             barcode: "8901030816997", category: "Household",     price: 20,   cost_price: 15,  description: "Lemon-powered dishwash bar that cuts grease easily.",             min_stock_level: 20,  unit: "bars",    current_stock: 60,  created_at: ts(25) },
        { id: 27, name: "Harpic Power Plus 500ml",           barcode: "8901103101501", category: "Household",     price: 115,  cost_price: 90,  description: "10× disinfection power toilet cleaner, kills 99.9% germs.",      min_stock_level: 10,  unit: "bottles", current_stock: 22,  created_at: ts(22) },
        { id: 28, name: "Good Knight Mosquito Coil 10s",     barcode: "8901396015414", category: "Household",     price: 45,   cost_price: 33,  description: "All-night protection mosquito repellent coils.",                  min_stock_level: 15,  unit: "boxes",   current_stock: 55,  created_at: ts(19) },

        // ── PERSONAL CARE ────────────────────────────────────────────────────
        { id: 29, name: "Dettol Handwash 200ml",             barcode: "8901396388416", category: "Personal Care", price: 99,   cost_price: 80,  description: "Antibacterial pH-balanced liquid handwash.",                     min_stock_level: 10,  unit: "bottles", current_stock: 25,  created_at: ts(30) },
        { id: 30, name: "Colgate Strong Teeth Paste 150g",   barcode: "8901123450917", category: "Personal Care", price: 85,   cost_price: 70,  description: "Calci-lock protection toothpaste for stronger teeth.",           min_stock_level: 15,  unit: "tubes",   current_stock: 5,   created_at: ts(30) },
        { id: 31, name: "Dove Soap 75g",                     barcode: "8901030560672", category: "Personal Care", price: 48,   cost_price: 37,  description: "Moisturizing beauty bar with ¼ moisturizing cream.",              min_stock_level: 20,  unit: "bars",    current_stock: 65,  created_at: ts(18) },
        { id: 32, name: "Pantene Shampoo 340ml",             barcode: "8006540113509", category: "Personal Care", price: 299,  cost_price: 248, description: "Pro-V nourishing shampoo for smooth and shiny hair.",             min_stock_level: 8,   unit: "bottles", current_stock: 14,  created_at: ts(14) },

        // ── BABY CARE ───────────────────────────────────────────────────────
        { id: 33, name: "Pampers Baby Dry Diapers M 20s",    barcode: "8001841718491", category: "Baby Care",     price: 399,  cost_price: 340, description: "Up to 12-hour protection baby diapers with soft stretch.",         min_stock_level: 8,   unit: "packs",   current_stock: 12,  created_at: ts(10) },
        { id: 34, name: "Cerelac Wheat 300g",                barcode: "8901058500121", category: "Baby Care",     price: 215,  cost_price: 180, description: "Wheat-based fortified baby cereal enriched with 18 nutrients.",    min_stock_level: 6,   unit: "tins",    current_stock: 9,   created_at: ts(8)  },

        // ── STATIONERY ──────────────────────────────────────────────────────
        { id: 35, name: "Classmate Notebook 200 Pages",      barcode: "8901824000021", category: "Stationery",    price: 55,   cost_price: 42,  description: "Single line ruled notebook, smooth paper quality.",               min_stock_level: 25,  unit: "pieces",  current_stock: 95,  created_at: ts(20) },
      ];


      // Seed historical logs
      const initialLogs: InventoryLog[] = initialProducts.map((p, idx) => ({
        id: idx + 1,
        product_id: p.id,
        product_name: p.name,
        quantity_changed: p.current_stock,
        change_type: 'IN',
        reason: 'Initial setup stock load',
        timestamp: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString()
      }));

      // Add a couple adjustment logs
      initialLogs.push({
        id: initialLogs.length + 1,
        product_id: 6, // Maggi
        product_name: "Maggi 2-Min Masala Noodles 70g",
        quantity_changed: -20,
        change_type: 'OUT',
        reason: 'Wastage / damaged stock write-off',
        timestamp: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString()
      });

      // Seed sales (generate historical sales for charts over the last 7 days)
      const initialSales: Sale[] = [];
      let saleIdCounter = 1;

      // Seed sales over last 7 days
      for (let day = 7; day >= 1; day--) {
        const dateString = new Date(Date.now() - day * 24 * 3600 * 1000 + 4 * 3600 * 1000).toISOString();
        
        // Let's create 3-5 sales per day
        const transactions = 3 + Math.floor(Math.random() * 3);
        for (let t = 0; t < transactions; t++) {
          // Select a random product (except maggi which has 0 stock now)
          const validProds = initialProducts.filter(p => p.id !== 6);
          const prod = validProds[Math.floor(Math.random() * validProds.length)];
          const qty = 1 + Math.floor(Math.random() * 4);
          
          initialSales.push({
            id: saleIdCounter++,
            product_id: prod.id,
            product_name: prod.name,
            quantity: qty,
            sale_price: prod.price,
            total_amount: qty * prod.price,
            sale_date: dateString,
            created_at: dateString
          });
        }
      }

      // Seed POs
      const initialPOs: PurchaseOrder[] = [
        {
          id: 1,
          supplier: "Amul Distribution North",
          items: [
            { product_id: 2, product_name: "Amul Butter 500g", quantity: 30, cost_price: 240.0 }
          ],
          total_amount: 7200.0,
          status: "ORDERED",
          created_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString()
        },
        {
          id: 2,
          supplier: "Hindustan Unilever Ltd",
          items: [
            { product_id: 5, product_name: "Surf Excel Easy Wash 1kg", quantity: 20, cost_price: 115.0 },
            { product_id: 8, product_name: "Dettol Liquid Handwash 200ml", quantity: 15, cost_price: 80.0 }
          ],
          total_amount: 3500.0,
          status: "DRAFT",
          created_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString()
        }
      ];

      setProducts(initialProducts);
      setSales(initialSales);
      setInventoryLogs(initialLogs);
      setPurchaseOrders(initialPOs);

      // Persist to local storage
      localStorage.setItem('sk_products', JSON.stringify(initialProducts));
      localStorage.setItem('sk_sales', JSON.stringify(initialSales));
      localStorage.setItem('sk_logs', JSON.stringify(initialLogs));
      localStorage.setItem('sk_pos', JSON.stringify(initialPOs));
      localStorage.setItem('sk_data_version', DATA_VERSION);
    }

  }, []);

  // Sync to local storage whenever state changes
  useEffect(() => {
    if (products.length > 0) localStorage.setItem('sk_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    if (sales.length > 0) localStorage.setItem('sk_sales', JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    if (inventoryLogs.length > 0) localStorage.setItem('sk_logs', JSON.stringify(inventoryLogs));
  }, [inventoryLogs]);

  useEffect(() => {
    if (purchaseOrders.length > 0) localStorage.setItem('sk_pos', JSON.stringify(purchaseOrders));
  }, [purchaseOrders]);

  // --- ACTIONS ---

  const login = (_username: string, token: string, user: User) => {
    setCurrentUser(user);
    localStorage.setItem('sk_token', token);
    localStorage.setItem('sk_user', JSON.stringify(user));
    showToast('success', `Welcome back, ${user.username}!`);
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('sk_token');
    localStorage.removeItem('sk_user');
    showToast('info', 'Logged out successfully.');
  };

  const signup = (username: string, _email: string, role: 'admin' | 'staff') => {
    // Simple registration simulation
    showToast('success', `Account created for ${username} (${role}). Please login.`);
  };

  const addProduct = (product: Omit<Product, 'id' | 'current_stock' | 'created_at'> & { initial_stock: number }) => {
    const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
    const newProduct: Product = {
      ...product,
      id: newId,
      current_stock: product.initial_stock,
      created_at: getNowISO()
    };

    setProducts((prev) => [...prev, newProduct]);

    // Log the initial inventory add
    const log: InventoryLog = {
      id: inventoryLogs.length > 0 ? Math.max(...inventoryLogs.map(l => l.id)) + 1 : 1,
      product_id: newId,
      product_name: product.name,
      quantity_changed: product.initial_stock,
      change_type: 'IN',
      reason: 'Initial stock on product creation',
      timestamp: getNowISO()
    };
    setInventoryLogs((prev) => [log, ...prev]);

    showToast('success', `Product "${product.name}" added successfully.`);
  };

  const updateProduct = (id: number, updates: Partial<Omit<Product, 'id' | 'current_stock' | 'created_at'>>) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const updated = { ...p, ...updates };
          showToast('success', `Product "${updated.name}" updated successfully.`);
          return updated;
        }
        return p;
      })
    );
  };

  const deleteProduct = (id: number) => {
    const prod = products.find(p => p.id === id);
    if (!prod) return;
    setProducts((prev) => prev.filter((p) => p.id !== id));
    showToast('warning', `Product "${prod.name}" deleted.`);
  };

  const adjustStock = (productId: number, quantity: number, type: 'IN' | 'OUT' | 'ADJUSTMENT', reason: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) {
      showToast('error', 'Product not found.');
      return;
    }

    const absQty = Math.abs(quantity);
    const finalChange = type === 'OUT' ? -absQty : type === 'IN' ? absQty : quantity;

    if (type === 'OUT' && prod.current_stock < absQty) {
      showToast('error', `Cannot write-out ${absQty} items. Only ${prod.current_stock} in stock.`);
      return;
    }

    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          return { ...p, current_stock: Math.max(0, p.current_stock + finalChange) };
        }
        return p;
      })
    );

    const logId = inventoryLogs.length > 0 ? Math.max(...inventoryLogs.map(l => l.id)) + 1 : 1;
    const log: InventoryLog = {
      id: logId,
      product_id: productId,
      product_name: prod.name,
      quantity_changed: finalChange,
      change_type: type,
      reason: reason || `Manual stock ${type.toLowerCase()}`,
      timestamp: getNowISO()
    };
    setInventoryLogs((prev) => [log, ...prev]);

    showToast('success', `Inventory updated for ${prod.name} (${finalChange > 0 ? '+' : ''}${finalChange}).`);
  };

  const recordSale = (items: { product_id: number; quantity: number; sale_price?: number }[]) => {
    const newSales: Sale[] = [];
    const logsToAdd: InventoryLog[] = [];
    let saleCounter = sales.length > 0 ? Math.max(...sales.map(s => s.id)) + 1 : 1;
    let logCounter = inventoryLogs.length > 0 ? Math.max(...inventoryLogs.map(l => l.id)) + 1 : 1;

    // Check stock for all items first
    for (const item of items) {
      const prod = products.find(p => p.id === item.product_id);
      if (!prod) {
        showToast('error', 'Product in cart is missing.');
        return;
      }
      if (prod.current_stock < item.quantity) {
        showToast('error', `Insufficient stock for "${prod.name}". Available: ${prod.current_stock}.`);
        return;
      }
    }

    // Process all sales
    const updatedProducts = products.map((prod) => {
      const saleItem = items.find(item => item.product_id === prod.id);
      if (saleItem) {
        const finalPrice = saleItem.sale_price !== undefined ? saleItem.sale_price : prod.price;
        const total = saleItem.quantity * finalPrice;
        
        newSales.push({
          id: saleCounter++,
          product_id: prod.id,
          product_name: prod.name,
          quantity: saleItem.quantity,
          sale_price: finalPrice,
          total_amount: total,
          sale_date: getNowISO(),
          created_at: getNowISO()
        });

        logsToAdd.push({
          id: logCounter++,
          product_id: prod.id,
          product_name: prod.name,
          quantity_changed: -saleItem.quantity,
          change_type: 'OUT',
          reason: `Customer Purchase (POS)`,
          timestamp: getNowISO()
        });

        return {
          ...prod,
          current_stock: prod.current_stock - saleItem.quantity
        };
      }
      return prod;
    });

    setProducts(updatedProducts);
    setSales((prev) => [...newSales, ...prev]);
    setInventoryLogs((prev) => [...logsToAdd, ...prev]);
    showToast('success', `Sale recorded! Total: INR ${newSales.reduce((acc, curr) => acc + curr.total_amount, 0).toFixed(2)}`);
  };

  const createPurchaseOrder = (supplier: string, items: { product_id: number; quantity: number }[]) => {
    const newId = purchaseOrders.length > 0 ? Math.max(...purchaseOrders.map(po => po.id)) + 1 : 1;
    
    let total = 0;
    const poItems: POItem[] = items.map(item => {
      const prod = products.find(p => p.id === item.product_id);
      const cp = prod ? prod.cost_price : 0;
      total += cp * item.quantity;
      return {
        product_id: item.product_id,
        product_name: prod ? prod.name : 'Unknown Product',
        quantity: item.quantity,
        cost_price: cp
      };
    });

    const newPO: PurchaseOrder = {
      id: newId,
      supplier,
      items: poItems,
      total_amount: total,
      status: 'DRAFT',
      created_at: getNowISO()
    };

    setPurchaseOrders((prev) => [newPO, ...prev]);
    showToast('success', `PO #${newId} created as DRAFT.`);
  };

  const updatePOStatus = (id: number, status: 'ORDERED' | 'RECEIVED') => {
    setPurchaseOrders((prevPOs) =>
      prevPOs.map((po) => {
        if (po.id === id) {
          const updated = { ...po, status };
          if (status === 'RECEIVED') {
            updated.received_at = getNowISO();
            
            // Add items to stock!
            setProducts((prevProds) =>
              prevProds.map((prod) => {
                const poItem = po.items.find(item => item.product_id === prod.id);
                if (poItem) {
                  // Log the inventory stock addition
                  adjustStock(prod.id, poItem.quantity, 'IN', `Received via Purchase Order #${po.id}`);
                  return { ...prod, current_stock: prod.current_stock + poItem.quantity };
                }
                return prod;
              })
            );
            showToast('success', `PO #${po.id} received. Inventory stocks updated!`);
          } else {
            showToast('info', `PO #${po.id} status updated to ${status}.`);
          }
          return updated;
        }
        return po;
      })
    );
  };

  // --- AI FORECAST GENERATION ---
  // Generate historical-trend looking forecasting data for next 14 days
  const getForecast = (productId: number): ForecastItem[] => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return [];

    // Let's generate seasonal predictions. E.g., average quantity sold daily * safety factor
    const prodSales = sales.filter(s => s.product_id === productId);
    const avgDailySales = prodSales.length > 0 
      ? prodSales.reduce((acc, s) => acc + s.quantity, 0) / 7 
      : (prod.id % 3) + 2; // fall back to mock formula

    const forecastList: ForecastItem[] = [];
    for (let i = 1; i <= 14; i++) {
      const fDate = new Date(Date.now() + i * 24 * 3600 * 1000);
      const dayOfWeek = fDate.getDay();
      
      // Kirana sells more on weekends (Saturday=6, Sunday=0)
      const weekendBoost = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.4 : 0.9;
      // Slight noise
      const noise = 0.85 + Math.random() * 0.3;
      const predicted = Math.max(1, Math.round(avgDailySales * weekendBoost * noise * 10) / 10);
      
      forecastList.push({
        date: fDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        predicted_quantity: predicted
      });
    }

    return forecastList;
  };

  const trainMLModel = async (productId?: number) => {
    // Simulate model training (wait 2 seconds)
    showToast('info', `Training ML model ${productId ? `for product #${productId}` : 'for all products'}...`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    showToast('success', 'Model training completed successfully! Coefficients updated.');
  };

  return (
    <AppContext.Provider
      value={{
        products,
        sales,
        inventoryLogs,
        purchaseOrders,
        currentUser,
        toasts,
        showToast,
        removeToast,
        login,
        logout,
        signup,
        addProduct,
        updateProduct,
        deleteProduct,
        adjustStock,
        recordSale,
        createPurchaseOrder,
        updatePOStatus,
        getForecast,
        trainMLModel,
        apiConnected,
        setApiConnected
      }}
    >
      {children}
      
      {/* Toast Render Panel */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <span style={{ fontWeight: 600 }}>
              {toast.type === 'success' && '✓'}
              {toast.type === 'error' && '✗'}
              {toast.type === 'warning' && '⚠'}
              {toast.type === 'info' && 'ℹ'}
            </span>
            <div>{toast.text}</div>
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
