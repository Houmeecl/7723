import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatRut, validateRut } from '@shared/utils/rut';
import { REGIONES_CHILE } from '@shared/utils/regiones';
import { CheckCircle2, FileText, Loader2, LogIn, Download, ShieldCheck, MapPin } from 'lucide-react';

interface DocumentType {
  id: string;
  name: string;
  price: number;
}

interface GeneratedDoc {
  documentId: number;
  documentType: string;
  provider: string;
  region: string;
  client: { name: string; rut: string; phone?: string; email?: string };
  verificationCode: string;
  pdfUrl: string;
  qrCode: string;
  amount: number;
  commission: number;
  createdAt: string;
}

const clp = (n: number) => '$' + (n || 0).toLocaleString('es-CL');

export default function PosDocumento() {
  const [token, setToken] = useState<string>(() => localStorage.getItem('vecinos_token') || '');
  const [agentName, setAgentName] = useState<string>(() => localStorage.getItem('vecinos_username') || '');
  const [username, setUsername] = useState('demopartner');
  const [password, setPassword] = useState('password123');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [docTypes, setDocTypes] = useState<DocumentType[]>([]);
  const [documentTypeId, setDocumentTypeId] = useState('');
  const [region, setRegion] = useState('');
  const [nombre, setNombre] = useState('');
  const [rut, setRut] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<GeneratedDoc | null>(null);

  const rutValid = rut.trim().length === 0 ? null : validateRut(rut);

  useEffect(() => {
    fetch('/api/vecinos-pos/document-types')
      .then((r) => r.json())
      .then((d) => {
        setDocTypes(d.documentTypes || []);
        if (d.documentTypes?.[0]) setDocumentTypeId(d.documentTypes[0].id);
      })
      .catch(() => {});
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError('');
    try {
      const res = await fetch('/api/vecinos/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.token) {
        setLoginError(data.message || 'Credenciales inválidas');
        return;
      }
      localStorage.setItem('vecinos_token', data.token);
      localStorage.setItem('vecinos_username', data.user?.username || username);
      setToken(data.token);
      setAgentName(data.user?.username || username);
    } catch {
      setLoginError('No se pudo conectar con el servidor');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('vecinos_token');
    localStorage.removeItem('vecinos_username');
    setToken('');
    setAgentName('');
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validateRut(rut)) {
      setError('El RUT ingresado no es válido');
      return;
    }
    if (nombre.trim().length < 3) {
      setError('Ingresa el nombre del cliente');
      return;
    }
    if (!region) {
      setError('Selecciona la región del proveedor');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/vecinos-pos/process-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          documentType: documentTypeId,
          region,
          clientInfo: { name: nombre, rut, phone: telefono, email },
        }),
      });
      const data = await res.json();
      if (res.status === 401 || res.status === 403) {
        handleLogout();
        setError('Sesión de agente expirada, vuelve a ingresar');
        return;
      }
      if (!res.ok || !data.success) {
        setError(data.message || 'No se pudo generar el documento');
        return;
      }
      setResult(data);
    } catch {
      setError('Error de conexión al generar el documento');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setResult(null);
    setNombre('');
    setRut('');
    setTelefono('');
    setEmail('');
    setError('');
  };

  // ----- Pantalla de acceso del agente -----
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <LogIn className="h-5 w-5" /> Acceso proveedor regional VecinoXpress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="username">Usuario</Label>
                <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="password">Contraseña</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              {loginError && <p className="text-sm text-red-600">{loginError}</p>}
              <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={loggingIn}>
                {loggingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ingresar'}
              </Button>
              <p className="text-xs text-slate-500 text-center">Demo: demopartner / password123</p>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ----- Comprobante del documento generado -----
  if (result) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 flex items-center justify-center">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-6 w-6" /> Documento generado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <img src={result.qrCode} alt="QR de verificación" className="h-40 w-40" />
            </div>
            <div className="text-center">
              <div className="text-sm text-slate-500">Código de verificación</div>
              <div className="text-2xl font-bold tracking-wide">{result.verificationCode}</div>
            </div>
            <div className="rounded-lg border p-4 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Documento</span><span className="font-medium">{result.documentType}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Proveedor regional</span><span className="font-medium">{result.provider}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Región</span><span className="font-medium">{result.region}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Cliente</span><span className="font-medium">{result.client.name}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">RUT</span><span className="font-medium">{result.client.rut}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Valor</span><span className="font-medium">{clp(result.amount)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Comisión proveedor</span><span className="font-medium text-green-600">{clp(result.commission)}</span></div>
            </div>
            <div className="flex gap-3">
              <a href={result.pdfUrl} target="_blank" rel="noreferrer" className="flex-1">
                <Button className="w-full bg-red-600 hover:bg-red-700">
                  <Download className="h-4 w-4 mr-2" /> Descargar PDF
                </Button>
              </a>
              <Button variant="outline" className="flex-1" onClick={resetForm}>Generar otro</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ----- Formulario POS: RUT + datos del cliente + tipo de documento -----
  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-slate-700">
            <ShieldCheck className="h-5 w-5 text-red-600" />
            <span className="font-semibold">Proveedor regional:</span> {agentName || 'VecinoXpress'}
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>Salir</Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <FileText className="h-5 w-5" /> Generar documento en POS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <Label htmlFor="region" className="flex items-center gap-1">
                  <MapPin className="h-4 w-4 text-red-600" /> Región del proveedor
                </Label>
                <select
                  id="region"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Selecciona una región...</option>
                  {REGIONES_CHILE.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="rut">RUT del cliente</Label>
                <Input
                  id="rut"
                  placeholder="12.345.678-9"
                  value={rut}
                  onChange={(e) => setRut(formatRut(e.target.value))}
                  className={rutValid === false ? 'border-red-500' : rutValid ? 'border-green-500' : ''}
                />
                {rutValid === false && <p className="text-xs text-red-600 mt-1">RUT inválido</p>}
                {rutValid === true && <p className="text-xs text-green-600 mt-1">RUT válido</p>}
              </div>
              <div>
                <Label htmlFor="nombre">Nombre del cliente</Label>
                <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre y apellido" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input id="telefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="+56 9 ..." />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@correo.cl" />
                </div>
              </div>
              <div>
                <Label htmlFor="tipo">Tipo de documento</Label>
                <select
                  id="tipo"
                  value={documentTypeId}
                  onChange={(e) => setDocumentTypeId(e.target.value)}
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {docTypes.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} — {clp(d.price)}
                    </option>
                  ))}
                </select>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700"
                disabled={submitting || rutValid === false || !region}
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generando...</>
                ) : (
                  'Generar documento'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
