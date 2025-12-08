import { useEffect, useRef } from 'react';

/**
 * Hook tự động làm mới dữ liệu theo chu kỳ
 * @param {Function} callback
 * @param {Array} dependencies 
 * @param {number} interval 
 * @param {boolean} enabled
 */
export const useAutoRefresh = (callback, dependencies = [], interval = 30000, enabled = true) => {
  const savedCallback = useRef();
  const timerRef = useRef(null);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const tick = () => {
      if (document.visibilityState === 'visible') {
        savedCallback.current?.();
      }
    };

    timerRef.current = setInterval(tick, interval);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interval, enabled, ...dependencies]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && enabled) {
        savedCallback.current?.();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled]);
};

export default useAutoRefresh;
