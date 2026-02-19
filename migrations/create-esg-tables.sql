-- ESG Accounting System – Tablas de Contabilidad Ambiental
-- Ejecutar con: psql $DATABASE_URL -f migrations/create-esg-tables.sql

-- Reportes ESG (PDFs cargados)
CREATE TABLE IF NOT EXISTS esg_reports (
  id SERIAL PRIMARY KEY,
  file_name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  report_year INTEGER NOT NULL,
  report_period TEXT,
  framework TEXT,
  extracted_text TEXT,
  status TEXT DEFAULT 'completed',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Métricas individuales ESG
CREATE TABLE IF NOT EXISTS esg_metrics (
  id SERIAL PRIMARY KEY,
  report_id INTEGER REFERENCES esg_reports(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  year INTEGER NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  indicator TEXT NOT NULL,
  value REAL,
  unit TEXT,
  source TEXT DEFAULT 'manual',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Huella de Carbono (Protocolo GHG - Alcances 1, 2 y 3)
CREATE TABLE IF NOT EXISTS carbon_footprint (
  id SERIAL PRIMARY KEY,
  report_id INTEGER REFERENCES esg_reports(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  year INTEGER NOT NULL,
  -- Alcance 1
  scope1_total REAL DEFAULT 0,
  scope1_combustion REAL DEFAULT 0,
  scope1_fugitive_emissions REAL DEFAULT 0,
  scope1_process_emissions REAL DEFAULT 0,
  scope1_fleet REAL DEFAULT 0,
  -- Alcance 2
  scope2_total REAL DEFAULT 0,
  scope2_electricity REAL DEFAULT 0,
  scope2_heat REAL DEFAULT 0,
  scope2_steam REAL DEFAULT 0,
  -- Alcance 3
  scope3_total REAL DEFAULT 0,
  scope3_business_travel REAL DEFAULT 0,
  scope3_employee_commuting REAL DEFAULT 0,
  scope3_purchased_goods REAL DEFAULT 0,
  scope3_waste REAL DEFAULT 0,
  scope3_upstream_transport REAL DEFAULT 0,
  scope3_downstream_transport REAL DEFAULT 0,
  scope3_use_of_products REAL DEFAULT 0,
  -- Totales
  total_emissions REAL DEFAULT 0,
  emissions_intensity_revenue REAL,
  emissions_intensity_employee REAL,
  reduction_target_pct REAL,
  baseline_year INTEGER,
  reduction_vs_baseline REAL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indicadores ESG consolidados (E, S, G)
CREATE TABLE IF NOT EXISTS esg_indicators (
  id SERIAL PRIMARY KEY,
  report_id INTEGER REFERENCES esg_reports(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  year INTEGER NOT NULL,
  -- Ambiental (E)
  total_energy_consumption REAL,
  renewable_energy_pct REAL,
  energy_intensity REAL,
  total_water_consumption REAL,
  water_recycled_pct REAL,
  total_waste_generated REAL,
  waste_recycled_pct REAL,
  hazardous_waste REAL,
  total_emissions REAL,
  scope1_emissions REAL,
  scope2_emissions REAL,
  scope3_emissions REAL,
  biodiversity_areas REAL,
  -- Social (S)
  total_employees INTEGER,
  new_hires INTEGER,
  women_pct REAL,
  women_in_management_pct REAL,
  training_hours_per_employee REAL,
  total_training_hours REAL,
  workplace_accidents INTEGER,
  accident_frequency_rate REAL,
  employee_turnover_pct REAL,
  community_investment REAL,
  satisfaction_score REAL,
  -- Gobernanza (G)
  board_size INTEGER,
  board_women_pct REAL,
  independent_directors_pct REAL,
  ethics_violations INTEGER,
  anti_corruption_training_pct REAL,
  sustainability_audits_done INTEGER,
  supplier_esg_audited_pct REAL,
  extra_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_esg_reports_company ON esg_reports(company_name);
CREATE INDEX IF NOT EXISTS idx_esg_reports_year ON esg_reports(report_year);
CREATE INDEX IF NOT EXISTS idx_esg_metrics_company_year ON esg_metrics(company_name, year);
CREATE INDEX IF NOT EXISTS idx_esg_metrics_category ON esg_metrics(category);
CREATE INDEX IF NOT EXISTS idx_carbon_footprint_company_year ON carbon_footprint(company_name, year);
CREATE INDEX IF NOT EXISTS idx_esg_indicators_company_year ON esg_indicators(company_name, year);
