-- Create master table if not exists
CREATE TABLE IF NOT EXISTS master (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone1 TEXT,
    phone2 TEXT,
    phone3 TEXT,
    phone4 TEXT,
    address1 TEXT,
    address2 TEXT,
    city TEXT,
    state TEXT,
    county TEXT,
    region TEXT,
    zipcode TEXT,
    lat REAL,
    lon REAL,
    vendor_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for master table
CREATE INDEX IF NOT EXISTS idx_email ON master(email);
CREATE INDEX IF NOT EXISTS idx_phone1 ON master(phone1);
CREATE INDEX IF NOT EXISTS idx_phone2 ON master(phone2);
CREATE INDEX IF NOT EXISTS idx_phone3 ON master(phone3);
CREATE INDEX IF NOT EXISTS idx_phone4 ON master(phone4);
CREATE INDEX IF NOT EXISTS idx_zipcode ON master(zipcode);
CREATE INDEX IF NOT EXISTS idx_city ON master(city);
CREATE INDEX IF NOT EXISTS idx_county ON master(county);
CREATE INDEX IF NOT EXISTS idx_region ON master(region);
CREATE INDEX IF NOT EXISTS idx_vendor ON master(vendor_name);

-- Create disposition_types table if not exists
CREATE TABLE IF NOT EXISTS disposition_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create dispositions table if not exists
CREATE TABLE IF NOT EXISTS dispositions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone_number TEXT NOT NULL,
    disposition_type TEXT NOT NULL,
    notes TEXT,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (disposition_type) REFERENCES disposition_types(name),
    UNIQUE(phone_number)
);

-- Create downloads_history table if not exists
CREATE TABLE IF NOT EXISTS downloads_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_name TEXT NOT NULL,
    record_count INTEGER NOT NULL,
    filters TEXT,
    created_by TEXT,
    download_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create uploaded_files table if not exists
CREATE TABLE IF NOT EXISTS uploaded_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    original_filename TEXT,
    vendor_name TEXT NOT NULL,
    total_records INTEGER NOT NULL DEFAULT 0,
    duplicates_count INTEGER NOT NULL DEFAULT 0,
    successful_records INTEGER NOT NULL DEFAULT 0,
    failed_records INTEGER NOT NULL DEFAULT 0,
    upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT CHECK(status IN ('processing', 'completed', 'failed')) DEFAULT 'processing',
    error_message TEXT,
    uploaded_by TEXT,
    file_path TEXT,
    file_size INTEGER,
    headers TEXT,
    mapping TEXT
);

-- Create indexes for uploaded_files table
CREATE INDEX IF NOT EXISTS idx_vendor_name ON uploaded_files(vendor_name);
CREATE INDEX IF NOT EXISTS idx_status ON uploaded_files(status);
CREATE INDEX IF NOT EXISTS idx_upload_date ON uploaded_files(upload_date);

-- Insert default disposition types if they don't exist
INSERT OR IGNORE INTO disposition_types (name, description) VALUES
    ('DNC', 'Do Not Call'),
    ('Callback', 'Contact requested callback'),
    ('Completed', 'Call completed successfully'),
    ('Disconnected', 'Phone number disconnected'),
    ('Language Barrier', 'Unable to communicate due to language'),
    ('No Answer', 'No answer after multiple attempts'),
    ('Not Interested', 'Contact not interested'),
    ('Voicemail', 'Left voicemail message'),
    ('Wrong Number', 'Incorrect phone number'),
    ('Busy', 'Line busy');
