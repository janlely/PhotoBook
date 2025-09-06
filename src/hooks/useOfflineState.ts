import { useState, useEffect } from 'react';
import { offlineManager, type OfflineState } from '../services/offlineManager';

export const useOfflineState = (): OfflineState => {
  const [state, setState] = useState<OfflineState>(offlineManager.getState());

  useEffect(() => {
    const unsubscribe = offlineManager.subscribe(setState);
    return unsubscribe;
  }, []);

  return state;
};

export default useOfflineState;