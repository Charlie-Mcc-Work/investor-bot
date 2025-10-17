const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
    constructor() {
        // Create data directory if it doesn't exist
        const dataDir = path.join(__dirname, 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        this.db = new sqlite3.Database(path.join(dataDir, 'stocks.db'));
        this.init();
    }

    init() {
        this.db.serialize(() => {
            this.db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    username TEXT NOT NULL,
                    cash REAL DEFAULT 1000.0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            this.db.run(`
                CREATE TABLE IF NOT EXISTS holdings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    symbol TEXT NOT NULL,
                    quantity REAL NOT NULL,
                    avg_price REAL NOT NULL,
                    is_short BOOLEAN DEFAULT FALSE,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            `);

            this.db.run(`
                CREATE TABLE IF NOT EXISTS transactions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    symbol TEXT NOT NULL,
                    type TEXT NOT NULL, -- 'buy', 'sell', 'short', 'cover'
                    quantity REAL NOT NULL,
                    price REAL NOT NULL,
                    total_value REAL NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            `);

            this.db.run(`
                CREATE TABLE IF NOT EXISTS stock_cache (
                    symbol TEXT PRIMARY KEY,
                    price REAL NOT NULL,
                    change_percent REAL,
                    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
        });
    }

    async ensureUser(userId, username) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (!row) {
                    this.db.run(
                        'INSERT INTO users (id, username, cash) VALUES (?, ?, 1000.0)',
                        [userId, username],
                        (err) => {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                } else {
                    this.db.run(
                        'UPDATE users SET username = ? WHERE id = ?',
                        [username, userId],
                        (err) => {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                }
            });
        });
    }

    async getUser(userId) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    async updateUserCash(userId, cashAmount) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE users SET cash = ? WHERE id = ?',
                [cashAmount, userId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    async getUserHoldings(userId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM holdings WHERE user_id = ? AND quantity != 0',
                [userId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                }
            );
        });
    }

    async getHolding(userId, symbol, isShort = false) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM holdings WHERE user_id = ? AND symbol = ? AND is_short = ?',
                [userId, symbol, isShort],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    async updateHolding(userId, symbol, quantity, avgPrice, isShort = false) {
        return new Promise((resolve, reject) => {
            if (quantity === 0) {
                // Remove holding if quantity is 0
                this.db.run(
                    'DELETE FROM holdings WHERE user_id = ? AND symbol = ? AND is_short = ?',
                    [userId, symbol, isShort],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            } else {
                this.db.run(
                    `INSERT OR REPLACE INTO holdings 
                     (user_id, symbol, quantity, avg_price, is_short) 
                     VALUES (?, ?, ?, ?, ?)`,
                    [userId, symbol, quantity, avgPrice, isShort],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            }
        });
    }

    async addTransaction(userId, symbol, type, quantity, price, totalValue) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO transactions (user_id, symbol, type, quantity, price, total_value) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, symbol, type, quantity, price, totalValue],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    async getUserTransactions(userId, limit = 10) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
                [userId, limit],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                }
            );
        });
    }

    async cacheStockPrice(symbol, price, changePercent = null) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT OR REPLACE INTO stock_cache (symbol, price, change_percent) VALUES (?, ?, ?)',
                [symbol, price, changePercent],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    async getCachedStockPrice(symbol) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM stock_cache WHERE symbol = ? AND datetime(last_updated) > datetime("now", "-5 minutes")',
                [symbol],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    async getAllUsersWithPortfolioValue() {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT u.*, 
                        u.cash as cash_value,
                        COALESCE(SUM(CASE WHEN h.is_short = 0 THEN h.quantity * sc.price ELSE 0 END), 0) as long_value,
                        COALESCE(SUM(CASE WHEN h.is_short = 1 THEN h.quantity * (2 * h.avg_price - sc.price) ELSE 0 END), 0) as short_value
                 FROM users u
                 LEFT JOIN holdings h ON u.id = h.user_id AND h.quantity != 0
                 LEFT JOIN stock_cache sc ON h.symbol = sc.symbol
                 GROUP BY u.id
                 ORDER BY (u.cash + COALESCE(SUM(CASE WHEN h.is_short = 0 THEN h.quantity * sc.price ELSE 0 END), 0) + COALESCE(SUM(CASE WHEN h.is_short = 1 THEN h.quantity * (2 * h.avg_price - sc.price) ELSE 0 END), 0)) DESC`,
                [],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                }
            );
        });
    }

    close() {
        this.db.close();
    }
}

module.exports = Database;