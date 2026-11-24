import { handle } from '../server/http.mjs';
export const POST = (request) => handle('periods', request);
