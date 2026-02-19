/**
 * ESG Accounting System – Rutas del servidor
 * Carga de PDFs, extracción de métricas y gestión de huella de carbono
 */

import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db, pool } from "./db";
import {
  esgReports,
  esgMetrics,
  carbonFootprint,
  esgIndicators,
} from "../shared/esg-schema";
import { eq, desc, and } from "drizzle-orm";

// ─── Auto-crear tablas ESG si no existen ─────────────────────────────────────
async function initEsgTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS esg_reports (
        id SERIAL PRIMARY KEY, file_name TEXT NOT NULL, original_name TEXT NOT NULL,
        company_name TEXT NOT NULL, report_year INTEGER NOT NULL, report_period TEXT,
        framework TEXT, extracted_text TEXT, status TEXT DEFAULT 'completed',
        notes TEXT, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS esg_metrics (
        id SERIAL PRIMARY KEY, report_id INTEGER REFERENCES esg_reports(id) ON DELETE CASCADE,
        company_name TEXT NOT NULL, year INTEGER NOT NULL, category TEXT NOT NULL,
        subcategory TEXT, indicator TEXT NOT NULL, value REAL, unit TEXT,
        source TEXT DEFAULT 'manual', notes TEXT, created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS carbon_footprint (
        id SERIAL PRIMARY KEY, report_id INTEGER REFERENCES esg_reports(id) ON DELETE SET NULL,
        company_name TEXT NOT NULL, year INTEGER NOT NULL,
        scope1_total REAL DEFAULT 0, scope1_combustion REAL DEFAULT 0,
        scope1_fugitive_emissions REAL DEFAULT 0, scope1_process_emissions REAL DEFAULT 0,
        scope1_fleet REAL DEFAULT 0, scope2_total REAL DEFAULT 0,
        scope2_electricity REAL DEFAULT 0, scope2_heat REAL DEFAULT 0,
        scope2_steam REAL DEFAULT 0, scope3_total REAL DEFAULT 0,
        scope3_business_travel REAL DEFAULT 0, scope3_employee_commuting REAL DEFAULT 0,
        scope3_purchased_goods REAL DEFAULT 0, scope3_waste REAL DEFAULT 0,
        scope3_upstream_transport REAL DEFAULT 0, scope3_downstream_transport REAL DEFAULT 0,
        scope3_use_of_products REAL DEFAULT 0, total_emissions REAL DEFAULT 0,
        emissions_intensity_revenue REAL, emissions_intensity_employee REAL,
        reduction_target_pct REAL, baseline_year INTEGER, reduction_vs_baseline REAL,
        created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS esg_indicators (
        id SERIAL PRIMARY KEY, report_id INTEGER REFERENCES esg_reports(id) ON DELETE SET NULL,
        company_name TEXT NOT NULL, year INTEGER NOT NULL,
        total_energy_consumption REAL, renewable_energy_pct REAL, energy_intensity REAL,
        total_water_consumption REAL, water_recycled_pct REAL, total_waste_generated REAL,
        waste_recycled_pct REAL, hazardous_waste REAL, total_emissions REAL,
        scope1_emissions REAL, scope2_emissions REAL, scope3_emissions REAL,
        biodiversity_areas REAL, total_employees INTEGER, new_hires INTEGER,
        women_pct REAL, women_in_management_pct REAL, training_hours_per_employee REAL,
        total_training_hours REAL, workplace_accidents INTEGER, accident_frequency_rate REAL,
        employee_turnover_pct REAL, community_investment REAL, satisfaction_score REAL,
        board_size INTEGER, board_women_pct REAL, independent_directors_pct REAL,
        ethics_violations INTEGER, anti_corruption_training_pct REAL,
        sustainability_audits_done INTEGER, supplier_esg_audited_pct REAL,
        extra_data JSONB, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("[ESG] Tablas de contabilidad ambiental verificadas ✓");
  } catch (err) {
    console.error("[ESG] Error al inicializar tablas:", err);
  }
}
initEsgTables();

const router = Router();

// ─── Configuración de multer para PDFs ESG ───────────────────────────────────
const esgUploadDir = path.join(process.cwd(), "uploads", "esg");
if (!fs.existsSync(esgUploadDir)) {
  fs.mkdirSync(esgUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, esgUploadDir),
  filename: (_req, file, cb) => {
    const uniqueName = `esg-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [".pdf", ".PDF"];
    const ext = path.extname(file.originalname);
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten archivos PDF"));
    }
  },
});

// ─── Extractor de métricas ESG del texto de un PDF ───────────────────────────
function extractEsgMetricsFromText(
  text: string,
  companyName: string,
  year: number,
  reportId: number
): Array<{
  reportId: number;
  companyName: string;
  year: number;
  category: string;
  subcategory: string;
  indicator: string;
  value: number | null;
  unit: string;
  source: string;
}> {
  const metrics: Array<{
    reportId: number;
    companyName: string;
    year: number;
    category: string;
    subcategory: string;
    indicator: string;
    value: number | null;
    unit: string;
    source: string;
  }> = [];

  const lower = text.toLowerCase();

  // Patrones de búsqueda: [regex, categoría, subcategoría, indicador, unidad]
  const patterns: Array<[RegExp, string, string, string, string]> = [
    // Emisiones de CO2
    [
      /(\d[\d\s.,]+)\s*(?:t|ton(?:eladas)?)\s*(?:de\s+)?co2(?:eq)?/gi,
      "environmental",
      "emissions",
      "Emisiones de CO2eq",
      "tCO2eq",
    ],
    [
      /emissions?[:\s]+(\d[\d\s.,]+)\s*(?:t(?:CO2)?(?:eq)?)/gi,
      "environmental",
      "emissions",
      "Emisiones GEI totales",
      "tCO2eq",
    ],
    [
      /alcance\s*1[:\s]+(\d[\d\s.,]+)\s*(?:t(?:CO2)?(?:eq)?)/gi,
      "environmental",
      "emissions",
      "Alcance 1 – Emisiones directas",
      "tCO2eq",
    ],
    [
      /scope\s*1[:\s]+(\d[\d\s.,]+)\s*(?:t(?:CO2)?(?:eq)?)/gi,
      "environmental",
      "emissions",
      "Alcance 1 – Emisiones directas",
      "tCO2eq",
    ],
    [
      /alcance\s*2[:\s]+(\d[\d\s.,]+)\s*(?:t(?:CO2)?(?:eq)?)/gi,
      "environmental",
      "emissions",
      "Alcance 2 – Electricidad",
      "tCO2eq",
    ],
    [
      /scope\s*2[:\s]+(\d[\d\s.,]+)\s*(?:t(?:CO2)?(?:eq)?)/gi,
      "environmental",
      "emissions",
      "Alcance 2 – Electricidad",
      "tCO2eq",
    ],
    [
      /alcance\s*3[:\s]+(\d[\d\s.,]+)\s*(?:t(?:CO2)?(?:eq)?)/gi,
      "environmental",
      "emissions",
      "Alcance 3 – Cadena de valor",
      "tCO2eq",
    ],
    [
      /scope\s*3[:\s]+(\d[\d\s.,]+)\s*(?:t(?:CO2)?(?:eq)?)/gi,
      "environmental",
      "emissions",
      "Alcance 3 – Cadena de valor",
      "tCO2eq",
    ],

    // Energía
    [
      /consumo\s+energ[eé]tico[:\s]+(\d[\d\s.,]+)\s*(?:mwh|gwh|kwh)/gi,
      "environmental",
      "energy",
      "Consumo energético total",
      "MWh",
    ],
    [
      /energ[ií]a\s+renovable[:\s]+(\d[\d\s.,]+)\s*%/gi,
      "environmental",
      "energy",
      "% Energía renovable",
      "%",
    ],
    [
      /energia\s+renovable[:\s]+(\d[\d\s.,]+)\s*%/gi,
      "environmental",
      "energy",
      "% Energía renovable",
      "%",
    ],
    [
      /(\d[\d\s.,]+)\s*mwh\s+(?:de\s+)?energ[ií]a/gi,
      "environmental",
      "energy",
      "Consumo energético total",
      "MWh",
    ],

    // Agua
    [
      /consumo\s+(?:de\s+)?agua[:\s]+(\d[\d\s.,]+)\s*(?:m[³3]|litros?|l)/gi,
      "environmental",
      "water",
      "Consumo de agua total",
      "m³",
    ],
    [
      /water\s+consumption[:\s]+(\d[\d\s.,]+)/gi,
      "environmental",
      "water",
      "Consumo de agua total",
      "m³",
    ],

    // Residuos
    [
      /residuos?\s+(?:generados?|totales?)[:\s]+(\d[\d\s.,]+)\s*(?:ton(?:eladas)?|t)/gi,
      "environmental",
      "waste",
      "Residuos generados",
      "toneladas",
    ],
    [
      /waste\s+generated[:\s]+(\d[\d\s.,]+)/gi,
      "environmental",
      "waste",
      "Residuos generados",
      "toneladas",
    ],
    [
      /residuos?\s+reciclados?[:\s]+(\d[\d\s.,]+)\s*%/gi,
      "environmental",
      "waste",
      "% Residuos reciclados",
      "%",
    ],

    // Empleados
    [
      /(?:n[ºo°]?\s*de\s+|total\s+|n[uú]mero\s+de\s+)?empleados?[:\s]+(\d[\d\s.,]+)/gi,
      "social",
      "employees",
      "Total de empleados",
      "personas",
    ],
    [
      /employees?[:\s]+(\d[\d\s.,]+)/gi,
      "social",
      "employees",
      "Total de empleados",
      "personas",
    ],
    [
      /mujeres?\s+en\s+la\s+plantilla[:\s]+(\d[\d\s.,]+)\s*%/gi,
      "social",
      "diversity",
      "% Mujeres en plantilla",
      "%",
    ],
    [
      /women\s+employees?[:\s]+(\d[\d\s.,]+)\s*%/gi,
      "social",
      "diversity",
      "% Mujeres en plantilla",
      "%",
    ],

    // Accidentes / seguridad
    [
      /accidentes?\s+laborales?[:\s]+(\d[\d\s.,]+)/gi,
      "social",
      "safety",
      "Accidentes laborales",
      "casos",
    ],
    [
      /workplace\s+accidents?[:\s]+(\d[\d\s.,]+)/gi,
      "social",
      "safety",
      "Accidentes laborales",
      "casos",
    ],
    [
      /horas\s+de\s+formaci[oó]n[:\s]+(\d[\d\s.,]+)/gi,
      "social",
      "training",
      "Horas de formación por empleado",
      "horas",
    ],

    // Gobernanza
    [
      /miembros?\s+(?:del?\s+)?directorio[:\s]+(\d[\d\s.,]+)/gi,
      "governance",
      "board",
      "Tamaño del directorio",
      "personas",
    ],
    [
      /mujeres?\s+en\s+(?:el\s+)?directorio[:\s]+(\d[\d\s.,]+)\s*%/gi,
      "governance",
      "board",
      "% Mujeres en directorio",
      "%",
    ],
    [
      /directores?\s+independientes?[:\s]+(\d[\d\s.,]+)\s*%/gi,
      "governance",
      "board",
      "% Directores independientes",
      "%",
    ],
  ];

  const seen = new Set<string>();

  for (const [regex, category, subcategory, indicator, unit] of patterns) {
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const rawVal = match[1]
        .replace(/\s/g, "")
        .replace(",", ".")
        .replace(/\.(?=.*\.)/g, ""); // quitar puntos de miles
      const value = parseFloat(rawVal);
      if (isNaN(value)) continue;

      const key = `${indicator}-${value}`;
      if (seen.has(key)) continue;
      seen.add(key);

      metrics.push({
        reportId,
        companyName,
        year,
        category,
        subcategory,
        indicator,
        value,
        unit,
        source: "pdf_extracted",
      });
    }
  }

  return metrics;
}

// ─── RUTAS ────────────────────────────────────────────────────────────────────

// POST /api/esg/reports/upload – Cargar PDF ESG
router.post(
  "/reports/upload",
  upload.single("pdf"),
  async (req: Request, res: Response) => {
    try {
      const {
        companyName,
        reportYear,
        reportPeriod,
        framework,
        notes,
      } = req.body;

      if (!companyName || !reportYear) {
        return res
          .status(400)
          .json({ error: "companyName y reportYear son obligatorios" });
      }

      const year = parseInt(reportYear, 10);
      let extractedText = "";
      let fileName = "";
      let originalName = "";

      // Si se subió un PDF, extraer texto
      if (req.file) {
        fileName = req.file.filename;
        originalName = req.file.originalname;

        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const pdfParse = require("pdf-parse");
          const fileBuffer = fs.readFileSync(req.file.path);
          const pdfData = await pdfParse(fileBuffer);
          extractedText = pdfData.text || "";
        } catch {
          extractedText = "";
        }
      } else {
        // Sin archivo: solo crear el reporte con datos del formulario
        fileName = `manual-${Date.now()}.txt`;
        originalName = "Entrada manual";
      }

      // Insertar reporte
      const [report] = await db
        .insert(esgReports)
        .values({
          fileName,
          originalName,
          companyName,
          reportYear: year,
          reportPeriod: reportPeriod || String(year),
          framework: framework || "GRI",
          extractedText,
          status: "completed",
          notes: notes || null,
        })
        .returning();

      // Si hay texto extraído, buscar métricas automáticamente
      if (extractedText.length > 100) {
        const metrics = extractEsgMetricsFromText(
          extractedText,
          companyName,
          year,
          report.id
        );
        if (metrics.length > 0) {
          await db.insert(esgMetrics).values(metrics);
        }
      }

      res.json({
        success: true,
        report,
        extractedMetricsCount: extractedText.length > 100 ? "auto" : 0,
      });
    } catch (err: any) {
      console.error("[ESG] Error al cargar PDF:", err);
      res.status(500).json({ error: err.message || "Error al procesar PDF" });
    }
  }
);

// GET /api/esg/reports – Listar todos los reportes
router.get("/reports", async (_req: Request, res: Response) => {
  try {
    const reports = await db
      .select()
      .from(esgReports)
      .orderBy(desc(esgReports.createdAt));
    res.json(reports);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/esg/reports/:id – Obtener reporte con sus métricas
router.get("/reports/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [report] = await db
      .select()
      .from(esgReports)
      .where(eq(esgReports.id, id));
    if (!report) return res.status(404).json({ error: "Reporte no encontrado" });

    const metrics = await db
      .select()
      .from(esgMetrics)
      .where(eq(esgMetrics.reportId, id));

    res.json({ ...report, metrics });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/esg/reports/:id
router.delete("/reports/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    await db.delete(esgReports).where(eq(esgReports.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Métricas ─────────────────────────────────────────────────────────────────

// GET /api/esg/metrics?companyName=&year=&category=
router.get("/metrics", async (req: Request, res: Response) => {
  try {
    const { companyName, year, category } = req.query;
    const conditions = [];
    if (companyName)
      conditions.push(eq(esgMetrics.companyName, companyName as string));
    if (year)
      conditions.push(eq(esgMetrics.year, parseInt(year as string, 10)));
    if (category)
      conditions.push(eq(esgMetrics.category, category as string));

    const rows =
      conditions.length > 0
        ? await db
            .select()
            .from(esgMetrics)
            .where(and(...conditions))
            .orderBy(desc(esgMetrics.createdAt))
        : await db
            .select()
            .from(esgMetrics)
            .orderBy(desc(esgMetrics.createdAt));

    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/esg/metrics – Crear métrica manual
router.post("/metrics", async (req: Request, res: Response) => {
  try {
    const {
      reportId,
      companyName,
      year,
      category,
      subcategory,
      indicator,
      value,
      unit,
      notes,
    } = req.body;

    if (!companyName || !year || !category || !indicator) {
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    const [metric] = await db
      .insert(esgMetrics)
      .values({
        reportId: reportId || null,
        companyName,
        year: parseInt(year, 10),
        category,
        subcategory: subcategory || null,
        indicator,
        value: value !== undefined && value !== "" ? parseFloat(value) : null,
        unit: unit || null,
        source: "manual",
        notes: notes || null,
      })
      .returning();

    res.json(metric);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/esg/metrics/:id
router.put("/metrics/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { value, unit, notes, indicator } = req.body;
    const [updated] = await db
      .update(esgMetrics)
      .set({
        value: value !== undefined ? parseFloat(value) : undefined,
        unit,
        notes,
        indicator,
      })
      .where(eq(esgMetrics.id, id))
      .returning();
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/esg/metrics/:id
router.delete("/metrics/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    await db.delete(esgMetrics).where(eq(esgMetrics.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Huella de Carbono ────────────────────────────────────────────────────────

// GET /api/esg/carbon-footprint?companyName=&year=
router.get("/carbon-footprint", async (req: Request, res: Response) => {
  try {
    const { companyName, year } = req.query;
    const conditions = [];
    if (companyName)
      conditions.push(
        eq(carbonFootprint.companyName, companyName as string)
      );
    if (year)
      conditions.push(
        eq(carbonFootprint.year, parseInt(year as string, 10))
      );

    const rows =
      conditions.length > 0
        ? await db
            .select()
            .from(carbonFootprint)
            .where(and(...conditions))
            .orderBy(desc(carbonFootprint.year))
        : await db
            .select()
            .from(carbonFootprint)
            .orderBy(desc(carbonFootprint.year));

    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/esg/carbon-footprint – Crear/actualizar huella de carbono
router.post("/carbon-footprint", async (req: Request, res: Response) => {
  try {
    const data = req.body;
    if (!data.companyName || !data.year) {
      return res
        .status(400)
        .json({ error: "companyName y year son obligatorios" });
    }

    // Calcular totales automáticamente
    const scope1Total =
      (parseFloat(data.scope1Combustion) || 0) +
      (parseFloat(data.scope1FugitiveEmissions) || 0) +
      (parseFloat(data.scope1ProcessEmissions) || 0) +
      (parseFloat(data.scope1Fleet) || 0);

    const scope2Total =
      (parseFloat(data.scope2Electricity) || 0) +
      (parseFloat(data.scope2Heat) || 0) +
      (parseFloat(data.scope2Steam) || 0);

    const scope3Total =
      (parseFloat(data.scope3BusinessTravel) || 0) +
      (parseFloat(data.scope3EmployeeCommuting) || 0) +
      (parseFloat(data.scope3PurchasedGoods) || 0) +
      (parseFloat(data.scope3Waste) || 0) +
      (parseFloat(data.scope3UpstreamTransport) || 0) +
      (parseFloat(data.scope3DownstreamTransport) || 0) +
      (parseFloat(data.scope3UseOfProducts) || 0);

    const totalEmissions = scope1Total + scope2Total + scope3Total;

    const payload = {
      reportId: data.reportId ? parseInt(data.reportId) : null,
      companyName: data.companyName,
      year: parseInt(data.year),
      scope1Total,
      scope1Combustion: parseFloat(data.scope1Combustion) || 0,
      scope1FugitiveEmissions: parseFloat(data.scope1FugitiveEmissions) || 0,
      scope1ProcessEmissions: parseFloat(data.scope1ProcessEmissions) || 0,
      scope1Fleet: parseFloat(data.scope1Fleet) || 0,
      scope2Total,
      scope2Electricity: parseFloat(data.scope2Electricity) || 0,
      scope2Heat: parseFloat(data.scope2Heat) || 0,
      scope2Steam: parseFloat(data.scope2Steam) || 0,
      scope3Total,
      scope3BusinessTravel: parseFloat(data.scope3BusinessTravel) || 0,
      scope3EmployeeCommuting: parseFloat(data.scope3EmployeeCommuting) || 0,
      scope3PurchasedGoods: parseFloat(data.scope3PurchasedGoods) || 0,
      scope3Waste: parseFloat(data.scope3Waste) || 0,
      scope3UpstreamTransport: parseFloat(data.scope3UpstreamTransport) || 0,
      scope3DownstreamTransport:
        parseFloat(data.scope3DownstreamTransport) || 0,
      scope3UseOfProducts: parseFloat(data.scope3UseOfProducts) || 0,
      totalEmissions,
      emissionsIntensityRevenue: data.emissionsIntensityRevenue
        ? parseFloat(data.emissionsIntensityRevenue)
        : null,
      emissionsIntensityEmployee: data.emissionsIntensityEmployee
        ? parseFloat(data.emissionsIntensityEmployee)
        : null,
      reductionTargetPct: data.reductionTargetPct
        ? parseFloat(data.reductionTargetPct)
        : null,
      baselineYear: data.baselineYear ? parseInt(data.baselineYear) : null,
      reductionVsBaseline: data.reductionVsBaseline
        ? parseFloat(data.reductionVsBaseline)
        : null,
    };

    const [record] = await db
      .insert(carbonFootprint)
      .values(payload)
      .returning();

    res.json(record);
  } catch (err: any) {
    console.error("[ESG] Error huella:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/esg/carbon-footprint/:id
router.put("/carbon-footprint/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = req.body;

    const scope1Total =
      (parseFloat(data.scope1Combustion) || 0) +
      (parseFloat(data.scope1FugitiveEmissions) || 0) +
      (parseFloat(data.scope1ProcessEmissions) || 0) +
      (parseFloat(data.scope1Fleet) || 0);

    const scope2Total =
      (parseFloat(data.scope2Electricity) || 0) +
      (parseFloat(data.scope2Heat) || 0) +
      (parseFloat(data.scope2Steam) || 0);

    const scope3Total =
      (parseFloat(data.scope3BusinessTravel) || 0) +
      (parseFloat(data.scope3EmployeeCommuting) || 0) +
      (parseFloat(data.scope3PurchasedGoods) || 0) +
      (parseFloat(data.scope3Waste) || 0) +
      (parseFloat(data.scope3UpstreamTransport) || 0) +
      (parseFloat(data.scope3DownstreamTransport) || 0) +
      (parseFloat(data.scope3UseOfProducts) || 0);

    const [updated] = await db
      .update(carbonFootprint)
      .set({
        ...data,
        scope1Total,
        scope2Total,
        scope3Total,
        totalEmissions: scope1Total + scope2Total + scope3Total,
        updatedAt: new Date(),
      })
      .where(eq(carbonFootprint.id, id))
      .returning();

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Indicadores ESG consolidados ─────────────────────────────────────────────

// GET /api/esg/indicators?companyName=&year=
router.get("/indicators", async (req: Request, res: Response) => {
  try {
    const { companyName, year } = req.query;
    const conditions = [];
    if (companyName)
      conditions.push(eq(esgIndicators.companyName, companyName as string));
    if (year)
      conditions.push(
        eq(esgIndicators.year, parseInt(year as string, 10))
      );

    const rows =
      conditions.length > 0
        ? await db
            .select()
            .from(esgIndicators)
            .where(and(...conditions))
            .orderBy(desc(esgIndicators.year))
        : await db
            .select()
            .from(esgIndicators)
            .orderBy(desc(esgIndicators.year));

    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/esg/indicators
router.post("/indicators", async (req: Request, res: Response) => {
  try {
    const data = req.body;
    if (!data.companyName || !data.year) {
      return res
        .status(400)
        .json({ error: "companyName y year son obligatorios" });
    }

    // Convertir todos los campos numéricos
    const toNum = (v: any) =>
      v !== undefined && v !== "" ? parseFloat(v) : null;
    const toInt = (v: any) =>
      v !== undefined && v !== "" ? parseInt(v, 10) : null;

    const [record] = await db
      .insert(esgIndicators)
      .values({
        reportId: data.reportId ? parseInt(data.reportId) : null,
        companyName: data.companyName,
        year: parseInt(data.year),
        totalEnergyConsumption: toNum(data.totalEnergyConsumption),
        renewableEnergyPct: toNum(data.renewableEnergyPct),
        energyIntensity: toNum(data.energyIntensity),
        totalWaterConsumption: toNum(data.totalWaterConsumption),
        waterRecycledPct: toNum(data.waterRecycledPct),
        totalWasteGenerated: toNum(data.totalWasteGenerated),
        wasteRecycledPct: toNum(data.wasteRecycledPct),
        hazardousWaste: toNum(data.hazardousWaste),
        totalEmissions: toNum(data.totalEmissions),
        scope1Emissions: toNum(data.scope1Emissions),
        scope2Emissions: toNum(data.scope2Emissions),
        scope3Emissions: toNum(data.scope3Emissions),
        biodiversityAreas: toNum(data.biodiversityAreas),
        totalEmployees: toInt(data.totalEmployees),
        newHires: toInt(data.newHires),
        womenPct: toNum(data.womenPct),
        womenInManagementPct: toNum(data.womenInManagementPct),
        trainingHoursPerEmployee: toNum(data.trainingHoursPerEmployee),
        totalTrainingHours: toNum(data.totalTrainingHours),
        workplaceAccidents: toInt(data.workplaceAccidents),
        accidentFrequencyRate: toNum(data.accidentFrequencyRate),
        employeeTurnoverPct: toNum(data.employeeTurnoverPct),
        communityInvestment: toNum(data.communityInvestment),
        satisfactionScore: toNum(data.satisfactionScore),
        boardSize: toInt(data.boardSize),
        boardWomenPct: toNum(data.boardWomenPct),
        independentDirectorsPct: toNum(data.independentDirectorsPct),
        ethicsViolations: toInt(data.ethicsViolations),
        antiCorruptionTrainingPct: toNum(data.antiCorruptionTrainingPct),
        sustainabilityAuditsDone: toInt(data.sustainabilityAuditsDone),
        supplierEsgAuditedPct: toNum(data.supplierEsgAuditedPct),
      })
      .returning();

    res.json(record);
  } catch (err: any) {
    console.error("[ESG] Error indicadores:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Dashboard resumen ─────────────────────────────────────────────────────────

// GET /api/esg/dashboard?companyName=
router.get("/dashboard", async (req: Request, res: Response) => {
  try {
    const { companyName } = req.query;

    const cond = companyName
      ? eq(esgReports.companyName, companyName as string)
      : undefined;

    const reports = cond
      ? await db.select().from(esgReports).where(cond).orderBy(desc(esgReports.reportYear))
      : await db.select().from(esgReports).orderBy(desc(esgReports.reportYear));

    const footprints = companyName
      ? await db
          .select()
          .from(carbonFootprint)
          .where(eq(carbonFootprint.companyName, companyName as string))
          .orderBy(desc(carbonFootprint.year))
      : await db.select().from(carbonFootprint).orderBy(desc(carbonFootprint.year));

    const indicators = companyName
      ? await db
          .select()
          .from(esgIndicators)
          .where(eq(esgIndicators.companyName, companyName as string))
          .orderBy(desc(esgIndicators.year))
      : await db.select().from(esgIndicators).orderBy(desc(esgIndicators.year));

    const metrics = companyName
      ? await db
          .select()
          .from(esgMetrics)
          .where(eq(esgMetrics.companyName, companyName as string))
          .orderBy(desc(esgMetrics.createdAt))
      : await db.select().from(esgMetrics).orderBy(desc(esgMetrics.createdAt));

    // Calcular totales de emisiones del último año
    const latestFootprint = footprints[0] || null;

    res.json({
      totalReports: reports.length,
      latestReport: reports[0] || null,
      latestFootprint,
      footprintHistory: footprints.slice(0, 10),
      indicatorsHistory: indicators.slice(0, 10),
      latestIndicators: indicators[0] || null,
      recentMetrics: metrics.slice(0, 20),
      summary: {
        totalEmissions: latestFootprint?.totalEmissions ?? 0,
        scope1: latestFootprint?.scope1Total ?? 0,
        scope2: latestFootprint?.scope2Total ?? 0,
        scope3: latestFootprint?.scope3Total ?? 0,
        totalEnergy: indicators[0]?.totalEnergyConsumption ?? 0,
        renewableEnergyPct: indicators[0]?.renewableEnergyPct ?? 0,
        totalWater: indicators[0]?.totalWaterConsumption ?? 0,
        totalWaste: indicators[0]?.totalWasteGenerated ?? 0,
        totalEmployees: indicators[0]?.totalEmployees ?? 0,
        womenPct: indicators[0]?.womenPct ?? 0,
      },
    });
  } catch (err: any) {
    console.error("[ESG] Error dashboard:", err);
    res.status(500).json({ error: err.message });
  }
});

export const esgRouter = router;
