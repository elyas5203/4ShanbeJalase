import React, { useState } from 'react';
import { Package, Plus, Check, Trash2, Edit2, Layers } from 'lucide-react';
import { Product, RequiredField } from '../types';

interface ProductsViewProps {
  products: Product[];
  onCreateProduct: (product: Omit<Product, 'id'>) => void;
  onUpdateProduct: (id: number, patch: Partial<Omit<Product, 'id'>>) => void;
  onDeleteProduct: (id: number) => void;
  onNavigateToPlans: (productId: number) => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  onCreateProduct,
  onUpdateProduct,
  onDeleteProduct,
  onNavigateToPlans,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdSlug, setNewProdSlug] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newFields, setNewFields] = useState<RequiredField[]>([
    { key: 'name', label: 'نام و نام خانوادگی', type: 'text', required: true }
  ]);

  const handleAddField = () => {
    setNewFields([...newFields, { key: '', label: '', type: 'text', required: true }]);
  };

  const handleRemoveField = (idx: number) => {
    setNewFields(newFields.filter((_, i) => i !== idx));
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName || !newProdSlug) return;

    onCreateProduct({
      name: newProdName,
      slug: newProdSlug.toLowerCase().trim(),
      description: newProdDesc,
      is_active: true,
      required_fields: newFields.filter(f => f.key.trim() !== '')
    });
    setShowAddModal(false);
    setNewProdName('');
    setNewProdSlug('');
    setNewProdDesc('');
  };

  const toggleProductActive = (prod: Product) => {
    onUpdateProduct(prod.id, { is_active: !prod.is_active });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-400" />
            مدیریت محصولات اشتراکی
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            تعریف سرویس‌ها و تعیین فیلدهای داینامیک مورد نیاز خریدار در ربات‌های تلگرام و بله
          </p>
        </div>
        <button
          id="btn-add-product"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          افزودن محصول جدید
        </button>
      </div>

      {/* Product Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {products.map((prod) => (
          <div key={prod.id} className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm">
                    AI
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">{prod.name}</h3>
                    <span className="text-[10px] font-mono text-slate-400">شناسه: {prod.slug}</span>
                  </div>
                </div>
                <button
                  id={`btn-toggle-prod-${prod.id}`}
                  onClick={() => toggleProductActive(prod)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                    prod.is_active
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {prod.is_active ? 'فعال در بات' : 'غیرفعال'}
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed min-h-[40px]">
                {prod.description || 'بدون توضیحات'}
              </p>

              {/* Required Dynamic Fields */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                  اطلاعات الزامی از خریدار در ربات:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {prod.required_fields.map((field) => (
                    <span
                      key={field.key}
                      className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-200 border border-slate-700 flex items-center gap-1"
                    >
                      <span>{field.label}</span>
                      <span className="text-slate-400 text-[9px]">({field.key})</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
              <button
                id={`btn-manage-plans-${prod.id}`}
                onClick={() => onNavigateToPlans(prod.id)}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                مدیریت پلن‌ها و قیمت‌ها
              </button>
              <button
                onClick={() => {
                  if (confirm('آیا از حذف این محصول و تمام پلن‌های آن مطمئن هستید؟')) {
                    onDeleteProduct(prod.id);
                  }
                }}
                className="text-xs text-slate-500 hover:text-red-400 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                حذف
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Add Product */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-400" />
              تعریف محصول اشتراکی جدید (مثلاً Claude یا VPN)
            </h3>

            <form onSubmit={handleCreateProduct} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">نام محصول:</label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً: اشتراک Claude Enterprise"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">شناسه انگلیسی (Slug):</label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً: claude"
                  value={newProdSlug}
                  onChange={(e) => setNewProdSlug(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">توضیحات محصول در منوی ربات:</label>
                <textarea
                  rows={2}
                  placeholder="امکانات و مزایای محصول..."
                  value={newProdDesc}
                  onChange={(e) => setNewProdDesc(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300">فیلدهای مورد نیاز از کاربر:</label>
                  <button
                    type="button"
                    onClick={handleAddField}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    افزودن فیلد
                  </button>
                </div>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {newFields.map((f, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="کلید انگلیسی (مثلاً email)"
                        value={f.key}
                        onChange={(e) => {
                          const copy = [...newFields];
                          copy[idx].key = e.target.value;
                          setNewFields(copy);
                        }}
                        className="w-1/3 p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-200"
                      />
                      <input
                        type="text"
                        placeholder="عنوان فارسی (مثلاً ایمیل گوگل)"
                        value={f.label}
                        onChange={(e) => {
                          const copy = [...newFields];
                          copy[idx].label = e.target.value;
                          setNewFields(copy);
                        }}
                        className="flex-1 p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-200"
                      />
                      {newFields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveField(idx)}
                          className="p-1.5 text-slate-500 hover:text-red-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
                >
                  ایجاد محصول
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
