import { useState, useEffect, useCallback } from 'react';
import { WatchlistDiffReport } from '../types';
import { fetchLastSeenDiff, fetchCompareDiff, acknowledgeDiff } from '../services/api';

export type DiffBaselineOption = 'LAST_SEEN' | 'TODAY_OPEN' | 'PREVIOUS_CLOSE';

export function useDiffReport(userId: string, refreshIntervalMs = 4000) {
  const [selectedBaseline, setSelectedBaseline] = useState<DiffBaselineOption>('LAST_SEEN');
  const [report, setReport] = useState<WatchlistDiffReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

  const loadDiff = useCallback(async (showLoading = false) => {
    if (!userId) return;
    try {
      if (showLoading) setIsLoading(true);
      setError(null);

      let data: WatchlistDiffReport;
      if (selectedBaseline === 'LAST_SEEN') {
        data = await fetchLastSeenDiff(userId);
      } else {
        data = await fetchCompareDiff(selectedBaseline, userId);
      }

      setReport(data);
      setLastUpdated(Date.now());
    } catch (err: any) {
      setError(err.message || 'Failed to compute structured diff');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [userId, selectedBaseline]);

  // Initial load when userId or selectedBaseline changes
  useEffect(() => {
    loadDiff(true);
  }, [loadDiff]);

  // Periodic polling for live state updates
  useEffect(() => {
    const interval = setInterval(() => {
      loadDiff(false);
    }, refreshIntervalMs);

    return () => clearInterval(interval);
  }, [loadDiff, refreshIntervalMs]);

  const acknowledge = async () => {
    if (!userId) return;
    try {
      setIsAcknowledging(true);
      const result = await acknowledgeDiff(userId);
      setReport(result.report);
      setSelectedBaseline('LAST_SEEN');
      setLastUpdated(Date.now());
    } catch (err: any) {
      setError(err.message || 'Failed to commit snapshot');
    } finally {
      setIsAcknowledging(false);
    }
  };

  return {
    report,
    selectedBaseline,
    setSelectedBaseline,
    isLoading,
    isAcknowledging,
    error,
    lastUpdated,
    loadDiff,
    acknowledge,
  };
}
