import { useEffect, useRef, useCallback } from "react";

interface UseSmartPollingOptions {
  /** fetch function ที่จะเรียกซ้ำ */
  fetchFn: () => Promise<void>;
  /** เงื่อนไขว่าต้อง poll ต่อหรือไม่ — return true = poll ต่อ */
  shouldPoll: boolean;
  /** interval เริ่มต้น (ms) default: 3000 */
  initialInterval?: number;
  /** interval สูงสุด (ms) default: 30000 */
  maxInterval?: number;
  /** ตัวคูณ backoff default: 1.5 */
  backoffMultiplier?: number;
}

/**
 * useSmartPolling — Exponential Backoff Polling Hook
 *
 * แทนที่จะ poll ทุก N วินาทีแบบ fixed:
 *   - เริ่มที่ initialInterval
 *   - แต่ละครั้งที่ยัง pending → เพิ่ม interval × backoffMultiplier
 *   - หยุดอัตโนมัติเมื่อ shouldPoll = false
 *   - Cleanup เมื่อ unmount
 *
 * ผลลัพธ์: ผู้ใช้ 300 คน × fixed 5s = 3600 req/min
 *          ผู้ใช้ 300 คน × backoff   = ~600 req/min หลัง 1 นาที
 */
export function useSmartPolling({
  fetchFn,
  shouldPoll,
  initialInterval = 3000,
  maxInterval = 30000,
  backoffMultiplier = 1.5,
}: UseSmartPollingOptions) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentIntervalRef = useRef(initialInterval);
  const isMountedRef = useRef(true);

  const clearPoll = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const scheduleNext = useCallback(() => {
    clearPoll();
    timeoutRef.current = setTimeout(async () => {
      if (!isMountedRef.current) return;
      await fetchFn();
      // เพิ่ม interval (จนถึง max)
      currentIntervalRef.current = Math.min(
        currentIntervalRef.current * backoffMultiplier,
        maxInterval
      );
    }, currentIntervalRef.current);
  }, [fetchFn, backoffMultiplier, maxInterval, clearPoll]);

  // รีเซ็ต interval เมื่อ shouldPoll กลับมาเป็น true ใหม่
  useEffect(() => {
    if (shouldPoll) {
      currentIntervalRef.current = initialInterval;
      scheduleNext();
    } else {
      clearPoll();
    }
  }, [shouldPoll]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reschedule เมื่อ scheduleNext เปลี่ยน (fetchFn ใหม่)
  useEffect(() => {
    if (shouldPoll) scheduleNext();
  }, [scheduleNext]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearPoll();
    };
  }, [clearPoll]);
}
