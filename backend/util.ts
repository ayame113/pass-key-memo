import { Context } from "$hono/mod.ts";
import { z } from "$zod/mod.ts";

export function parse<T>(schema: z.ZodType<T>) {
  return (value: unknown, c: Context) => {
    const parsed = schema.safeParse(value);

    if (!parsed.success) {
      return c.text("invalid header", 400);
    }

    return parsed.data;
  };
}
