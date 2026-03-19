import { supabase, supabaseAdmin } from '../utils/supabase.js';

// GET /api/revenue/read
export const getRevenue = async (req, res) => {
  try {
    const { startDate, endDate, brandId } = req.query;
    
    let query = supabase
      .from('live_sessions')
      .select(`
        *,
        brands ( brand_id, brand_name ),
        platforms ( platform_id, platform_name ),
        staff ( id, name )
      `)
      .order('date', { ascending: false });

    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);
    if (brandId) query = query.eq('brand_id', brandId);

    const { data, error } = await query;

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching revenue:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/revenue/create
export const createRevenue = async (req, res) => {
  try {
    const { date, time, revenue_shopee, revenue_tiktok, period_id, host_id, brand_id, platform_id } = req.body;

    const { data, error } = await supabaseAdmin
      .from('live_sessions')
      .insert([{
        date,
        time,
        revenue_shopee: revenue_shopee || 0,
        revenue_tiktok: revenue_tiktok || 0,
        period_id,
        host_id,
        brand_id,
        platform_id
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('Error creating revenue:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/revenue/update/:id
export const updateRevenue = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabaseAdmin
      .from('live_sessions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating revenue:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/revenue/delete/:id
export const deleteRevenue = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('live_sessions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true, message: 'Revenue record deleted' });
  } catch (error) {
    console.error('Error deleting revenue:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/revenue/upload (placeholder)
export const uploadRevenue = async (req, res) => {
  res.json({ success: true, message: 'Upload endpoint ready' });
};

// GET /api/revenue/ingestion-logs (placeholder)
export const getIngestionLogs = async (req, res) => {
  res.json({ success: true, data: [] });
};