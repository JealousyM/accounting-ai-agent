export const MKTAI_SCRIPT_URL = process.env.NEXT_PUBLIC_MKTAI_SCRIPT_URL;
export const MKTAI_TRACKING_ID = process.env.NEXT_PUBLIC_MKTAI_TRACKING_ID;

declare global {
  interface Window {
    mktai: (type: string, action: string, params?: Record<string, unknown>) => void;
  }
}

export function mktaiEvent(
  eventName: string,
  action: string,
  params?: Record<string, unknown>
): void {
  if (typeof window.mktai !== 'function') return;
  window.mktai(eventName, action, params);
}

export function mktaiConversion(type: string, params?: Record<string, unknown>): void {
  if (typeof window.mktai !== 'function') return;
  window.mktai('conversion', type, params);
}
