import axios from 'axios';

const API_TOKEN = 'Xql7ZNMOjdE1pxn7FOh4739UX07owQNA2dNDguw0K6p881Q8yhlInKkHgEgh';
const BASE_URL = 'https://api.sportmonks.com/v3/football';

async function runStatDiscovery() {
    try {
        console.log("1. Buscando jogo Tier 1 (Premier League - ID 8) FINALIZADO recentíssimo...");

        // Buscar jogos dos últimos 7 dias
        const today = new Date();
        const lastWeek = new Date(today);
        lastWeek.setDate(today.getDate() - 7);

        const startStr = lastWeek.toISOString().split('T')[0];
        const endStr = today.toISOString().split('T')[0];

        // Premier League (8)
        const fixturesUrl = `${BASE_URL}/fixtures/between/${startStr}/${endStr}?api_token=${API_TOKEN}&include=league;participants;state&filters=fixtureLeagues:8`;
        const fixturesResponse = await axios.get(fixturesUrl);

        let fixture = fixturesResponse.data.data.find(f => f.state.state === 'FT');

        if (!fixture) {
            console.log("Nenhum jogo recente da Premier League encontrado. Tentando La Liga (ID 564)...");
            const laLigaUrl = `${BASE_URL}/fixtures/between/${startStr}/${endStr}?api_token=${API_TOKEN}&include=league;participants;state&filters=fixtureLeagues:564`;
            const laLigaResp = await axios.get(laLigaUrl);
            fixture = laLigaResp.data.data.find(f => f.state.state === 'FT');
        }

        if (!fixture) {
            console.error("Nenhum jogo encontrado para teste.");
            return;
        }

        console.log(`\n=== JOGO SELECIONADO ===`);
        console.log(`${fixture.name} (ID: ${fixture.id})`);
        console.log(`Liga: ${fixture.league.name}`);
        console.log(`Data: ${fixture.starting_at}`);

        // 2. Request Stat Discovery
        console.log("\n2. Executando Request Stat Discovery...");
        // include=statistics.type;statistics.details (details might not exist but let's try standard includes)
        const detailsUrl = `${BASE_URL}/fixtures/${fixture.id}?api_token=${API_TOKEN}&include=statistics.type`;
        const detailsResp = await axios.get(detailsUrl);
        const data = detailsResp.data.data;

        // 3. Varredura Completa
        console.log("\n=== VARREDURA DE ESTATÍSTICAS (DUMP) ===");
        const stats = data.statistics || [];

        if (stats.length === 0) {
            console.log("Nenhuma estatística retornada.");
            return;
        }

        // Agrupar e Listar
        const uniqueStats = {};
        stats.forEach(s => {
            const typeId = s.type_id;
            const name = s.type?.name || "Unknown";
            const devName = s.type?.developer_name || "Unknown";
            const val = s.data?.value ?? s.value;

            // Chave única por nome para não repetir home/away
            if (!uniqueStats[name]) {
                uniqueStats[name] = {
                    id: typeId,
                    name: name,
                    devName: devName,
                    exampleValue: val
                };
            }
        });

        // Imprimir Lista
        Object.values(uniqueStats).sort((a, b) => a.name.localeCompare(b.name)).forEach(s => {
            console.log(`ID: ${s.id} | Name: ${s.name} | DeveloperName: ${s.devName} | Value: ${s.exampleValue}`);
        });

        // 4. Busca por Keywords
        console.log("\n=== BUSCA POR KEYWORDS (Zone, Third, Attack, Action, Possession) ===");
        const keywords = ['zone', 'third', 'attack', 'action', 'possession', 'heat'];
        const found = Object.values(uniqueStats).filter(s => {
            const n = s.name.toLowerCase();
            const d = s.devName.toLowerCase();
            return keywords.some(k => n.includes(k) || d.includes(k));
        });

        if (found.length > 0) {
            console.log("Estatísticas Relevantes Encontradas:");
            found.forEach(s => {
                console.log(`>>> ID: ${s.id} | Name: ${s.name} | DeveloperName: ${s.devName}`);
            });
        } else {
            console.log("Nenhuma estatística com as keywords encontrada.");
        }

    } catch (error) {
        console.error("Erro no teste:", error.message);
        if (error.response) console.error("Response Data:", error.response.data);
    }
}

runStatDiscovery();
