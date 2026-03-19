import { supabase, supabaseAdmin } from '../utils/supabase.js';

// GET /api/brands/read
export const getBrands = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .order('brand_name');

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching brands:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/brands/create
export const createBrand = async (req, res) => {
  try {
    const { brand_name, brand_category, brand_status } = req.body;

    const { data, error } = await supabaseAdmin
      .from('brands')
      .insert([{
        brand_name,
        brand_category,
        brand_status: brand_status || 'active'
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('Error creating brand:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/brands/update/:id
export const updateBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabaseAdmin
      .from('brands')
      .update(updates)
      .eq('brand_id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating brand:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/brands/delete/:id
export const deleteBrand = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('brands')
      .delete()
      .eq('brand_id', id);

    if (error) throw error;

    res.json({ success: true, message: 'Brand deleted' });
  } catch (error) {
    console.error('Error deleting brand:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/brands/risk-signals
export const getRiskSignals = async (req, res) => {
  try {
    const { data: brands, error } = await supabase
      .from('brands')
      .select(`
        brand_id,
        brand_name,
        brand_status,
        live_sessions ( revenue_shopee, revenue_tiktok, date )
      `);

    if (error) throw error;

    const risks = brands.map(brand => {
      const sessions = brand.live_sessions || [];
      const recentRevenue = sessions.reduce(
        (sum, s) => sum + (s.revenue_shopee || 0) + (s.revenue_tiktok || 0), 0
      );
      
      let risk_level = 'low';
      if (recentRevenue < 1000000) risk_level = 'high';
      else if (recentRevenue < 5000000) risk_level = 'medium';

      return {
        brand_id: brand.brand_id,
        brand_name: brand.brand_name,
        risk_level,
        status: brand.brand_status
      };
    });

    res.json({ success: true, data: risks });
  } catch (error) {
    console.error('Error calculating risks:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};