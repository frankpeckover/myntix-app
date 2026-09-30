export const sessionExpiredEventName = "app:session-expired";

export function notifySessionExpired() {
  window.dispatchEvent(new CustomEvent(sessionExpiredEventName));
}
