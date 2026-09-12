import { RunLifecycleEvent, LifecycleEventBus } from "@proofscale/shared";
import { NotificationFanOutService } from "./NotificationFanOutService.js";

type EventHandler = (event: RunLifecycleEvent) => Promise<void>;

export class EventBus {
  private static isSubscribed = false;

  static ensureSubscriber() {
    if (this.isSubscribed) return;
    this.isSubscribed = true;
    LifecycleEventBus.subscribe(async (event) => {
      await NotificationFanOutService.handleRunLifecycleEvent(event);
    });
  }

  /**
   * Publishes a RunLifecycleEvent across the channel.
   */
  static async publish(event: RunLifecycleEvent): Promise<void> {
    this.ensureSubscriber();
    await LifecycleEventBus.publish(event);
  }

  /**
   * Subscribes a consumer to RunLifecycleEvents.
   */
  static subscribe(handler: EventHandler): void {
    LifecycleEventBus.subscribe(handler);
  }
}
