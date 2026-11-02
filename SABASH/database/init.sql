CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE freight_type_enum AS ENUM ('sea', 'air');
CREATE TYPE shipment_status_enum AS ENUM ('Loaded', 'In Transit', 'Arrived Dar', 'Delivered');
CREATE TYPE user_role_enum AS ENUM ('ADMIN', 'MANAGER', 'STAFF', 'WAREHOUSE');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role_enum DEFAULT 'STAFF',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE warehouses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL,
    country VARCHAR(50) NOT NULL
);

CREATE TABLE shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_code VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    freight_type freight_type_enum NOT NULL,
    origin_warehouse_code VARCHAR(10) REFERENCES warehouses(code),
    length_cm NUMERIC(10, 2) NOT NULL DEFAULT 0,
    width_cm NUMERIC(10, 2) NOT NULL DEFAULT 0,
    height_cm NUMERIC(10, 2) NOT NULL DEFAULT 0,
    weight_kg NUMERIC(10, 2) NOT NULL DEFAULT 0,
    calculated_cbm NUMERIC(10, 4) DEFAULT 0,
    billable_weight_kg NUMERIC(10, 2) DEFAULT 0,
    total_cost_usd NUMERIC(10, 2) DEFAULT 0,
    total_cost_tzs NUMERIC(12, 2) DEFAULT 0,
    current_lat NUMERIC(10, 6) DEFAULT NULL,
    current_lng NUMERIC(10, 6) DEFAULT NULL,
    event_history JSONB DEFAULT '[]'::jsonb,
    status shipment_status_enum DEFAULT 'Loaded',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100),
    company VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shipments_tracking ON shipments(tracking_code);
CREATE INDEX idx_shipments_phone ON shipments(customer_phone);
CREATE INDEX idx_shipments_status ON shipments(status);
CREATE INDEX idx_customers_phone ON customers(phone);

INSERT INTO warehouses (name, code, country) VALUES 
('Guangzhou Office', 'CN', 'China'),
('Dubai Office', 'AE', 'UAE'),
('Dar es Salaam HQ', 'TZ', 'Tanzania');

INSERT INTO users (name, email, password_hash, role) 
VALUES ('System Admin', 'admin@sabash.com', crypt('admin123', gen_salt('bf')), 'ADMIN');

CREATE TABLE marketing_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES users(id),
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    workplace VARCHAR(150) NOT NULL,
    comments TEXT,
    visit_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
