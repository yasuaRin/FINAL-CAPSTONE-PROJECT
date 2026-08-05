// frontend/src/hooks/usePredictions.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';

const ML_API_URL = 'http://localhost:3000';

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

  const controller = new AbortController();
  retrainAbortRef.current = controller;

  try {
    // Step 1: Kick off training (server responds immediately, job runs in background)
    const startRes = await fetch(`${ML_API_URL}/api/ml/retrain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ n_future: 12 }),
      signal: controller.signal,
    });

    if (!startRes.ok) {
      const errorData = await startRes.json();
      throw new Error(errorData.message || errorData.error || 'Retraining failed to start');
    }

    // Step 2: Poll status until the background job actually finishes
    let status;
    do {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      if (controller.signal.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }
      const statusRes = await fetch(`${ML_API_URL}/api/ml/retrain/status`, {
      signal: controller.signal,
      cache: 'no-store',
    });
      status = await statusRes.json();
    } while (status.isRunning);

    // Step 3: Check the REAL result, not just "the request was accepted"
    if (!status.lastResult || status.lastResult.success !== true) {
      throw new Error(status.lastResult?.error || 'Training failed');
    }
    if (status.lastResult.cancelled) {
      return { success: false, aborted: true, error: 'Training stopped by user' };
    }

    // Step 4: Now it's safe to refetch — the DB write has actually completed
    await fetchPredictions();

    return { success: true, message: 'Models retrained successfully' };

  } catch (err) {
    if (err.name === 'AbortError') {
      return { success: false, aborted: true, error: 'Training stopped by user' };
    }
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