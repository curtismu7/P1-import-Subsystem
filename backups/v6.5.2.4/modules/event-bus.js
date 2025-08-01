// event-bus.js
// Simple EventBus utility for cross-subsystem communication

class EventBus {
    constructor() {
        this.events = {};
    }
    on(event, handler) {
        (this.events[event] = this.events[event] || []).push(handler);
    }
    off(event, handler) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(h => h !== handler);
    }
    emit(event, data) {
        (this.events[event] || []).forEach(h => h(data));
    }
}

// Create and export a default instance
const eventBus = new EventBus();

// Export both the class and the default instance
export { EventBus, eventBus };
export default eventBus;

// Browser global fallback for legacy compatibility
if (typeof window !== 'undefined') {
    window.EventBus = EventBus;
    window.eventBus = eventBus;
}
