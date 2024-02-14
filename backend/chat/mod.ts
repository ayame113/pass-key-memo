import { assert } from "$std/assert/assert.ts";
import { Hono, validator } from "$hono/mod.ts";
import { z } from "$zod/mod.ts";
import type { Database } from "../../backend/db.ts";
import { verifyFirebaseToken } from "../../backend/auth/firebase.ts";
import { parse } from "../util.ts";

const FIREBASE_PROJECT_ID = Deno.env.get("FIREBASE_PROJECT_ID");
assert(FIREBASE_PROJECT_ID, "FIREBASE_PROJECT_ID is undefined");

const app = new Hono<{ Variables: { db: Database } }>();

// ルーティングの設定
export const chatApp = app
  .post(
    "/message",
    validator("header", parse(z.object({ authorization: z.string() }))),
    validator(
      "json",
      parse(z.object({
        message: z.string().min(2).max(2),
      })),
    ),
    async (c) => {
      const body = c.req.valid("json");
      const { db } = c.var;
      const { uid } = await verifyFirebaseToken(c.req.valid("header"), {
        projectId: FIREBASE_PROJECT_ID,
      });

      await db.postChat(uid, body.message);

      return c.json({ success: true });
    },
  )
  .get(
    "/history",
    validator("header", parse(z.object({ authorization: z.string() }))),
    async (c) => {
      const { db } = c.var;

      const messages = await db.getChatMessages();

      return c.json({ messages });
    },
  );
