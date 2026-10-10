export type Severity = 'error' | 'warning';
export interface Diagnostic {
  code: string;
  severity: Severity;
  message: string;
  file?: string;
  line?: number;
  col?: number;
}
export function formatDiagnostic(d: Diagnostic): string {
  const where = d.file ? `${d.file}${d.line ? `:${d.line}:${d.col ?? 1}` : ''} ` : '';
  return `${where}${d.severity} ${d.code} ${d.message}`;
}
export const hasErrors = (ds: readonly Diagnostic[]): boolean => ds.some((d) => d.severity === 'error');
export const err = (code: string, message: string, at: { file?: string; line?: number; col?: number } = {}): Diagnostic => ({ code, severity: 'error', message, ...at });
export const warn = (code: string, message: string, at: { file?: string; line?: number; col?: number } = {}): Diagnostic => ({ code, severity: 'warning', message, ...at });
