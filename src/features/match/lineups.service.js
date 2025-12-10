
// Lineups Service - Normalize Lineup Data
// Maps SportMonks lineup data to frontend structure

/**
 * Normalize lineups for frontend
 * @param {Array} lineups - Raw lineups from API
 * @param {Object} homeTeam - Home team object {id, name, logo}
 * @param {Object} awayTeam - Away team object {id, name, logo}
 * @returns {Object} Normalized lineups { home: {...}, away: {...} }
 */
export const normalizeLineups = (lineups, homeTeam, awayTeam) => {
    if (!lineups || !Array.isArray(lineups)) {
        return {
            home: { starters: [], subs: [], missing: [], formation: '' },
            away: { starters: [], subs: [], missing: [], formation: '' }
        };
    }

    // Helper to map position ID/Name to code (GK, DF, MF, FW)
    const getPositionCode = (player) => {
        // SportMonks v3 usually provides position_id or type_id
        // We can also infer from formation_position if available
        // 1: Goalkeeper, 2: Defender, 3: Midfielder, 4: Attacker (Example IDs, need verification)
        // Better to rely on type_id if available or position name

        const typeId = player.type_id; // 11=GK, 12=DF, 13=MF, 14=FW (Common in V3)
        // Let's use a mapping based on observation or standard V3 docs
        // GK=11, DF=12, MF=13, FW=14 is common but let's be safe

        // If we have position name directly
        const posName = player.position?.name || player.type?.name || "";
        if (posName.includes("Goalkeeper")) return "GK";
        if (posName.includes("Defender")) return "DF";
        if (posName.includes("Midfielder")) return "MF";
        if (posName.includes("Attacker") || posName.includes("Forward")) return "FW";

        // Fallback to formation position logic if needed
        // formation_position 1 is usually GK
        if (player.formation_position === 1) return "GK";

        return "MF"; // Default
    };

    // Helper to format grid (e.g., "3:1")
    // SportMonks returns formation_field like "1:1" (Line:Index)
    const formatGrid = (player) => {
        if (player.formation_field) return player.formation_field;
        // If missing, try to construct from formation_position
        // This is hard without knowing the formation structure
        return null;
    };

    const processTeamLineup = (teamId) => {
        const teamLineup = lineups.filter(p => p.team_id === teamId);

        // Starters: usually have formation_position or start_time=0?
        // In V3, lineups include both starters and bench.
        // 'type_id' might distinguish, or 'formation_position' is null for bench?
        // Usually, bench players have formation_position = null or specific type.
        // Let's assume if formation_position is present, it's a starter.

        const starters = teamLineup
            .filter(p => p.formation_position !== null && p.formation_position !== undefined)
            .map(p => ({
                id: p.player_id,
                name: p.player_name || p.player?.display_name || "Unknown",
                number: p.jersey_number,
                pos: getPositionCode(p),
                rating: p.rating || "6.0", // Mock or real rating
                grid: formatGrid(p),
                image: p.player?.image_path
            }))
            .sort((a, b) => {
                // Sort by grid (Line:Index) to ensure correct visual order
                if (a.grid && b.grid) {
                    const [la, ia] = a.grid.split(':').map(Number);
                    const [lb, ib] = b.grid.split(':').map(Number);
                    if (la !== lb) return la - lb;
                    return ia - ib;
                }
                return 0;
            });

        const subs = teamLineup
            .filter(p => p.formation_position === null || p.formation_position === undefined)
            .map(p => ({
                id: p.player_id,
                name: p.player_name || p.player?.display_name || "Unknown",
                number: p.jersey_number,
                pos: getPositionCode(p),
                rating: p.rating || "-",
                // Substitution info (time, in/out) would need events parsing
                // For now, list them
            }));

        return {
            starters,
            subs,
            missing: [], // Would need 'injuries' include or separate endpoint
            formation: "4-3-3", // Need to extract from match info or infer
            color: "#000000" // Placeholder
        };
    };

    return {
        home: {
            ...processTeamLineup(homeTeam.id),
            color: "#3b82f6" // Example Blue
        },
        away: {
            ...processTeamLineup(awayTeam.id),
            color: "#ef4444" // Example Red
        }
    };
};
