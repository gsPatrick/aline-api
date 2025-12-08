import { getMatchStats } from './src/features/match/match.service.js';
import { getTeamData } from './src/features/team/team.service.js';
import { sequelize } from './src/models/index.js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const API_TOKEN = process.env.SPORTMONKS_API_TOKEN || "Xql7ZNMOjdE1pxn7FOh4739UX07owQNA2dNDguw0K6p881Q8yhlInKkHgEgh";
const MATCH_ID = 19427586; // Arsenal vs Brentford - working match with full data

const run = async () => {
    try {
        await sequelize.sync();

        console.log(`\n🔍 Generating Frontend Contract JSON...\n`);
        console.log(`Match ID: ${MATCH_ID}`);
        console.log(`Fetching complete match analysis...\n`);

        // Import the functions we need
        const { fetchExternalMatchData, calculateMatchStats } = await import('./src/features/match/match.service.js');

        // Fetch match data directly from API
        const matchData = await fetchExternalMatchData(MATCH_ID, API_TOKEN);

        // Calculate stats (this is what the controller returns)
        const matchStats = calculateMatchStats(matchData);

        console.log("✅ Match stats fetched successfully");
        console.log(`   Home: ${matchStats.homeTeam?.name}`);
        console.log(`   Away: ${matchStats.awayTeam?.name}`);

        // Also fetch team data for one of the teams to show squad structure
        const homeTeamId = matchStats.homeTeam?.id;
        let teamData = null;

        if (homeTeamId) {
            console.log(`\nFetching team data for ${matchStats.homeTeam?.name}...`);
            teamData = await getTeamData(homeTeamId, API_TOKEN);
            console.log(`✅ Team data fetched`);
            console.log(`   Squad: ${teamData.squad?.players?.length || 0} players`);
        }

        // Create the contract object
        const contract = {
            _meta: {
                description: "Frontend Contract - Complete API Response Structure",
                generated: new Date().toISOString(),
                endpoints: {
                    matchAnalysis: "GET /api/matches/:id/analysis",
                    teamData: "GET /api/teams/:id"
                },
                notes: [
                    "This JSON represents the EXACT structure returned by the API",
                    "Use this as reference when building React components",
                    "All field types and nesting levels are preserved",
                    "cornerAnalysis.races and intervals may be null if no commentary data available"
                ]
            },
            matchAnalysis: matchStats,
            teamData: teamData
        };

        // Save to file
        const outputPath = './frontend-contract.json';
        fs.writeFileSync(outputPath, JSON.stringify(contract, null, 2));

        console.log(`\n${'='.repeat(60)}`);
        console.log(`✅ Frontend Contract Generated!`);
        console.log(`${'='.repeat(60)}`);
        console.log(`\nFile: ${outputPath}`);
        console.log(`Size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);

        // Print structure summary
        console.log(`\n📋 Structure Summary:`);
        console.log(`\nMatch Analysis:`);
        console.log(`   - homeTeam: { id, name, logo }`);
        console.log(`   - awayTeam: { id, name, logo }`);
        console.log(`   - matchInfo: { date, league, venue, referee, state }`);
        console.log(`   - liveScore: { home, away, status }`);
        console.log(`   - goalAnalysis: { home: {...}, away: {...} }`);
        console.log(`   - cornerAnalysis: { home: { races, intervals, ... }, away: {...} }`);
        console.log(`   - cardsAnalysis: { home: {...}, away: {...} }`);
        console.log(`   - chartsAnalysis: { timeline, xG, possession, ... }`);
        console.log(`   - h2h: { matches: [...] }`);
        console.log(`   - form: { home: [...], away: [...] }`);

        console.log(`\nTeam Data:`);
        console.log(`   - id, name, logo`);
        console.log(`   - squad: { hasData, players: [{ id, name, rating, goals, ... }] }`);
        console.log(`   - activeSeasons: [...]`);
        console.log(`   - matchHistory: [...]`);
        console.log(`   - upcomingMatches: [...]`);

        console.log(`\n💡 Next Steps:`);
        console.log(`   1. Open frontend-contract.json`);
        console.log(`   2. Use it as reference for React component props`);
        console.log(`   3. Build UI components matching the data structure`);

    } catch (error) {
        console.error("\n❌ Error generating contract:", error.message);
        console.error(error.stack);
    } finally {
        await sequelize.close();
    }
};

run();
