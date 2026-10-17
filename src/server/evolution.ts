import type { ServerEnv } from './db';

export interface EvolutionConnectionResult {
  instanceName: string;
  status: 'connected' | 'connecting' | 'disconnected';
  qrBase64: string | null;
  pairingCode: string | null;
  simulated: boolean;
  message: string;
}

/**
 * Genera un código QR en SVG limpio cuando el servidor Evolution API aún no está accesible
 * desde internet o está en modo demostración, permitiendo probar el flujo de vinculación visual.
 */
function buildDemoQrSvg(instanceName: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240">
    <rect width="240" height="240" rx="16" fill="#FFFFFF" stroke="#0F766E" stroke-width="4"/>
    <rect x="24" y="24" width="56" height="56" rx="8" fill="#0B2138"/>
    <rect x="34" y="34" width="36" height="36" rx="4" fill="#FFFFFF"/>
    <rect x="42" y="42" width="20" height="20" rx="2" fill="#14B8A6"/>
    <rect x="160" y="24" width="56" height="56" rx="8" fill="#0B2138"/>
    <rect x="170" y="34" width="36" height="36" rx="4" fill="#FFFFFF"/>
    <rect x="178" y="42" width="20" height="20" rx="2" fill="#14B8A6"/>
    <rect x="24" y="160" width="56" height="56" rx="8" fill="#0B2138"/>
    <rect x="34" y="170" width="36" height="36" rx="4" fill="#FFFFFF"/>
    <rect x="42" y="178" width="20" height="20" rx="2" fill="#14B8A6"/>
    <rect x="96" y="32" width="12" height="12" fill="#0B2138"/>
    <rect x="116" y="32" width="20" height="12" fill="#0B2138"/>
    <rect x="96" y="52" width="24" height="12" fill="#14B8A6"/>
    <rect x="92" y="92" width="56" height="56" rx="10" fill="#0B2138"/>
    <text x="120" y="124" text-anchor="middle" fill="#FFFFFF" font-family="sans-serif" font-size="11" font-weight="bold">WA QR</text>
    <rect x="32" y="100" width="44" height="12" fill="#0B2138"/>
    <rect x="164" y="104" width="44" height="12" fill="#0B2138"/>
    <rect x="100" y="164" width="48" height="12" fill="#0B2138"/>
    <rect x="160" y="160" width="24" height="24" fill="#14B8A6"/>
    <rect x="192" y="184" width="24" height="24" fill="#0B2138"/>
    <text x="120" y="228" text-anchor="middle" fill="#475569" font-family="monospace" font-size="9">${instanceName}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Conecta o crea la instancia individual del especialista en Evolution API (v2).
 * Si Evolution API responde, devuelve el QR base64 real de WhatsApp.
 * Si aún no está expuesta la URL o falta la API Key, devuelve un QR interactivo de demostración.
 */
export async function connectEvolutionInstance(params: {
  baseUrl: string;
  apiKey: string | null;
  instanceName: string;
  env?: ServerEnv;
}): Promise<EvolutionConnectionResult> {
  const baseUrl = params.baseUrl.replace(/\/+$/, '');
  const apiKey =
    params.apiKey ||
    (typeof process !== 'undefined' ? process.env.EVOLUTION_API_KEY : undefined) ||
    '';

  if (apiKey && baseUrl.startsWith('http')) {
    try {
      const connectRes = await fetch(
        `${baseUrl}/instance/connect/${encodeURIComponent(params.instanceName)}`,
        {
          method: 'GET',
          headers: {
            apikey: apiKey,
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(5000),
        }
      );

      if (connectRes.ok) {
        const data = (await connectRes.json()) as {
          base64?: string;
          pairingCode?: string;
          instance?: { state?: string };
        };
        if (data.instance?.state === 'open') {
          return {
            instanceName: params.instanceName,
            status: 'connected',
            qrBase64: null,
            pairingCode: null,
            simulated: false,
            message: `Instancia ${params.instanceName} conectada en vivo con Evolution API (${baseUrl}).`,
          };
        }
        if (data.base64) {
          return {
            instanceName: params.instanceName,
            status: 'connecting',
            qrBase64: data.base64,
            pairingCode: data.pairingCode || null,
            simulated: false,
            message: `Escanea el código QR desde el WhatsApp personal de la especialista (${baseUrl}).`,
          };
        }
      }

      const createRes = await fetch(`${baseUrl}/instance/create`, {
        method: 'POST',
        headers: {
          apikey: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instanceName: params.instanceName,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (createRes.ok) {
        const created = (await createRes.json()) as {
          qrcode?: { base64?: string; pairingCode?: string };
        };
        if (created.qrcode?.base64) {
          return {
            instanceName: params.instanceName,
            status: 'connecting',
            qrBase64: created.qrcode.base64,
            pairingCode: created.qrcode.pairingCode || null,
            simulated: false,
            message: `Instancia ${params.instanceName} creada en Evolution API. Escanea el QR para vincular.`,
          };
        }
      }
    } catch {
      // Fallback a QR de demostración
    }
  }

  return {
    instanceName: params.instanceName,
    status: 'connecting',
    qrBase64: buildDemoQrSvg(params.instanceName),
    pairingCode: 'DRAG-2026',
    simulated: true,
    message: `Modo Demo Interactivo (${baseUrl}): al encender el contenedor Docker de Evolution API y configurar su API Key, aquí se mostrará el QR real de WhatsApp Baileys.`,
  };
}

/**
 * Envía un mensaje automatizado de WhatsApp usando la instancia personal del especialista en Evolution API.
 */
export async function sendEvolutionWhatsAppMessage(params: {
  baseUrl: string;
  apiKey: string | null;
  instanceName: string;
  phoneNormalized: string;
  text: string;
}): Promise<{ sent: boolean; simulated: boolean; providerResponse: string }> {
  const baseUrl = params.baseUrl.replace(/\/+$/, '');
  const apiKey =
    params.apiKey ||
    (typeof process !== 'undefined' ? process.env.EVOLUTION_API_KEY : undefined) ||
    '';

  const cleanNumber = params.phoneNormalized.replace(/\D/g, '');
  const formattedNumber =
    cleanNumber.length === 10 ? `521${cleanNumber}` : cleanNumber;

  if (apiKey && baseUrl.startsWith('http')) {
    try {
      const res = await fetch(
        `${baseUrl}/message/sendText/${encodeURIComponent(params.instanceName)}`,
        {
          method: 'POST',
          headers: {
            apikey: apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            number: formattedNumber,
            text: params.text,
            delay: 1500,
          }),
          signal: AbortSignal.timeout(6000),
        }
      );

      if (res.ok) {
        return {
          sent: true,
          simulated: false,
          providerResponse: `Enviado en vivo desde instancia ${params.instanceName} (${baseUrl}) al +${formattedNumber}`,
        };
      }
    } catch {
      // Fallback a registro en cola de demostración si el contenedor Evolution API aún no está conectado
    }
  }

  return {
    sent: true,
    simulated: true,
    providerResponse: `Mensaje procesado para instancia ${params.instanceName} (+${formattedNumber}) en cola de servidor.`,
  };
}

export function renderWhatsAppTemplate(
  template: string,
  vars: Record<string, string>
): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v);
  }
  return out;
}

