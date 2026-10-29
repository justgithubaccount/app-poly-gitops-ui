import { z } from "zod";

export const flowNameSchema = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/);
export const flowsSchema = z.object({ flows: z.array(flowNameSchema) });
export const agentsSchema = z.object({ agents: z.array(z.string().min(1)) });

const contextSchema = z
  .record(z.string(), z.unknown())
  .refine((value) => !Object.hasOwn(value, "namespace") && !Object.hasOwn(value, "app_name"), {
    message: "namespace и app_name задаются отдельными полями, а не через контекст",
  });

export const runRequestSchema = z.object({
  namespace: z.string().trim().min(1).max(253),
  app_name: z.string().trim().min(1).max(253).nullable().optional(),
  context: contextSchema.nullable().optional(),
});

export function parseRunContext(text: string): z.infer<typeof contextSchema> | undefined {
  if (!text.trim()) return undefined;
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("Контекст должен быть корректным JSON-объектом");
  }
  const parsed = contextSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error("Контекст должен быть JSON-объектом без ключей namespace и app_name");
  }
  return parsed.data;
}

export const runResponseSchema = z.object({
  final_answer: z.string(),
  steps: z.array(
    z.object({
      agent: z.string(),
      task: z.string(),
      output: z.string(),
      duration_ms: z.number().int().nonnegative(),
    }),
  ),
  metadata: z
    .object({
      total_duration_ms: z.number().nonnegative().optional(),
      trace_id: z.string().optional(),
    })
    .catchall(z.unknown()),
});

export type RunResponse = z.infer<typeof runResponseSchema>;
