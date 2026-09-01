-- ArogyaConnect reference schema (PostgreSQL).
-- SQLAlchemy create_all is the supported prototype initializer.
-- All data is synthetic.

CREATE TABLE IF NOT EXISTS facilities (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  type VARCHAR(40) NOT NULL,
  village VARCHAR(120) NOT NULL,
  district VARCHAR(120) NOT NULL,
  state VARCHAR(80) NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  connectivity_status VARCHAR(20),
  created_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(160) UNIQUE NOT NULL,
  phone VARCHAR(20) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL,
  facility_id INTEGER REFERENCES facilities(id),
  preferred_language VARCHAR(8),
  specialization VARCHAR(80),
  worker_type VARCHAR(40),
  is_available BOOLEAN,
  created_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patients (
  id SERIAL PRIMARY KEY,
  health_id VARCHAR(40) UNIQUE NOT NULL,
  name VARCHAR(160) NOT NULL,
  age INTEGER NOT NULL,
  gender VARCHAR(16) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  village VARCHAR(120) NOT NULL,
  district VARCHAR(120) NOT NULL,
  state VARCHAR(80) NOT NULL,
  preferred_language VARCHAR(8),
  migrant_status BOOLEAN,
  registered_facility_id INTEGER REFERENCES facilities(id),
  client_id VARCHAR(64) UNIQUE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_patients_name ON patients(name);
CREATE INDEX IF NOT EXISTS ix_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS ix_patients_village ON patients(village);
