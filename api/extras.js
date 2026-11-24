import { handle } from '../server/http.mjs';
export const POST = (request) => handle('extras', request);
