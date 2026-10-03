export interface SharedWin {
    depth: number;
    moves: string[];
    steps: number;
    at: string;
}

export interface CollectiveBook {
    model: string;
    name?: string;
    wins: SharedWin[];
    bestDepth: number;
    updatedAt: string | null;
}

const empty: CollectiveBook = { model: 'dqn-1', wins: [], bestDepth: 0, updatedAt: null };

export async function loadCollective(): Promise<CollectiveBook> {
    try {
        const res = await fetch('/api/collective', { cache: 'no-store' });
        if (!res.ok) return empty;
        return await res.json();
    } catch {
        return empty;
    }
}

export async function saveWin(win: { depth: number; moves: string[]; steps: number }) {
    const local = JSON.parse(localStorage.getItem('dqn-1-wins') || '[]');
    local.unshift({ ...win, at: new Date().toISOString() });
    localStorage.setItem('dqn-1-wins', JSON.stringify(local.slice(0, 50)));
    const res = await fetch('/api/collective', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(win),
    });
    if (!res.ok) throw new Error('não salvou no banco compartilhado');
    return res.json();
}
