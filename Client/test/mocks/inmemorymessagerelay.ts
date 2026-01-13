/**
 * In-memory message relay for testing purposes
 * This is a simple pub/sub implementation for unit tests
 */
export interface MessageRelay {
  subscribe(channel: string, callback: (message: string) => void): void
  publish(channel: string, message: string): void
}

export class InMemoryMessageRelay implements MessageRelay {
  private subscriptions: Map<string, Set<(message: string) => void>> = new Map()

  subscribe(channel: string, callback: (message: string) => void): void {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set())
    }
    this.subscriptions.get(channel)!.add(callback)
  }

  publish(channel: string, message: string): void {
    const subscribers = this.subscriptions.get(channel)
    if (subscribers) {
      subscribers.forEach((callback) => callback(message))
    }
  }
}
