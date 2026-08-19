const timestamp = (): string => new Date().toISOString();

function info(message: string, meta?: unknown): void {
  console.log(`[${timestamp()}] INFO  ${message}`, meta ?? '');
}

function warn(message: string, meta?: unknown): void {
  console.warn(`[${timestamp()}] WARN  ${message}`, meta ?? '');
}

function error(message: string, meta?: unknown): void {
  const detail = meta instanceof Error ? meta.message : meta;
  console.error(`[${timestamp()}] ERROR ${message}`, detail ?? '');
}

export default { info, warn, error };
