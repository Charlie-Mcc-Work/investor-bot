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

        this.db = new sqlite3.Database(path.join(dataDir, 'business.db'));
        this.init();
    }

    init() {
        this.db.serialize(() => {
            this.db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    username TEXT NOT NULL,
                    money REAL DEFAULT 1000.0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            this.db.run(`
                CREATE TABLE IF NOT EXISTS market_rounds (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    round_number INTEGER NOT NULL,
                    market_mood TEXT DEFAULT 'normal',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            this.db.run(`
                CREATE TABLE IF NOT EXISTS investments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    round_id INTEGER NOT NULL,
                    type TEXT NOT NULL,
                    symbol TEXT NOT NULL,
                    amount REAL NOT NULL,
                    multiplier REAL,
                    settled BOOLEAN DEFAULT FALSE,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id),
                    FOREIGN KEY (round_id) REFERENCES market_rounds (id)
                )
            `);

            this.db.run(`
                CREATE TABLE IF NOT EXISTS market_options (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    round_id INTEGER NOT NULL,
                    type TEXT NOT NULL,
                    symbol TEXT NOT NULL,
                    name TEXT NOT NULL,
                    multiplier REAL NOT NULL,
                    FOREIGN KEY (round_id) REFERENCES market_rounds (id)
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
                    // Create new user with starting money of $1000
                    this.db.run(
                        'INSERT INTO users (id, username, money) VALUES (?, ?, 1000.0)',
                        [userId, username],
                        (err) => {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                } else {
                    // Update username in case it changed
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

    async updateUser(userId, updates) {
        return new Promise((resolve, reject) => {
            const fields = Object.keys(updates);
            const values = Object.values(updates);
            const setClause = fields.map(field => `${field} = ?`).join(', ');
            
            this.db.run(
                `UPDATE users SET ${setClause} WHERE id = ?`,
                [...values, userId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    async getAllUsersRanked() {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM users ORDER BY money DESC',
                [],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                }
            );
        });
    }

    async createMarketRound(roundNumber, marketMood = 'normal') {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO market_rounds (round_number, market_mood) VALUES (?, ?)',
                [roundNumber, marketMood],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    async addMarketOption(roundId, type, symbol, name, multiplier) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO market_options (round_id, type, symbol, name, multiplier) VALUES (?, ?, ?, ?, ?)',
                [roundId, type, symbol, name, multiplier],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    async getCurrentRound() {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM market_rounds ORDER BY id DESC LIMIT 1',
                [],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    async getMarketOptions(roundId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM market_options WHERE round_id = ? ORDER BY type, symbol',
                [roundId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                }
            );
        });
    }

    async addInvestment(userId, roundId, type, symbol, amount) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO investments (user_id, round_id, type, symbol, amount) VALUES (?, ?, ?, ?, ?)',
                [userId, roundId, type, symbol, amount],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    async getUserInvestments(userId, roundId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM investments WHERE user_id = ? AND round_id = ? AND settled = FALSE',
                [userId, roundId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                }
            );
        });
    }

    async getAllInvestments(roundId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT i.*, u.username FROM investments i JOIN users u ON i.user_id = u.id WHERE i.round_id = ? AND i.settled = FALSE',
                [roundId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                }
            );
        });
    }

    async settleInvestments(roundId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE investments SET settled = TRUE WHERE round_id = ?',
                [roundId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    close() {
        this.db.close();
    }
}

module.exports = Database;