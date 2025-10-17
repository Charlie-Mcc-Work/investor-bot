const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Database = require('./database.js');
const StockAPI = require('./stockAPI.js');
const config = require('./config.json');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

const db = new Database();
const stockAPI = new StockAPI(config.alpha_vantage_api_key);

client.once('ready', async () => {
    console.log(`${client.user.tag} is ready for stock trading!`);
    console.log(`Bot is in ${client.guilds.cache.size} guilds`);
    console.log('Note: Using Alpha Vantage API with demo fallback for rate limits');
    
    // Register slash commands
    const commands = [
        new SlashCommandBuilder()
            .setName('buy')
            .setDescription('Buy shares of a stock')
            .addStringOption(option =>
                option.setName('symbol')
                    .setDescription('Stock symbol (e.g., AAPL)')
                    .setRequired(true)
            )
            .addNumberOption(option =>
                option.setName('quantity')
                    .setDescription('Number of shares to buy')
                    .setRequired(true)
                    .setMinValue(0.01)
            ),
        new SlashCommandBuilder()
            .setName('sell')
            .setDescription('Sell shares of a stock you own')
            .addStringOption(option =>
                option.setName('symbol')
                    .setDescription('Stock symbol (e.g., AAPL)')
                    .setRequired(true)
            )
            .addNumberOption(option =>
                option.setName('quantity')
                    .setDescription('Number of shares to sell')
                    .setRequired(true)
                    .setMinValue(0.01)
            ),
        new SlashCommandBuilder()
            .setName('price')
            .setDescription('Get current stock price')
            .addStringOption(option =>
                option.setName('symbol')
                    .setDescription('Stock symbol (e.g., AAPL)')
                    .setRequired(true)
            ),
        new SlashCommandBuilder()
            .setName('portfolio')
            .setDescription('View your stock portfolio'),
        new SlashCommandBuilder()
            .setName('balance')
            .setDescription('Check your cash balance and total portfolio value'),
        new SlashCommandBuilder()
            .setName('leaderboard')
            .setDescription('Show all players ranked by total portfolio value'),
        new SlashCommandBuilder()
            .setName('browse')
            .setDescription('Browse stocks by category')
            .addStringOption(option =>
                option.setName('category')
                    .setDescription('Browse stocks by category')
                    .setRequired(true)
                    .addChoices(
                        { name: '🔥 Popular Stocks', value: 'popular' },
                        { name: '📈 Tech Giants', value: 'tech' },
                        { name: '🏦 Banking & Finance', value: 'finance' },
                        { name: '⚡ Energy & Oil', value: 'energy' },
                        { name: '🏥 Healthcare', value: 'healthcare' },
                        { name: '🛒 Consumer Goods', value: 'consumer' },
                        { name: '🏭 Industrial', value: 'industrial' },
                        { name: '🔤 Alphabetical A-M', value: 'alpha_am' },
                        { name: '🔤 Alphabetical N-Z', value: 'alpha_nz' }
                    )
            )
    ];

    try {
        console.log('Refreshing application (/) commands...');
        console.log('Clearing existing global commands...');
        await client.application.commands.set([]);
        
        // Clear guild-specific commands to avoid duplicates
        console.log('Clearing guild-specific commands...');
        for (const guild of client.guilds.cache.values()) {
            try {
                await guild.commands.set([]);
                console.log(`Cleared commands from guild: ${guild.name}`);
            } catch (guildError) {
                console.error(`Failed to clear commands from guild ${guild.name}:`, guildError.message);
            }
        }
        
        console.log('Registering new global commands...');
        await client.application.commands.set(commands);
        console.log(`Successfully registered ${commands.length} commands globally.`);
        console.log('Command registration complete!');
    } catch (error) {
        console.error('Error refreshing commands:', error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, user } = interaction;
    const userId = user.id;
    const username = user.username;

    try {
        await db.ensureUser(userId, username);

        switch (commandName) {
            case 'buy':
                await handleBuy(interaction, userId);
                break;
            case 'sell':
                await handleSell(interaction, userId);
                break;
            case 'price':
                await handlePrice(interaction);
                break;
            case 'portfolio':
                await handlePortfolio(interaction, userId);
                break;
            case 'balance':
                await handleBalance(interaction, userId);
                break;
            case 'leaderboard':
                await handleLeaderboard(interaction);
                break;
            case 'browse':
                await handleBrowse(interaction);
                break;
        }
    } catch (error) {
        console.error('Error handling command:', error);
        await interaction.reply({ content: 'An error occurred while processing your command. Please try again later.', ephemeral: true });
    }
});

async function getStockPrice(symbol) {
    // Check cache first
    const cached = await db.getCachedStockPrice(symbol);
    if (cached) {
        return cached;
    }

    try {
        const stockData = await stockAPI.getStockPrice(symbol);
        await db.cacheStockPrice(symbol, stockData.price, stockData.changePercent);
        return stockData;
    } catch (error) {
        // If API fails, the stockAPI will return demo data, so we shouldn't throw here
        console.error(`API error for ${symbol}, but demo data should be provided`);
        throw new Error(`Could not fetch price for ${symbol}. Please check the symbol and try again.`);
    }
}

async function handleBuy(interaction, userId) {
    const symbol = interaction.options.getString('symbol').toUpperCase();
    const quantity = interaction.options.getNumber('quantity');

    await interaction.deferReply();

    try {
        const stockData = await getStockPrice(symbol);
        const stockCost = stockData.price * quantity;
        const transactionFee = stockAPI.calculateTransactionFee(stockCost);
        const totalCost = stockCost + transactionFee;
        
        const user = await db.getUser(userId);
        if (user.cash < totalCost) {
            await interaction.editReply(`Insufficient funds! You need $${totalCost.toFixed(2)} (including $${transactionFee.toFixed(2)} fee) but only have $${user.cash.toFixed(2)}.`);
            return;
        }

        // Update cash
        await db.updateUserCash(userId, user.cash - totalCost);

        // Update holdings
        const existingHolding = await db.getHolding(userId, symbol, false);
        let newQuantity, newAvgPrice;
        
        if (existingHolding) {
            const totalShares = existingHolding.quantity + quantity;
            const totalValue = (existingHolding.quantity * existingHolding.avg_price) + stockCost;
            newQuantity = totalShares;
            newAvgPrice = totalValue / totalShares;
        } else {
            newQuantity = quantity;
            newAvgPrice = stockData.price;
        }

        await db.updateHolding(userId, symbol, newQuantity, newAvgPrice, false);
        await db.addTransaction(userId, symbol, 'buy', quantity, stockData.price, totalCost);

        // Get random haiku
        const haiku = stockAPI.getRandomHaiku();

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Buy Order Executed')
            .addFields(
                { name: 'Stock', value: symbol, inline: true },
                { name: 'Quantity', value: quantity.toString(), inline: true },
                { name: 'Price', value: `$${stockData.price.toFixed(2)}`, inline: true },
                { name: 'Stock Cost', value: `$${stockCost.toFixed(2)}`, inline: true },
                { name: 'Transaction Fee (0.02%)', value: `$${transactionFee.toFixed(2)}`, inline: true },
                { name: 'Total Cost', value: `$${totalCost.toFixed(2)}`, inline: true },
                { name: 'Remaining Cash', value: `$${(user.cash - totalCost).toFixed(2)}`, inline: false },
                { name: '🌸 Trading Wisdom', value: `*${haiku}*`, inline: false }
            );

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        await interaction.editReply(`Error: ${error.message}`);
    }
}

async function handleSell(interaction, userId) {
    const symbol = interaction.options.getString('symbol').toUpperCase();
    const quantity = interaction.options.getNumber('quantity');

    await interaction.deferReply();

    try {
        const holding = await db.getHolding(userId, symbol, false);
        if (!holding || holding.quantity < quantity) {
            await interaction.editReply(`You don't own enough shares of ${symbol}. You have ${holding ? holding.quantity : 0} shares.`);
            return;
        }

        const stockData = await getStockPrice(symbol);
        const stockRevenue = stockData.price * quantity;
        const transactionFee = stockAPI.calculateTransactionFee(stockRevenue);
        const totalRevenue = stockRevenue - transactionFee;
        
        const user = await db.getUser(userId);
        await db.updateUserCash(userId, user.cash + totalRevenue);

        // Update holdings
        const newQuantity = holding.quantity - quantity;
        await db.updateHolding(userId, symbol, newQuantity, holding.avg_price, false);
        await db.addTransaction(userId, symbol, 'sell', quantity, stockData.price, totalRevenue);

        const profit = (stockData.price - holding.avg_price) * quantity - transactionFee;
        const profitColor = profit >= 0 ? '#00ff00' : '#ff0000';
        const profitEmoji = profit >= 0 ? '📈' : '📉';

        // Get random haiku
        const haiku = stockAPI.getRandomHaiku();

        const embed = new EmbedBuilder()
            .setColor(profitColor)
            .setTitle('✅ Sell Order Executed')
            .addFields(
                { name: 'Stock', value: symbol, inline: true },
                { name: 'Quantity', value: quantity.toString(), inline: true },
                { name: 'Price', value: `$${stockData.price.toFixed(2)}`, inline: true },
                { name: 'Stock Revenue', value: `$${stockRevenue.toFixed(2)}`, inline: true },
                { name: 'Transaction Fee (0.02%)', value: `$${transactionFee.toFixed(2)}`, inline: true },
                { name: 'Net Revenue', value: `$${totalRevenue.toFixed(2)}`, inline: true },
                { name: `${profitEmoji} Net Profit/Loss`, value: `$${profit.toFixed(2)}`, inline: true },
                { name: 'New Cash Balance', value: `$${(user.cash + totalRevenue).toFixed(2)}`, inline: true },
                { name: '🌸 Trading Wisdom', value: `*${haiku}*`, inline: false }
            );

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        await interaction.editReply(`Error: ${error.message}`);
    }
}

async function handlePrice(interaction) {
    const symbol = interaction.options.getString('symbol').toUpperCase();
    await interaction.deferReply();

    try {
        // Check if we're using cached data first
        const cached = await db.getCachedStockPrice(symbol);
        let stockData, isDemo = false;
        
        if (cached) {
            stockData = cached;
        } else {
            // Try to get live data, but it might return demo data due to rate limits
            stockData = await stockAPI.getStockPrice(symbol);
            // Cache the result
            await db.cacheStockPrice(symbol, stockData.price, stockData.changePercent);
        }

        const changeColor = stockData.changePercent >= 0 ? '#00ff00' : '#ff0000';
        const changeEmoji = stockData.changePercent >= 0 ? '📈' : '📉';

        const embed = new EmbedBuilder()
            .setColor(changeColor)
            .setTitle(`📊 ${symbol} Stock Price`)
            .addFields(
                { name: 'Current Price', value: `$${stockData.price.toFixed(2)}`, inline: true },
                { name: `${changeEmoji} Daily Change`, value: `${stockData.changePercent >= 0 ? '+' : ''}${stockData.changePercent.toFixed(2)}%`, inline: true }
            )
            .setFooter({ 
                text: cached ? 
                    'Transaction fee: 0.02% on all trades • Showing cached data' : 
                    'Transaction fee: 0.02% on all trades • Live/Demo data'
            })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        await interaction.editReply(`Error: ${error.message}`);
    }
}

async function handlePortfolio(interaction, userId) {
    await interaction.deferReply();

    try {
        const holdings = await db.getUserHoldings(userId);
        
        if (holdings.length === 0) {
            await interaction.editReply('Your portfolio is empty! Use `/buy` to purchase some stocks.');
            return;
        }

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('📁 Your Portfolio');

        let totalValue = 0;
        let portfolioText = '';

        for (const holding of holdings) {
            try {
                const stockData = await getStockPrice(holding.symbol);
                const currentValue = holding.quantity * stockData.price;
                const profit = holding.quantity * (stockData.price - holding.avg_price);
                const profitEmoji = profit >= 0 ? '📈' : '📉';

                portfolioText += `**${holding.symbol}**: ${holding.quantity} shares @ $${holding.avg_price.toFixed(2)}\n`;
                portfolioText += `Current: $${stockData.price.toFixed(2)} | Value: $${currentValue.toFixed(2)} | P/L: ${profitEmoji} $${profit.toFixed(2)}\n\n`;

                totalValue += currentValue;
            } catch (error) {
                console.error(`Error getting price for ${holding.symbol}:`, error);
                portfolioText += `**${holding.symbol}**: ${holding.quantity} shares @ $${holding.avg_price.toFixed(2)}\n`;
                portfolioText += `Current: Price unavailable\n\n`;
            }
        }

        if (portfolioText) {
            embed.addFields({ name: '📈 Your Holdings', value: portfolioText, inline: false });
        }

        embed.addFields({ name: 'Total Portfolio Value', value: `$${totalValue.toFixed(2)}`, inline: true });
        embed.setFooter({ text: 'Note: Portfolio value excludes transaction fees already paid' });

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        await interaction.editReply(`Error: ${error.message}`);
    }
}

async function handleBalance(interaction, userId) {
    await interaction.deferReply();

    try {
        const user = await db.getUser(userId);
        const holdings = await db.getUserHoldings(userId);
        
        let portfolioValue = 0;
        for (const holding of holdings) {
            try {
                const stockData = await getStockPrice(holding.symbol);
                portfolioValue += holding.quantity * stockData.price;
            } catch (error) {
                console.error(`Error getting price for ${holding.symbol}:`, error);
            }
        }

        const totalValue = user.cash + portfolioValue;

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('💰 Your Balance')
            .addFields(
                { name: 'Cash', value: `$${user.cash.toFixed(2)}`, inline: true },
                { name: 'Portfolio Value', value: `$${portfolioValue.toFixed(2)}`, inline: true },
                { name: 'Total Value', value: `$${totalValue.toFixed(2)}`, inline: true }
            )
            .setFooter({ text: 'Remember: 0.02% transaction fee applies to all trades' });

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        await interaction.editReply(`Error: ${error.message}`);
    }
}

async function handleLeaderboard(interaction) {
    await interaction.deferReply();

    try {
        const rankings = await db.getAllUsersWithPortfolioValue();
        
        if (rankings.length === 0) {
            await interaction.editReply('No players found!');
            return;
        }

        const embed = new EmbedBuilder()
            .setColor('#ffd700')
            .setTitle('🏆 Trading Leaderboard')
            .setDescription('Players ranked by total portfolio value');

        let description = '';
        rankings.slice(0, 10).forEach((user, index) => {
            const totalValue = user.cash_value + (user.long_value || 0) + (user.short_value || 0);
            let emoji = `${index + 1}.`;
            
            if (index === 0) emoji = '🥇';
            else if (index === 1) emoji = '🥈';
            else if (index === 2) emoji = '🥉';

            description += `${emoji} **${user.username}**: $${totalValue.toFixed(2)}\n`;
        });

        embed.setDescription(description);
        embed.setFooter({ text: 'Values shown are net worth after all transaction fees' });
        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        await interaction.editReply(`Error: ${error.message}`);
    }
}

async function handleBrowse(interaction) {
    const category = interaction.options.getString('category');
    
    await interaction.deferReply();

    try {
        const stocks = stockAPI.getStocksByCategory(category);
        const categoryName = stockAPI.getCategoryName(category);
        
        if (stocks.length === 0) {
            await interaction.editReply(`No stocks found for category: ${categoryName}`);
            return;
        }

        const embed = new EmbedBuilder()
            .setColor('#9b59b6')
            .setTitle(`📊 ${categoryName}`)
            .setDescription('Browse stocks with live prices:');

        let stockText = '';
        let successCount = 0;
        const maxStocks = 8; // Reduced to avoid rate limits
        const targetStocks = stocks.slice(0, maxStocks);

        // First, try to get prices from cache
        for (const symbol of targetStocks) {
            try {
                // Check cache first (more lenient timeout for browse)
                const cached = await db.getCachedStockPrice(symbol);
                if (cached && new Date() - new Date(cached.last_updated) < 300000) { // 5 minutes
                    const changeEmoji = cached.change_percent >= 0 ? '📈' : '📉';
                    const changeColor = cached.change_percent >= 0 ? '+' : '';
                    stockText += `${changeEmoji} **${symbol}**: $${cached.price.toFixed(2)} (${changeColor}${cached.change_percent.toFixed(2)}%)\n`;
                    successCount++;
                }
            } catch (error) {
                console.error(`Error checking cache for ${symbol}:`, error);
            }
        }

        // If we have some cached results, show them first
        if (successCount > 0) {
            embed.setDescription(stockText);
            embed.setFooter({ 
                text: `Showing ${successCount}/${targetStocks.length} stocks • Use /price <symbol> for live data • 0.02% fee applies`
            });
            await interaction.editReply({ embeds: [embed] });
            return;
        }

        // If no cache hits, fetch a few live prices with proper delays
        stockText = '🔄 *Fetching live prices...*\n\n';
        let fetchedCount = 0;
        const maxLiveFetches = 5; // Limit live API calls

        for (const symbol of targetStocks.slice(0, maxLiveFetches)) {
            try {
                const stockData = await getStockPrice(symbol);
                const changeEmoji = stockData.changePercent >= 0 ? '📈' : '📉';
                const changeColor = stockData.changePercent >= 0 ? '+' : '';
                
                stockText += `${changeEmoji} **${symbol}**: $${stockData.price.toFixed(2)} (${changeColor}${stockData.changePercent.toFixed(2)}%)\n`;
                fetchedCount++;
                
                // Add longer delay to avoid rate limiting
                if (fetchedCount < maxLiveFetches) {
                    await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
                }
            } catch (error) {
                console.error(`Error fetching price for ${symbol}:`, error.message);
                stockText += `📊 **${symbol}**: Use \`/price ${symbol}\` for live data\n`;
            }
        }

        // Add remaining stocks as "use /price" suggestions
        const remainingStocks = targetStocks.slice(maxLiveFetches);
        if (remainingStocks.length > 0) {
            stockText += `\n📈 **More ${categoryName} stocks:**\n`;
            remainingStocks.forEach(symbol => {
                stockText += `💼 **${symbol}** - Use \`/price ${symbol}\` for live data\n`;
            });
        }

        if (stocks.length > maxStocks) {
            stockText += `\n*... and ${stocks.length - maxStocks} more stocks in this category*`;
        }

        embed.setDescription(stockText);
        embed.setFooter({ 
            text: `Use /price <symbol> for detailed live info • Use /buy <symbol> <quantity> to trade • 0.02% fee applies`
        });
        
        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        await interaction.editReply(`Error: ${error.message}`);
    }
}

client.login(config.token);