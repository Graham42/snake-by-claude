import { getStore } from "@netlify/blobs";

// In-memory rate limiting (resets on cold start, but sufficient for basic protection)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 5; // Max 5 submissions per minute per IP

function checkRateLimit(ip) {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
        rateLimitMap.set(ip, { windowStart: now, count: 1 });
        return true;
    }

    if (entry.count >= RATE_LIMIT_MAX) {
        return false;
    }

    entry.count++;
    return true;
}

function validateScore(data) {
    const { score, gameData, timestamp } = data;

    // Score must be a multiple of 10
    if (typeof score !== 'number' || score % 10 !== 0) {
        return { valid: false, error: "Invalid score format" };
    }

    // Score must be in valid range (0 to 10000)
    if (score < 0 || score > 10000) {
        return { valid: false, error: "Score out of range" };
    }

    // Timestamp must be within last 10 minutes
    const now = Date.now();
    if (typeof timestamp !== 'number' || Math.abs(now - timestamp) > 600000) {
        return { valid: false, error: "Timestamp expired" };
    }

    // Validate gameData structure
    if (!gameData || typeof gameData !== 'object') {
        return { valid: false, error: "Missing game data" };
    }

    const { difficulty, snakeLength, gameTime } = gameData;

    // Validate difficulty
    const validDifficulties = ['EASY', 'MEDIUM', 'HARD'];
    if (!validDifficulties.includes(difficulty)) {
        return { valid: false, error: "Invalid difficulty" };
    }

    // Physics validation: snake length should equal (score / 10) + 3
    // Allow ±2 margin for edge cases
    const expectedLength = (score / 10) + 3;
    if (typeof snakeLength !== 'number' || Math.abs(snakeLength - expectedLength) > 2) {
        return { valid: false, error: "Invalid game data" };
    }

    // Timing validation: minimum game time is (score / 10) * 500ms
    const minGameTime = (score / 10) * 500;
    if (typeof gameTime !== 'number' || gameTime < minGameTime) {
        return { valid: false, error: "Invalid game time" };
    }

    return { valid: true };
}

function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export default async (request, context) => {
    // Only allow POST
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Get client IP for rate limiting
    const ip = context.ip || request.headers.get('x-forwarded-for') || 'unknown';

    // Check rate limit
    if (!checkRateLimit(ip)) {
        return new Response(JSON.stringify({
            success: false,
            error: 'Rate limit exceeded. Please wait before submitting again.'
        }), {
            status: 429,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const data = await request.json();

        // Validate the score
        const validation = validateScore(data);
        if (!validation.valid) {
            return new Response(JSON.stringify({
                success: false,
                error: validation.error
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const { score, gameData, timestamp } = data;

        // Get the leaderboard store
        const store = getStore("leaderboard");

        // Fetch current leaderboard with retry logic
        let leaderboardData;
        let retries = 3;

        while (retries > 0) {
            try {
                const existing = await store.get("scores", { type: "json" });
                leaderboardData = existing || {
                    version: 1,
                    lastUpdated: Date.now(),
                    scores: []
                };
                break;
            } catch (e) {
                retries--;
                if (retries === 0) throw e;
                await new Promise(r => setTimeout(r, 100 * (4 - retries)));
            }
        }

        // Create new score entry
        const newEntry = {
            id: generateId(),
            score,
            difficulty: gameData.difficulty,
            snakeLength: gameData.snakeLength,
            gameTime: gameData.gameTime,
            timestamp
        };

        // Add score to list
        leaderboardData.scores.push(newEntry);

        // Sort by score (desc), then by timestamp (earlier is better)
        leaderboardData.scores.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return a.timestamp - b.timestamp;
        });

        // Keep only top 20
        leaderboardData.scores = leaderboardData.scores.slice(0, 20);

        // Find rank of new score
        const rank = leaderboardData.scores.findIndex(s => s.id === newEntry.id) + 1;
        const madeLeaderboard = rank > 0 && rank <= 20;

        // Update timestamp
        leaderboardData.lastUpdated = Date.now();

        // Save with retry logic
        retries = 3;
        while (retries > 0) {
            try {
                await store.setJSON("scores", leaderboardData);
                break;
            } catch (e) {
                retries--;
                if (retries === 0) throw e;
                await new Promise(r => setTimeout(r, 100 * (4 - retries)));
            }
        }

        return new Response(JSON.stringify({
            success: true,
            rank: madeLeaderboard ? rank : null,
            message: madeLeaderboard
                ? `You made the leaderboard at #${rank}!`
                : 'Score submitted successfully'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Submit score error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Server error'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
