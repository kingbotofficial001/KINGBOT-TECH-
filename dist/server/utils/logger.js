"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const timestamp = () => new Date().toISOString();
function info(message, meta) {
    console.log(`[${timestamp()}] INFO  ${message}`, meta ?? '');
}
function warn(message, meta) {
    console.warn(`[${timestamp()}] WARN  ${message}`, meta ?? '');
}
function error(message, meta) {
    const detail = meta instanceof Error ? meta.message : meta;
    console.error(`[${timestamp()}] ERROR ${message}`, detail ?? '');
}
exports.default = { info, warn, error };
