# High Score Leaderboard Implementation Plan

## Overview
Add a global high score board to the Snake game using Netlify's free tier features. Display top 20 anonymous scores on the game over screen.

## Architecture

### Storage Solution: Netlify Blobs + Netlify Functions
- **Netlify Blobs** for persistent storage (simple key-value, perfect for leaderboard array)
- **Netlify Functions** for serverless API endpoints
- **Free tier capacity**: 125k requests/month, 100 hours runtime (more than sufficient for ~62k games/month)

### Data Flow
```
Browser → POST /submit-score → Validate → Update Blob → Return rank
Browser → GET /get-leaderboard → Read Blob → Return top 20
```

---

## Implementation Steps

### 1. Backend Infrastructure

#### Create New Files

**`netlify.toml`** - Netlify configuration
```toml
[build]
  functions = "netlify/functions"

[functions]
  node_bundler = "esbuild"
```

**`package.json`** - Dependencies
```json
{
  "name": "snake-game-leaderboard",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "@netlify/blobs": "^8.1.0"
  }
}
```

**`netlify/functions/submit-score.js`** - Score submission endpoint
- Accept: `{ score, timestamp, gameData: { difficulty, snakeLength, gameTime } }`
- Validate score (see anti-cheat section below)
- Rate limit: 5 submissions per IP per minute
- Update leaderboard blob if score is top 20
- Return: `{ success, rank, message }`

**`netlify/functions/get-leaderboard.js`** - Leaderboard retrieval endpoint
- Fetch leaderboard blob
- Return top 20 scores sorted by score (descending), then timestamp
- Implement 5-second cache to reduce read operations

#### Data Model in Blob (key: "leaderboard")
```json
{
  "version": 1,
  "lastUpdated": 1736726400000,
  "scores": [
    {
      "id": "uuid-v4",
      "score": 450,
      "difficulty": "HARD",
      "snakeLength": 48,
      "gameTime": 285000,
      "timestamp": 1736726400000
    }
    // ... up to 20 entries
  ]
}
```

---

### 2. Frontend Integration

#### Modify `game.js`

**Add new Leaderboard module** (after line 386, after UI module):
```javascript
const Leaderboard = {
    baseUrl: '/.netlify/functions',

    async submitScore(score, difficulty, snakeLength, gameTime) {
        // POST to submit-score
        // Handle errors gracefully (don't block UI)
        // Return { success, rank, error }
    },

    async fetchLeaderboard() {
        // GET from get-leaderboard
        // Handle loading states and errors
        // Return { success, scores, error }
    }
};
```

**Update gameState object** (line 37):
```javascript
leaderboard: {
    scores: [],
    loading: false,
    error: null
}
```

**Integration in game over flow** (around lines 527-537):
1. Call `Leaderboard.submitScore()` with current game data
2. Call `Leaderboard.fetchLeaderboard()` to get top 20
3. Display leaderboard in overlay (non-blocking, async)

**Update UI.showOverlay function**:
- When `isGameOver === true`, show leaderboard section
- Display loading spinner while fetching
- Show error message if fetch fails (but don't block game restart)
- Render top 20 scores as list items

---

#### Modify `index.html`

**Add leaderboard container** (after line 23, inside overlay):
```html
<p id="finalScore" class="hidden"></p>

<!-- NEW: Leaderboard Section -->
<div id="leaderboardSection" class="hidden">
    <h3>Global Top 20</h3>
    <div id="leaderboardLoading" class="loading-spinner hidden">Loading...</div>
    <div id="leaderboardError" class="error-message hidden"></div>
    <ol id="leaderboardList" class="leaderboard-list"></ol>
</div>
```

---

#### Modify `styles.css`

**Add leaderboard styles** (end of file, after line 248):
```css
#leaderboardSection {
    margin-top: 24px;
    max-width: 400px;
}

.leaderboard-list {
    list-style: none;
    padding: 0;
    max-height: 300px;
    overflow-y: auto;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 8px;
}

.leaderboard-entry {
    display: flex;
    justify-content: space-between;
    padding: 8px 12px;
    margin-bottom: 4px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 4px;
}

.leaderboard-entry .rank {
    font-weight: 700;
    color: #00ff41;
    min-width: 30px;
}

.leaderboard-entry .score {
    font-weight: 600;
    flex: 1;
    text-align: center;
}

.leaderboard-entry .difficulty-badge {
    font-size: 12px;
    padding: 4px 8px;
    border-radius: 4px;
    background: rgba(76, 204, 163, 0.3);
    color: #4ecca3;
}

.loading-spinner {
    color: rgba(255, 255, 255, 0.7);
    font-style: italic;
}

.error-message {
    color: #ff6b6b;
    font-size: 14px;
}
```

---

### 3. Anti-Cheat Validation (Server-Side)

Implement in `submit-score.js`:

1. **Score validation**:
   - Must be multiple of 10 (each food = 10 points)
   - Range: 0 to 10,000 (grid is 20×20 = 400 cells max)

2. **Timestamp validation**:
   - Must be within last 10 minutes (prevents replay attacks)

3. **Physics validation**:
   - Snake length must equal `(score / 10) + 3` (initial length)
   - Allow ±2 margin for edge cases

4. **Timing validation**:
   - Minimum game time: `(score / 10) × 500ms` (can't eat food instantly)

5. **Rate limiting**:
   - Track submissions by IP in memory
   - Max 5 per minute per IP
   - Clean up old entries periodically

Example validation:
```javascript
function validateScore(data) {
    const { score, gameData, timestamp } = data;

    if (score % 10 !== 0) return { valid: false, error: "Invalid score" };
    if (score < 0 || score > 10000) return { valid: false, error: "Invalid score" };

    const now = Date.now();
    if (Math.abs(now - timestamp) > 600000) {
        return { valid: false, error: "Timestamp expired" };
    }

    const expectedLength = (score / 10) + 3;
    if (Math.abs(gameData.snakeLength - expectedLength) > 2) {
        return { valid: false, error: "Invalid game data" };
    }

    const minGameTime = (score / 10) * 500;
    if (gameData.gameTime < minGameTime) {
        return { valid: false, error: "Invalid game time" };
    }

    return { valid: true };
}
```

---

### 4. Deployment Approach

#### Critical: Switch from Drag-and-Drop to Git-Based Deploy

**Why?** Netlify's drag-and-drop **does not run `npm install`**, so Netlify Functions with dependencies won't work.

**Recommended approach:**
1. Initialize Git repository in project directory
2. Create `.gitignore` to exclude `node_modules/`
3. Push to GitHub/GitLab/Bitbucket
4. Connect Netlify site to Git repository
5. Netlify will automatically install dependencies and deploy functions

**Steps:**
```bash
cd /home/graham/1g-of-code/snake
git init
echo "node_modules/" > .gitignore
git add .
git commit -m "Add global leaderboard"
# Push to GitHub
# Connect to Netlify via dashboard
```

**Benefits:**
- Automatic dependency installation
- Functions bundled correctly with esbuild
- Version control for rollbacks
- Automatic deploys on push
- Build logs for debugging

---

## Error Handling

### Frontend
- **Network errors**: Show leaderboard with "Unable to connect" message, don't block game restart
- **Slow responses**: Show loading spinner, timeout after 5 seconds
- **Invalid score rejected**: Log to console, don't show error to user (prevents revealing anti-cheat logic)

### Backend
- **Blob failures**: Retry up to 3 times with exponential backoff
- **Concurrent writes**: Implement optimistic locking with retry
- **Invalid data**: Return 400 error, log suspicious activity

---

## Critical Files

1. **`game.js`** (line 37, 386, 527-537) - Add leaderboard module, update gameState, integrate with game over
2. **`index.html`** (after line 23) - Add leaderboard container to overlay
3. **`styles.css`** (after line 248) - Add leaderboard styles
4. **`netlify/functions/submit-score.js`** (NEW) - Score submission with validation
5. **`netlify/functions/get-leaderboard.js`** (NEW) - Leaderboard retrieval
6. **`netlify.toml`** (NEW) - Netlify configuration
7. **`package.json`** (NEW) - Dependencies (`@netlify/blobs`)

---

## Verification Plan

### Local Testing (Netlify CLI)
```bash
npm install -g netlify-cli
netlify login
netlify dev  # Runs local server with functions
```

### Test Cases
1. Play game, achieve score, verify submission succeeds
2. Check leaderboard displays on game over screen
3. Verify scores persist across page refreshes
4. Test invalid score rejection (modify score client-side)
5. Test rate limiting (submit 6 times rapidly)
6. Test on mobile (responsive design, loading states)
7. Test offline behavior (error handling)

### Production Testing
1. Deploy to Netlify via Git
2. Monitor function logs in Netlify dashboard
3. Test from multiple devices/networks
4. Verify scores sync globally
5. Check free tier usage in Netlify analytics

---

## Free Tier Capacity

- **Requests**: 125k/month (supports ~62k games/month with 2 API calls per game)
- **Runtime**: 100 hours/month (need ~5 hours for 62k games at 0.15s per call)
- **Safety margin**: 50x under limits
- **Blob storage**: Minimal (~5-10 KB for 20 entries)

---

## Future Enhancements (Post-MVP)
- Difficulty-specific leaderboards (separate top 20 per difficulty)
- Daily/weekly leaderboards (multiple blob keys)
- Player names (optional, with profanity filter)
- Social sharing buttons
- Score history and trends
