/**
 * ESG Dashboard – Tablero principal de Contabilidad Ambiental
 * Visualiza emisiones de carbono, indicadores E-S-G y tendencias
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Leaf,
  Users,
  Building2,
  CloudRain,
  Droplets,
  Trash2,
  Zap,
  FileText,
  Upload,
  TrendingDown,
  Award,
  BarChart2,
  ChevronRight,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface DashboardData {
  totalReports: number;
  latestReport: any;
  latestFootprint: any;
  footprintHistory: any[];
  indicatorsHistory: any[];
  latestIndicators: any;
  recentMetrics: any[];
  summary: {
    totalEmissions: number;
    scope1: number;
    scope2: number;
    scope3: number;
    totalEnergy: number;
    renewableEnergyPct: number;
    totalWater: number;
    totalWaste: number;
    totalEmployees: number;
    womenPct: number;
  };
}

// ─── Colores ──────────────────────────────────────────────────────────────────
const SCOPE_COLORS = ["#16a34a", "#2563eb", "#9333ea"];
const ENV_COLOR = "#16a34a";
const SOC_COLOR = "#2563eb";
const GOV_COLOR = "#f59e0b";

// ─── Utilidades ───────────────────────────────────────────────────────────────
function fmt(n: number | undefined | null, decimals = 1): string {
  if (n === undefined || n === null || isNaN(Number(n))) return "—";
  return Number(n).toLocaleString("es-CL", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// ─── Tarjeta métrica ──────────────────────────────────────────────────────────
function MetricCard({
  icon: Icon,
  label,
  value,
  unit,
  color = "green",
  trend,
}: {
  icon: any;
  label: string;
  value: string;
  unit: string;
  color?: "green" | "blue" | "amber" | "red" | "purple";
  trend?: string;
}) {
  const colors: Record<string, string> = {
    green: "bg-green-50 text-green-700 border-green-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    red: "bg-red-50 text-red-700 border-red-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
  };
  const iconColors: Record<string, string> = {
    green: "text-green-600",
    blue: "text-blue-600",
    amber: "text-amber-600",
    red: "text-red-600",
    purple: "text-purple-600",
  };

  return (
    <div
      className={`rounded-xl border p-4 ${colors[color]} flex flex-col gap-2`}
    >
      <div className="flex items-center gap-2">
        <Icon size={18} className={iconColors[color]} />
        <span className="text-xs font-medium uppercase tracking-wide opacity-70">
          {label}
        </span>
      </div>
      <div className="flex items-end gap-1">
        <span className="text-2xl font-bold">{value}</span>
        <span className="text-sm opacity-60 mb-1">{unit}</span>
      </div>
      {trend && (
        <span className="text-xs opacity-60 flex items-center gap-1">
          <TrendingDown size={12} /> {trend}
        </span>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function EsgDashboard() {
  const [company, setCompany] = useState("");

  const { data, isLoading, isError } = useQuery<DashboardData>({
    queryKey: ["/api/esg/dashboard", company],
    queryFn: async () => {
      const url = company
        ? `/api/esg/dashboard?companyName=${encodeURIComponent(company)}`
        : "/api/esg/dashboard";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Error al cargar dashboard");
      return res.json();
    },
  });

  // Preparar datos para gráficos
  const scopeData = data
    ? [
        { name: "Alcance 1", value: data.summary.scope1, fill: SCOPE_COLORS[0] },
        { name: "Alcance 2", value: data.summary.scope2, fill: SCOPE_COLORS[1] },
        { name: "Alcance 3", value: data.summary.scope3, fill: SCOPE_COLORS[2] },
      ]
    : [];

  const emissionsTrend = data?.footprintHistory
    .slice()
    .reverse()
    .map((f: any) => ({
      year: f.year,
      "Alcance 1": f.scope1Total || 0,
      "Alcance 2": f.scope2Total || 0,
      "Alcance 3": f.scope3Total || 0,
      Total: f.totalEmissions || 0,
    }));

  const envTrend = data?.indicatorsHistory
    .slice()
    .reverse()
    .map((i: any) => ({
      year: i.year,
      Energía: i.totalEnergyConsumption || 0,
      Agua: i.totalWaterConsumption || 0,
      Residuos: i.totalWasteGenerated || 0,
    }));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500 text-sm animate-pulse">Cargando datos ESG…</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600 text-sm">
          Error al conectar con el servidor ESG. Asegúrese de que la base de datos esté activa.
        </div>
      </div>
    );
  }

  const s = data?.summary;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 rounded-xl p-2">
              <Leaf className="text-green-700" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Contabilidad Ambiental ESG
              </h1>
              <p className="text-xs text-gray-500">
                Huella de carbono · Indicadores ambientales, sociales y de gobernanza
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Filtrar por empresa…"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <Link href="/esg/upload">
              <a className="flex items-center gap-2 bg-green-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-green-700 transition-colors">
                <Upload size={15} />
                Cargar PDF
              </a>
            </Link>
            <Link href="/esg/carbon-footprint">
              <a className="flex items-center gap-2 border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                <CloudRain size={15} />
                Huella de Carbono
              </a>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* KPIs */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Leaf size={14} className="text-green-600" /> Resumen Ambiental (E)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              icon={CloudRain}
              label="Emisiones totales"
              value={fmt(s?.totalEmissions, 0)}
              unit="tCO2eq"
              color="red"
            />
            <MetricCard
              icon={Zap}
              label="Consumo energético"
              value={fmt(s?.totalEnergy, 0)}
              unit="MWh"
              color="amber"
            />
            <MetricCard
              icon={Droplets}
              label="Consumo de agua"
              value={fmt(s?.totalWater, 0)}
              unit="m³"
              color="blue"
            />
            <MetricCard
              icon={Trash2}
              label="Residuos generados"
              value={fmt(s?.totalWaste, 0)}
              unit="ton"
              color="purple"
            />
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Users size={14} className="text-blue-600" /> Resumen Social (S) y Gobernanza (G)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              icon={Users}
              label="Total empleados"
              value={fmt(s?.totalEmployees, 0)}
              unit="personas"
              color="blue"
            />
            <MetricCard
              icon={Award}
              label="% Mujeres"
              value={fmt(s?.womenPct, 1)}
              unit="%"
              color="purple"
            />
            <MetricCard
              icon={Leaf}
              label="Energía renovable"
              value={fmt(s?.renewableEnergyPct, 1)}
              unit="%"
              color="green"
            />
            <MetricCard
              icon={FileText}
              label="Reportes ESG"
              value={String(data?.totalReports ?? 0)}
              unit="cargados"
              color="amber"
            />
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie: distribución de alcances */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <CloudRain size={15} className="text-green-600" />
              Distribución Huella de Carbono (Alcances)
            </h3>
            {s && s.totalEmissions > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={scopeData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(1)}%`
                    }
                    labelLine={false}
                  >
                    {scopeData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: any) =>
                      `${Number(v).toLocaleString("es-CL")} tCO2eq`
                    }
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart message="Sin datos de emisiones. Cargue un reporte o ingrese la huella de carbono." />
            )}
          </div>

          {/* Bar: tendencia emisiones por año */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <BarChart2 size={15} className="text-blue-600" />
              Tendencia de Emisiones por Año
            </h3>
            {emissionsTrend && emissionsTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={emissionsTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(v: any) =>
                      `${Number(v).toLocaleString("es-CL")} tCO2eq`
                    }
                  />
                  <Legend />
                  <Bar dataKey="Alcance 1" fill={SCOPE_COLORS[0]} radius={[4,4,0,0]} />
                  <Bar dataKey="Alcance 2" fill={SCOPE_COLORS[1]} radius={[4,4,0,0]} />
                  <Bar dataKey="Alcance 3" fill={SCOPE_COLORS[2]} radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart message="Sin historial de emisiones. Ingrese datos de años anteriores." />
            )}
          </div>

          {/* Line: tendencia energía / agua / residuos */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Zap size={15} className="text-amber-600" />
              Tendencia de Indicadores Ambientales
            </h3>
            {envTrend && envTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={envTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="Energía" stroke={ENV_COLOR} strokeWidth={2} dot />
                  <Line type="monotone" dataKey="Agua" stroke={SOC_COLOR} strokeWidth={2} dot />
                  <Line type="monotone" dataKey="Residuos" stroke={GOV_COLOR} strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart message="Sin historial de indicadores. Ingrese datos a través de Reportes ESG." />
            )}
          </div>

          {/* Últimas métricas extraídas */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <FileText size={15} className="text-gray-600" />
              Métricas recientes extraídas
            </h3>
            {data?.recentMetrics && data.recentMetrics.length > 0 ? (
              <div className="overflow-auto max-h-52">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-100">
                      <th className="text-left py-1 pr-2">Indicador</th>
                      <th className="text-right pr-2">Valor</th>
                      <th className="text-left">Unidad</th>
                      <th className="text-center">Año</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentMetrics.slice(0, 15).map((m: any) => (
                      <tr
                        key={m.id}
                        className="border-b border-gray-50 hover:bg-gray-50"
                      >
                        <td className="py-1 pr-2 font-medium text-gray-800">
                          {m.indicator}
                        </td>
                        <td className="text-right pr-2 tabular-nums text-gray-700">
                          {fmt(m.value, 2)}
                        </td>
                        <td className="text-gray-500">{m.unit}</td>
                        <td className="text-center text-gray-500">{m.year}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyChart message="Sin métricas. Cargue un PDF ESG para extraer métricas automáticamente." />
            )}
          </div>
        </div>

        {/* Accesos rápidos */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            Accesos rápidos
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <QuickLink
              href="/esg/upload"
              icon={Upload}
              title="Cargar Reporte PDF"
              desc="Sube un informe ESG en PDF para extraer métricas automáticamente"
              color="green"
            />
            <QuickLink
              href="/esg/carbon-footprint"
              icon={CloudRain}
              title="Huella de Carbono"
              desc="Registra emisiones Alcance 1, 2 y 3 (Protocolo GHG)"
              color="blue"
            />
            <QuickLink
              href="/esg/upload"
              icon={Building2}
              title="Indicadores ESG"
              desc="Ingresa indicadores ambientales, sociales y de gobernanza"
              color="amber"
            />
          </div>
        </div>

        {/* Último reporte */}
        {data?.latestReport && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <FileText size={15} /> Último reporte cargado
            </h3>
            <div className="flex flex-wrap gap-6 text-sm text-gray-600">
              <div>
                <span className="text-gray-400 text-xs">Empresa</span>
                <p className="font-medium text-gray-800">
                  {data.latestReport.companyName}
                </p>
              </div>
              <div>
                <span className="text-gray-400 text-xs">Año</span>
                <p className="font-medium text-gray-800">
                  {data.latestReport.reportYear}
                </p>
              </div>
              <div>
                <span className="text-gray-400 text-xs">Marco</span>
                <p className="font-medium text-gray-800">
                  {data.latestReport.framework || "—"}
                </p>
              </div>
              <div>
                <span className="text-gray-400 text-xs">Archivo</span>
                <p className="font-medium text-gray-800">
                  {data.latestReport.originalName}
                </p>
              </div>
              <div>
                <span className="text-gray-400 text-xs">Estado</span>
                <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 font-medium">
                  {data.latestReport.status}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────
function EmptyChart({ message }: { message: string }) {
  return (
    <div className="h-52 flex flex-col items-center justify-center text-gray-400 gap-2">
      <BarChart2 size={32} className="opacity-30" />
      <p className="text-xs text-center max-w-xs">{message}</p>
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  title,
  desc,
  color,
}: {
  href: string;
  icon: any;
  title: string;
  desc: string;
  color: "green" | "blue" | "amber";
}) {
  const cls: Record<string, string> = {
    green: "bg-green-50 hover:bg-green-100 border-green-200 text-green-700",
    blue: "bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700",
    amber: "bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700",
  };
  return (
    <Link href={href}>
      <a
        className={`rounded-xl border p-4 flex flex-col gap-2 transition-colors cursor-pointer ${cls[color]}`}
      >
        <div className="flex items-center justify-between">
          <Icon size={20} />
          <ChevronRight size={15} className="opacity-50" />
        </div>
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-xs opacity-70">{desc}</p>
      </a>
    </Link>
  );
}
