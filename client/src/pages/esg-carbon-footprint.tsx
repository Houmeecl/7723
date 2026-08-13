/**
 * ESG Carbon Footprint – Registro de Huella de Carbono (Protocolo GHG)
 * Alcance 1 (directas), Alcance 2 (electricidad), Alcance 3 (cadena de valor)
 */

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ArrowLeft, CloudRain, Plus, CheckCircle, AlertCircle } from "lucide-react";

const CURRENT_YEAR = new Date().getFullYear();

const SCOPE_COLORS = { scope1: "#16a34a", scope2: "#2563eb", scope3: "#9333ea" };

function fmt(n: any) {
  if (n === null || n === undefined || isNaN(Number(n))) return "—";
  return Number(n).toLocaleString("es-CL", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

const EMPTY_FORM = {
  companyName: "",
  year: String(CURRENT_YEAR),
  // Alcance 1
  scope1Combustion: "",
  scope1FugitiveEmissions: "",
  scope1ProcessEmissions: "",
  scope1Fleet: "",
  // Alcance 2
  scope2Electricity: "",
  scope2Heat: "",
  scope2Steam: "",
  // Alcance 3
  scope3BusinessTravel: "",
  scope3EmployeeCommuting: "",
  scope3PurchasedGoods: "",
  scope3Waste: "",
  scope3UpstreamTransport: "",
  scope3DownstreamTransport: "",
  scope3UseOfProducts: "",
  // Extras
  emissionsIntensityRevenue: "",
  emissionsIntensityEmployee: "",
  reductionTargetPct: "",
  baselineYear: "",
};

export default function EsgCarbonFootprint() {
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);
  const [saved, setSaved] = useState(false);

  const { data: records = [] } = useQuery<any[]>({
    queryKey: ["/api/esg/carbon-footprint"],
    queryFn: async () => {
      const res = await fetch("/api/esg/carbon-footprint");
      if (!res.ok) throw new Error("Error");
      return res.json();
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/esg/carbon-footprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Error al guardar");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/esg/carbon-footprint"] });
      qc.invalidateQueries({ queryKey: ["/api/esg/dashboard"] });
      setSaved(true);
      setForm(EMPTY_FORM);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const f = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  // Calcular totales en tiempo real
  const s1 =
    (parseFloat(form.scope1Combustion) || 0) +
    (parseFloat(form.scope1FugitiveEmissions) || 0) +
    (parseFloat(form.scope1ProcessEmissions) || 0) +
    (parseFloat(form.scope1Fleet) || 0);
  const s2 =
    (parseFloat(form.scope2Electricity) || 0) +
    (parseFloat(form.scope2Heat) || 0) +
    (parseFloat(form.scope2Steam) || 0);
  const s3 =
    (parseFloat(form.scope3BusinessTravel) || 0) +
    (parseFloat(form.scope3EmployeeCommuting) || 0) +
    (parseFloat(form.scope3PurchasedGoods) || 0) +
    (parseFloat(form.scope3Waste) || 0) +
    (parseFloat(form.scope3UpstreamTransport) || 0) +
    (parseFloat(form.scope3DownstreamTransport) || 0) +
    (parseFloat(form.scope3UseOfProducts) || 0);
  const total = s1 + s2 + s3;

  // Datos para el gráfico de historial
  const chartData = records
    .slice()
    .reverse()
    .map((r: any) => ({
      year: r.year,
      "Alcance 1": r.scope1Total || 0,
      "Alcance 2": r.scope2Total || 0,
      "Alcance 3": r.scope3Total || 0,
    }));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Link href="/esg">
            <a className="text-gray-400 hover:text-gray-600">
              <ArrowLeft size={20} />
            </a>
          </Link>
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 rounded-xl p-2">
              <CloudRain className="text-blue-700" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Huella de Carbono</h1>
              <p className="text-xs text-gray-500">Protocolo GHG · Alcances 1, 2 y 3 · tCO2eq</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Resumen en tiempo real */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Alcance 1", value: s1, color: "green", desc: "Emisiones directas" },
            { label: "Alcance 2", value: s2, color: "blue", desc: "Electricidad / calor" },
            { label: "Alcance 3", value: s3, color: "purple", desc: "Cadena de valor" },
            { label: "Total", value: total, color: "red", desc: "tCO2eq totales" },
          ].map((item) => (
            <div key={item.label} className={`rounded-xl border p-4 ${
              item.color === "green" ? "bg-green-50 border-green-200 text-green-800" :
              item.color === "blue" ? "bg-blue-50 border-blue-200 text-blue-800" :
              item.color === "purple" ? "bg-purple-50 border-purple-200 text-purple-800" :
              "bg-red-50 border-red-200 text-red-800"
            }`}>
              <p className="text-xs font-medium uppercase tracking-wide opacity-70">{item.label}</p>
              <p className="text-2xl font-bold mt-1">{item.value.toLocaleString("es-CL", { maximumFractionDigits: 1 })}</p>
              <p className="text-xs opacity-60 mt-0.5">tCO2eq — {item.desc}</p>
            </div>
          ))}
        </div>

        {/* Formulario */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Registrar Emisiones</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Empresa *</label>
              <input type="text" value={form.companyName} onChange={(e) => f("companyName", e.target.value)} placeholder="Nombre de la empresa" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Año *</label>
              <input type="number" value={form.year} onChange={(e) => f("year", e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {/* Alcance 1 */}
          <ScopeSection
            title="Alcance 1 – Emisiones Directas"
            subtitle="Combustión de combustibles fósiles, procesos industriales, emisiones fugitivas y flota propia"
            color="green"
            total={s1}
          >
            <ScopeField label="Combustión estacionaria (tCO2eq)" value={form.scope1Combustion} onChange={(v) => f("scope1Combustion", v)} />
            <ScopeField label="Emisiones fugitivas (tCO2eq)" value={form.scope1FugitiveEmissions} onChange={(v) => f("scope1FugitiveEmissions", v)} />
            <ScopeField label="Emisiones de proceso (tCO2eq)" value={form.scope1ProcessEmissions} onChange={(v) => f("scope1ProcessEmissions", v)} />
            <ScopeField label="Flota vehicular propia (tCO2eq)" value={form.scope1Fleet} onChange={(v) => f("scope1Fleet", v)} />
          </ScopeSection>

          {/* Alcance 2 */}
          <ScopeSection
            title="Alcance 2 – Emisiones Indirectas por Energía"
            subtitle="Electricidad, calor y vapor comprados a terceros"
            color="blue"
            total={s2}
          >
            <ScopeField label="Electricidad comprada (tCO2eq)" value={form.scope2Electricity} onChange={(v) => f("scope2Electricity", v)} />
            <ScopeField label="Calor / frío comprado (tCO2eq)" value={form.scope2Heat} onChange={(v) => f("scope2Heat", v)} />
            <ScopeField label="Vapor comprado (tCO2eq)" value={form.scope2Steam} onChange={(v) => f("scope2Steam", v)} />
          </ScopeSection>

          {/* Alcance 3 */}
          <ScopeSection
            title="Alcance 3 – Otras Emisiones Indirectas"
            subtitle="Viajes, cadena de suministro, uso de productos y logística"
            color="purple"
            total={s3}
          >
            <ScopeField label="Viajes de negocios (tCO2eq)" value={form.scope3BusinessTravel} onChange={(v) => f("scope3BusinessTravel", v)} />
            <ScopeField label="Desplazamiento empleados (tCO2eq)" value={form.scope3EmployeeCommuting} onChange={(v) => f("scope3EmployeeCommuting", v)} />
            <ScopeField label="Bienes y servicios comprados (tCO2eq)" value={form.scope3PurchasedGoods} onChange={(v) => f("scope3PurchasedGoods", v)} />
            <ScopeField label="Gestión de residuos (tCO2eq)" value={form.scope3Waste} onChange={(v) => f("scope3Waste", v)} />
            <ScopeField label="Transporte upstream (tCO2eq)" value={form.scope3UpstreamTransport} onChange={(v) => f("scope3UpstreamTransport", v)} />
            <ScopeField label="Transporte downstream (tCO2eq)" value={form.scope3DownstreamTransport} onChange={(v) => f("scope3DownstreamTransport", v)} />
            <ScopeField label="Uso de productos vendidos (tCO2eq)" value={form.scope3UseOfProducts} onChange={(v) => f("scope3UseOfProducts", v)} />
          </ScopeSection>

          {/* Intensidad y metas */}
          <div className="rounded-lg border border-gray-200 p-4 mb-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Intensidad y Metas</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <ScopeField label="Intensidad / millón USD" value={form.emissionsIntensityRevenue} onChange={(v) => f("emissionsIntensityRevenue", v)} />
              <ScopeField label="Intensidad / empleado" value={form.emissionsIntensityEmployee} onChange={(v) => f("emissionsIntensityEmployee", v)} />
              <ScopeField label="Meta reducción (%)" value={form.reductionTargetPct} onChange={(v) => f("reductionTargetPct", v)} />
              <ScopeField label="Año base" value={form.baselineYear} onChange={(v) => f("baselineYear", v)} />
            </div>
          </div>

          {saved && (
            <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 flex items-center gap-2 text-sm text-green-800">
              <CheckCircle size={15} /> Huella de carbono guardada correctamente.
            </div>
          )}
          {mutation.isError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-sm text-red-700">
              <AlertCircle size={15} /> Error al guardar. Verifique los datos.
            </div>
          )}

          <button
            onClick={() => mutation.mutate()}
            disabled={!form.companyName || !form.year || mutation.isPending}
            className="w-full bg-blue-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {mutation.isPending ? "Guardando…" : <><Plus size={15} /> Registrar Huella de Carbono</>}
          </button>
        </section>

        {/* Historial */}
        {records.length > 0 && (
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Historial de Emisiones</h2>

            {chartData.length > 1 && (
              <div className="mb-6">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} unit=" t" />
                    <Tooltip formatter={(v: any) => `${Number(v).toLocaleString("es-CL")} tCO2eq`} />
                    <Legend />
                    <Bar dataKey="Alcance 1" fill={SCOPE_COLORS.scope1} radius={[4,4,0,0]} />
                    <Bar dataKey="Alcance 2" fill={SCOPE_COLORS.scope2} radius={[4,4,0,0]} />
                    <Bar dataKey="Alcance 3" fill={SCOPE_COLORS.scope3} radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-100">
                    <th className="text-left py-2 pr-3">Empresa</th>
                    <th className="text-right pr-3">Año</th>
                    <th className="text-right pr-3">Alc. 1</th>
                    <th className="text-right pr-3">Alc. 2</th>
                    <th className="text-right pr-3">Alc. 3</th>
                    <th className="text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r: any) => (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 pr-3 font-medium text-gray-800">{r.companyName}</td>
                      <td className="pr-3 text-gray-600 text-right">{r.year}</td>
                      <td className="pr-3 text-right text-green-700 tabular-nums">{fmt(r.scope1Total)}</td>
                      <td className="pr-3 text-right text-blue-700 tabular-nums">{fmt(r.scope2Total)}</td>
                      <td className="pr-3 text-right text-purple-700 tabular-nums">{fmt(r.scope3Total)}</td>
                      <td className="text-right font-semibold text-gray-900 tabular-nums">{fmt(r.totalEmissions)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function ScopeSection({ title, subtitle, color, total, children }: {
  title: string; subtitle: string; color: "green" | "blue" | "purple"; total: number; children: React.ReactNode;
}) {
  const cls = {
    green: "bg-green-50 border-green-200 text-green-800",
    blue: "bg-blue-50 border-blue-200 text-blue-800",
    purple: "bg-purple-50 border-purple-200 text-purple-800",
  };
  return (
    <div className={`rounded-lg border p-4 mb-4 ${cls[color]}`}>
      <div className="flex items-start justify-between mb-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider">{title}</h3>
        <span className="text-xs font-bold tabular-nums">
          {total.toLocaleString("es-CL", { maximumFractionDigits: 1 })} tCO2eq
        </span>
      </div>
      <p className="text-xs opacity-60 mb-3">{subtitle}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">{children}</div>
    </div>
  );
}

function ScopeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs text-gray-600 block mb-1">{label}</label>
      <input
        type="number"
        step="any"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      />
    </div>
  );
}
