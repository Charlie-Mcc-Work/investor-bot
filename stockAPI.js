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

        // Collection of Japanese haikus for trading wisdom
        this.tradingHaikus = [
            "Market waves rise, fall\nPatience brings inner profit\nMoney flows like streams",
            "Cherry blossoms bloom\nStock prices dance with the wind\nWisdom in waiting",
            "Mountain stands so tall\nYour portfolio grows with time\nRocks do not worry",
            "Morning dew glistens\nInvestments need time to grow\nSunrise brings new hope",
            "River flows steadfast\nThrough valleys of gain and loss\nCurrent guides the way",
            "Bamboo bends, not breaks\nFlexible minds make profit\nStorm clouds always pass",
            "Silent pond reflects\nMarket's face in still water\nRipples show the truth",
            "Ancient oak tree stands\nRoots deep in soil of wisdom\nBranches reach for sky",
            "Snowflake lands softly\nEach trade unique, yet fragile\nMelts into the whole",
            "Spider weaves with care\nPortfolio threads intertwined\nPatience builds the web",
            "Moon phases cycle\nBull and bear markets return\nNature knows balance",
            "Crane stands on one leg\nFocus brings stability\nBalance conquers all",
            "Rain nourishes earth\nLosses water future gains\nSeasons teach us well",
            "Wind through bamboo groves\nWhispers secrets of the trade\nListen with your heart",
            "Turtle moves slowly\nSteady wins the longest race\nHaste brings only loss",
            "Lotus blooms in mud\nBeauty rises from darkness\nGrowth through adversity",
            "Eagle soars above\nBroad view sees opportunity\nHeights reward the brave",
            "Ocean tides retreat\nWhat goes out will come back in\nCycles teach us truth",
            "Morning mist lifts slow\nClarity comes to those who wait\nFog reveals the path",
            "Dragonfly skims pond\nLight touches on the surface\nQuick moves, gentle touch",
            "Pine needle falls down\nSmall actions compound over time\nForest grows from one",
            "Cricket sings at night\nMusic in the quiet hours\nPeace amidst the trade",
            "Starlight guides the way\nDistant goals shine in darkness\nNavigation true",
            "Morning glory blooms\nDaily opening to the sun\nGrowth requires light",
            "Pebble in still pond\nRipples spread to distant shores\nSmall trades, big effects",
            "Sunset paints the sky\nDay's trading comes to an end\nRest prepares for dawn",
            "Bee visits each flower\nDiversification brings sweet rewards\nNectar from many",
            "Waterfall cascades\nPower in the downward flow\nForce creates the pool",
            "Frost melts with first light\nTemporary setbacks fade\nWarmth returns to all",
            "Heron waits motionless\nPatience strikes at perfect time\nStillness breeds success",
            "Willow bends gracefully\nAdaptation saves the tree\nFlow with market winds",
            "Acorn holds great oak\nSmall investments grow to giants\nTime nurtures the seed",
            "Thunder follows lightning\nActions have consequences\nTiming matters most",
            "Dewdrop holds the world\nMicrocosm reflects the whole\nSmall contains the large",
            "Salmon swims upstream\nDetermination conquers current\nPersistence finds the way",
            "Sandcastle meets the tide\nImpermanence teaches letting go\nBuild again tomorrow",
            "Firefly blinks bright\nMoments of illumination\nLight shows in darkness",
            "Icicle grows slowly\nDrop by drop builds crystal spear\nPatience forms strength",
            "Butterfly emerges\nTransformation through patience\nBeauty after struggle",
            "Morning tea steams up\nWarmth and clarity combine\nSimple pleasures last"
        ];
    }

    async getStockPrice(symbol) {
        try {
            const response = await axios.get(this.baseURL, {
                params: {
                    function: 'GLOBAL_QUOTE',
                    symbol: symbol,
                    apikey: this.apiKey
                },
                timeout: 10000 // 10 second timeout
            });

            // Check for API rate limit message
            if (response.data.Information && response.data.Information.includes('rate limit')) {
                console.log(`API rate limit hit for ${symbol}, using demo data`);
                return this.getDemoPrice(symbol);
            }

            if (response.data.Note && response.data.Note.includes('API call frequency')) {
                console.log(`API frequency limit hit for ${symbol}, using demo data`);
                return this.getDemoPrice(symbol);
            }

            // Check for invalid API key
            if (response.data['Error Message']) {
                throw new Error(`API Error: ${response.data['Error Message']}`);
            }

            const quote = response.data['Global Quote'];
            if (!quote || !quote['05. price']) {
                // If no quote data, try demo price
                console.log(`No quote data for ${symbol}, using demo data`);
                return this.getDemoPrice(symbol);
            }

            return {
                symbol: symbol,
                price: parseFloat(quote['05. price']),
                change: parseFloat(quote['09. change']),
                changePercent: parseFloat(quote['10. change percent'].replace('%', ''))
            };
        } catch (error) {
            if (error.code === 'ECONNABORTED') {
                console.log(`Timeout for ${symbol}, using demo data`);
                return this.getDemoPrice(symbol);
            }
            console.error(`Error fetching price for ${symbol}, using demo data:`, error.message);
            return this.getDemoPrice(symbol);
        }
    }

    getDemoPrice(symbol) {
        // Demo prices for when API is rate limited
        const demoPrices = {
            // Tech stocks
            'AAPL': { base: 175.50, volatility: 0.02 },
            'MSFT': { base: 338.25, volatility: 0.015 },
            'GOOGL': { base: 125.80, volatility: 0.025 },
            'AMZN': { base: 128.40, volatility: 0.03 },
            'TSLA': { base: 242.15, volatility: 0.04 },
            'META': { base: 298.75, volatility: 0.035 },
            'NVDA': { base: 422.30, volatility: 0.045 },
            'NFLX': { base: 385.60, volatility: 0.03 },
            
            // Finance stocks
            'JPM': { base: 152.25, volatility: 0.02 },
            'BAC': { base: 34.80, volatility: 0.025 },
            'WFC': { base: 42.15, volatility: 0.03 },
            'GS': { base: 358.90, volatility: 0.025 },
            'MS': { base: 85.45, volatility: 0.03 },
            'V': { base: 258.75, volatility: 0.015 },
            'MA': { base: 398.20, volatility: 0.02 },
            'AXP': { base: 175.60, volatility: 0.025 },
            
            // Other popular stocks
            'JNJ': { base: 162.30, volatility: 0.015 },
            'WMT': { base: 158.90, volatility: 0.015 },
            'PG': { base: 155.75, volatility: 0.015 },
            'KO': { base: 62.85, volatility: 0.015 },
            'PEP': { base: 172.40, volatility: 0.015 },
            'DIS': { base: 94.25, volatility: 0.03 }
        };

        const stock = demoPrices[symbol];
        if (!stock) {
            // Generate a random price for unknown stocks
            const randomPrice = Math.random() * 200 + 50; // $50-$250 range
            const randomChange = (Math.random() - 0.5) * 10; // -5% to +5%
            return {
                symbol: symbol,
                price: randomPrice,
                change: randomPrice * (randomChange / 100),
                changePercent: randomChange
            };
        }

        // Add some randomness to the demo price
        const priceVariation = (Math.random() - 0.5) * 2 * stock.volatility;
        const actualPrice = stock.base * (1 + priceVariation);
        const changePercent = priceVariation * 100;
        const change = actualPrice * (changePercent / 100);

        return {
            symbol: symbol,
            price: actualPrice,
            change: change,
            changePercent: changePercent
        };
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

    getRandomHaiku() {
        const randomIndex = Math.floor(Math.random() * this.tradingHaikus.length);
        return this.tradingHaikus[randomIndex];
    }

    calculateTransactionFee(amount) {
        return amount * 0.0002; // 0.02% fee
    }
}

module.exports = StockAPI;