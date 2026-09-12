# Sistema de Inscripción con Pago - VecinoXpress

## 📊 Resumen

Se ha implementado un sistema completo de inscripción con pago integrado para el registro de nuevos socios en la plataforma VecinoXpress.

## 🎯 Funcionalidades Implementadas

### 1. Componente de Pago para Registro
**Archivo**: `client/src/components/payments/RegistrationPayment.tsx`

- ✅ Selección de 3 planes:
  - **Básico**: $9.900 por documento
  - **Profesional**: $49.900 mensual (Recomendado)
  - **Empresarial**: $199.900 mensual

- ✅ Formulario de pago con:
  - Selección de método (tarjeta crédito/débito)
  - Número de tarjeta con formato automático
  - Nombre del titular
  - Fecha de expiración (MM/YY)
  - Código CVV

- ✅ Validaciones completas:
  - Número de tarjeta (16 dígitos)
  - Nombre (mínimo 5 caracteres)
  - Fecha válida (formato MM/YY)
  - CVV (3-4 dígitos)

### 2. Flujo de Registro Actualizado
**Archivo**: `client/src/pages/vecinos/registro.tsx`

#### Proceso de 5 Pasos:

```
1. INFORMACIÓN DEL NEGOCIO
   ├─ Nombre del negocio
   ├─ Tipo de negocio
   ├─ Dirección y ciudad
   └─ Teléfono y email

2. INFORMACIÓN DEL PROPIETARIO
   ├─ Nombre completo
   ├─ RUT
   └─ Teléfono de contacto

3. SELECCIÓN DE PLAN Y PAGO ⭐ NUEVO
   ├─ Visualización de planes
   ├─ Selección de plan
   └─ Procesamiento de pago

4. TÉRMINOS Y CONFIRMACIÓN
   ├─ Resumen del registro
   ├─ Aceptación de términos
   └─ Confirmación de datos

5. REGISTRO COMPLETADO
   ├─ Mensaje de éxito
   ├─ Instrucciones siguientes pasos
   └─ Enlaces a login y descarga de app
```

### 3. API Backend Actualizada
**Archivo**: `server/vecinos/vecinos-routes.ts`

#### Endpoint: `POST /api/vecinos/register`

**Datos recibidos**:
```typescript
{
  // Información del negocio
  storeName: string
  businessType: string
  address: string
  city: string
  phone: string
  email: string
  
  // Información del propietario
  ownerName: string
  ownerRut: string
  ownerPhone: string
  
  // Información bancaria (opcional)
  bankName?: string
  accountType?: string
  accountNumber?: string
  
  // Información de pago ⭐ NUEVO
  planId?: 'basic' | 'professional' | 'enterprise'
  paymentInfo?: {
    transactionId: string
    amount: number
    paymentMethod: 'credit' | 'debit'
    cardInfo: {
      last4: string
      expiry: string
    }
  }
}
```

**Mejoras implementadas**:
- ✅ Generación automática de username temporal
- ✅ Código de socio único (LOCAL-XP####)
- ✅ Activación automática después del pago
- ✅ Registro del plan seleccionado
- ✅ Logging de información de pago

## 💳 Planes Disponibles

| Plan | Precio | Período | Características |
|------|--------|---------|-----------------|
| **Básico** | $9.900 | Por documento | • Firma simple<br>• Hasta 2 firmantes<br>• Validez legal básica<br>• Almacenamiento 30 días |
| **Profesional** 🌟 | $49.900 | Mensual | • 10 documentos/mes<br>• Hasta 5 firmantes<br>• Firma avanzada<br>• Almacenamiento 1 año<br>• Plantillas personalizadas |
| **Empresarial** | $199.900 | Mensual | • 50 documentos/mes<br>• Firmantes ilimitados<br>• Firma avanzada<br>• Almacenamiento ilimitado<br>• API integración<br>• Soporte prioritario |

## 🎨 Diseño UI/UX

### Indicador de Progreso
```
[Negocio] ──── [Propietario] ──── [Pago] ──── [Confirmar]
    ✓               ✓              🔵            ○
```

### Cards de Planes
- Diseño responsive (grid 1-3 columnas)
- Plan recomendado destacado con badge
- Indicador visual de selección
- Lista de características con checkmarks
- Precios en formato chileno (CLP)

### Formulario de Pago
- Iconos contextuales (tarjeta, calendario, lock)
- Formato automático de campos
- Validación en tiempo real
- Estados de loading
- Mensajes de error claros

## 🔒 Seguridad

### Validaciones Frontend
- ✅ Longitud de tarjeta (16 dígitos)
- ✅ Formato de fecha (MM/YY)
- ✅ Código CVV (3-4 dígitos)
- ✅ Nombre del titular
- ✅ Campos requeridos

### Procesamiento Backend
- ✅ Validación de email único
- ✅ Generación segura de códigos
- ✅ Hash de contraseñas (preparado)
- ✅ Tokens JWT

### Indicadores de Seguridad
- Badge "Pago seguro" con escudo
- Mensaje de encriptación SSL
- Icono de candado en CVV

## 📱 Responsive Design

- ✅ Mobile First approach
- ✅ Cards adaptables (1 columna en mobile, 3 en desktop)
- ✅ Botones full-width en mobile
- ✅ Espaciado optimizado
- ✅ Texto legible en todos los tamaños

## 🧪 Testing Recomendado

### Flujo Completo
1. Acceder a `/vecinos/registro`
2. Completar información del negocio
3. Completar información del propietario
4. Seleccionar plan (probar cada uno)
5. Ingresar datos de pago
6. Aceptar términos
7. Verificar confirmación

### Casos de Error
- [ ] Email duplicado
- [ ] Tarjeta inválida
- [ ] Fecha expirada
- [ ] CVV incorrecto
- [ ] Campos vacíos

### Navegación
- [ ] Botón "Anterior" en cada paso
- [ ] Validación antes de avanzar
- [ ] Cambio de plan antes de pagar
- [ ] Cancelar proceso

## 🚀 Integración con Pasarela Real

Para conectar con una pasarela de pago real (MercadoPago, WebPay, Flow, etc.):

### 1. Actualizar `handleProcessPayment` en `RegistrationPayment.tsx`:
```typescript
const handleProcessPayment = async () => {
  if (!validatePaymentForm()) return;
  
  setIsProcessing(true);
  
  try {
    // Llamar a la API de pago
    const response = await apiRequest("POST", "/api/payments/process", {
      planId: selectedPlan,
      amount: selectedPlanDetails.price,
      cardInfo: {
        number: cardNumber.replace(/\s/g, ""),
        name: cardName,
        expiry: expiryDate,
        cvv: cvv
      }
    });
    
    const paymentResult = await response.json();
    
    if (paymentResult.success) {
      onPaymentComplete(selectedPlan, paymentResult);
    }
  } catch (error) {
    toast({
      title: "Error en el pago",
      description: error.message,
      variant: "destructive"
    });
  } finally {
    setIsProcessing(false);
  }
};
```

### 2. Crear endpoint de procesamiento en el backend:
```typescript
router.post('/payments/process', async (req, res) => {
  // Integrar con MercadoPago, WebPay, etc.
  // Validar y procesar el pago
  // Retornar resultado
});
```

## 📊 Base de Datos

### Tablas Requeridas (Futuro)

#### `subscription_plans`
```sql
CREATE TABLE subscription_plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  plan_type VARCHAR(50), -- 'basic', 'professional', 'enterprise'
  price INTEGER,
  period VARCHAR(50),
  features JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `payments`
```sql
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  partner_id INTEGER REFERENCES partners(id),
  plan_id INTEGER REFERENCES subscription_plans(id),
  amount INTEGER,
  transaction_id VARCHAR(255) UNIQUE,
  payment_method VARCHAR(50),
  card_last4 VARCHAR(4),
  status VARCHAR(50), -- 'pending', 'completed', 'failed'
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 📝 Notas de Implementación

### Estado Actual
- ✅ UI/UX completo
- ✅ Validaciones frontend
- ✅ Flujo de registro integrado
- ✅ API preparada
- ⏳ Pago simulado (2 segundos de timeout)
- ⏳ Sin integración con pasarela real

### Siguiente Fase
1. Integrar pasarela de pago real
2. Crear tablas de BD para planes y pagos
3. Implementar webhooks de confirmación
4. Enviar emails de confirmación
5. Dashboard de gestión de suscripciones
6. Sistema de renovación automática

## 🔗 Enlaces

- **PR**: https://github.com/Houmeecl/7723/pull/2
- **Branch**: `cursor/add-registration-payment-d1af`
- **Componente principal**: `client/src/components/payments/RegistrationPayment.tsx`
- **Flujo de registro**: `client/src/pages/vecinos/registro.tsx`
- **API**: `server/vecinos/vecinos-routes.ts`

## 👥 Casos de Uso

### Usuario Final
1. Dueño de minimarket accede al formulario de registro
2. Completa información de su negocio
3. Ingresa sus datos personales
4. **Selecciona el plan que mejor se ajusta a su volumen de documentos**
5. **Paga con su tarjeta de crédito/débito**
6. Recibe confirmación y credenciales de acceso
7. Puede empezar a usar la plataforma inmediatamente

### Administrador
1. Recibe notificación de nuevo registro con pago
2. Valida información del socio
3. El socio ya está activo y puede operar
4. Monitorea uso según el plan contratado

## 💡 Mejoras Futuras

- [ ] Opción de pago con transferencia bancaria
- [ ] Cupones de descuento
- [ ] Período de prueba gratuito
- [ ] Upgrade/downgrade de planes
- [ ] Facturación automática
- [ ] Historial de pagos en dashboard
- [ ] Notificaciones de vencimiento
- [ ] Métricas de conversión de planes

---

**Fecha de implementación**: 2026-09-12  
**Versión**: 1.0  
**Estado**: ✅ Implementado y listo para testing
