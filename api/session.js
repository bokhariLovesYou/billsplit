import { handle } from '../server/http.mjs';
export const POST = (request) => handle('session', request);
export const DELETE = (request) => handle('session', request);
