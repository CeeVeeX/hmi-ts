export type ListenerSignature<L> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [E in keyof L]: (...args: any[]) => any
}

export interface DefaultListener {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: (...args: any[]) => any
}

// Define a new type to handle '*' events
type WildcardListener<L extends ListenerSignature<L>> = (data: {
  args: Parameters<L[keyof L]>
  event: keyof L
}) => ReturnType<L[keyof L]>

export type ExtendedListenerSignature<L extends ListenerSignature<L>> = L & {
  '*': WildcardListener<L>
}

/**
 * EventEmitter class implements an event emitter that supports multiple arguments per event.
 * It allows adding, removing, and emitting events.
 *
 * Example usage:
 * ```typescript
 * interface MyEvents {
 *   'user-login': (username: string, userId: number) => void; // User login event with username and userId
 *   'data-fetch': (url: string) => void ; // Data fetch event with URL
 * }
 *
 * const emitter = new EventEmitter<MyEvents>();
 *
 * emitter.on('user-login', (username, userId) => {
 *   console.log(`User ${username} with ID ${userId} logged in`);
 * });
 *
 * emitter.emit('user-login', 'john_doe', 123); // Triggers the event
 * ```
 */
export class EventEmitter<L extends ListenerSignature<L> = DefaultListener> {
  // A dictionary to store event names and their associated listeners
  private events: Partial<
    Record<
      keyof ExtendedListenerSignature<L>,
      ExtendedListenerSignature<L>[keyof ExtendedListenerSignature<L>][]
    >
  > = {}

  /**
   * Registers a listener for a specific event.
   *
   * @param event - The name of the event to listen for, * for wildcard listeners.
   * @param listener - The callback function to execute when the event is emitted.
   *
   * Example:
   * ```typescript
   * const off = emitter.on('user-login', (username, userId) => {
   *   console.log(`User ${username} with ID ${userId} logged in`);
   * });
   * // To remove the listener later, call the returned function
   * off();
   * ```
   */
  on<U extends keyof ExtendedListenerSignature<L>>(
    event: U,
    listener: ExtendedListenerSignature<L>[U],
  ): () => void {
    // Initialize an empty array for listeners if not already set
    if (!this.events[event]) {
      this.events[event] = []
    }
    // Add the listener to the event's listeners array
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.events[event]!.push(listener as any)

    return () => {
      this.off(event, listener)
    }
  }

  /**
   * Registers a one-time listener for a specific event.
   * The listener is automatically removed after being invoked once.
   *
   * @param event - The name of the event to listen for, * for wildcard listeners.
   * @param listener - The callback function to execute when the event is emitted (only once).
   *
   * Example:
   * ```typescript
   * emitter.once('user-login', (username, userId) => {
   *   console.log(`User ${username} with ID ${userId} logged in for the first time`);
   * });
   * ```
   */
  once<U extends keyof ExtendedListenerSignature<L>>(
    event: U,
    listener: ExtendedListenerSignature<L>[U],
  ): void {
    // Create a wrapper listener that removes itself after being invoked
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const _wrapper = (...args: any[]): void => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(listener as (...args: any[]) => void)(...args)
      this.off(event, _wrapper as ExtendedListenerSignature<L>[U])
    }

    // Register the wrapper listener
    this.on(event, _wrapper as ExtendedListenerSignature<L>[U])
  }

  /**
   * Emits an event and triggers all listeners for that event, passing the provided arguments.
   *
   * @param event - The name of the event to emit.
   * @param args - The arguments to pass to the listeners of the event.
   *
   * Example:
   * ```typescript
   * emitter.emit('user-login', 'john_doe', 123);
   * // This will trigger all listeners for 'user-login' with 'john_doe' and '123' as arguments.
   * ```
   */
  emit<U extends keyof L>(event: U, ...args: Parameters<L[U]>): boolean {
    // Check if the event has a wildcard listener and invoke it with the provided arguments
    if (this.events['*']) {
      this.events['*']!.forEach((listener: WildcardListener<L>) =>
        listener({
          args: args as Parameters<L[keyof L]>,
          event,
        }),
      )
    }

    // Check if the event has listeners, and if so, invoke each listener with the provided arguments
    if (this.events[event]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.events[event]!.forEach((listener) => (listener as (...args: any[]) => void)(...args))
      return true
    }

    return false
  }

  /**
   * Removes a specific listener for an event.
   *
   * @param event - The name of the event.
   * @param listener - The listener to remove from the event's listeners.
   *
   * Example:
   * ```typescript
   * const listener = (username, userId) => { console.log(`${username} logged in`); };
   * emitter.on('user-login', listener);
   * emitter.off('user-login', listener); // This will remove the listener
   * ```
   */
  off<U extends keyof ExtendedListenerSignature<L>>(
    event: U,
    listener: ExtendedListenerSignature<L>[U],
  ): boolean {
    // If the event has listeners, filter out the listener to remove it
    if (this.events[event]) {
      this.events[event] = this.events[event]!.filter((l) => l !== listener)
      return true
    }

    return false
  }

  /**
   * Removes all listeners for all events.
   * This will clear the entire event registry.
   *
   * Example:
   * ```typescript
   * emitter.offAll(); // Removes all listeners for all events
   * ```
   */
  offAll(): void {
    // Clear the events registry completely
    this.events = {}
  }
}

export default EventEmitter
