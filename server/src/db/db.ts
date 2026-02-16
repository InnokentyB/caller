
import Database from 'better-sqlite3';

const db = new Database('messenger.db', { verbose: console.log });
db.pragma('journal_mode = WAL');

// Initialize tables
export function initDB() {
  const userTable = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  const sessionTable = `
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      device_info TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `;

  const inviteTable = `
    CREATE TABLE IF NOT EXISTS invites (
      code TEXT PRIMARY KEY,
      creator_id TEXT NOT NULL,
      used_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(creator_id) REFERENCES users(id)
    )
  `;

  const contactTable = `
    CREATE TABLE IF NOT EXISTS contacts (
      user_id TEXT NOT NULL,
      contact_id TEXT NOT NULL,
      status TEXT CHECK(status IN ('pending', 'accepted', 'blocked')) DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, contact_id),
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(contact_id) REFERENCES users(id)
    )
  `;

  const messageTable = `
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL,
      recipient_id TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT CHECK(status IN ('sent', 'delivered', 'read')) DEFAULT 'sent',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(sender_id) REFERENCES users(id),
      FOREIGN KEY(recipient_id) REFERENCES users(id)
    )
  `;

  db.exec(userTable);
  db.exec(sessionTable);
  db.exec(inviteTable);
  db.exec(contactTable);
  db.exec(messageTable);
}

export default db;
