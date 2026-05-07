// frontend/src/hooks/usePredictions.js
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';

const ML_API_URL = import.meta.env.VITE_ML_API_URL || 'http://localhost:5000';

export const usePredictions = () => {
  const [futurePredictions, setFuturePredictions] = useState([]);
  const [historicalPredictions, setHistoricalPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRetraining, setIsRetraining] = useState(false);
  const [error, setError] = useState(null);

  const fetchPredictions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: sbError } = await supabase
        .from('revenue_predictions')
        .select('*')
        .order('date', { ascending: true });

      if (sbError) throw sbError;

      const future = (data || []).filter(p => p.is_future === true);
      const historical = (data || []).filter(p => p.is_future === false);

      // Debug logs
      console.log('=== USE PREDICTIONS DEBUG ===');
      console.log('Total records:', data?.length);
      console.log('Future predictions count:', future.length);
      console.log('Future period_ids:', future.map(p => p.period_id));
      console.log('Historical period_ids:', historical.slice(0, 10).map(p => p.period_id));
      console.log('==============================');

      setFuturePredictions(future);
      setHistoricalPredictions(historical);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  const retrainModels = useCallback(async (brandId = null) => {
    setIsRetraining(true);
    try {
      const startRes = await fetch(`${ML_API_URL}/api/ml/retrain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand_id: brandId, n_future: 14 }),
      });

      if (!startRes.ok) {
        const err = await startRes.json();
        throw new Error(err.detail || 'Failed to start training');
      }

      await new Promise((resolve, reject) => {
        const interval = setInterval(async () => {
          try {
            const statusRes = await fetch(`${ML_API_URL}/api/ml/status`);
            const { is_running, last_result } = await statusRes.json();

            if (!is_running) {
              clearInterval(interval);
              if (last_result?.error) {
                reject(new Error(last_result.error));
              } else {
                resolve(last_result);
              }
            }
          } catch (e) {
            clearInterval(interval);
            reject(e);
          }
        }, 3000);
      });

      await fetchPredictions();
      return { success: true };

    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setIsRetraining(false);
    }
  }, [fetchPredictions]);

  const formatCurrency = (value) => {
    if (!value && value !== 0) return 'Rp 0';
    return `Rp ${value.toLocaleString('id-ID')}`;
  };

  return {
    futurePredictions,
    historicalPredictions,
    loading,
    isRetraining,
    error,
    formatCurrency,
    retrainModels,
    refetch: fetchPredictions,
  };
};