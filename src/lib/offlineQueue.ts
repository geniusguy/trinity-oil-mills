// Offline Queue Management
// This module handles offline actions and syncs them when online

interface QueueItem {
  id: string;
  action: string;
  data: any;
  timestamp: number;
  retryCount: number;
}

const QUEUE_KEY = 'trinity-offline-queue';
const MAX_RETRIES = 3;

class OfflineQueue {
  private queue: QueueItem[] = [];
  private isProcessing = false;

  constructor() {
    this.loadQueue();
    this.setupOnlineListener();
  }

  private loadQueue(): void {
    try {
      const stored = localStorage.getItem(QUEUE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
      this.queue = [];
    }
  }

  private saveQueue(): void {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
      this.notifyUpdate();
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  private notifyUpdate(): void {
    // Dispatch custom event for UI updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('offline-queue-update', {
        detail: { count: this.queue.length }
      }));
    }
  }

  private setupOnlineListener(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.processQueue();
      });
    }
  }

  public addToQueue(action: string, data: any): string {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const item: QueueItem = {
      id,
      action,
      data,
      timestamp: Date.now(),
      retryCount: 0
    };

    this.queue.push(item);
    this.saveQueue();

    // Try to process immediately if online
    if (navigator.onLine) {
      this.processQueue();
    }

    return id;
  }

  public async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    const itemsToProcess = [...this.queue];
    
    for (const item of itemsToProcess) {
      try {
        await this.processItem(item);
        this.removeFromQueue(item.id);
      } catch (error) {
        console.error('Failed to process queue item:', error);
        item.retryCount++;
        
        if (item.retryCount >= MAX_RETRIES) {
          console.error('Max retries reached for item:', item);
          this.removeFromQueue(item.id);
        }
      }
    }

    this.isProcessing = false;
    this.saveQueue();
  }

  private async processItem(item: QueueItem): Promise<void> {
    const { action, data } = item;

    switch (action) {
      case 'CREATE_EXPENSE':
        await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        break;

      case 'UPDATE_EXPENSE':
        await fetch(`/api/expenses/${data.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        break;

      case 'DELETE_EXPENSE':
        await fetch(`/api/expenses/${data.id}`, {
          method: 'DELETE'
        });
        break;

      case 'CREATE_SALE':
        await fetch('/api/sales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        break;

      case 'UPDATE_INVENTORY':
        await fetch('/api/inventory', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        break;

      default:
        console.warn('Unknown queue action:', action);
    }
  }

  private removeFromQueue(id: string): void {
    this.queue = this.queue.filter(item => item.id !== id);
  }

  public getQueue(): QueueItem[] {
    return [...this.queue];
  }

  public getQueueCount(): number {
    return this.queue.length;
  }

  public clearQueue(): void {
    this.queue = [];
    this.saveQueue();
  }
}

// Create singleton instance
let queueInstance: OfflineQueue | null = null;

function getQueueInstance(): OfflineQueue {
  if (!queueInstance) {
    queueInstance = new OfflineQueue();
  }
  return queueInstance;
}

// Public API
export function addToOfflineQueue(action: string, data: any): string {
  return getQueueInstance().addToQueue(action, data);
}

export function getQueueCount(): Promise<number> {
  return Promise.resolve(getQueueInstance().getQueueCount());
}

export function processOfflineQueue(): Promise<void> {
  return getQueueInstance().processQueue();
}

export function getOfflineQueue(): QueueItem[] {
  return getQueueInstance().getQueue();
}

export function clearOfflineQueue(): void {
  getQueueInstance().clearQueue();
}

// Additional exports for compatibility
export function setupOnlineFlush(): void {
  // This function sets up the online flush - already handled in constructor
  getQueueInstance();
}

export function flushQueue(): Promise<void> {
  return processOfflineQueue();
}

// Initialize queue when module loads (client-side only)
if (typeof window !== 'undefined') {
  getQueueInstance();
}
