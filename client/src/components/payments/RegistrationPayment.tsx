import { useState } from "react";
import { 
  CreditCard, 
  Check, 
  Calendar,
  User,
  Lock,
  ShieldCheck,
  DollarSign,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

// Tipos de plan disponibles
export type PlanType = "basic" | "professional" | "enterprise";

interface Plan {
  id: PlanType;
  name: string;
  price: number;
  period: string;
  features: string[];
  recommended?: boolean;
}

const PLANS: Plan[] = [
  {
    id: "basic",
    name: "Plan Básico",
    price: 9900,
    period: "por documento",
    features: [
      "Firma simple por documento",
      "Hasta 2 firmantes",
      "Validez legal básica",
      "Almacenamiento 30 días"
    ]
  },
  {
    id: "professional",
    name: "Plan Profesional",
    price: 49900,
    period: "mensual",
    recommended: true,
    features: [
      "10 documentos mensuales",
      "Hasta 5 firmantes",
      "Firma avanzada incluida",
      "Almacenamiento 1 año",
      "Plantillas personalizadas"
    ]
  },
  {
    id: "enterprise",
    name: "Plan Empresarial",
    price: 199900,
    period: "mensual",
    features: [
      "50 documentos mensuales",
      "Firmantes ilimitados",
      "Firma avanzada incluida",
      "Almacenamiento ilimitado",
      "API para integración",
      "Soporte prioritario"
    ]
  }
];

interface RegistrationPaymentProps {
  onPaymentComplete: (planId: PlanType, paymentData: any) => void;
  onCancel?: () => void;
}

export default function RegistrationPayment({ 
  onPaymentComplete, 
  onCancel 
}: RegistrationPaymentProps) {
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("professional");
  const [paymentStep, setPaymentStep] = useState<"select" | "payment">("select");
  const [isProcessing, setIsProcessing] = useState(false);

  // Estados del formulario de pago
  const [paymentMethod, setPaymentMethod] = useState<"credit" | "debit">("credit");
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");

  const selectedPlanDetails = PLANS.find(p => p.id === selectedPlan)!;

  // Formatear número de tarjeta
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    value = value.substring(0, 16);
    if (value.length > 0) {
      value = value.match(/.{1,4}/g)!.join(" ");
    }
    setCardNumber(value);
  };

  // Formatear fecha de expiración
  const handleExpiryDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    value = value.substring(0, 4);
    if (value.length > 2) {
      value = value.substring(0, 2) + "/" + value.substring(2);
    }
    setExpiryDate(value);
  };

  // Validar formulario de pago
  const validatePaymentForm = () => {
    if (cardNumber.replace(/\s/g, "").length !== 16) {
      toast({
        title: "Número de tarjeta inválido",
        description: "Ingrese un número de tarjeta válido de 16 dígitos.",
        variant: "destructive",
      });
      return false;
    }

    if (cardName.trim().length < 5) {
      toast({
        title: "Nombre inválido",
        description: "Ingrese el nombre como aparece en la tarjeta.",
        variant: "destructive",
      });
      return false;
    }

    if (!expiryDate.match(/^\d{2}\/\d{2}$/)) {
      toast({
        title: "Fecha de expiración inválida",
        description: "Ingrese la fecha en formato MM/YY.",
        variant: "destructive",
      });
      return false;
    }

    if (cvv.length < 3 || cvv.length > 4) {
      toast({
        title: "Código de seguridad inválido",
        description: "Ingrese un código de seguridad válido (3 o 4 dígitos).",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  // Procesar el pago
  const handleProcessPayment = async () => {
    if (!validatePaymentForm()) {
      return;
    }

    setIsProcessing(true);

    // Simular procesamiento de pago
    setTimeout(() => {
      const paymentData = {
        planId: selectedPlan,
        amount: selectedPlanDetails.price,
        paymentMethod,
        cardInfo: {
          last4: cardNumber.replace(/\s/g, "").slice(-4),
          expiry: expiryDate
        },
        transactionId: `TXN-${Date.now()}`
      };

      setIsProcessing(false);
      toast({
        title: "Pago procesado correctamente",
        description: `Se ha procesado el pago de $${(selectedPlanDetails.price / 100).toLocaleString('es-CL')}`,
      });

      onPaymentComplete(selectedPlan, paymentData);
    }, 2000);
  };

  // Renderizar selección de plan
  if (paymentStep === "select") {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-2xl font-bold mb-2">Selecciona tu plan</h3>
          <p className="text-gray-600">
            Elige el plan que mejor se adapte a las necesidades de tu negocio
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <Card 
              key={plan.id}
              className={`relative cursor-pointer transition-all ${
                selectedPlan === plan.id 
                  ? 'border-2 border-blue-600 shadow-lg' 
                  : 'border border-gray-200 hover:border-blue-300'
              } ${plan.recommended ? 'md:-mt-4' : ''}`}
              onClick={() => setSelectedPlan(plan.id)}
            >
              {plan.recommended && (
                <div className="bg-blue-600 text-white text-center py-2 text-sm font-medium rounded-t-lg">
                  <Sparkles className="inline h-4 w-4 mr-1" />
                  RECOMENDADO
                </div>
              )}
              
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{plan.name}</span>
                  {selectedPlan === plan.id && (
                    <div className="h-6 w-6 bg-blue-600 rounded-full flex items-center justify-center">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  )}
                </CardTitle>
                <CardDescription>
                  <div className="mt-4">
                    <span className="text-3xl font-bold text-gray-900">
                      ${(plan.price / 100).toLocaleString('es-CL')}
                    </span>
                    <span className="text-gray-500 ml-2">{plan.period}</span>
                  </div>
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                      <span className="text-sm text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <Alert className="bg-blue-50 border-blue-200">
          <ShieldCheck className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">Pago seguro</AlertTitle>
          <AlertDescription className="text-blue-700">
            Tu información de pago está protegida con encriptación SSL de nivel bancario
          </AlertDescription>
        </Alert>

        <div className="flex justify-between mt-8">
          {onCancel && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
            >
              Volver
            </Button>
          )}
          
          <Button 
            type="button" 
            className="bg-blue-600 hover:bg-blue-700 ml-auto"
            onClick={() => setPaymentStep("payment")}
          >
            Continuar con el pago
            <DollarSign className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Renderizar formulario de pago
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold mb-2">Información de pago</h3>
        <p className="text-gray-600">
          Completa los datos de tu tarjeta para finalizar la inscripción
        </p>
      </div>

      <Card className="bg-gray-50">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium text-lg">{selectedPlanDetails.name}</p>
              <p className="text-sm text-gray-500">{selectedPlanDetails.period}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">
                ${(selectedPlanDetails.price / 100).toLocaleString('es-CL')}
              </p>
              <Button 
                variant="link" 
                size="sm"
                className="text-blue-600 p-0 h-auto"
                onClick={() => setPaymentStep("select")}
              >
                Cambiar plan
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-3">Método de pago</h4>
          <RadioGroup 
            value={paymentMethod} 
            onValueChange={(value) => setPaymentMethod(value as "credit" | "debit")}
            className="grid grid-cols-2 gap-4"
          >
            <div>
              <RadioGroupItem
                value="credit"
                id="credit"
                className="peer sr-only"
              />
              <Label
                htmlFor="credit"
                className="flex flex-col items-center justify-between rounded-md border-2 border-gray-200 bg-white p-4 hover:bg-gray-50 hover:border-gray-300 peer-data-[state=checked]:border-blue-600 [&:has([data-state=checked])]:border-blue-600 cursor-pointer"
              >
                <CreditCard className="mb-3 h-6 w-6" />
                Tarjeta de Crédito
              </Label>
            </div>
            
            <div>
              <RadioGroupItem
                value="debit"
                id="debit"
                className="peer sr-only"
              />
              <Label
                htmlFor="debit"
                className="flex flex-col items-center justify-between rounded-md border-2 border-gray-200 bg-white p-4 hover:bg-gray-50 hover:border-gray-300 peer-data-[state=checked]:border-blue-600 [&:has([data-state=checked])]:border-blue-600 cursor-pointer"
              >
                <CreditCard className="mb-3 h-6 w-6" />
                Tarjeta de Débito
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="card-number">Número de tarjeta</Label>
            <div className="relative">
              <Input
                id="card-number"
                placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChange={handleCardNumberChange}
                className="pl-10"
                maxLength={19}
              />
              <CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="card-name">Nombre en la tarjeta</Label>
            <div className="relative">
              <Input
                id="card-name"
                placeholder="Juan Pérez"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                className="pl-10"
              />
              <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="expiry-date">Fecha de expiración</Label>
              <div className="relative">
                <Input
                  id="expiry-date"
                  placeholder="MM/YY"
                  value={expiryDate}
                  onChange={handleExpiryDateChange}
                  className="pl-10"
                  maxLength={5}
                />
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="cvv">CVV</Label>
              <div className="relative">
                <Input
                  id="cvv"
                  placeholder="123"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").substring(0, 4))}
                  className="pl-10"
                  maxLength={4}
                  type="password"
                />
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        <Alert>
          <Lock className="h-4 w-4" />
          <AlertTitle>Conexión segura</AlertTitle>
          <AlertDescription>
            Tu pago está protegido con encriptación SSL de nivel bancario
          </AlertDescription>
        </Alert>
      </div>

      <div className="flex justify-between mt-8">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => setPaymentStep("select")}
          disabled={isProcessing}
        >
          Volver
        </Button>
        
        <Button 
          type="button" 
          className="bg-blue-600 hover:bg-blue-700"
          onClick={handleProcessPayment}
          disabled={isProcessing || !cardNumber || !cardName || !expiryDate || !cvv}
        >
          {isProcessing ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
              Procesando...
            </>
          ) : (
            <>
              Confirmar pago de ${(selectedPlanDetails.price / 100).toLocaleString('es-CL')}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
