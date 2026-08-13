/**
 * ESG Upload – Carga de PDF ESG y entrada manual de indicadores
 */

import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Upload,
  FileText,
  Leaf,
  Trash2,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Plus,
  X,
} from "lucide-react";

const FRAMEWORKS = ["GRI", "SASB", "TCFD", "CDP", "GHG Protocol", "IFRS S1/S2", "ISO 14064", "Otro"];
const CURRENT_YEAR = new Date().getFullYear();

export default function EsgUpload() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    companyName: "",
    reportYear: String(CURRENT_YEAR),
    reportPeriod: "",
    framework: "GRI",
    notes: "",
  });
  const [uploadResult, setUploadResult] = useState<any>(null);

  const [indForm, setIndForm] = useState({
    companyName: "",
    year: String(CURRENT_YEAR),
    totalEnergyConsumption: "",
    renewableEnergyPct: "",
    totalWaterConsumption: "",
    totalWasteGenerated: "",
    wasteRecycledPct: "",
    totalEmployees: "",
    womenPct: "",
    trainingHoursPerEmployee: "",
    workplaceAccidents: "",
    employeeTurnoverPct: "",
    communityInvestment: "",
    boardSize: "",
    boardWomenPct: "",
    independentDirectorsPct: "",
    ethicsViolations: "",
    antiCorruptionTrainingPct: "",
  });

  const { data: reports = [] } = useQuery<any[]>({
    queryKey: ["/api/esg/reports"],
    queryFn: async () => {
      const res = await fetch("/api/esg/reports");
      if (!res.ok) throw new Error("Error");
      return res.json();
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      if (selectedFile) fd.append("pdf", selectedFile);
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      const res = await fetch("/api/esg/reports/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Error al subir");
      return res.json();
    },
    onSuccess: (data) => {
      setUploadResult(data);
      qc.invalidateQueries({ queryKey: ["/api/esg/reports"] });
      qc.invalidateQueries({ queryKey: ["/api/esg/dashboard"] });
      setSelectedFile(null);
      setForm({ companyName: "", reportYear: String(CURRENT_YEAR), reportPeriod: "", framework: "GRI", notes: "" });
    },
  });

  const indicatorsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/esg/indicators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(indForm),
      });
      if (!res.ok) throw new Error("Error al guardar");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/esg/dashboard"] });
      alert("Indicadores ESG guardados correctamente.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/esg/reports/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/esg/reports"] });
      qc.invalidateQueries({ queryKey: ["/api/esg/dashboard"] });
    },
  });

  const f = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));
  const fi = (key: string, val: string) => setIndForm((p) => ({ ...p, [key]: val }));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Link href="/esg">
            <a className="text-gray-400 hover:text-gray-600">
              <ArrowLeft size={20} />
            </a>
          </Link>
          <div className="flex items-center gap-3">
            <div className="bg-green-100 rounded-xl p-2">
              <Upload className="text-green-700" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Cargar Reporte ESG</h1>
              <p className="text-xs text-gray-500">Sube un PDF o ingresa indicadores manualmente</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Formulario PDF */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FileText size={16} className="text-green-600" /> Información del Reporte
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <InputField label="Empresa *" value={form.companyName} onChange={(v) => f("companyName", v)} placeholder="Nombre de la empresa" type="text" />
            <InputField label="Año del Reporte *" value={form.reportYear} onChange={(v) => f("reportYear", v)} type="number" />
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Marco de Reporte</label>
              <select value={form.framework} onChange={(e) => f("framework", e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                {FRAMEWORKS.map((fw) => <option key={fw}>{fw}</option>)}
              </select>
            </div>
            <InputField label="Período (opcional)" value={form.reportPeriod} onChange={(v) => f("reportPeriod", v)} placeholder="ej. 2024, Q1-Q4 2024" type="text" />
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-gray-600 block mb-1">Notas</label>
              <textarea value={form.notes} onChange={(e) => f("notes", e.target.value)} rows={2} placeholder="Observaciones adicionales…" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const file = e.dataTransfer.files[0]; if (file?.type === "application/pdf") setSelectedFile(file); }}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors mb-4 ${dragOver ? "border-green-400 bg-green-50" : selectedFile ? "border-green-300 bg-green-50" : "border-gray-300 hover:border-gray-400"}`}
          >
            <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setSelectedFile(e.target.files[0]); }} />
            {selectedFile ? (
              <div className="flex flex-col items-center gap-2">
                <FileText size={32} className="text-green-600" />
                <p className="font-medium text-green-800">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                <button onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 mt-1">
                  <X size={12} /> Quitar archivo
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-400">
                <Upload size={32} />
                <p className="text-sm font-medium">Arrastra un PDF aquí o haz clic para seleccionar</p>
                <p className="text-xs">Máximo 50 MB · Solo archivos PDF</p>
              </div>
            )}
          </div>

          {uploadResult && (
            <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 flex items-start gap-2 text-sm text-green-800">
              <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Reporte cargado correctamente</p>
                <p className="text-xs mt-0.5">ID: {uploadResult.report?.id} · Métricas extraídas automáticamente</p>
              </div>
            </div>
          )}

          {uploadMutation.isError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-sm text-red-700">
              <AlertCircle size={14} /> Error al subir el reporte.
            </div>
          )}

          <button onClick={() => uploadMutation.mutate()} disabled={!form.companyName || uploadMutation.isPending} className="w-full bg-green-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
            {uploadMutation.isPending ? "Procesando…" : <><Upload size={15} /> {selectedFile ? "Subir PDF y extraer métricas" : "Guardar reporte (sin PDF)"}</>}
          </button>
        </section>

        {/* Indicadores manuales */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
            <Leaf size={16} className="text-green-600" /> Indicadores ESG Manuales
          </h2>
          <p className="text-xs text-gray-500 mb-5">Los campos vacíos se omiten automáticamente.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <InputField label="Empresa *" value={indForm.companyName} onChange={(v) => fi("companyName", v)} placeholder="Nombre empresa" type="text" />
            <InputField label="Año *" value={indForm.year} onChange={(v) => fi("year", v)} type="number" />
          </div>

          <GroupSection title="Ambiental (E)" color="green">
            <NumField label="Consumo energético total (MWh)" value={indForm.totalEnergyConsumption} onChange={(v) => fi("totalEnergyConsumption", v)} />
            <NumField label="% Energía renovable" value={indForm.renewableEnergyPct} onChange={(v) => fi("renewableEnergyPct", v)} />
            <NumField label="Consumo de agua (m³)" value={indForm.totalWaterConsumption} onChange={(v) => fi("totalWaterConsumption", v)} />
            <NumField label="Residuos generados (ton)" value={indForm.totalWasteGenerated} onChange={(v) => fi("totalWasteGenerated", v)} />
            <NumField label="% Residuos reciclados" value={indForm.wasteRecycledPct} onChange={(v) => fi("wasteRecycledPct", v)} />
          </GroupSection>

          <GroupSection title="Social (S)" color="blue">
            <NumField label="Total empleados" value={indForm.totalEmployees} onChange={(v) => fi("totalEmployees", v)} />
            <NumField label="% Mujeres en plantilla" value={indForm.womenPct} onChange={(v) => fi("womenPct", v)} />
            <NumField label="Horas formación / empleado" value={indForm.trainingHoursPerEmployee} onChange={(v) => fi("trainingHoursPerEmployee", v)} />
            <NumField label="Accidentes laborales" value={indForm.workplaceAccidents} onChange={(v) => fi("workplaceAccidents", v)} />
            <NumField label="% Rotación personal" value={indForm.employeeTurnoverPct} onChange={(v) => fi("employeeTurnoverPct", v)} />
            <NumField label="Inversión comunidad (CLP)" value={indForm.communityInvestment} onChange={(v) => fi("communityInvestment", v)} />
          </GroupSection>

          <GroupSection title="Gobernanza (G)" color="amber">
            <NumField label="Tamaño del directorio" value={indForm.boardSize} onChange={(v) => fi("boardSize", v)} />
            <NumField label="% Mujeres en directorio" value={indForm.boardWomenPct} onChange={(v) => fi("boardWomenPct", v)} />
            <NumField label="% Directores independientes" value={indForm.independentDirectorsPct} onChange={(v) => fi("independentDirectorsPct", v)} />
            <NumField label="Infracciones éticas" value={indForm.ethicsViolations} onChange={(v) => fi("ethicsViolations", v)} />
            <NumField label="% Capacitación anti-corrupción" value={indForm.antiCorruptionTrainingPct} onChange={(v) => fi("antiCorruptionTrainingPct", v)} />
          </GroupSection>

          {indicatorsMutation.isError && (
            <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle size={14} /> Error al guardar indicadores.
            </div>
          )}

          <button onClick={() => indicatorsMutation.mutate()} disabled={!indForm.companyName || !indForm.year || indicatorsMutation.isPending} className="mt-2 w-full bg-blue-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
            {indicatorsMutation.isPending ? "Guardando…" : <><Plus size={15} /> Guardar indicadores ESG</>}
          </button>
        </section>

        {/* Listado reportes */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FileText size={16} className="text-gray-600" /> Reportes cargados ({reports.length})
          </h2>
          {reports.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No hay reportes cargados aún.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-100">
                    <th className="text-left py-2 pr-3">Empresa</th>
                    <th className="text-left pr-3">Año</th>
                    <th className="text-left pr-3">Marco</th>
                    <th className="text-left pr-3">Archivo</th>
                    <th className="text-center pr-3">Estado</th>
                    <th className="text-center">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r: any) => (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 pr-3 font-medium text-gray-800">{r.companyName}</td>
                      <td className="pr-3 text-gray-600">{r.reportYear}</td>
                      <td className="pr-3 text-gray-600">{r.framework || "—"}</td>
                      <td className="pr-3 text-gray-500 max-w-[160px] truncate">{r.originalName}</td>
                      <td className="pr-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">{r.status}</span>
                      </td>
                      <td className="text-center">
                        <button onClick={() => { if (confirm("¿Eliminar este reporte?")) deleteMutation.mutate(r.id); }} className="text-red-400 hover:text-red-600 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, type }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-600 block mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
    </div>
  );
}

function GroupSection({ title, color, children }: { title: string; color: "green" | "blue" | "amber"; children: React.ReactNode }) {
  const cls = { green: "bg-green-50 border-green-200 text-green-700", blue: "bg-blue-50 border-blue-200 text-blue-700", amber: "bg-amber-50 border-amber-200 text-amber-700" };
  return (
    <div className={`rounded-lg border p-4 mb-4 ${cls[color]}`}>
      <h3 className="text-xs font-semibold uppercase tracking-wider mb-3">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">{children}</div>
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs text-gray-600 block mb-1">{label}</label>
      <input type="number" step="any" value={value} onChange={(e) => onChange(e.target.value)} placeholder="—" className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white" />
    </div>
  );
}
