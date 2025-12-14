/**
 * Script para capturar o response do player-stats e salvar em arquivo
 * 
 * Execute com: node debug-player-stats.js
 */

import 'dotenv/config';
import axios from 'axios';
import fs from 'fs';

const API_TOKEN = process.env.SPORTMONKS_API_TOKEN;
const BASE_URL = 'https://api.sportmonks.com/v3/football';

// Team para testar (Santos = 19, o usuario estava testando este)
const TEAM_ID = 19;

async function fetchAndSave() {
    console.log('🔍 Buscando dados de player stats...');
    console.log(`📊 Team ID: ${TEAM_ID}`);

    // Usar datas fixas de 2024 para garantir que pegamos partidas passadas
    // (A data do sistema local pode estar errada)
    const startStr = '2024-06-01';
    const endStr = '2024-12-14';

    console.log(`📅 Date range: ${startStr} to ${endStr}`);

    const url = `${BASE_URL}/fixtures/between/${startStr}/${endStr}/${TEAM_ID}?api_token=${API_TOKEN}&include=lineups.player;statistics;participants;scores&per_page=5`;

    console.log(`\n📍 URL: ${url.replace(API_TOKEN, 'TOKEN')}`);

    try {
        const { data } = await axios.get(url);

        let output = '';
        output += '='.repeat(80) + '\n';
        output += 'PLAYER STATS API RESPONSE MAPPING\n';
        output += `Team ID: ${TEAM_ID}\n`;
        output += `Date Range: ${startStr} to ${endStr}\n`;
        output += `Timestamp: ${new Date().toISOString()}\n`;
        output += '='.repeat(80) + '\n\n';

        // Rate limit info
        if (data.rate_limit) {
            output += 'RATE LIMIT:\n';
            output += JSON.stringify(data.rate_limit, null, 2) + '\n\n';
        }

        const fixtures = data.data || [];
        output += `Total fixtures: ${fixtures.length}\n\n`;

        for (let i = 0; i < Math.min(fixtures.length, 3); i++) {
            const fixture = fixtures[i];
            output += '-'.repeat(80) + '\n';
            output += `FIXTURE ${i + 1}: ID ${fixture.id}\n`;
            output += `Date: ${fixture.starting_at}\n`;
            output += '-'.repeat(80) + '\n\n';

            // Participants
            output += '### PARTICIPANTS:\n';
            if (fixture.participants) {
                fixture.participants.forEach(p => {
                    output += `  - ${p.name} (ID: ${p.id}, Location: ${p.meta?.location})\n`;
                });
            }
            output += '\n';

            // Scores
            output += '### SCORES:\n';
            if (fixture.scores) {
                output += JSON.stringify(fixture.scores, null, 2) + '\n';
            }
            output += '\n';

            // Lineups
            output += '### LINEUPS:\n';
            if (fixture.lineups && fixture.lineups.length > 0) {
                output += `Total lineups: ${fixture.lineups.length}\n\n`;

                // Agrupar por time
                const lineupsByTeam = {};
                fixture.lineups.forEach(l => {
                    if (!lineupsByTeam[l.team_id]) {
                        lineupsByTeam[l.team_id] = [];
                    }
                    lineupsByTeam[l.team_id].push(l);
                });

                for (const [teamId, lineups] of Object.entries(lineupsByTeam)) {
                    output += `  TEAM ${teamId} (${lineups.length} players):\n`;
                    lineups.slice(0, 5).forEach(l => {
                        output += `    - Player ID: ${l.player_id}\n`;
                        output += `      Name: ${l.player?.common_name || l.player?.display_name || 'N/A'}\n`;
                        output += `      Position: ${l.position}\n`;
                        output += `      Jersey: ${l.jersey_number}\n`;
                        output += `      Formation Position: ${l.formation_position}\n`;
                        if (l.player) {
                            output += `      Player Object Keys: ${Object.keys(l.player).join(', ')}\n`;
                        }
                        output += '\n';
                    });
                }
            } else {
                output += 'No lineups data\n';
            }
            output += '\n';

            // Statistics
            output += '### STATISTICS:\n';
            if (fixture.statistics && fixture.statistics.length > 0) {
                output += `Total statistics entries: ${fixture.statistics.length}\n\n`;

                // Agrupar por type_id
                const statsByType = {};
                fixture.statistics.forEach(s => {
                    if (!statsByType[s.type_id]) {
                        statsByType[s.type_id] = [];
                    }
                    statsByType[s.type_id].push(s);
                });

                output += 'Unique type_ids found:\n';
                for (const [typeId, stats] of Object.entries(statsByType)) {
                    const sample = stats[0];
                    output += `  [${typeId}] Count: ${stats.length}\n`;
                    output += `    Sample: ${JSON.stringify(sample, null, 2).split('\n').join('\n    ')}\n`;
                }

                // Mostrar algumas estatísticas com player_id
                output += '\nStatistics with player_id:\n';
                const playerStats = fixture.statistics.filter(s => s.player_id);
                playerStats.slice(0, 10).forEach(s => {
                    output += `  type_id: ${s.type_id}, player_id: ${s.player_id}, data: ${JSON.stringify(s.data)}\n`;
                });

            } else {
                output += 'No statistics data\n';
            }
            output += '\n\n';
        }

        // Salvar arquivo
        const filename = 'player-stats-response.txt';
        fs.writeFileSync(filename, output);
        console.log(`\n✅ Arquivo salvo: ${filename}`);
        console.log(`📊 Total fixtures: ${fixtures.length}`);

        // Print resumo no console
        console.log('\n📋 RESUMO DOS TYPE_IDS ENCONTRADOS:');
        const allTypeIds = new Set();
        fixtures.forEach(f => {
            (f.statistics || []).forEach(s => allTypeIds.add(s.type_id));
        });
        console.log([...allTypeIds].sort((a, b) => a - b).join(', '));

    } catch (error) {
        console.error('❌ Erro:', error.response?.status, error.response?.data?.message || error.message);

        if (error.response?.data) {
            fs.writeFileSync('player-stats-error.txt', JSON.stringify(error.response.data, null, 2));
            console.log('📝 Erro salvo em player-stats-error.txt');
        }
    }
}

fetchAndSave();
