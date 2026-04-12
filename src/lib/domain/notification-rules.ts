/**
 * Notification Rules — Quiet hours, anti-spam, channel priority
 */

const QUIET_HOURS_START = 22; // 10 PM
const QUIET_HOURS_END = 6;   // 6 AM
const MIN_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes between messages

// Track last sent per phone (in-memory for now)
const lastSent: Map<string, number> = new Map();

/**
 * Check if notification should be sent right now
 */
export function shouldSendNotification(phone: string): boolean {
  // Check quiet hours (WIT = UTC+9)
  const now = new Date();
  const witHour = (now.getUTCHours() + 9) % 24;
  
  if (witHour >= QUIET_HOURS_START || witHour < QUIET_HOURS_END) {
    return false;
  }

  // Anti-spam: min interval between messages
  const last = lastSent.get(phone);
  if (last && Date.now() - last < MIN_INTERVAL_MS) {
    return false;
  }

  lastSent.set(phone, Date.now());
  return true;
}

/**
 * Get priority channel for a notification type
 */
export function getChannelPriority(type: string): ('wa' | 'push' | 'in_app')[] {
  const critical = ['seat_claim_created', 'seat_claim_expired', 'settlement_invoice'];
  
  if (critical.includes(type)) {
    return ['wa', 'in_app']; // WA first, always save in-app
  }
  
  return ['in_app']; // Default: in-app only
}
