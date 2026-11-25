export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

export const PROJECT_STATUS_LABELS = [
  "Aberto",        // 0: Open
  "Em Andamento",  // 1: InProgress
  "Entregue",      // 2: Delivered
  "Finalizado",    // 3: Completed
  "Cancelado",     // 4: Canceled
  "Em Disputa"     // 5: InDispute
];

export const EVENTS_LOOKBACK_BLOCKS = 9000n;
export const EVENTS_FEED_LIMIT = 10;

export const REVIEW_WINDOW_SECONDS = 7 * 24 * 60 * 60;