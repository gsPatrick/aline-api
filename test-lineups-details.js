/**
 * Script para testar lineups.details e events para estatísticas de jogadores
 */

import 'dotenv/config';
import axios from 'axios';
import fs from 'fs';

const API_TOKEN = process.env.SPORTMONKS_API_TOKEN;
const BASE_URL = 'https://api.sportmonks.com/v3/football';

// Fixture ID de teste (Arsenal vs Bournemouth)
const FIXTURE_ID = 19150776;

async function fetchDetails() {
    console.log('🔍 Testando includes para Player Stats...');
    console.log(`📊 Fixture ID: ${FIXTURE_ID}`);

    const url = `${BASE_URL}/fixtures/${FIXTURE_ID}?api_token=${API_TOKEN}&include=lineups.details;events`;

    console.log(`\n📍 URL: ${url.replace(API_TOKEN, 'TOKEN')}`);

    try {
        const { data } = await axios.get(url);

        let output = '';
        output += '='.repeat(80) + '\n';
        output += 'LINEUPS.DETAILS AND EVENTS RESPONSE\n';
        output += `Fixture ID: ${FIXTURE_ID}\n`;
        output += `Timestamp: ${new Date().toISOString()}\n`;
        output += '='.repeat(80) + '\n\n';

        const fixture = data.data;

        // Lineups com details
        output += '### LINEUPS WITH DETAILS:\n';
        if (fixture.lineups && fixture.lineups.length > 0) {
            output += `Total lineups: ${fixture.lineups.length}\n\n`;

            // Mostrar os primeiros 5 lineups com seus details
            fixture.lineups.slice(0, 8).forEach((l, idx) => {
                output += `Player ${idx + 1}: ID ${l.player_id}\n`;
                output += `  Team ID: ${l.team_id}\n`;
                output += `  Jersey: ${l.jersey_number}\n`;
                output += `  Position: ${l.position || l.formation_position}\n`;

                if (l.details && l.details.length > 0) {
                    output += `  DETAILS (${l.details.length} entries):\n`;
                    l.details.slice(0, 10).forEach(d => {
                        output += `    - type_id: ${d.type_id}, value: ${JSON.stringify(d.data)}\n`;
                    });
                } else {
                    output += '  DETAILS: None\n';
                }
                output += '\n';
            });
        }

        // Events
        output += '\n### EVENTS:\n';
        if (fixture.events && fixture.events.length > 0) {
            output += `Total events: ${fixture.events.length}\n\n`;

            // Agrupar por type_id
            const eventsByType = {};
            fixture.events.forEach(e => {
                if (!eventsByType[e.type_id]) {
                    eventsByType[e.type_id] = [];
                }
                eventsByType[e.type_id].push(e);
            });

            output += 'Events by type:\n';
            for (const [typeId, events] of Object.entries(eventsByType)) {
                output += `  [type_id: ${typeId}] Count: ${events.length}\n`;
                const sample = events[0];
                output += `    Sample: player_id: ${sample.player_id}, player_name: ${sample.player_name}\n`;
                output += `    Minute: ${sample.minute}, Info: ${sample.info || 'N/A'}\n`;
                output += `    Full event: ${JSON.stringify(sample, null, 2).split('\n').join('\n    ')}\n\n`;
            }
        } else {
            output += 'No events\n';
        }

        // Salvar
        fs.writeFileSync('lineups-details-response.txt', output);
        console.log(`\n✅ Arquivo salvo: lineups-details-response.txt`);

        // Info resumo
        console.log('\n📋 RESUMO:');
        console.log(`  Lineups: ${fixture.lineups?.length || 0}`);
        console.log(`  Lineups com details: ${fixture.lineups?.filter(l => l.details?.length > 0).length || 0}`);
        console.log(`  Events: ${fixture.events?.length || 0}`);

    } catch (error) {
        console.error('❌ Erro:', error.response?.status, error.response?.data?.message || error.message);
    }
}

fetchDetails();
