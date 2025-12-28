// Test OpenAI web search API
import 'dotenv/config';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function testWebSearch() {
    console.log('Testing OpenAI Web Search...');
    console.log('API Key exists:', !!OPENAI_API_KEY);

    // Test 1: Responses API with web_search
    console.log('\n=== Test 1: Responses API ===');
    try {
        const res = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                input: 'Quais são as últimas notícias do Borussia Dortmund?',
                tools: [{ type: 'web_search' }]
            })
        });

        console.log('Status:', res.status);
        const data = await res.json();
        console.log('Response:', JSON.stringify(data, null, 2).slice(0, 1000));
    } catch (e) {
        console.log('Error:', e.message);
    }

    // Test 2: Chat Completions with search model
    console.log('\n=== Test 2: gpt-4o-search-preview ===');
    try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o-search-preview',
                messages: [
                    { role: 'user', content: 'Quais são as últimas notícias do Borussia Dortmund?' }
                ],
                web_search_options: { search_context_size: 'medium' }
            })
        });

        console.log('Status:', res.status);
        const data = await res.json();
        console.log('Response:', JSON.stringify(data, null, 2).slice(0, 1000));
    } catch (e) {
        console.log('Error:', e.message);
    }

    // Test 3: Regular gpt-4o-mini (fallback)
    console.log('\n=== Test 3: gpt-4o-mini (regular) ===');
    try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'Você é um assistente de futebol.' },
                    { role: 'user', content: 'Quais foram os últimos resultados do Borussia Dortmund?' }
                ]
            })
        });

        console.log('Status:', res.status);
        const data = await res.json();
        console.log('Response:', JSON.stringify(data, null, 2).slice(0, 1000));
    } catch (e) {
        console.log('Error:', e.message);
    }
}

testWebSearch();
