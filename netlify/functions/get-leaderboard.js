import { getStore } from "@netlify/blobs";

// Simple in-memory cache (5 second TTL)
let cachedData = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5000; // 5 seconds

export default async (request, context) => {
    // Only allow GET
    if (request.method !== 'GET') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const now = Date.now();

        // Check cache
        if (cachedData && (now - cacheTimestamp) < CACHE_TTL) {
            return new Response(JSON.stringify({
                success: true,
                scores: cachedData.scores,
                lastUpdated: cachedData.lastUpdated
            }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'public, max-age=5'
                }
            });
        }

        // Get the leaderboard store
        const store = getStore("leaderboard");

        // Fetch leaderboard with retry logic
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

        // Update cache
        cachedData = leaderboardData;
        cacheTimestamp = now;

        return new Response(JSON.stringify({
            success: true,
            scores: leaderboardData.scores,
            lastUpdated: leaderboardData.lastUpdated
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=5'
            }
        });

    } catch (error) {
        console.error('Get leaderboard error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Server error',
            scores: []
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
