/**
 * O contrato de um meio de pagamento.
 *
 * Existe para que trocar de provedor não signifique reescrever o checkout —
 * e essa troca acontece: taxa muda, provedor cai, PIX e cartão às vezes
 * ficam melhor em casas diferentes. Nenhum código de produto deve saber o
 * nome do gateway; só este arquivo e o adaptador dele.
 *
 * O que NÃO passa por aqui, nunca: número de cartão, CVV e validade. Esses
 * dados vão do navegador direto para o provedor, que devolve um token. O
 * Atlas guarda transação, status, valor, método e produto — nada que sirva
 * para cobrar alguém de novo.
 */

export type PaymentMethod = "pix" | "card";

export interface ChargeRequest {
  orderId: string;
  reference: string;
  amountCents: number;
  currency: string;
  description: string;
  customer: { name: string; email: string; taxId?: string };
  /** Cartão: token gerado no navegador pelo SDK do provedor. Nunca o PAN. */
  cardToken?: string;
  installments?: number;
}

export interface PixCharge {
  method: "pix";
  gatewayReference: string;
  /** Imagem do QR Code, já pronta para exibir. */
  qrCodeImage: string;
  /** O "copia e cola". */
  qrCodePayload: string;
  expiresAt: string;
}

export interface CardCharge {
  method: "card";
  gatewayReference: string;
  /** Alguns provedores aprovam na hora; outros só pelo webhook. */
  approved: boolean;
  /** 3-D Secure: para onde mandar o cliente, quando houver. */
  redirectUrl?: string;
}

export type Charge = PixCharge | CardCharge;

/**
 * O que um webhook do provedor significa para nós.
 *
 * Traduzido para o nosso vocabulário de propósito: o resto do sistema não
 * deve aprender os nomes de evento de nenhum provedor.
 */
export interface GatewayEvent {
  gatewayReference: string;
  kind: "paid" | "failed" | "expired" | "refunded" | "processing" | "ignored";
  amountCents?: number;
  raw: unknown;
}

export interface PaymentGateway {
  readonly id: string;
  readonly supports: PaymentMethod[];
  createPixCharge(request: ChargeRequest): Promise<PixCharge>;
  createCardCharge(request: ChargeRequest): Promise<CardCharge>;
  /**
   * Confere a assinatura do webhook e devolve o evento traduzido, ou null se
   * a assinatura não bate.
   *
   * Devolver null em vez de lançar é deliberado: assinatura inválida é o caso
   * ESPERADO de quem tenta forjar um pagamento, e o chamador precisa
   * responder 401 sem tratar isso como incidente.
   */
  parseWebhook(rawBody: string, headers: Record<string, string>): GatewayEvent | null;
}
