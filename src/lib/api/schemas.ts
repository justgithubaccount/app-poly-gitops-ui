import { z } from "zod";

export const messageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});
export const chatRequestSchema = z.object({ messages: z.array(messageSchema).min(1) });
export const chatResponseSchema = z.object({ reply: z.string() });
export const createProjectSchema = z.object({ name: z.string().trim().min(1).max(200) });
export const projectSchema = z.object({ id: z.string(), name: z.string() });
export const projectsSchema = z.array(projectSchema);
export const historySchema = z.array(
  z.object({
    id: z.string(),
    project_id: z.string(),
    messages: z.array(
      messageSchema.extend({
        timestamp: z.string(),
        trace_id: z.string().nullable().optional(),
        span_id: z.string().nullable().optional(),
      }),
    ),
    timestamp: z.string(),
    trace_id: z.string().nullable(),
    span_id: z.string().nullable(),
  }),
);
export const healthSchema = z.object({ status: z.string() });
export const behaviorSchema = z.record(z.string(), z.unknown());

export type Message = z.infer<typeof messageSchema>;
export type Project = z.infer<typeof projectSchema>;
export type RequestHistory = z.infer<typeof historySchema>;
