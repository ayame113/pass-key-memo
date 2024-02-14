import { assert } from "$std/assert/assert.ts";
import { Hono } from "$hono/mod.ts";
import { cert, initializeApp } from "npm:firebase-admin@12.0.0/app";
import { authApp } from "./auth/mod.ts";
import { Database } from "./db.ts";
import { chatApp } from "./chat/mod.ts";

const db = new Database();

// firebase初期化処理
const FIREBASE_PROJECT_ID = Deno.env.get("FIREBASE_PROJECT_ID");
assert(FIREBASE_PROJECT_ID, "FIREBASE_PROJECT_ID is undefined");

initializeApp({
  credential: cert({
    projectId: FIREBASE_PROJECT_ID,
    clientEmail: Deno.env.get("FIREBASE_CLIENT_EMAIL"),
    privateKey: Deno.env.get("FIREBASE_PRIVATE_KEY"),
  }),
});

export const app = new Hono<{ Variables: { db: Database } }>()
  .basePath("/api")
  .use("*", async (c, next) => {
    c.set("db", db);
    await next();
  })
  .route("/auth", authApp)
  .route("/chat", chatApp);

export type AppType = typeof app;
