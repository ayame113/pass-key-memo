import { Handler } from "$fresh/server.ts";
import { app } from "../../backend/mod.ts";

export const handler: Handler = app.fetch;
