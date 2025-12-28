// Live Match Updates Service
// Polls for live matches and broadcasts updates via WebSocket
import { getIO } from './socket.js';

const LIVE_STATUSES = ['LIVE', 'HT', '1H', '2H', 'ET', 'PEN_LIVE', 'BREAK'];
const POLL_INTERVAL = 30000; // 30 seconds

let pollInterval = null;
let liveMatchIds = new Set();

// Check if a match is live
const isLiveStatus = (status) => LIVE_STATUSES.includes(status);

// Start polling for live match updates
export const startLiveMatchPolling = async (matchService) => {
    console.log('🔴 Starting live match polling service...');

    if (pollInterval) {
        clearInterval(pollInterval);
    }

    pollInterval = setInterval(async () => {
        try {
            await pollLiveMatches(matchService);
        } catch (error) {
            console.error('[LiveUpdates] Error polling:', error.message);
        }
    }, POLL_INTERVAL);

    // Initial poll
    await pollLiveMatches(matchService);
};

// Stop polling
export const stopLiveMatchPolling = () => {
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
        console.log('⏹️ Stopped live match polling');
    }
};

// Poll for updates on live matches
const pollLiveMatches = async (matchService) => {
    if (liveMatchIds.size === 0) {
        console.log('[LiveUpdates] No live matches to update');
        return;
    }

    console.log(`[LiveUpdates] Updating ${liveMatchIds.size} live match(es)`);

    const io = getIO();

    for (const matchId of liveMatchIds) {
        try {
            // Fetch fresh data (no cache)
            const matchData = await matchService.getMatchStats(matchId, { skipCache: true });

            if (matchData) {
                // Broadcast to all clients watching this match
                io.to(`match:${matchId}`).emit('match:update', {
                    matchId,
                    data: matchData,
                    timestamp: new Date().toISOString()
                });

                console.log(`[LiveUpdates] Broadcast update for match ${matchId}`);

                // Check if match is no longer live
                if (!isLiveStatus(matchData.matchInfo?.status)) {
                    liveMatchIds.delete(matchId);
                    console.log(`[LiveUpdates] Match ${matchId} finished, removed from live tracking`);
                }
            }
        } catch (error) {
            console.error(`[LiveUpdates] Error updating match ${matchId}:`, error.message);
        }
    }
};

// Add a match to live tracking
export const trackLiveMatch = (matchId) => {
    liveMatchIds.add(matchId);
    console.log(`[LiveUpdates] Now tracking match ${matchId} (total: ${liveMatchIds.size})`);
};

// Remove a match from tracking
export const untrackLiveMatch = (matchId) => {
    liveMatchIds.delete(matchId);
    console.log(`[LiveUpdates] Stopped tracking match ${matchId}`);
};

// Get currently tracked matches
export const getTrackedMatches = () => Array.from(liveMatchIds);

// Setup socket handlers for match rooms
export const setupMatchSocketHandlers = (io) => {
    io.on('connection', (socket) => {
        // Allow clients to join match-specific rooms (no auth required for goldstats)
        socket.on('match:subscribe', (matchId) => {
            socket.join(`match:${matchId}`);
            console.log(`[Socket] Client ${socket.id} subscribed to match:${matchId}`);

            // Track this match if it's live
            trackLiveMatch(matchId);
        });

        socket.on('match:unsubscribe', (matchId) => {
            socket.leave(`match:${matchId}`);
            console.log(`[Socket] Client ${socket.id} unsubscribed from match:${matchId}`);
        });
    });
};
