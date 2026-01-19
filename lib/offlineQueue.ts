/**
 * Offline Queue Utility
 * Stores pending transactions when offline and syncs when back online
 */

const QUEUE_KEY = 'flavorpos_offline_queue';

interface QueuedItem {
    id: string;
    type: 'sale' | 'expense' | 'income';
    data: any;
    timestamp: number;
}

export function getQueue(): QueuedItem[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
}

export function addToQueue(item: Omit<QueuedItem, 'timestamp'>): void {
    const queue = getQueue();
    queue.push({ ...item, timestamp: Date.now() });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function removeFromQueue(id: string): void {
    const queue = getQueue();
    const filtered = queue.filter(item => item.id !== id);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
}

export function clearQueue(): void {
    localStorage.removeItem(QUEUE_KEY);
}

export async function syncQueue(
    onSuccess?: (item: QueuedItem) => void,
    onError?: (item: QueuedItem, error: Error) => void
): Promise<{ synced: number; failed: number }> {
    const queue = getQueue();
    let synced = 0;
    let failed = 0;

    for (const item of queue) {
        try {
            const endpoint = `/api/${item.type}s`;
            const token = localStorage.getItem('flavorpos_token') || localStorage.getItem('pos_token');

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(item.data)
            });

            if (response.ok) {
                removeFromQueue(item.id);
                synced++;
                onSuccess?.(item);
            } else {
                failed++;
                const error = await response.json();
                onError?.(item, new Error(error.error || 'Sync failed'));
            }
        } catch (error) {
            failed++;
            onError?.(item, error as Error);
        }
    }

    return { synced, failed };
}
