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


  // Cancels the in-flight retrain request, if any. Aborting the fetch
  // causes retrainModels' catch block to resolve immediately (instead of
  // waiting for the ML API to finish), so the UI can close right away.
const cancelRetrain = useCallback(async () => {
  retrainAbortRef.current?.abort();
  try {
    await fetch(`${ML_API_URL}/api/ml/retrain/cancel`, { method: 'POST' });
  } catch (err) {
    console.warn('[ML] Failed to send cancel request:', err.message);
  }
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