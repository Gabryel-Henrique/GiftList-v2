// Short vibration as feedback on touch devices (Android browsers/PWA; iOS
// Safari has no Vibration API, so this silently does nothing there).
export function haptic(pattern: number | number[] = 12) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // unsupported or blocked: no feedback, nothing else to do
  }
}

// A slightly longer pattern for "all done" moments.
export const CELEBRATE_PATTERN = [18, 60, 28];
