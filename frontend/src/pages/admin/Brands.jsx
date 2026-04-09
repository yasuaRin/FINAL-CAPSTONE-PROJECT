import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit3, Trash2, X, Briefcase, Activity, FileUp, CheckCircle2 } from 'lucide-react';
import { useBrands } from '../../hooks/useBrands';
import { useRevenue } from '../../hooks/useRevenue';

function Brands() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [notification, setNotification] = useState(null);
  const [editingBrand, setEditingBrand] = useState(null);

  // Supabase data hooks
  const { brands, loading: brandsLoading, createBrand, updateBrand, deleteBrand } = useBrands();
  const { data: revenueData, loading: revenueLoading } = useRevenue();

  const isLoading = brandsLoading || revenueLoading;

  // Calculate risk signals based on revenue data
  const brandsWithRisk = useMemo(() => {
    if (!brands?.length || !revenueData?.length) return [];

    return brands.map(brand => {
      const brandRevenue = revenueData
        .filter(r => r.brand_id === brand.id)
        .reduce((sum, r) => sum + (r.revenue_shopee || 0) + (r.revenue_tiktok || 0), 0);

      let riskLevel = 'low';
      let status = 'active';

      if (brandRevenue === 0) {
        riskLevel = 'high';
        status = 'at-risk';
      } else if (brandRevenue < 1000000) {
        riskLevel = 'medium';
        status = 'monitor';
      }

      return {
        ...brand,
        totalRevenue: brandRevenue,
        riskLevel,
        status
      };
    });
  }, [brands, revenueData]);

  const filteredBrands = useMemo(() => {
    return brandsWithRisk.filter(brand =>
      brand.brand_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, brandsWithRisk]);

  const handleCreateBrand = async (brandData) => {
    try {
      await createBrand(brandData);
      setIsCreateModalOpen(false);
      setNotification('Brand created successfully');
      setTimeout(() => setNotification(null), 3000);
    } catch {
      setNotification('Failed to create brand');
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleUpdateBrand = async (id, updates) => {
    try {
      await updateBrand(id, updates);
      setEditingBrand(null);
      setNotification('Brand updated successfully');
      setTimeout(() => setNotification(null), 3000);
    } catch {
      setNotification('Failed to update brand');
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleDeleteBrand = async (id) => {
    if (window.confirm('Are you sure you want to delete this brand?')) {
      try {
        await deleteBrand(id);
        setNotification('Brand deleted successfully');
        setTimeout(() => setNotification(null), 3000);
      } catch {
        setNotification('Failed to delete brand');
        setTimeout(() => setNotification(null), 3000);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Activity className="animate-spin text-slate-400" size={32} />
        <p className="text-slate-500 text-sm font-medium">Loading brand data from Supabase...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-16 relative"
    >
      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-4 left-1/2 z-[100] bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10"
          >
            <div className="bg-emerald-500 rounded-full p-1">
              <CheckCircle2 size={16} />
            </div>
            <span className="text-sm font-bold tracking-tight">{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Brand Portfolio</h1>
          <p className="text-slate-500 mt-1">Manage corporate entities, assess risk levels, and track performance metrics.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search brands..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center justify-center rounded-xl text-sm font-bold transition-all bg-slate-900 text-white hover:bg-slate-800 h-10 px-6 py-2 gap-2 shadow-lg"
          >
            <Plus size={16} />
            Onboard Entity
          </button>
        </div>
      </div>

      {/* Brand Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBrands.map((brand, index) => (
          <motion.div
            key={brand.id || `brand-${index}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="dashboard-card"
          >
            <div className={`card-header-gradient ${
              brand.riskLevel === 'high' ? 'bg-red-500' :
              brand.riskLevel === 'medium' ? 'bg-yellow-500' : 'primary-gradient'
            }`}>
              <Briefcase size={20} />
              <span className="font-bold text-sm">{brand.brand_name}</span>
            </div>

            <div className="p-6 pt-8">
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Category</p>
                  <p className="text-sm font-medium text-slate-700">{brand.brand_category || 'N/A'}</p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Total Revenue</p>
                  <p className="text-lg font-bold text-slate-900">
                    Rp {brand.totalRevenue.toLocaleString('id-ID')}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Risk Level</p>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                    brand.riskLevel === 'high' ? 'bg-red-100 text-red-800' :
                    brand.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {brand.riskLevel.toUpperCase()}
                  </span>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setEditingBrand(brand)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-xs font-bold transition-colors"
                  >
                    <Edit3 size={14} className="inline mr-1" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteBrand(brand.id)}
                    className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-lg text-xs font-bold transition-colors"
                  >
                    <Trash2 size={14} className="inline mr-1" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Create Brand Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <BrandModal
            onClose={() => setIsCreateModalOpen(false)}
            onSubmit={handleCreateBrand}
            title="Onboard New Brand"
          />
        )}
      </AnimatePresence>

      {/* Edit Brand Modal */}
      <AnimatePresence>
        {editingBrand && (
          <BrandModal
            brand={editingBrand}
            onClose={() => setEditingBrand(null)}
            onSubmit={(updates) => handleUpdateBrand(editingBrand.id, updates)}
            title="Edit Brand"
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Brand Modal Component
function BrandModal({ brand, onClose, onSubmit, title }) {
  const [formData, setFormData] = useState({
    brand_name: brand?.brand_name || '',
    brand_category: brand?.brand_category || '',
    brand_status: brand?.brand_status || 'active'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full"
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Brand Name</label>
            <input
              type="text"
              value={formData.brand_name}
              onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Category</label>
            <select
              value={formData.brand_category}
              onChange={(e) => setFormData({ ...formData, brand_category: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="">Select Category</option>
              <option value="Fashion">Fashion</option>
              <option value="Technology">Technology</option>
              <option value="Food">Food</option>
              <option value="Beauty">Beauty</option>
              <option value="Lifestyle">Lifestyle</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Status</label>
            <select
              value={formData.brand_status}
              onChange={(e) => setFormData({ ...formData, brand_status: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-bold transition-colors"
            >
              {brand ? 'Update' : 'Create'} Brand
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

export default Brands;
