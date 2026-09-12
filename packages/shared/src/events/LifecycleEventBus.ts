import { RunLifecycleEvent } from "../schemas/notifications.js";

type LifecycleEventHandler = (event: RunLifecycleEvent) => Promise<void> | void;

export class LifecycleEventBus {
  private static handlers = new Set<LifecycleEventHandler>();

  /**
   * Publishes a RunLifecycleEvent across all registered subscribers.
   */
  static async publish(event: RunLifecycleEvent): Promise<void> {
    for (const handler of Array.from(this.handlers)) {
      try {
        const res = handler(event);
        if (res && typeof (res as Promise<void>).then === "function") {
          (res as Promise<void>).catch((err) => {
            console.error("[LifecycleEventBus] Error in event handler:", err);
          });
        }
      } catch (err) {
        console.error("[LifecycleEventBus] Synchronous error in event handler:", err);
      }
    }
  }

  /**
   * Subscribes a consumer to RunLifecycleEvents.
   */
  static subscribe(handler: LifecycleEventHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  /**
   * Clears all subscribers (useful for testing).
   */
  static removeAllSubscribers(): void {
    this.handlers.clear();
  }
}
