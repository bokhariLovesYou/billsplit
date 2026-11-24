import { handle } from '../server/http.mjs';
export const GET = (request) => handle('ledger', request);
