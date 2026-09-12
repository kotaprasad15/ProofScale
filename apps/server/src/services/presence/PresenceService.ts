/**
 * RateCap Presence Tracking Service
 * 
 * Tracks whether a user has an active, visible tab open on any device.
 * Server stores presence as: presence:{userId}:{deviceId} = { visible: boolean, ts: number }
 * with a 30-second TTL.
 * 
 * Push-eligibility check at delivery time:
 * Push if NO presence key exists for the user across any device, or every existing key has visible: false.
 */

interface PresenceRecord {
  visible: boolean;
  ts: number;
}

export class PresenceService {
  private static TTL_MS = 30_000; // 30 seconds TTL
  private static inMemoryStore = new Map<string, PresenceRecord>();

  /**
   * Updates presence for a specific user and device.
   */
  static updatePresence(userId: string, deviceId: string, visible: boolean): void {
    const key = `presence:${userId}:${deviceId}`;
    this.inMemoryStore.set(key, {
      visible,
      ts: Date.now()
    });
  }

  /**
   * Removes presence when a tab explicitly unloads.
   */
  static removePresence(userId: string, deviceId: string): void {
    const key = `presence:${userId}:${deviceId}`;
    this.inMemoryStore.delete(key);
  }

  /**
   * Checks if the user is currently actively watching any visible tab.
   * Returns true if at least one non-expired device has visible: true.
   * Returns false if user has no active devices or all devices have visible: false.
   */
  static isUserActivelyWatching(userId: string): boolean {
    const now = Date.now();
    const prefix = `presence:${userId}:`;
    let hasAnyVisibleDevice = false;

    for (const [key, record] of this.inMemoryStore.entries()) {
      if (key.startsWith(prefix)) {
        // Expired check
        if (now - record.ts > this.TTL_MS) {
          this.inMemoryStore.delete(key);
        } else if (record.visible) {
          hasAnyVisibleDevice = true;
          break;
        }
      }
    }

    return hasAnyVisibleDevice;
  }

  /**
   * For testing & maintenance: Clears all presence records.
   */
  static clear(): void {
    this.inMemoryStore.clear();
  }
}
