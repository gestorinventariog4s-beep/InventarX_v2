import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowUpDown,
  ChevronDown,
  Clock,
  Filter,
  ImagePlus,
  LayoutGrid,
  List,
  Package,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Product, ProductPayload, SizeStockPayload, StockAlert } from '../types';

interface InventoryManagerProps {
  products: Product[];
  alerts: StockAlert[];
  onAddProduct: (p: ProductPayload) => Promise<void>;
  onEditProduct: (id: string, p: ProductPayload) => Promise<void>;
  onDeleteProduct: (id: string, mode: 'soft' | 'hard') => Promise<void>;
  isLoading: boolean;
}

const ARTICLE_TYPES = [
  { id: 'Camisa', label: '👕 Camisa', sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] },
  { id: 'Pantalones', label: '👖 Pantalones', sizes: ['28', '30', '32', '34', '36', '38', '40', '42'] },
  { id: 'Calzado', label: '🥾 Calzado (Botas, Tenis, Zapatos)', sizes: ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45'] },
  { id: 'Sastreria', label: '👔 Sastrería (Flus / Sacos / Blazers)', sizes: ['34', '36', '38', '40', '42', '44', '46', '48'] },
  { id: 'Otros', label: '📦 Otros / Accesorios', sizes: ['UNICA', 'S', 'M', 'L', 'XL'] },
];

const cleanArticleTypeLabel = (label: string) => label.split(' ').slice(1).join(' ') || label;
const normalizeSizeLabel = (size: string) => {
  const normalized = (size || '').trim().toUpperCase();
  if (normalized === 'METRO') return 'M';
  if (normalized === 'SG') return 'XL';
  return normalized;
};

const EMPTY_FORM: ProductPayload = {
  sku: '',
  name: '',
  type: ARTICLE_TYPES[0].id,
  color: '',
  photoUrl: '',
  stockMinimo: 1,
  stockMaximo: 10,
  sizeStocks: [],
  categoryName: 'Dotación',
  categoryDescription: '',
};

export const InventoryModule: React.FC<InventoryManagerProps> = ({
  products,
  alerts,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  isLoading
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'name_asc' | 'name_desc' | 'stock_desc' | 'stock_asc'>('recent');
  const [quickView, setQuickView] = useState<'all' | 'critical'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductPayload>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [articleTypeMenuOpen, setArticleTypeMenuOpen] = useState(false);
  const articleTypeMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!articleTypeMenuOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (articleTypeMenuRef.current && !articleTypeMenuRef.current.contains(event.target as Node)) {
        setArticleTypeMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setArticleTypeMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [articleTypeMenuOpen]);

  // Compute total stock from sizeStocks
  const totalStock = (sizeStocks: SizeStockPayload[]) =>
    sizeStocks.reduce((sum, s) => sum + (s.stock || 0), 0);

  // Get color info for a single size bar
  const getSizeBarColor = (sizeStock: number, stockMinimo: number, stockMaximo: number, numSizes: number) => {
    const perSizeMax = numSizes > 0 ? stockMaximo / numSizes : stockMaximo;
    const perSizeMin = numSizes > 0 ? stockMinimo / numSizes : stockMinimo;
    const pct = perSizeMax > 0 ? (sizeStock / perSizeMax) * 100 : 0;
    if (sizeStock <= 0 || pct <= (perSizeMin / perSizeMax) * 100 + 5) {
      return { bar: 'bg-rose-500', border: 'border-rose-300', text: 'text-rose-600', label: 'Crítico' };
    }
    if (pct < 55) {
      return { bar: 'bg-amber-400', border: 'border-amber-300', text: 'text-amber-600', label: 'Bajo' };
    }
    return { bar: 'bg-emerald-500', border: 'border-emerald-300', text: 'text-emerald-600', label: 'Óptimo' };
  };

  const openCreateEditor = () => {
    setEditingProductId(null);
    setForm(EMPTY_FORM);
    setSaveError(null);
    setEditorOpen(true);
  };

  const openEditEditor = (product: Product) => {
    setSaveError(null);
    setEditingProductId(product.id);
    setForm({
      sku: product.sku,
      name: product.name,
      type: product.type,
      color: product.color ?? '',
      photoUrl: product.photoUrl ?? '',
      stockMinimo: product.stockMinimo,
      stockMaximo: product.stockMaximo,
      sizeStocks: (product.sizeStocks ?? []).map(ss => ({ talla: normalizeSizeLabel(ss.talla), stock: ss.stock })),
      categoryName: product.category?.name ?? 'General',
      categoryDescription: product.category?.description ?? '',
    });
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingProductId(null);
    setForm(EMPTY_FORM);
    setArticleTypeMenuOpen(false);
  };

  const selectArticleType = (newType: string) => {
    setForm((prev) => ({
      ...prev,
      type: newType,
      sizeStocks: [],
    }));
    setArticleTypeMenuOpen(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setForm((prev) => ({ ...prev, photoUrl: result }));
    };
    reader.readAsDataURL(file);
  };

  const toggleSize = (size: string) => {
    const normalizedSize = normalizeSizeLabel(size);
    const exists = form.sizeStocks.some(s => normalizeSizeLabel(s.talla) === normalizedSize);
    if (exists) {
      setForm(prev => ({ ...prev, sizeStocks: prev.sizeStocks.filter(s => normalizeSizeLabel(s.talla) !== normalizedSize) }));
    } else {
      setForm(prev => ({ ...prev, sizeStocks: [...prev.sizeStocks, { talla: normalizedSize, stock: 0 }] }));
    }
  };

  const updateSizeStock = (talla: string, stock: number) => {
    const normalizedTalla = normalizeSizeLabel(talla);
    setForm(prev => ({
      ...prev,
      sizeStocks: prev.sizeStocks.map(s => normalizeSizeLabel(s.talla) === normalizedTalla ? { ...s, talla: normalizedTalla, stock } : s),
    }));
  };

  const handleSaveProduct = async () => {
    if (isSaving) return;
    if (!form.sku.trim() || !form.name.trim() || !form.type.trim() || !form.categoryName.trim()) {
      return;
    }

    if (form.stockMinimo >= form.stockMaximo) {
      return;
    }

    if (form.sizeStocks.length === 0) {
      return;
    }

    const normalizedSizeStocks = Object.values(
      form.sizeStocks.reduce((acc, sizeStock) => {
        const talla = normalizeSizeLabel(sizeStock.talla);
        const current = acc[talla]?.stock ?? 0;
        acc[talla] = { talla, stock: current + (Number(sizeStock.stock) || 0) };
        return acc;
      }, {} as Record<string, SizeStockPayload>)
    );

    const payload: ProductPayload = {
      ...form,
      sizeStocks: normalizedSizeStocks,
    };

    setSaveError(null);
    setIsSaving(true);
    try {
      if (editingProductId == null) {
        await onAddProduct(payload);
      } else {
        await onEditProduct(editingProductId, payload);
      }
      closeEditor();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Error al guardar el producto.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteWithMode = async (mode: 'soft' | 'hard') => {
    if (!deleteTarget) return;
    await onDeleteProduct(deleteTarget.id, mode);
    setDeleteTarget(null);
  };

  const categories = useMemo(() =>
    Array.from(new Set(products.map(p => p.category?.name))).filter(Boolean)
    , [products]);

  const filteredProducts = useMemo(() => {
    const filtered = products.filter(p => {
      const name = p.name || '';
      const sku = p.sku || '';
      const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCat = filterCategory === 'all' || (p.category?.name === filterCategory);
      const matchesQuickView = quickView === 'all' || p.stock <= p.stockMinimo;
      return matchesSearch && matchesCat && matchesQuickView;
    });

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':
          return (a.name ?? '').localeCompare(b.name ?? '', 'es', { sensitivity: 'base' });
        case 'name_desc':
          return (b.name ?? '').localeCompare(a.name ?? '', 'es', { sensitivity: 'base' });
        case 'stock_asc':
          return (a.stock ?? 0) - (b.stock ?? 0);
        case 'stock_desc':
          return (b.stock ?? 0) - (a.stock ?? 0);
        case 'oldest':
          return (a.id ?? '').localeCompare(b.id ?? '');
        case 'recent':
        default:
          return (b.id ?? '').localeCompare(a.id ?? '');
      }
    });

    return sorted;
  }, [products, searchTerm, filterCategory, sortBy, quickView]);

  return (
    <div className="space-y-6 pb-10">
      {/* Header Section - COMPACT & BLUE CONTRAST */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Banner de Inventario - PREMIUM GRADIENT */}
        <div className="lg:col-span-8 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 dark:from-blue-900 dark:to-slate-900 rounded-[3rem] p-8 lg:p-10 text-white relative overflow-hidden flex flex-col justify-between min-h-[300px] lg:min-h-[400px] shadow-[0_30px_60px_-15px_rgba(37,99,235,0.3)] border border-white/10">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-white/5 to-transparent pointer-events-none" />
          <div className="absolute -top-12 -right-12 opacity-10 pointer-events-none text-white rotate-12">
            <Package className="w-48 h-48 lg:w-72 lg:h-72" strokeWidth={1} />
          </div>

          <div className="relative z-10 space-y-4 lg:space-y-6">
            <div className="inline-flex items-center gap-2 lg:gap-3 bg-white/10 backdrop-blur-md border border-white/20 px-4 lg:px-5 py-1.5 lg:py-2 rounded-2xl w-fit">
              <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full bg-blue-300 animate-pulse" />
              <span className="text-[8px] lg:text-[10px] font-black uppercase tracking-[0.3em]">Operaciones de Activos</span>
            </div>

            <h1 className="text-4xl lg:text-6xl font-black tracking-tighter leading-tight">
              Control de <br /> <span className="text-blue-200">Inventario</span>
            </h1>

            <p className="text-blue-100/70 max-w-lg text-xs lg:text-base font-medium leading-relaxed">
              Plataforma de alta precisión para el seguimiento de dotación industrial y activos corporativos con analítica de stock en tiempo real.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 lg:gap-4 relative z-10 mt-6 lg:mt-8">
            <button
              onClick={openCreateEditor}
              disabled={isLoading}
              className="bg-white text-blue-700 hover:bg-blue-50 px-6 py-4 lg:px-10 lg:py-5 rounded-[1.5rem] lg:rounded-[1.8rem] font-black text-[9px] lg:text-[11px] uppercase tracking-widest flex items-center gap-2 lg:gap-3 transition-all shadow-xl shadow-blue-900/20 active:scale-95 group"
            >
              <Plus className="w-4 h-4 lg:w-5 lg:h-5 group-hover:rotate-90 transition-transform" strokeWidth={3} /> Nuevo Producto
            </button>

          </div>
        </div>

        {/* Métricas de Stock (Isla Derecha) */}
        <div className="lg:col-span-4 grid grid-cols-2 lg:grid-cols-1 lg:grid-rows-2 gap-4 lg:gap-6">
          <button
            type="button"
            onClick={() => setQuickView('all')}
            className={`text-left rounded-[1.5rem] lg:rounded-[2rem] p-5 lg:p-6 border transition-all flex flex-col justify-center ${
              quickView === 'all'
                ? 'bg-blue-600 text-white border-blue-600 shadow-[0_20px_40px_-20px_rgba(37,99,235,0.6)]'
                : 'bg-white dark:bg-white/5 border-blue-100 dark:border-white/10 text-blue-900 dark:text-white'
            }`}
          >
            <p className={`text-[8px] lg:text-[9px] font-black uppercase tracking-[0.2em] ${quickView === 'all' ? 'text-blue-100' : 'text-blue-500 dark:text-slate-400'}`}>
              Existencias Totales
            </p>
            <h3 className="text-3xl lg:text-4xl font-black leading-none tracking-tighter mt-2">
              {products.reduce((acc, p) => acc + (p.stock || 0), 0).toLocaleString()}
            </h3>
            <div className={`inline-flex items-center gap-1.5 mt-3 lg:mt-4 text-[7px] lg:text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg w-fit ${quickView === 'all' ? 'bg-white/15 text-white' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
              <Clock className="w-3 h-3 lg:w-4 lg:h-4" /> Vista General
            </div>
          </button>

          <button
            type="button"
            onClick={() => setQuickView('critical')}
            className={`text-left rounded-[1.5rem] lg:rounded-[2rem] p-5 lg:p-6 border transition-all flex flex-col justify-center ${
              quickView === 'critical'
                ? 'bg-rose-600 text-white border-rose-600 shadow-[0_20px_40px_-20px_rgba(225,29,72,0.6)]'
                : 'bg-rose-50 border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20 text-rose-700 dark:text-rose-300'
            }`}
          >
            <p className={`text-[8px] lg:text-[9px] font-black uppercase tracking-[0.2em] ${quickView === 'critical' ? 'text-rose-100' : 'text-rose-600'}`}>
              Alertas Críticas
            </p>
            <h3 className="text-3xl lg:text-4xl font-black leading-none tracking-tighter mt-2">
              {alerts.length || products.filter(p => p.stock <= p.stockMinimo).length}
            </h3>
            <div className={`inline-flex items-center gap-1.5 mt-3 lg:mt-4 text-[7px] lg:text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg w-fit ${quickView === 'critical' ? 'bg-white/15 text-white' : 'bg-rose-100/70 text-rose-600 border border-rose-200/70'}`}>
              <AlertTriangle className="w-3 h-3 lg:w-4 lg:h-4" /> Solo críticos
            </div>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-white/5 border border-blue-100 dark:border-white/10 rounded-[2rem] p-3 flex flex-wrap items-center gap-3 shadow-sm">
        <div className="flex-1 min-w-[250px] relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-blue-600" size={18} />
          <input
            className="w-full bg-blue-50/50 dark:bg-white/5 border-none rounded-xl py-4 pl-12 pr-4 text-sm font-bold text-blue-900 dark:text-white placeholder:text-blue-300 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
            placeholder="Buscar por SKU o nombre..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative flex items-center gap-2 bg-blue-50/70 dark:bg-white/5 px-2.5 py-1.5 rounded-xl border border-blue-100 dark:border-white/5 shadow-sm">
          <Filter size={14} className="text-blue-600 ml-1" />
          <select
            className="appearance-none bg-transparent border-none text-[9px] font-black text-blue-900 dark:text-slate-300 uppercase tracking-widest focus:ring-0 cursor-pointer pl-1 pr-8"
            value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all">CATEGORÍAS</option>
            {categories.map(c => <option key={c} value={c}>{c?.toUpperCase()}</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
        </div>
        <div className="relative flex items-center gap-2 bg-blue-50/70 dark:bg-white/5 px-2.5 py-1.5 rounded-xl border border-blue-100 dark:border-white/5 shadow-sm">
          <ArrowUpDown size={14} className="text-blue-600 ml-1" />
          <select
            className="appearance-none bg-transparent border-none text-[9px] font-black text-blue-900 dark:text-slate-300 uppercase tracking-widest focus:ring-0 cursor-pointer pl-1 pr-8"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          >
            <option value="recent">ENTRADAS RECIENTES</option>
            <option value="oldest">ENTRADAS ANTIGUAS</option>
            <option value="name_asc">NOMBRE A-Z</option>
            <option value="name_desc">NOMBRE Z-A</option>
            <option value="stock_desc">STOCK MAYOR-MENOR</option>
            <option value="stock_asc">STOCK MENOR-MAYOR</option>
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
        </div>
        <div className="flex bg-blue-50/50 dark:bg-white/5 p-1 rounded-xl border border-blue-100 dark:border-white/5">
          <button onClick={() => setViewMode('table')} className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm' : 'text-blue-400'}`}><List size={16} /></button>
          <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm' : 'text-blue-400'}`}><LayoutGrid size={16} /></button>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProducts.map((p) => {
            const sizeStocks = p.sizeStocks ?? [];
            const numSizes = sizeStocks.length;
            const perSizeMax = numSizes > 0 ? p.stockMaximo / numSizes : p.stockMaximo;
            const isExpanded = expandedProductId === p.id;
            const stockPct = Math.min((p.stock / p.stockMaximo) * 100, 100);

            return (
              <motion.article
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-white/5 border border-blue-100 dark:border-white/10 rounded-[1.8rem] p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-blue-50 dark:bg-white/10 border border-blue-100 dark:border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                      {p.photoUrl ? (
                        <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package size={20} className="text-blue-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                    <p className="font-black text-blue-950 dark:text-white text-sm truncate">{p.name}</p>
                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">{p.sku}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="bg-blue-50 dark:bg-white/10 text-blue-600 dark:text-slate-400 text-[8px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest border border-blue-100 dark:border-white/5">
                      {cleanArticleTypeLabel(ARTICLE_TYPES.find(t => t.id === p.type)?.label || p.type || 'GENERAL')}
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-blue-600 text-white">
                      Global: {p.stock} U
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="rounded-xl border border-blue-100 dark:border-white/10 bg-blue-50/50 dark:bg-white/5 px-3 py-2">
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Tallas</p>
                    <p className="text-sm font-black text-blue-700 dark:text-blue-300">{sizeStocks.length}</p>
                  </div>
                  <div className="rounded-xl border border-blue-100 dark:border-white/10 bg-blue-50/50 dark:bg-white/5 px-3 py-2">
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Mín / Máx</p>
                    <p className="text-sm font-black text-blue-700 dark:text-blue-300">{p.stockMinimo} / {p.stockMaximo}</p>
                  </div>
                  <div className="rounded-xl border border-blue-100 dark:border-white/10 bg-blue-50/50 dark:bg-white/5 px-3 py-2">
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Estado</p>
                    <p className={`text-sm font-black ${p.stock <= p.stockMinimo ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {p.stock <= p.stockMinimo ? 'Crítico' : 'Estable'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest">Mín {p.stockMinimo}</span>
                  <div className="flex-1 h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                    <motion.div className="h-full rounded-full bg-blue-500" initial={{ width: 0 }} animate={{ width: `${stockPct}%` }} />
                  </div>
                  <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Máx {p.stockMaximo}</span>
                </div>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-3 mb-4 rounded-xl border border-blue-100 dark:border-white/10 bg-blue-50/40 dark:bg-white/5 p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Detalle por talla</p>
                          <p className="text-[9px] font-black text-blue-500">{sizeStocks.length} tallas</p>
                        </div>
                        {sizeStocks.length > 0 ? (
                          <div className="space-y-2">
                            {sizeStocks.map((ss) => {
                              const color = getSizeBarColor(ss.stock, p.stockMinimo, p.stockMaximo, numSizes);
                              const fillPct = perSizeMax > 0 ? Math.min((ss.stock / perSizeMax) * 100, 100) : 0;
                              return (
                                <div key={`${p.id}-row-${ss.talla}`} className="flex items-center gap-2">
                                  <span translate="no" className="notranslate w-8 text-[9px] font-black text-slate-500 uppercase">{ss.talla}</span>
                                  <div className="flex-1 h-2 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${color.bar}`} style={{ width: `${fillPct}%` }} />
                                  </div>
                                  <span className={`text-[9px] font-black ${color.text}`}>{ss.stock}</span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sin detalle por talla</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-2">
                  <button
                    onClick={() => openEditEditor(p)}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-2.5 text-[10px] font-black uppercase tracking-widest"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => setExpandedProductId(isExpanded ? null : p.id)}
                    className="px-3 py-2 text-[9px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100 rounded-xl hover:bg-blue-100 transition-all"
                  >
                    {isExpanded ? 'Ocultar' : 'Ver'}
                  </button>
                  <button onClick={() => setDeleteTarget(p)} className="p-2 text-blue-300 hover:text-rose-600 hover:bg-rose-100 rounded-xl transition-all"><Trash2 size={16} /></button>
                </div>
              </motion.article>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-white/5 border border-blue-100 dark:border-white/10 rounded-[2rem] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-blue-50/30 dark:bg-black/20">
                  <th className="px-6 py-5 text-[9px] font-black text-blue-400 dark:text-slate-500 uppercase tracking-[0.2em] border-b border-blue-50 dark:border-white/5">Producto</th>
                  <th className="px-6 py-5 text-[9px] font-black text-blue-400 dark:text-slate-500 uppercase tracking-[0.2em] border-b border-blue-50 dark:border-white/5">Tallas</th>
                  <th className="px-6 py-5 text-[9px] font-black text-blue-400 dark:text-slate-500 uppercase tracking-[0.2em] border-b border-blue-50 dark:border-white/5">Nivel</th>
                  <th className="px-6 py-5 text-[9px] font-black text-blue-400 dark:text-slate-500 uppercase tracking-[0.2em] border-b border-blue-50 dark:border-white/5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-50 dark:divide-white/5">
                {filteredProducts.map((p) => {
                  const sizeStocks = p.sizeStocks ?? [];
                  const numSizes = sizeStocks.length;
                  const perSizeMax = numSizes > 0 ? p.stockMaximo / numSizes : p.stockMaximo;

                  return (
                    <motion.tr key={p.id} className="hover:bg-blue-50/30 dark:hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="min-w-0 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-white/10 border border-blue-100 dark:border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                            {p.photoUrl ? (
                              <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <Package size={14} className="text-blue-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-black text-blue-950 dark:text-white text-sm leading-tight truncate">{p.name}</p>
                            <span className="text-[9px] font-black text-blue-500 dark:text-blue-400 uppercase tracking-widest">{p.sku} • {cleanArticleTypeLabel(ARTICLE_TYPES.find(t => t.id === p.type)?.label || p.type)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        {/* Per-size mini bar chart */}
                        {sizeStocks.length > 0 ? (
                          <div className="flex items-end gap-1.5">
                            {sizeStocks.map((ss) => {
                              const color = getSizeBarColor(ss.stock, p.stockMinimo, p.stockMaximo, numSizes);
                              const fillPct = perSizeMax > 0 ? Math.min((ss.stock / perSizeMax) * 100, 100) : 0;
                              return (
                                <div key={`tbl-${p.id}-${ss.talla}`} className="flex flex-col items-center gap-0.5">
                                  <span className={`text-[8px] font-black ${color.text}`}>{ss.stock}</span>
                                  <div className="w-6 h-8 bg-slate-100 dark:bg-white/10 rounded overflow-hidden flex flex-col justify-end">
                                    <div className={`w-full rounded ${color.bar}`} style={{ height: `${fillPct}%` }} />
                                  </div>
                                  <span translate="no" className="notranslate text-[7px] font-black text-slate-400 uppercase">{ss.talla}</span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest bg-slate-100 text-slate-500">UNICA · {p.stock} U</span>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <div className="w-40 space-y-1">
                          <div className="flex justify-between text-[9px] font-black">
                            <span className="text-blue-400">Total: {p.stock} U</span>
                            <span className="text-slate-400">Mín {p.stockMinimo} / Máx {p.stockMaximo}</span>
                          </div>
                          <div className="h-1.5 bg-blue-50 dark:bg-white/5 rounded-full overflow-hidden">
                            <motion.div className="h-full rounded-full bg-blue-500" initial={{ width: 0 }} animate={{ width: `${Math.min((p.stock / p.stockMaximo) * 100, 100)}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openEditEditor(p)} className="px-3 py-2 text-[9px] font-black uppercase tracking-widest bg-blue-600 text-white rounded-xl hover:bg-blue-500">Editar</button>
                          <button onClick={() => setDeleteTarget(p)} className="p-2 text-blue-300 hover:text-rose-600 hover:bg-rose-100 rounded-xl transition-all"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AnimatePresence>
        {editorOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2147483647] bg-blue-950/45 backdrop-blur-md p-3 md:p-4 flex items-start justify-center overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.985, opacity: 0, y: -22 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.985, opacity: 0, y: -14 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-5xl max-h-[94vh] mt-2 md:mt-4 overflow-hidden rounded-[2.2rem] bg-white dark:bg-slate-900 border border-white dark:border-white/10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] p-5 md:p-6 relative flex flex-col"
            >
              <div className="flex items-center justify-between mb-4 md:mb-5">
                <div className="space-y-1">
                  <h3 className="text-xl md:text-2xl font-black text-blue-950 dark:text-white tracking-tighter leading-tight">
                    {editingProductId == null ? 'Registrar Dotación' : 'Actualizar Producto'}
                  </h3>
                  <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">
                    Panel de Gestión de Inventario
                  </p>
                </div>
                <button 
                  onClick={closeEditor} 
                  className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-white/5 flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors"
                >
                  <X size={18} strokeWidth={3} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-5">
                {/* Left Column: Core Info */}
                <div className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Identificador SKU</label>
                    <input 
                      className="w-full bg-blue-50/50 dark:bg-white/5 border border-blue-100 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-blue-950 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" 
                      placeholder="Ej: D311141001" 
                      value={form.sku} 
                      onChange={(e) => setForm((prev) => ({ ...prev, sku: e.target.value.toUpperCase() }))} 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Nombre Comercial</label>
                    <input 
                      className="w-full bg-blue-50/50 dark:bg-white/5 border border-blue-100 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-blue-950 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" 
                      placeholder="Ej: Camisa Slim Fit Premium" 
                      value={form.name} 
                      onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Categoría de Artículo</label>
                    <div className="relative" ref={articleTypeMenuRef}>
                      <button
                        type="button"
                        onClick={() => setArticleTypeMenuOpen((prev) => !prev)}
                        className="w-full bg-white/90 dark:bg-slate-950/60 border border-blue-100 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-blue-950 dark:text-white transition-all cursor-pointer hover:border-blue-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none flex items-center justify-between"
                        aria-haspopup="listbox"
                        aria-expanded={articleTypeMenuOpen}
                      >
                        <span className="truncate text-left">
                          {cleanArticleTypeLabel(ARTICLE_TYPES.find(type => type.id === form.type)?.label ?? '')}
                        </span>
                        <span className="flex items-center gap-2 text-blue-500 shrink-0 pl-3">
                          <Package size={16} />
                          <ChevronDown size={14} className={`transition-transform ${articleTypeMenuOpen ? 'rotate-180' : ''}`} />
                        </span>
                      </button>

                      <AnimatePresence>
                        {articleTypeMenuOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -6, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.98 }}
                            transition={{ duration: 0.16 }}
                            className="absolute z-30 mt-2 w-full rounded-2xl border border-blue-200 dark:border-white/10 bg-white dark:bg-slate-950 shadow-[0_20px_45px_-20px_rgba(37,99,235,0.45)] overflow-hidden"
                            role="listbox"
                          >
                            <div className="max-h-56 overflow-y-auto py-1">
                              {ARTICLE_TYPES.map((type) => {
                                const isSelected = type.id === form.type;
                                return (
                                  <button
                                    key={type.id}
                                    type="button"
                                    onClick={() => selectArticleType(type.id)}
                                    className={`w-full text-left px-3.5 py-2 text-sm font-black transition-colors flex items-center gap-2 ${
                                      isSelected
                                        ? 'bg-blue-600 text-white'
                                        : 'text-blue-900 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-white/5'
                                    }`}
                                    role="option"
                                    aria-selected={isSelected}
                                  >
                                    <span
                                      className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 ${
                                        isSelected
                                          ? 'border-white/40 bg-white/20'
                                          : 'border-blue-100 dark:border-white/10 bg-blue-50 dark:bg-white/5 text-blue-500 dark:text-blue-300'
                                      }`}
                                    >
                                      <Package size={13} />
                                    </span>
                                    <span className="truncate">{cleanArticleTypeLabel(type.label)}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Color</label>
                      <input 
                        className="w-full bg-blue-50/50 dark:bg-white/5 border border-blue-100 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-blue-950 dark:text-white outline-none" 
                        placeholder="Ej: Azul Marino" 
                        value={form.color} 
                        onChange={(e) => setForm((prev) => ({ ...prev, color: e.target.value }))} 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Grupo</label>
                      <input 
                        className="w-full bg-blue-50/50 dark:bg-white/5 border border-blue-100 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-blue-950 dark:text-white outline-none" 
                        placeholder="Ej: Operativos" 
                        value={form.categoryName} 
                        onChange={(e) => setForm((prev) => ({ ...prev, categoryName: e.target.value }))} 
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column: Sizes with per-size stock & Global Min/Max */}
                <div className="space-y-3.5">
                  {/* Size selection */}
                  <div className="space-y-2.5 bg-blue-50/30 dark:bg-white/5 p-4 rounded-2xl border border-blue-100 dark:border-white/10">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 flex items-center gap-2">
                      <List size={14} /> Tallas Disponibles
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(
                        new Set((ARTICLE_TYPES.find(t => t.id === form.type)?.sizes ?? []).map((size) => normalizeSizeLabel(size)))
                      ).map(size => {
                        const isSelected = form.sizeStocks.some(s => normalizeSizeLabel(s.talla) === size);
                        return (
                          <button
                            key={size}
                            onClick={() => toggleSize(size)}
                            type="button"
                            translate="no"
                            className={`notranslate relative overflow-hidden min-w-[52px] px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none scale-105 ring-2 ring-blue-200/80 dark:ring-blue-400/20'
                                : 'bg-white dark:bg-white/10 text-blue-500 border border-blue-100 dark:border-transparent hover:border-blue-300 hover:bg-blue-50/80 dark:hover:bg-blue-500/10'
                            }`}
                          >
                            <span className={`absolute inset-x-0 bottom-0 h-[2px] transition-all ${isSelected ? 'bg-white/60' : 'bg-transparent'}`} />
                            {size}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Per-size stock inputs */}
                  {form.sizeStocks.length > 0 && (
                    <div className="space-y-2.5 bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/10">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Cantidad por Talla</label>
                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
                          Total: {totalStock(form.sizeStocks)} U
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 max-h-40 overflow-y-auto pr-1">
                        {form.sizeStocks.map((ss) => {
                          const normalizedLabel = normalizeSizeLabel(ss.talla);
                          const color = getSizeBarColor(ss.stock, form.stockMinimo, form.stockMaximo, form.sizeStocks.length);
                          return (
                            <div key={`input-${normalizedLabel}`} className={`flex items-center gap-2 bg-white dark:bg-white/5 rounded-xl px-3 py-2 border ${color.border}`}>
                              <span translate="no" className="notranslate text-[10px] font-black text-blue-700 dark:text-blue-300 w-8 shrink-0 uppercase">{normalizedLabel}</span>
                              <input
                                type="number"
                                min={0}
                                value={ss.stock}
                                onChange={(e) => updateSizeStock(normalizedLabel, Math.max(0, Number(e.target.value)))}
                                className={`w-full bg-transparent border-none outline-none text-sm font-black text-center ${color.text}`}
                              />
                              <div className="w-1.5 h-5 rounded-full shrink-0 overflow-hidden bg-slate-100">
                                <div
                                  className={`w-full rounded-full ${color.bar} transition-all`}
                                  style={{
                                    height: `${Math.min(((ss.stock / (form.stockMaximo / form.sizeStocks.length)) * 100), 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Global min/max */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Mínimo Global</label>
                      <input
                        type="number"
                        min={1}
                        className="w-full bg-rose-50/50 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-500/20 rounded-xl px-4 py-3 text-sm font-black text-rose-600 text-center"
                        value={form.stockMinimo}
                        onChange={(e) => setForm(prev => ({ ...prev, stockMinimo: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Máximo Global</label>
                      <input
                        type="number"
                        min={2}
                        className="w-full bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/20 rounded-xl px-4 py-3 text-sm font-black text-emerald-600 text-center"
                        value={form.stockMaximo}
                        onChange={(e) => setForm(prev => ({ ...prev, stockMaximo: Number(e.target.value) }))}
                      />
                    </div>
                  </div>

                  <div className="relative group overflow-hidden rounded-2xl border-2 border-dashed border-blue-200 dark:border-white/10 bg-blue-50/40 dark:bg-white/5 p-3 transition-all hover:border-blue-400">
                    <div className="flex items-center justify-between mb-2.5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Imagen del Producto</p>
                      <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest cursor-pointer shadow-lg shadow-blue-100 dark:shadow-none hover:bg-blue-500 active:scale-95 transition-all">
                        <ImagePlus size={14} /> Seleccionar
                        <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                      </label>
                    </div>
                    {form.photoUrl ? (
                      <div className="relative h-24 w-full">
                        <img src={form.photoUrl} alt="preview" className="w-full h-full object-contain rounded-xl" />
                        <button onClick={() => setForm(p => ({ ...p, photoUrl: '' }))} className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-lg shadow-lg"><X size={12} /></button>
                      </div>
                    ) : (
                      <div className="h-24 flex flex-col items-center justify-center gap-1.5 text-blue-300">
                        <Package size={24} className="opacity-20" />
                        <span className="text-[9px] font-black uppercase tracking-widest opacity-50">Sin Archivo</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              </div>

              {saveError && (
                <div className="mx-0 mt-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 px-4 py-2.5 text-[10px] font-bold text-red-600 dark:text-red-400">
                  {saveError}
                </div>
              )}
              <div className="flex gap-3 mt-4 pt-3 border-t border-blue-100/80 dark:border-white/10 bg-white dark:bg-slate-900">
                <button 
                  onClick={closeEditor} 
                  disabled={isSaving}
                  className="flex-1 rounded-xl border border-blue-100 dark:border-white/10 px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 hover:bg-blue-50 transition-all disabled:opacity-40"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => void handleSaveProduct()} 
                  disabled={isLoading || isSaving} 
                  className="flex-[2] rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-blue-200 dark:shadow-none disabled:opacity-60 transition-all active:scale-[0.98]"
                >
                  {isSaving ? 'Guardando...' : editingProductId == null ? 'Finalizar Registro' : 'Actualizar Cambios'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1100] bg-blue-950/45 backdrop-blur-sm p-4 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 12 }}
              className="w-full max-w-lg rounded-[2rem] bg-white dark:bg-slate-900 border border-blue-100 dark:border-white/10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.25)] p-6"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 mb-2">Confirmar Acción</p>
              <h4 className="text-xl font-black tracking-tight text-blue-950 dark:text-white mb-2">{deleteTarget.name}</h4>
              <p className="text-sm font-bold text-slate-500 mb-6">
                ¿Deseas ocultar este producto del inventario o eliminarlo definitivamente?
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="rounded-xl border border-blue-100 dark:border-white/10 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-blue-500 hover:bg-blue-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => void handleDeleteWithMode('soft')}
                  className="rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all"
                >
                  Ocultar
                </button>
                <button
                  onClick={() => void handleDeleteWithMode('hard')}
                  className="rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};