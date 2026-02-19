import {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
  real,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── ESG Reports ──────────────────────────────────────────────────────────────
// Almacena los reportes ESG cargados (PDF u otros)
export const esgReports = pgTable("esg_reports", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  companyName: text("company_name").notNull(),
  reportYear: integer("report_year").notNull(),
  reportPeriod: text("report_period"), // "2024", "Q1-2024", etc.
  framework: text("framework"), // GRI, SASB, TCFD, CDP, GHG Protocol, etc.
  extractedText: text("extracted_text"),
  status: text("status").default("completed"), // processing, completed, error
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEsgReportSchema = createInsertSchema(esgReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertEsgReport = z.infer<typeof insertEsgReportSchema>;
export type EsgReport = typeof esgReports.$inferSelect;

// ─── ESG Metrics ──────────────────────────────────────────────────────────────
// Métricas individuales extraídas o ingresadas manualmente
export const esgMetrics = pgTable("esg_metrics", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").references(() => esgReports.id, {
    onDelete: "cascade",
  }),
  companyName: text("company_name").notNull(),
  year: integer("year").notNull(),
  category: text("category").notNull(), // environmental, social, governance
  subcategory: text("subcategory"), // energy, water, waste, emissions, employees, etc.
  indicator: text("indicator").notNull(), // nombre del indicador
  value: real("value"),
  unit: text("unit"), // MWh, m3, tCO2eq, %, personas, horas, etc.
  source: text("source").default("manual"), // manual, pdf_extracted
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEsgMetricSchema = createInsertSchema(esgMetrics).omit({
  id: true,
  createdAt: true,
});
export type InsertEsgMetric = z.infer<typeof insertEsgMetricSchema>;
export type EsgMetric = typeof esgMetrics.$inferSelect;

// ─── Carbon Footprint (Huella de Carbono) ─────────────────────────────────────
// Protocolo GHG: Alcance 1, 2 y 3
export const carbonFootprint = pgTable("carbon_footprint", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").references(() => esgReports.id, {
    onDelete: "set null",
  }),
  companyName: text("company_name").notNull(),
  year: integer("year").notNull(),

  // Alcance 1 – Emisiones directas (tCO2eq)
  scope1Total: real("scope1_total").default(0),
  scope1Combustion: real("scope1_combustion").default(0),
  scope1FugitiveEmissions: real("scope1_fugitive_emissions").default(0),
  scope1ProcessEmissions: real("scope1_process_emissions").default(0),
  scope1Fleet: real("scope1_fleet").default(0),

  // Alcance 2 – Emisiones indirectas por energía (tCO2eq)
  scope2Total: real("scope2_total").default(0),
  scope2Electricity: real("scope2_electricity").default(0),
  scope2Heat: real("scope2_heat").default(0),
  scope2Steam: real("scope2_steam").default(0),

  // Alcance 3 – Otras emisiones indirectas (tCO2eq)
  scope3Total: real("scope3_total").default(0),
  scope3BusinessTravel: real("scope3_business_travel").default(0),
  scope3EmployeeCommuting: real("scope3_employee_commuting").default(0),
  scope3PurchasedGoods: real("scope3_purchased_goods").default(0),
  scope3Waste: real("scope3_waste").default(0),
  scope3UpstreamTransport: real("scope3_upstream_transport").default(0),
  scope3DownstreamTransport: real("scope3_downstream_transport").default(0),
  scope3UseOfProducts: real("scope3_use_of_products").default(0),

  // Totales
  totalEmissions: real("total_emissions").default(0), // tCO2eq
  emissionsIntensityRevenue: real("emissions_intensity_revenue"), // tCO2eq / millón USD
  emissionsIntensityEmployee: real("emissions_intensity_employee"), // tCO2eq / empleado
  reductionTargetPct: real("reduction_target_pct"), // % meta reducción
  baselineYear: integer("baseline_year"),
  reductionVsBaseline: real("reduction_vs_baseline"), // % reducción vs año base

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCarbonFootprintSchema = createInsertSchema(
  carbonFootprint
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCarbonFootprint = z.infer<typeof insertCarbonFootprintSchema>;
export type CarbonFootprint = typeof carbonFootprint.$inferSelect;

// ─── ESG Indicators (Resumen consolidado) ─────────────────────────────────────
export const esgIndicators = pgTable("esg_indicators", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").references(() => esgReports.id, {
    onDelete: "set null",
  }),
  companyName: text("company_name").notNull(),
  year: integer("year").notNull(),

  // Ambiental (E)
  totalEnergyConsumption: real("total_energy_consumption"), // MWh
  renewableEnergyPct: real("renewable_energy_pct"), // %
  energyIntensity: real("energy_intensity"), // MWh / unidad producción
  totalWaterConsumption: real("total_water_consumption"), // m³
  waterRecycledPct: real("water_recycled_pct"), // %
  totalWasteGenerated: real("total_waste_generated"), // toneladas
  wasteRecycledPct: real("waste_recycled_pct"), // %
  hazardousWaste: real("hazardous_waste"), // toneladas
  totalEmissions: real("total_emissions"), // tCO2eq
  scope1Emissions: real("scope1_emissions"), // tCO2eq
  scope2Emissions: real("scope2_emissions"), // tCO2eq
  scope3Emissions: real("scope3_emissions"), // tCO2eq
  biodiversityAreas: real("biodiversity_areas"), // hectáreas protegidas

  // Social (S)
  totalEmployees: integer("total_employees"),
  newHires: integer("new_hires"),
  womenPct: real("women_pct"), // %
  womenInManagementPct: real("women_in_management_pct"), // %
  trainingHoursPerEmployee: real("training_hours_per_employee"),
  totalTrainingHours: real("total_training_hours"),
  workplaceAccidents: integer("workplace_accidents"),
  accidentFrequencyRate: real("accident_frequency_rate"),
  employeeTurnoverPct: real("employee_turnover_pct"), // %
  communityInvestment: real("community_investment"), // CLP / USD
  satisfactionScore: real("satisfaction_score"), // 0-10

  // Gobernanza (G)
  boardSize: integer("board_size"),
  boardWomenPct: real("board_women_pct"), // %
  independentDirectorsPct: real("independent_directors_pct"), // %
  ethicsViolations: integer("ethics_violations"),
  antiCorruptionTrainingPct: real("anti_corruption_training_pct"), // %
  sustainabilityAuditsDone: integer("sustainability_audits_done"),
  supplierEsgAuditedPct: real("supplier_esg_audited_pct"), // %
  extraData: jsonb("extra_data"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEsgIndicatorsSchema = createInsertSchema(
  esgIndicators
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertEsgIndicators = z.infer<typeof insertEsgIndicatorsSchema>;
export type EsgIndicators = typeof esgIndicators.$inferSelect;
