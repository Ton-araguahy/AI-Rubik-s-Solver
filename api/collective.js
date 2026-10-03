import { get, put } from '@vercel/blob';

const KEY = 'dqn-1/wins.json';

async function readBook() {
    try {
        const blob = await get(KEY, { access: 'private' });
        if (!blob || blob.statusCode !== 200) return emptyBook();
        const text = await new Response(blob.stream).text();
        return JSON.parse(text);
    } catch {
        return emptyBook();
    }
}

function emptyBook() {
    return { model: 'dqn-1', name: 'DQN', wins: [], bestDepth: 0, updatedAt: null };
}

export default async function handler(req, res) {
    if (req.method === 'GET') {
        const book = await readBook();
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json(book);
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'method' });
    }

    const body = req.body || {};
    const depth = Number(body.depth);
    const moves = Array.isArray(body.moves) ? body.moves.slice(0, 80) : [];
    if (!depth || depth < 1 || depth > 40 || moves.length === 0) {
        return res.status(400).json({ error: 'vitória inválida' });
    }

    const book = await readBook();
    const same = book.wins.find((w) => w.depth === depth && w.moves.join(' ') === moves.join(' '));
    if (!same) {
        book.wins.push({
            depth,
            moves,
            steps: Number(body.steps) || moves.length,
            at: new Date().toISOString(),
        });
    }
    book.wins = book.wins
        .sort((a, b) => b.depth - a.depth || a.steps - b.steps)
        .slice(0, 200);
    book.bestDepth = book.wins.reduce((m, w) => Math.max(m, w.depth), 0);
    book.updatedAt = new Date().toISOString();
    book.model = 'dqn-1';

    await put(KEY, JSON.stringify(book), {
        access: 'private',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
    });

    return res.status(200).json({ ok: true, count: book.wins.length, bestDepth: book.bestDepth });
}
