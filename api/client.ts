import { hc, InferRequestType } from "$hono/mod.ts";
import { auth } from "../deps/firebase.ts";
// サーバー側から必要な型をimportする
import type { AppType } from "../routes/api/[...path].ts";

const client = hc<AppType>("/");

export async function generateRegistrationOptions(
  body: InferRequestType<
    typeof client.api.generate_registration_options.$post
  >["json"],
) {
  const res = await client.api.generate_registration_options.$post({
    json: body,
  });
  return await res.json();
}

export async function verifyRegistration(
  body: InferRequestType<typeof client.api.verify_registration.$post>["json"],
) {
  const res = await client.api.verify_registration.$post({ json: body });
  return await res.json();
}

export async function generateAuthenticationOptions() {
  const res = await client.api.generate_authentication_options.$post();
  return await res.json();
}

export async function verifyAuthentication(
  body: InferRequestType<typeof client.api.verify_authentication.$post>["json"],
) {
  const res = await client.api.verify_authentication.$post({ json: body });
  return await res.json();
}

export async function getUserInfo() {
  const idToken = await auth.currentUser?.getIdToken(true);
  const res = await client.api.user_info.$get({
    header: {
      authorization: `Bearer ${idToken}`,
    },
  });
  return await res.json();
}
