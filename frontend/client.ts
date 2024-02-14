import { hc, InferRequestType } from "$hono/mod.ts";
import { auth } from "./deps/firebase.ts";
// サーバー側から必要な型をimportする
import type { AppType } from "../backend/mod.ts";

const client = hc<AppType>("/");

export async function createUser(
  body: InferRequestType<typeof client.api.auth.create_user.$post>["json"],
) {
  const res = await client.api.auth.create_user.$post({
    json: body,
  });
  return await res.json();
}

export async function generateRegistrationOptions() {
  const idToken = await auth.currentUser?.getIdToken();
  const res = await client.api.auth.generate_registration_options.$post({
    header: { authorization: `Bearer ${idToken}` },
  });
  return await res.json();
}

export async function verifyRegistration(
  body: InferRequestType<
    typeof client.api.auth.verify_registration.$post
  >["json"],
) {
  const idToken = await auth.currentUser?.getIdToken();
  const res = await client.api.auth.verify_registration.$post({
    header: { authorization: `Bearer ${idToken}` },
    json: body,
  });
  return await res.json();
}

export async function generateAuthenticationOptions() {
  const res = await client.api.auth.generate_authentication_options.$post();
  return await res.json();
}

export async function verifyAuthentication(
  body: InferRequestType<
    typeof client.api.auth.verify_authentication.$post
  >["json"],
) {
  const res = await client.api.auth.verify_authentication.$post({ json: body });
  return await res.json();
}

export async function getUserInfo() {
  const idToken = await auth.currentUser?.getIdToken();
  const res = await client.api.auth.user_info.$get({
    header: {
      authorization: `Bearer ${idToken}`,
    },
  });
  return await res.json();
}

export async function postChat(message: string) {
  const idToken = await auth.currentUser?.getIdToken();
  const res = await client.api.chat.message.$post({
    header: { authorization: `Bearer ${idToken}` },
    json: { message },
  });
  return await res.json();
}

export async function getChatHistory() {
  const idToken = await auth.currentUser?.getIdToken();
  const res = await client.api.chat.history.$get({
    header: { authorization: `Bearer ${idToken}` },
  });
  return await res.json();
}
