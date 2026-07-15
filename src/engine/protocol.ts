import { z } from 'zod';

export const EngineToHostSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('ready'),
    pyodideVersion: z.string().optional(),
    version: z.string().optional(),
    engine: z.string().optional(),
    offline: z.boolean().optional(),
  }),
  z.object({ type: z.literal('status'), message: z.string() }),
  z.object({ type: z.literal('stdout'), data: z.string() }),
  z.object({ type: z.literal('stderr'), data: z.string() }),
  z.object({ type: z.literal('input_request'), prompt: z.string(), id: z.string() }),
  z.object({ type: z.literal('done'), ok: z.boolean(), durationMs: z.number() }),
  z.object({ type: z.literal('error'), message: z.string() }),
  z.object({
    type: z.literal('error_detail'),
    message: z.string(),
    line: z.number().nullable().optional(),
  }),
  z.object({ type: z.literal('packages'), packages: z.array(z.string()) }),
]);

export type EngineToHostMessage = z.infer<typeof EngineToHostSchema>;

export type HostToEngineMessage =
  | { type: 'run'; code: string; autoInstall: boolean; timeoutMs?: number }
  | { type: 'stdin'; id: string; value: string }
  | { type: 'install'; packages: string[] }
  | { type: 'interrupt' }
  | { type: 'ping' };

export interface ConsoleLine {
  id: string;
  kind: 'stdout' | 'stderr' | 'system' | 'stdin' | 'prompt';
  text: string;
}

export type RunnerStatus =
  | 'idle'
  | 'booting'
  | 'ready'
  | 'running'
  | 'awaiting_input'
  | 'installing'
  | 'error';
