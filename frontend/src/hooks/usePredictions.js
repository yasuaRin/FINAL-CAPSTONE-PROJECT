// frontend/src/hooks/usePredictions.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';

const ML_API_URL = import.meta.env.VITE_ML_API_URL;

export const usePredictions = () => {
  const [futurePredictions, setFuturePredictions] = useState([]);
  const [historicalPredictions, setHistoricalPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRetraining, setIsRetraining] = useState(false);
  const [error, setError] = useState(null);

  // Holds the AbortController for the in-flight retrain request, so it can
  // be cancelled on demand (e.g. user presses "Stop" in the UI).
  const retrainAbortRef = useRef(null);

  const fetchPredictions = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: sbError } = await supabase
        .from('revenue_predictions')
        .select('*')
        .order('date', { ascending: true });

      if (sbError) throw sbError;

      const future = (data || []).filter(p => p.is_future === true);
      const historical = (data || []).filter(p => p.is_future === false);

      //console.log('📊 Future predictions:', future.length);
      setFuturePredictions(future);
      setHistoricalPredictions(historical);
      
    } catch (err) {
      //console.error('Fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPredictions();
  }, [fetchPredictions]);

  const retrainModels = useCallback(async () => {
    setIsRetraining(true);
    setError(null);

    // Create a fresh AbortController for this retrain run and keep a ref to
    // it so cancelRetrain() can abort the underlying fetch on demand.
    const controller = new AbortController();
    retrainAbortRef.current = controller;
    
    try {
      // Step 1: Call ML API to retrain
      // console.log('🔄 Starting ML retraining...');
      
      const response = await fetch(`${ML_API_URL}/api/ml/retrain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          n_future: 12  // Predict next 12 periods
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Retraining failed');
      }

      // eslint-disable-next-line no-unused-vars
      const result = await response.json();
     // console.log('✅ ML retraining completed:', result);

      // Step 2: Fetch updated predictions
      await fetchPredictions();
      
      return { success: true, message: 'Models retrained successfully' };
      
    } catch (err) {
      if (err.name === 'AbortError') {
        // Cancelled by the user — not a real error, just report it as such
        // so callers can distinguish a manual stop from a genuine failure.
        return { success: false, aborted: true, error: 'Training stopped by user' };
      }
     // console.error('❌ Retrain error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsRetraining(false);
      retrainAbortRef.current = null;
    }
  }, [fetchPredictions]);

  // Cancels the in-flight retrain request, if any. Aborting the fetch
  // causes retrainModels' catch block to resolve immediately (instead of
  // waiting for the ML API to finish), so the UI can close right away.
  const cancelRetrain = useCallback(() => {
    retrainAbortRef.current?.abort();
  }, []);

  return {
    futurePredictions,
    historicalPredictions,
    loading,
    isRetraining,
    error,
    retrainModels,
    cancelRetrain,
    refetch: fetchPredictions,
  };
};