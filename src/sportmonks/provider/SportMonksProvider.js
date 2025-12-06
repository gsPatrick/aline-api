import axios from 'axios';

class SportMonksProvider {
    constructor() {
        this.baseUrl = process.env.MYSPORTMONKS_API_BASE;
        this.apiToken = process.env.MYSPORTMONKS_API_KEY;
    }

    /**
     * Método genérico para fazer GET na API
     * @param {string} endpoint - Ex: '/fixtures/between/...'
     * @param {object} params - Query params adicionais
     */
    async get(endpoint, params = {}) {
        try {
            // Mescla o token com os parâmetros recebidos
            const queryParams = {
                api_token: this.apiToken,
                ...params
            };

            const response = await axios.get(`${this.baseUrl}${endpoint}`, {
                params: queryParams
            });

            return response.data;
        } catch (error) {
            // Log de erro mais detalhado para debug
            if (error.response) {
                console.error(`Erro SportMonks [${endpoint}] Status: ${error.response.status}`, error.response.data);
            } else {
                console.error(`Erro SportMonks [${endpoint}]:`, error.message);
            }
            throw new Error('Falha ao comunicar com a SportMonks API');
        }
    }
}

export default new SportMonksProvider();