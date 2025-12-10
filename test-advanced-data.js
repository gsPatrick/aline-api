import axios from 'axios';
import fs from 'fs';

const API_TOKEN = 'Xql7ZNMOjdE1pxn7FOh4739UX07owQNA2dNDguw0K6p881Q8yhlInKkHgEgh';
const BASE_URL = 'https://api.sportmonks.com/v3/football';

async function runTest() {
    try {
        console.log("1. Buscando jogo recente da Premier League (ID 8)...");
        const today = new Date();
        const lastWeek = new Date(today);
        lastWeek.setDate(today.getDate() - 7);
        const startStr = lastWeek.toISOString().split('T')[0];
        const endStr = today.toISOString().split('T')[0];

        const fixturesUrl = `${BASE_URL}/fixtures/between/${startStr}/${endStr}?api_token=${API_TOKEN}&include=league;participants;state&filters=fixtureLeagues:8`;
        const fixturesResponse = await axios.get(fixturesUrl);

        let fixture = fixturesResponse.data.data.find(f => f.state.state === 'FT' || f.state.state === 'LIVE');

        if (!fixture) {
            console.log("Nenhum jogo recente da PL encontrado. Tentando qualquer liga...");
            const anyUrl = `${BASE_URL}/fixtures/between/${startStr}/${endStr}?api_token=${API_TOKEN}&include=league;participants;state`;
            const anyResp = await axios.get(anyUrl);
            fixture = anyResp.data.data.find(f => f.state.state === 'FT' || f.state.state === 'LIVE');
        }

        if (!fixture) {
            console.error("Nenhum jogo encontrado.");
            return;
        }

        console.log(`Jogo Selecionado: ${fixture.name} (ID: ${fixture.id})`);

        // 2. Testar Includes Avançados
        console.log("2. Buscando dados com includes: ballCoordinates, pressure, statistics...");
        // Note: ballCoordinates might be 'ball-coordinates' or 'ballCoordinates'. Docs say 'ballCoordinates'.
        // Pressure might be 'pressure' or 'pressure-stats'.
        const detailsUrl = `${BASE_URL}/fixtures/${fixture.id}?api_token=${API_TOKEN}&include=ballCoordinates;statistics;events`;

        const detailsResp = await axios.get(detailsUrl);
        const data = detailsResp.data.data;

        // 3. Verificar Ball Coordinates (Action Zones)
        console.log("\n--- BALL COORDINATES (ACTION ZONES) ---");
        if (data.ballCoordinates && data.ballCoordinates.length > 0) {
            console.log(`Encontrados ${data.ballCoordinates.length} registros de coordenadas da bola.`);
            console.log("Exemplo:", JSON.stringify(data.ballCoordinates[0], null, 2));
        } else {
            console.log("Nenhum dado de 'ballCoordinates' retornado.");
        }

        // 4. Verificar Pressure (Momentum)
        console.log("\n--- PRESSURE (MOMENTUM) ---");
        if (data.pressure && data.pressure.length > 0) {
            console.log(`Encontrados ${data.pressure.length} registros de pressão.`);
            console.log("Exemplo:", JSON.stringify(data.pressure[0], null, 2));
        } else {
            console.log("Nenhum dado de 'pressure' retornado.");
        }

        // 5. Verificar Statistics (Fallback)
        console.log("\n--- STATISTICS ---");
        if (data.statistics) {
            const statNames = [...new Set(data.statistics.map(s => s.type?.name))];
            console.log("Stats disponíveis:", statNames.join(', '));
        }

    } catch (error) {
        console.error("Erro:", error.message);
        if (error.response) console.error("Detalhes:", error.response.data);
    }
}

runTest();
