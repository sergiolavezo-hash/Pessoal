/**
 * Estados de um pedido, e quem pode mudá-los.
 *
 * Existe como máquina explícita, e não como updates espalhados, por um
 * motivo: o estado do pedido é o que autoriza o download. Um caminho que
 * chegue a PAID sem confirmação do gateway entrega o produto de graça, e um
 * que saia de PAID por engano tira o produto de quem pagou. Ambos são
 * silenciosos — ninguém abre um chamado dizendo "recebi de graça".
 */

export const ORDER_STATUSES = [
  "PENDING",
  "PROCESSING",
  "PAID",
  "FAILED",
  "EXPIRED",
  "CANCELLED",
  "REFUNDED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/**
 * Quem tem autoridade para provocar a transição.
 *
 * `gateway` são fatos vindos de um webhook cuja assinatura já foi conferida.
 * `customer` é o navegador — que só pode desistir, nunca confirmar. `admin` é
 * a operação, para estorno e correção. A separação é o coração da regra
 * "nunca confiar no frontend": não existe transição para PAID com ator
 * `customer`, então o caminho nem chega a ser escrito.
 */
export type OrderActor = "customer" | "gateway" | "admin";

interface Transition {
  from: OrderStatus;
  to: OrderStatus;
  by: OrderActor[];
}

const TRANSITIONS: Transition[] = [
  // O cliente escolheu como pagar e o gateway aceitou o encargo.
  { from: "PENDING", to: "PROCESSING", by: ["gateway"] },
  // Desistiu antes de pagar.
  { from: "PENDING", to: "CANCELLED", by: ["customer", "admin"] },
  { from: "PROCESSING", to: "CANCELLED", by: ["admin"] },
  // O PIX venceu sem pagamento.
  { from: "PENDING", to: "EXPIRED", by: ["gateway", "admin"] },
  { from: "PROCESSING", to: "EXPIRED", by: ["gateway", "admin"] },
  // A ÚNICA porta para PAID, e só o gateway a abre.
  { from: "PROCESSING", to: "PAID", by: ["gateway"] },
  // PIX pode confirmar sem passar por PROCESSING, dependendo do provedor.
  { from: "PENDING", to: "PAID", by: ["gateway"] },
  { from: "PROCESSING", to: "FAILED", by: ["gateway"] },
  { from: "PENDING", to: "FAILED", by: ["gateway"] },
  // Estorno é decisão de negócio, mesmo quando o gateway avisa primeiro.
  { from: "PAID", to: "REFUNDED", by: ["gateway", "admin"] },
];

/** Estados dos quais não se sai — o pedido acabou, de um jeito ou de outro. */
const TERMINAL: OrderStatus[] = ["FAILED", "EXPIRED", "CANCELLED", "REFUNDED"];

export function isTerminal(status: OrderStatus): boolean {
  return TERMINAL.includes(status);
}

/** Só PAID libera o produto. Escrito uma vez, para não ser reinterpretado. */
export function grantsAccess(status: OrderStatus): boolean {
  return status === "PAID";
}

export interface TransitionResult {
  ok: boolean;
  /** Repetição do mesmo estado: o webhook reenviou, e isso não é erro. */
  noop?: boolean;
  reason?: string;
}

/**
 * A transição é permitida?
 *
 * Repetir o estado atual devolve `noop` em vez de erro: gateways reenviam o
 * mesmo evento, e tratar reenvio como falha enche o log de alarme falso e
 * esconde o problema de verdade.
 */
export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
  by: OrderActor
): TransitionResult {
  if (from === to) return { ok: false, noop: true };

  if (isTerminal(from)) {
    // REFUNDED sai de PAID, que não é terminal; o resto é fim de linha.
    return { ok: false, reason: `Pedido já está em ${from} e não muda mais.` };
  }

  const allowed = TRANSITIONS.find((t) => t.from === from && t.to === to);
  if (!allowed) return { ok: false, reason: `Transição ${from} → ${to} não existe.` };

  if (!allowed.by.includes(by)) {
    return {
      ok: false,
      reason: `${from} → ${to} não pode ser feita por "${by}".`,
    };
  }
  return { ok: true };
}

/** Rótulos em português, para o cliente e para a área administrativa. */
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Aguardando pagamento",
  PROCESSING: "Processando",
  PAID: "Pago",
  FAILED: "Não aprovado",
  EXPIRED: "Expirado",
  CANCELLED: "Cancelado",
  REFUNDED: "Estornado",
};
