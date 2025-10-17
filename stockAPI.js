const axios = require('axios');

class StockAPI {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseURL = 'https://www.alphavantage.co/query';
        
        // Popular stocks to trade
        this.popularStocks = [
            'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX',
            'BABA', 'V', 'JNJ', 'WMT', 'JPM', 'MA', 'PG', 'UNH', 'DIS', 'HD',
            'PYPL', 'BAC', 'ADBE', 'CRM', 'INTC', 'VZ', 'CMCSA', 'PFE', 'T',
            'ABT', 'KO', 'PEP', 'TMO', 'AVGO', 'ACN', 'LLY', 'MRK', 'COST',
            'DHR', 'TXN', 'NEE', 'QCOM', 'BMY', 'AMD', 'HON', 'PM', 'UNP',
            'IBM', 'AMGN', 'LOW', 'SBUX', 'MDT', 'GS', 'CAT', 'CVX', 'LIN'
        ];

        // Categorized stock lists
        this.stockCategories = {
            popular: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'V', 'JPM'],
            tech: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'NFLX', 'ADBE', 'CRM', 'INTC', 'AMD', 'QCOM', 'IBM'],
            finance: ['JPM', 'BAC', 'WFC', 'GS', 'MS', 'V', 'MA', 'AXP', 'C', 'USB', 'PNC', 'TFC'],
            energy: ['XOM', 'CVX', 'COP', 'EOG', 'SLB', 'MPC', 'VLO', 'PSX', 'KMI', 'OKE', 'WMB', 'EPD'],
            healthcare: ['JNJ', 'UNH', 'PFE', 'ABT', 'TMO', 'LLY', 'MRK', 'ABBV', 'BMY', 'AMGN', 'GILD', 'CVS'],
            consumer: ['WMT', 'PG', 'KO', 'PEP', 'COST', 'HD', 'LOW', 'SBUX', 'MCD', 'NKE', 'TGT', 'DIS'],
            industrial: ['CAT', 'HON', 'UNP', 'MMM', 'GE', 'BA', 'RTX', 'LMT', 'DE', 'EMR', 'ITW', 'PH'],
            alpha_am: ['AAPL', 'ABBV', 'ABT', 'ACN', 'ADBE', 'AMD', 'AMGN', 'AMZN', 'AXP', 'BA', 'BAC', 'BMY', 'C', 'CAT', 'CRM', 'CVS', 'CVX', 'DHR', 'DIS', 'EMR', 'EOG', 'GE', 'GILD', 'GOOGL', 'GS', 'HD', 'HON', 'IBM', 'INTC', 'ITW', 'JNJ', 'JPM', 'KMI', 'KO', 'LIN', 'LLY', 'LMT', 'LOW', 'MA', 'MCD', 'META', 'MMM', 'MPC', 'MRK', 'MS', 'MSFT'],
            alpha_nz: ['NEE', 'NFLX', 'NKE', 'NVDA', 'OKE', 'PEP', 'PFE', 'PG', 'PH', 'PNC', 'PSX', 'PYPL', 'QCOM', 'RTX', 'SBUX', 'SLB', 'T', 'TFC', 'TGT', 'TMO', 'TSLA', 'TXN', 'UNH', 'UNP', 'USB', 'V', 'VLO', 'VZ', 'WFC', 'WMB', 'WMT', 'XOM']
        };
    }

    async getStockPrice(symbol) {
        try {
            const response = await axios.get(this.baseURL, {
                params: {
                    function: 'GLOBAL_QUOTE',
                    symbol: symbol,
                    apikey: this.apiKey
                }
            });

            const quote = response.data['Global Quote'];
            if (!quote || !quote['05. price']) {
                throw new Error('Invalid response from API');
            }

            return {
                symbol: symbol,
                price: parseFloat(quote['05. price']),
                change: parseFloat(quote['09. change']),
                changePercent: parseFloat(quote['10. change percent'].replace('%', ''))
            };
        } catch (error) {
            console.error(`Error fetching price for ${symbol}:`, error.message);
            throw error;
        }
    }

    async getMultipleStockPrices(symbols) {
        const results = {};
        const promises = symbols.map(async (symbol) => {
            try {
                const data = await this.getStockPrice(symbol);
                results[symbol] = data;
                // Add delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 200));
            } catch (error) {
                console.error(`Failed to get price for ${symbol}`);
                results[symbol] = null;
            }
        });

        await Promise.all(promises);
        return results;
    }

    getPopularStocks() {
        return this.popularStocks;
    }

    async searchStock(query) {
        try {
            const response = await axios.get(this.baseURL, {
                params: {
                    function: 'SYMBOL_SEARCH',
                    keywords: query,
                    apikey: this.apiKey
                }
            });

            const matches = response.data['bestMatches'];
            if (!matches || matches.length === 0) {
                return [];
            }

            return matches.slice(0, 5).map(match => ({
                symbol: match['1. symbol'],
                name: match['2. name'],
                type: match['3. type'],
                region: match['4. region']
            }));
        } catch (error) {
            console.error('Error searching stocks:', error.message);
            return [];
        }
    }

    getStocksByCategory(category) {
        return this.stockCategories[category] || [];
    }

    getCategoryName(category) {
        const categoryNames = {
            popular: '🔥 Popular Stocks',
            tech: '📈 Tech Giants',
            finance: '🏦 Banking & Finance',
            energy: '⚡ Energy & Oil',
            healthcare: '🏥 Healthcare',
            consumer: '🛒 Consumer Goods',
            industrial: '🏭 Industrial',
            alpha_am: '🔤 Alphabetical A-M',
            alpha_nz: '🔤 Alphabetical N-Z'
        };
        return categoryNames[category] || 'Unknown Category';
    }
}

module.exports = StockAPI;