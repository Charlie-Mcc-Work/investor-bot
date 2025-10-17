const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Database = require('./database.js');
const config = require('./config.json');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

const db = new Database();

// Global market state
let currentRound = null;

// Generate random memecoin names
const MEMECOIN_PREFIXES = ['Moon', 'Doge', 'Shiba', 'Safe', 'Baby', 'Mega', 'Ultra', 'Turbo', 'Rocket', 'Diamond'];
const MEMECOIN_SUFFIXES = ['Coin', 'Token', 'Inu', 'Mars', 'Moon', 'Safe', 'Pump', 'Lambo', 'Hodl', 'Gem'];

// Business stock tickers
const BUSINESS_STOCKS = [
    { ticker: 'AAPL', name: 'Apple Inc.' },
    { ticker: 'MSFT', name: 'Microsoft Corp.' },
    { ticker: 'GOOGL', name: 'Alphabet Inc.' },
    { ticker: 'TSLA', name: 'Tesla Inc.' },
    { ticker: 'NVDA', name: 'NVIDIA Corp.' },
    { ticker: 'AMZN', name: 'Amazon.com Inc.' },
    { ticker: 'META', name: 'Meta Platforms Inc.' },
    { ticker: 'NFLX', name: 'Netflix Inc.' },
    { ticker: 'CRM', name: 'Salesforce Inc.' },
    { ticker: 'UBER', name: 'Uber Technologies Inc.' }
];

// Initialize market on bot start
async function initializeMarket() {
    const round = await db.getCurrentRound();
    if (!round) {
        // Create first market round
        const roundId = await db.createMarketRound(1);
        await generateMarketOptions(roundId);
        currentRound = await db.getCurrentRound();
    } else {
        currentRound = round;
    }
}

function generateMemecoinName() {
    const prefix = MEMECOIN_PREFIXES[Math.floor(Math.random() * MEMECOIN_PREFIXES.length)];
    const suffix = MEMECOIN_SUFFIXES[Math.floor(Math.random() * MEMECOIN_SUFFIXES.length)];
    return { symbol: `${prefix.toUpperCase()}${suffix.toUpperCase()}`, name: `${prefix}${suffix}` };
}

function generateCryptoMultiplier() {
    const rand = Math.random();
    if (rand < 0.20) return { multiplier: 0, outcome: 'rug' }; // 20% rug pull
    if (rand < 0.50) return { multiplier: 0.5, outcome: 'dip' }; // 30% dip
    if (rand < 0.80) return { multiplier: 1, outcome: 'sideways' }; // 30% sideways
    if (rand < 0.95) return { multiplier: 2, outcome: 'bull' }; // 15% bull run
    return { multiplier: 5, outcome: 'moon' }; // 5% to the moon
}

function generateBusinessMultiplier() {
    const rand = Math.random();
    if (rand < 0.05) return { multiplier: 0, outcome: 'bankruptcy' }; // 5% bankruptcy
    if (rand < 0.25) return { multiplier: 0.5, outcome: 'bad_quarter' }; // 20% bad quarter
    if (rand < 0.65) return { multiplier: 1, outcome: 'break_even' }; // 40% break even
    if (rand < 0.90) return { multiplier: 1.5, outcome: 'profitable' }; // 25% profitable
    return { multiplier: 3, outcome: 'huge_success' }; // 10% huge success
}

async function generateMarketOptions(roundId) {
    // Generate 5 memecoins
    for (let i = 0; i < 5; i++) {
        const coin = generateMemecoinName();
        const outcome = generateCryptoMultiplier();
        await db.addMarketOption(roundId, 'crypto', coin.symbol, coin.name, outcome.multiplier);
    }

    // Generate 5 business stocks
    const shuffled = [...BUSINESS_STOCKS].sort(() => 0.5 - Math.random());
    for (let i = 0; i < 5; i++) {
        const stock = shuffled[i];
        const outcome = generateBusinessMultiplier();
        await db.addMarketOption(roundId, 'business', stock.ticker, stock.name, outcome.multiplier);
    }
}

function getCryptoFlavorText(outcome, multiplier, symbol) {
    const texts = {
        'moon': [
            `🚀 ${symbol} TO THE MOON! You made a meme token at 3 a.m. It's now worth more than a small nation.`,
            `🌙 LUNAR LANDING CONFIRMED! ${symbol} just got endorsed by every celebrity on Twitter simultaneously.`,
            `💎 DIAMOND HANDS REWARDED! ${symbol} is now the official currency of Mars.`
        ],
        'bull': [
            `📈 Bull run activated! Market euphoria for ${symbol}! You pretend this was skill.`,
            `🐂 BULLISH AF! ${symbol} pumped harder than your gym playlist.`,
            `💪 Big green candles! ${symbol} goes brrrr and you're here for it.`
        ],
        'sideways': [
            `😐 Stablecoin vibes. ${symbol} doing absolutely nothing. How boring.`,
            `🦀 CRAB MARKET! ${symbol} moves sideways like a confused crustacean.`,
            `📊 Perfectly balanced. ${symbol} refuses to move. Very zen.`
        ],
        'dip': [
            `📉 Oops, influencer drama tanked ${symbol}. Someone tweeted something.`,
            `💸 Minor rug pull vibes. ${symbol} devs "taking a break" apparently.`,
            `🤡 You bought the top of ${symbol}. Classic move, investor.`
        ],
        'rug': [
            `💀 FULL RUG PULL! ${symbol} liquidity gone. Exchange hacked. Your coins are now digital art.`,
            `🏃‍♂️ Devs fled to Bali with ${symbol} funds. Their LinkedIn says "Crypto Entrepreneur."`,
            `☠️ ${symbol} just got rug pulled harder than grandma's carpet. RIP.`
        ]
    };
    
    const options = texts[outcome] || [`Something happened to ${symbol}. (${multiplier}x)`];
    return options[Math.floor(Math.random() * options.length)];
}

function getBusinessFlavorText(outcome, multiplier, symbol) {
    const texts = {
        'huge_success': [
            `🏆 ${symbol} HUGE SUCCESS! Your startup got acquired. Time for a yacht and Ted Talks.`,
            `💰 MARKET DOMINATION! ${symbol} just revolutionized something. You're basically Steve Jobs now.`,
            `🚀 UNICORN STATUS! ${symbol} valuation went parabolic. The board loves you.`
        ],
        'profitable': [
            `💰 Profitable quarter for ${symbol}! Revenue up 15%! Everyone's impressed at the meeting.`,
            `📊 SOLID GAINS! ${symbol} exceeded projections. You get a corner office.`,
            `💼 Professional success! ${symbol} stock buyback announced. Very corporate.`
        ],
        'break_even': [
            `😐 Break even quarter for ${symbol}. Lots of meetings. No actual progress made.`,
            `📈📉 FLAT PERFORMANCE! ${symbol} perfectly mediocre. Peak corporate efficiency.`,
            `🤝 Status quo maintained! ${symbol} neither won nor lost. How... strategic.`
        ],
        'bad_quarter': [
            `📉 Bad quarter for ${symbol}. Supply costs doubled. You blame 'market forces' in the presentation.`,
            `💸 MARGIN COMPRESSION! ${symbol} hit by "unprecedented headwinds." Classic excuse.`,
            `📊 Disappointing results. ${symbol} CFO mentions "challenging environment" 47 times.`
        ],
        'bankruptcy': [
            `💣 ${symbol} BANKRUPTCY! You expanded too fast. CFO fled to Bali. Chapter 11 speedrun.`,
            `☠️ COMPANY COLLAPSED! ${symbol} tried to pivot to NFTs. Didn't work out.`,
            `🏃‍♂️ ${symbol} went under faster than the Titanic. At least you have LinkedIn.`
        ]
    };
    
    const options = texts[outcome] || [`Something happened to ${symbol}. (${multiplier}x)`];
    return options[Math.floor(Math.random() * options.length)];
}

// Initialize database when bot starts
client.once('ready', async () => {
    console.log(`${client.user.tag} is ready to conduct business!`);
    
    // Initialize market
    await initializeMarket();
    console.log(`Market initialized! Round ${currentRound.round_number}`);
    
    // Register slash commands
    const commands = [
        new SlashCommandBuilder()
            .setName('crypto')
            .setDescription('Invest in a memecoin (high risk, high reward)')
            .addStringOption(option =>
                option.setName('coin')
                    .setDescription('Memecoin to invest in')
                    .setRequired(true)
            )
            .addNumberOption(option =>
                option.setName('amount')
                    .setDescription('Amount to invest')
                    .setRequired(true)
                    .setMinValue(0.01)
            ),
        new SlashCommandBuilder()
            .setName('invest')
            .setDescription('Invest in a business stock (moderate risk)')
            .addStringOption(option =>
                option.setName('stock')
                    .setDescription('Stock ticker to invest in')
                    .setRequired(true)
            )
            .addNumberOption(option =>
                option.setName('amount')
                    .setDescription('Amount to invest')
                    .setRequired(true)
                    .setMinValue(0.01)
            ),
        new SlashCommandBuilder()
            .setName('market')
            .setDescription('View current market options'),
        new SlashCommandBuilder()
            .setName('portfolio')
            .setDescription('View your current investments'),
        new SlashCommandBuilder()
            .setName('businessrankings')
            .setDescription('Show all players ranked by money'),
        new SlashCommandBuilder()
            .setName('funds')
            .setDescription('Check your current funds'),
        new SlashCommandBuilder()
            .setName('conductbusiness')
            .setDescription('Execute all market trades and see results!')
    ];

    try {
        console.log('Refreshing application (/) commands...');
        await client.application.commands.set(commands);
        console.log('Successfully reloaded application (/) commands.');
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
        // Ensure user exists in database
        await db.ensureUser(userId, username);

        switch (commandName) {
            case 'crypto':
                await handleCrypto(interaction, userId);
                break;
            case 'invest':
                await handleInvest(interaction, userId);
                break;
            case 'market':
                await handleMarket(interaction);
                break;
            case 'portfolio':
                await handlePortfolio(interaction, userId);
                break;
            case 'businessrankings':
                await handleBusinessRankings(interaction);
                break;
            case 'funds':
                await handleFunds(interaction, userId);
                break;
            case 'conductbusiness':
                await handleConductBusiness(interaction);
                break;
        }
    } catch (error) {
        console.error('Error handling command:', error);
        await interaction.reply({ content: 'An error occurred while processing your command.', ephemeral: true });
    }
});

async function handleCrypto(interaction, userId) {
    const coin = interaction.options.getString('coin').toUpperCase();
    const amount = interaction.options.getNumber('amount');
    const userData = await db.getUser(userId);

    if (userData.money < amount) {
        await interaction.reply({ content: `Insufficient funds! You only have $${userData.money.toFixed(2)}.`, ephemeral: true });
        return;
    }

    // Check if coin exists in current market
    const marketOptions = await db.getMarketOptions(currentRound.id);
    const validCoin = marketOptions.find(option => option.type === 'crypto' && option.symbol === coin);
    
    if (!validCoin) {
        const availableCoins = marketOptions.filter(option => option.type === 'crypto').map(option => option.symbol).join(', ');
        await interaction.reply({ content: `Invalid memecoin! Available options: ${availableCoins}`, ephemeral: true });
        return;
    }

    // Deduct money and add investment
    await db.updateUser(userId, { money: userData.money - amount });
    await db.addInvestment(userId, currentRound.id, 'crypto', coin, amount);

    const embed = new EmbedBuilder()
        .setColor('#f1c40f')
        .setTitle('🪙 Crypto Investment Made!')
        .setDescription(`You've YOLOed $${amount.toFixed(2)} into ${validCoin.name}!`)
        .addFields(
            { name: 'Investment', value: `$${amount.toFixed(2)} → ${coin}`, inline: true },
            { name: 'Remaining Funds', value: `$${(userData.money - amount).toFixed(2)}`, inline: true }
        )
        .setFooter({ text: 'Use /conductbusiness to execute all trades and see results!' });

    await interaction.reply({ embeds: [embed] });
}

async function handleInvest(interaction, userId) {
    const stock = interaction.options.getString('stock').toUpperCase();
    const amount = interaction.options.getNumber('amount');
    const userData = await db.getUser(userId);

    if (userData.money < amount) {
        await interaction.reply({ content: `Insufficient funds! You only have $${userData.money.toFixed(2)}.`, ephemeral: true });
        return;
    }

    // Check if stock exists in current market
    const marketOptions = await db.getMarketOptions(currentRound.id);
    const validStock = marketOptions.find(option => option.type === 'business' && option.symbol === stock);
    
    if (!validStock) {
        const availableStocks = marketOptions.filter(option => option.type === 'business').map(option => option.symbol).join(', ');
        await interaction.reply({ content: `Invalid stock ticker! Available options: ${availableStocks}`, ephemeral: true });
        return;
    }

    // Deduct money and add investment
    await db.updateUser(userId, { money: userData.money - amount });
    await db.addInvestment(userId, currentRound.id, 'business', stock, amount);

    const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('💼 Business Investment Made!')
        .setDescription(`You've professionally allocated $${amount.toFixed(2)} to ${validStock.name}!`)
        .addFields(
            { name: 'Investment', value: `$${amount.toFixed(2)} → ${stock}`, inline: true },
            { name: 'Remaining Funds', value: `$${(userData.money - amount).toFixed(2)}`, inline: true }
        )
        .setFooter({ text: 'Use /conductbusiness to execute all trades and see results!' });

    await interaction.reply({ embeds: [embed] });
}

async function handleMarket(interaction) {
    const marketOptions = await db.getMarketOptions(currentRound.id);
    const cryptos = marketOptions.filter(option => option.type === 'crypto');
    const stocks = marketOptions.filter(option => option.type === 'business');

    const embed = new EmbedBuilder()
        .setColor('#9b59b6')
        .setTitle('📊 Current Market Options')
        .setDescription(`Round ${currentRound.round_number} | Market Mood: ${currentRound.market_mood.toUpperCase()}`)
        .addFields(
            { 
                name: '🪙 Memecoins (High Risk)', 
                value: cryptos.map(coin => `**${coin.symbol}** - ${coin.name}`).join('\n'), 
                inline: true 
            },
            { 
                name: '💼 Business Stocks (Moderate Risk)', 
                value: stocks.map(stock => `**${stock.symbol}** - ${stock.name}`).join('\n'), 
                inline: true 
            }
        )
        .setFooter({ text: 'Use /crypto <coin> <amount> or /invest <stock> <amount>' });

    await interaction.reply({ embeds: [embed] });
}

async function handlePortfolio(interaction, userId) {
    const investments = await db.getUserInvestments(userId, currentRound.id);
    
    if (investments.length === 0) {
        await interaction.reply({ content: 'No current investments! Use `/market` to see options.', ephemeral: true });
        return;
    }

    const cryptoInvestments = investments.filter(inv => inv.type === 'crypto');
    const businessInvestments = investments.filter(inv => inv.type === 'business');
    
    const embed = new EmbedBuilder()
        .setColor('#e67e22')
        .setTitle('📁 Your Portfolio')
        .setDescription(`Round ${currentRound.round_number} Investments`);

    if (cryptoInvestments.length > 0) {
        embed.addFields({
            name: '🪙 Crypto Positions',
            value: cryptoInvestments.map(inv => `**${inv.symbol}**: $${inv.amount.toFixed(2)}`).join('\n'),
            inline: true
        });
    }

    if (businessInvestments.length > 0) {
        embed.addFields({
            name: '💼 Business Positions',
            value: businessInvestments.map(inv => `**${inv.symbol}**: $${inv.amount.toFixed(2)}`).join('\n'),
            inline: true
        });
    }

    const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
    embed.addFields({ name: 'Total Invested', value: `$${totalInvested.toFixed(2)}`, inline: false });

    await interaction.reply({ embeds: [embed] });
}

async function handleFunds(interaction, userId) {
    const userData = await db.getUser(userId);
    const investments = await db.getUserInvestments(userId, currentRound.id);
    const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
    
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('💳 Your Financial Status')
        .addFields(
            { name: 'Available Cash', value: `$${userData.money.toFixed(2)}`, inline: true },
            { name: 'Invested Amount', value: `$${totalInvested.toFixed(2)}`, inline: true },
            { name: 'Total Portfolio', value: `$${(userData.money + totalInvested).toFixed(2)}`, inline: true }
        );

    await interaction.reply({ embeds: [embed] });
}

async function handleBusinessRankings(interaction) {
    const rankings = await db.getAllUsersRanked();
    
    if (rankings.length === 0) {
        await interaction.reply('No players found!');
        return;
    }

    const embed = new EmbedBuilder()
        .setColor('#ffd700')
        .setTitle('🏆 Business Leaderboard')
        .setDescription('Financial titans ranked by portfolio value');

    // Add special titles based on performance
    rankings.forEach((user, index) => {
        const rank = index + 1;
        let emoji = `${rank}.`;
        let title = '';

        if (rank === 1) {
            emoji = '🥇';
            title = ' - Top Business Conductor';
        } else if (rank === 2) {
            emoji = '🥈';
            title = ' - Corporate Vice Lord';
        } else if (rank === 3) {
            emoji = '🥉';
            title = ' - Executive Overlord';
        } else if (user.money < 100) {
            title = ' - Fiscal Clown';
        } else if (user.money < 500) {
            title = ' - Rug Magnet';
        }

        embed.addFields({
            name: `${emoji} ${user.username}${title}`,
            value: `$${user.money.toFixed(2)}`,
            inline: true
        });
    });

    await interaction.reply({ embeds: [embed] });
}

async function handleConductBusiness(interaction) {
    const allInvestments = await db.getAllInvestments(currentRound.id);
    
    if (allInvestments.length === 0) {
        await interaction.reply('No investments to process! Use `/market` to see options and invest first.');
        return;
    }

    // Get market options with their predetermined multipliers
    const marketOptions = await db.getMarketOptions(currentRound.id);
    
    let userProfits = new Map();

    // Process each investment
    for (const investment of allInvestments) {
        const option = marketOptions.find(opt => opt.symbol === investment.symbol && opt.type === investment.type);
        const payout = investment.amount * option.multiplier;
        const profit = payout - investment.amount;

        // Track user profits
        if (!userProfits.has(investment.user_id)) {
            userProfits.set(investment.user_id, { username: investment.username, totalPayout: 0, investments: [] });
        }
        
        const userProfit = userProfits.get(investment.user_id);
        userProfit.totalPayout += payout;
        
        // Determine outcome type for flavor text
        let outcome;
        if (investment.type === 'crypto') {
            if (option.multiplier === 0) outcome = 'rug';
            else if (option.multiplier === 0.5) outcome = 'dip';
            else if (option.multiplier === 1) outcome = 'sideways';
            else if (option.multiplier === 2) outcome = 'bull';
            else if (option.multiplier === 5) outcome = 'moon';
        } else {
            if (option.multiplier === 0) outcome = 'bankruptcy';
            else if (option.multiplier === 0.5) outcome = 'bad_quarter';
            else if (option.multiplier === 1) outcome = 'break_even';
            else if (option.multiplier === 1.5) outcome = 'profitable';
            else if (option.multiplier === 3) outcome = 'huge_success';
        }

        const flavorText = investment.type === 'crypto' 
            ? getCryptoFlavorText(outcome, option.multiplier, investment.symbol)
            : getBusinessFlavorText(outcome, option.multiplier, investment.symbol);

        userProfit.investments.push({
            symbol: investment.symbol,
            type: investment.type,
            amount: investment.amount,
            multiplier: option.multiplier,
            payout: payout,
            profit: profit,
            flavorText: flavorText
        });
    }

    // Update user balances
    for (const [userId, userProfit] of userProfits) {
        const userData = await db.getUser(userId);
        await db.updateUser(userId, { money: userData.money + userProfit.totalPayout });
    }

    // Mark investments as settled
    await db.settleInvestments(currentRound.id);

    // Create new market round
    const newRoundId = await db.createMarketRound(currentRound.round_number + 1);
    await generateMarketOptions(newRoundId);
    currentRound = await db.getCurrentRound();

    // Create results embed
    const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('🎲 BUSINESS HAS BEEN CONDUCTED!')
        .setDescription(`Round ${currentRound.round_number - 1} Results | Now entering Round ${currentRound.round_number}`)
        .setFooter({ text: 'New market options available! Use /market to see them.' });

    let resultText = '';
    for (const [userId, userProfit] of userProfits) {
        const totalProfit = userProfit.totalPayout - userProfit.investments.reduce((sum, inv) => sum + inv.amount, 0);
        const profitEmoji = totalProfit > 0 ? '📈' : totalProfit < 0 ? '📉' : '😐';
        
        resultText += `\n**${userProfit.username}** ${profitEmoji} Net: ${totalProfit >= 0 ? '+' : ''}$${totalProfit.toFixed(2)}\n`;
        
        for (const inv of userProfit.investments) {
            const emoji = inv.type === 'crypto' ? '🪙' : '💼';
            resultText += `${emoji} ${inv.symbol}: $${inv.amount.toFixed(2)} → $${inv.payout.toFixed(2)} (${inv.multiplier}x)\n`;
            resultText += `*${inv.flavorText}*\n`;
        }
        resultText += '\n';
    }

    if (resultText.length > 4096) {
        // If too long, split into multiple embeds or summarize
        embed.setDescription('Results too long! Check individual portfolios.');
    } else {
        embed.setDescription(resultText);
    }

    await interaction.reply({ embeds: [embed] });
}

// Login using token from config.json
client.login(config.token);