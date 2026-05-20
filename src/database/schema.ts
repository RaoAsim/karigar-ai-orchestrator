import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;

export const getDb = (): SQLite.SQLiteDatabase => {
  if (!_db) {
    _db = SQLite.openDatabaseSync('karigar.db');
  }
  return _db;
};

export const initDb = () => {
  try {
    const db = getDb();
    // Users table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS Users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone_number TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('CUSTOMER', 'VENDOR')),
        name TEXT NOT NULL
      );
    `);

    // Providers table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS Providers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        service_category TEXT NOT NULL,
        location_area TEXT NOT NULL,
        rating REAL,
        hourly_rate REAL,
        distance_km REAL,
        status TEXT NOT NULL CHECK(status IN ('AVAILABLE', 'BUSY')),
        FOREIGN KEY (user_id) REFERENCES Users(id)
      );
    `);

    // Bookings table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS Bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        provider_id INTEGER NOT NULL,
        service_time TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('PENDING', 'CONFIRMED', 'COMPLETED')),
        job_location TEXT,
        FOREIGN KEY (customer_id) REFERENCES Users(id),
        FOREIGN KEY (provider_id) REFERENCES Providers(id)
      );
    `);

    // Schema evolutions
    try { db.execSync('ALTER TABLE Providers ADD COLUMN hourly_rate REAL;'); } catch (e) {}
    try { db.execSync('ALTER TABLE Providers ADD COLUMN distance_km REAL;'); } catch (e) {}
    try { db.execSync('ALTER TABLE Bookings ADD COLUMN job_location TEXT;'); } catch (e) {}
  } catch (error) {
    console.error('Error initializing DB schema:', error);
  }
};

export const seedDb = () => {
  try {
    const db = getDb();
    // Check if users already exist
    const existingUser = db.getFirstSync('SELECT * FROM Users LIMIT 1');
    if (existingUser) {
      console.log('DB already seeded.');
      return; // Already seeded
    }

    console.log('Seeding DB with mock data...');

    // 1. Seed Customer User
    db.runSync(
      'INSERT INTO Users (phone_number, password, role, name) VALUES (?, ?, ?, ?)',
      ['03001234567', 'password123', 'CUSTOMER', 'Ali Customer']
    );

    // 2. Helper function to seed vendor and their corresponding provider profiles
    const seedArtisan = (
      phone: string,
      name: string,
      category: string,
      area: string,
      rating: number,
      rate: number,
      dist: number
    ) => {
      const userRes = db.runSync(
        'INSERT INTO Users (phone_number, password, role, name) VALUES (?, ?, ?, ?)',
        [phone, 'password123', 'VENDOR', name]
      );
      db.runSync(
        'INSERT INTO Providers (user_id, service_category, location_area, rating, hourly_rate, distance_km, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userRes.lastInsertRowId, category, area, rating, rate, dist, 'AVAILABLE']
      );
    };

    // 3. Seed 12+ Unique Pakistani Artisans across Islamabad
    // Plumbers
    seedArtisan('03007654321', 'Ahmed Vendor', 'plumber', 'G-13', 4.8, 1200, 1.2);
    seedArtisan('03001111111', 'Zahid Khan', 'plumber', 'Gulberg Green', 4.9, 1500, 2.1);
    seedArtisan('03002222222', 'Imran Shah', 'plumber', 'F-10', 4.7, 1000, 3.4);

    // Electricians
    seedArtisan('03003333333', 'Kashif Ali', 'electrician', 'G-13', 4.8, 1400, 0.8);
    seedArtisan('03004444444', 'Sajid Mughal', 'electrician', 'Gulberg Green', 4.6, 1200, 1.9);
    seedArtisan('03005555555', 'Kamran Bhatti', 'electrician', 'Blue Area', 4.9, 1800, 2.5);

    // AC Technicians
    seedArtisan('03006666666', 'Nabeel Ahmed', 'ac technician', 'G-13', 4.5, 2000, 1.5);
    seedArtisan('03007777777', 'Faisal Qureshi', 'ac technician', 'Gulberg Green', 4.8, 2500, 2.7);
    seedArtisan('03008888888', 'Yasir Awan', 'ac technician', 'F-10', 4.7, 2200, 3.1);

    // Mechanics
    seedArtisan('03009999999', 'Tariq Jamil', 'mechanic', 'G-13', 4.6, 1500, 1.1);
    seedArtisan('03001212121', 'Bilal Siddiqui', 'mechanic', 'Gulberg Green', 4.9, 1800, 2.3);
    seedArtisan('03002323232', 'Rizwan Abbasi', 'mechanic', 'Blue Area', 4.8, 1600, 4.2);

    // Beauticians
    seedArtisan('03003434343', 'Ayesha Bibi', 'beautician', 'G-13', 4.9, 3000, 1.4);
    seedArtisan('03004545454', 'Sana Malik', 'beautician', 'Gulberg Green', 4.7, 2500, 2.8);

    console.log('DB seeding completed.');
  } catch (error) {
    console.error('Error seeding DB:', error);
  }
};
