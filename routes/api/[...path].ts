import { assert } from "$std/assert/assert.ts";
import { Handler } from "$fresh/server.ts";
import { Context, Hono, validator } from "$hono/mod.ts";
import { z } from "$zod/mod.ts";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  VerifiedAuthenticationResponse,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "$simplewebauthn/server.ts";
import {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from "$simplewebauthn/typescript-types.ts";
import { isoBase64URL } from "$simplewebauthn/server/helpers.ts";
import { cert, initializeApp } from "npm:firebase-admin@12.0.0/app";
import { Database } from "../../backend/db.ts";
import { getFirebaseToken, verifyFirebaseToken } from "../../backend/auth.ts";

// Human-readable title for your website
const rpName = "pass key memo";
// A unique identifier for your website
const rpID = Deno.env.get("DENO_DEPLOYMENT_ID")
  ? "pass-key-memo.deno.dev"
  : "localhost";
// The URL at which registrations and authentications should occur
const origin = [
  "http://localhost:8000",
  "http://localhost:8001",
  `https://${rpID}`,
];

const db = new Database();

const FIREBASE_PROJECT_ID = Deno.env.get("FIREBASE_PROJECT_ID");
assert(FIREBASE_PROJECT_ID, "FIREBASE_PROJECT_ID is undefined");

initializeApp({
  credential: cert({
    projectId: FIREBASE_PROJECT_ID,
    clientEmail: Deno.env.get("FIREBASE_CLIENT_EMAIL"),
    privateKey: Deno.env.get("FIREBASE_PRIVATE_KEY"),
  }),
});

const app = new Hono().basePath("/api");

// ルーティングの設定
const route = app
  .post(
    "/create_user",
    validator(
      "json",
      parse(z.object({
        userName: z.string().min(1).max(255),
      })),
    ),
    async (c) => {
      const body = c.req.valid("json");

      // ユーザーを新規作成
      const user = await db.createUser(body.userName);

      // firebaseのidTokenを発行して返す
      const firebaseCustomToken = await getFirebaseToken(user.id);

      return c.json({ firebaseCustomToken });
    },
  )
  .post(
    "/generate_registration_options",
    validator("header", parse(z.object({ authorization: z.string() }))),
    async (c) => {
      const { uid } = await verifyFirebaseToken(c.req.valid("header"), {
        projectId: FIREBASE_PROJECT_ID,
      });

      // ユーザー情報を取得
      const [user, userAuthenticators] = await Promise.all([
        db.getUser(uid),
        db.getUserAuthenticators(uid),
      ]);

      // registration optionを生成
      const options = await generateRegistrationOptions({
        rpName,
        rpID,
        userID: uid,
        userName: `${user.name}-${Math.random().toString(36).slice(-8)}`,
        userDisplayName: user.name,
        // Don't prompt users for additional information about the authenticator
        // (Recommended for smoother UX)
        attestationType: "none",
        // Prevent users from re-registering existing authenticators
        excludeCredentials: userAuthenticators.map((authenticator) => ({
          id: authenticator.credentialID,
          type: "public-key",
          // Optional
          transports: authenticator.transports,
        })),
        // See "Guiding use of authenticators via authenticatorSelection" below
        authenticatorSelection: {
          // "Discoverable credentials" used to be called "resident keys". The
          // old name persists in the options passed to `navigator.credentials.create()`.
          residentKey: "required",
          userVerification: "preferred",
        },
      });

      // 生成されたchallengeを記録
      const { challengeId } = await db.rememberChallenge(options.challenge);

      await db.logAllUsers();

      return c.json({ registrationOptions: options, challengeId });
    },
  )
  .post(
    "/verify_registration",
    validator("header", parse(z.object({ authorization: z.string() }))),
    validator(
      "json",
      parse(z.object({
        challengeId: z.string(),
        registrationResponse: z.custom<RegistrationResponseJSON>((value) =>
          z.record(z.unknown()).safeParse(value).success
        ),
      })),
    ),
    async (c) => {
      const { uid } = await verifyFirebaseToken(c.req.valid("header"), {
        projectId: FIREBASE_PROJECT_ID,
      });
      const { challengeId, registrationResponse } = c.req.valid("json");

      // 認証器情報を検証
      let verification;
      try {
        verification = await verifyRegistrationResponse({
          response: registrationResponse,
          async expectedChallenge(challenge) {
            return await db.checkChallenge(challengeId, challenge);
          },
          expectedOrigin: origin,
          expectedRPID: rpID,
          requireUserVerification: true,
        });
      } catch (error) {
        console.error(error);
        c.status(401);
        return c.json({ verified: false } as const);
      }

      const { registrationInfo, verified } = verification;

      if (!verified || !registrationInfo) {
        c.status(401);
        return c.json({ verified: false } as const);
      }

      await db.saveUserAuthenticator(uid, {
        credentialID: registrationInfo.credentialID,
        credentialPublicKey: registrationInfo.credentialPublicKey,
        counter: registrationInfo.counter,
        credentialDeviceType: registrationInfo.credentialDeviceType,
        credentialBackedUp: registrationInfo.credentialBackedUp,
        transports: registrationResponse.response.transports,
      });

      await db.logAllUsers();

      return c.json({ verified: true } as const);
    },
  )
  .post("/generate_authentication_options", async (c) => {
    // authentication optionを生成
    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: "preferred",
    });

    // challengeを記録
    const { challengeId } = await db.rememberChallenge(options.challenge);

    await db.logAllUsers();

    return c.json({ authenticationOptions: options, challengeId });
  })
  .post(
    "/verify_authentication",
    validator(
      "json",
      parse(z.object({
        challengeId: z.string(),
        authenticationResponse: z.custom<AuthenticationResponseJSON>((value) =>
          z.record(z.unknown()).safeParse(value).success
        ),
      })),
    ),
    async (c) => {
      const { authenticationResponse, challengeId } = c.req.valid("json");
      const { userHandle } = authenticationResponse.response;

      if (!userHandle) {
        c.status(401);
        return c.json({ verified: false } as const);
      }

      // 認証器情報を取得
      const authenticator = await db.getUserAuthenticator(
        userHandle,
        authenticationResponse.id,
      );

      // 認証器情報を検証
      let verification: VerifiedAuthenticationResponse;
      try {
        verification = await verifyAuthenticationResponse({
          response: authenticationResponse,
          async expectedChallenge(challenge) {
            return await db.checkChallenge(challengeId, challenge);
          },
          expectedOrigin: origin,
          expectedRPID: rpID,
          authenticator,
          requireUserVerification: true,
        });
      } catch (error) {
        console.error(error);
        c.status(401);
        return c.json({ verified: false } as const);
      }

      // 検証が成功しなければ401を返す
      if (!verification.verified) {
        c.status(401);
        return c.json({ verified: false } as const);
      }

      // 認証器のcounter情報を更新
      await db.updateUserAuthenticatorCounter(
        userHandle,
        authenticator.credentialID,
        verification.authenticationInfo.newCounter,
      );

      await db.logAllUsers();

      // firebaseのidTokenを発行して返す
      const firebaseCustomToken = await getFirebaseToken(userHandle);

      return c.json({ verified: true, firebaseCustomToken } as const);
    },
  )
  .get(
    "/user_info",
    validator("header", parse(z.object({ authorization: z.string() }))),
    async (c) => {
      const { uid } = await verifyFirebaseToken(c.req.valid("header"), {
        projectId: FIREBASE_PROJECT_ID,
      });

      const [user, authenticators] = await Promise.all([
        db.getUser(uid),
        db.getUserAuthenticators(uid),
      ]);

      return c.json({
        userInfo: user,
        authenticators: authenticators.map((authenticator) => ({
          credentialID: isoBase64URL.fromBuffer(authenticator.credentialID),
          credentialDeviceType: authenticator.credentialDeviceType,
          credentialBackedUp: authenticator.credentialBackedUp,
          counter: authenticator.counter,
        })),
      });
    },
  );

export const handler: Handler = (req) => app.fetch(req);
export type AppType = typeof route;

function parse<T>(schema: z.ZodType<T>) {
  return (value: unknown, c: Context) => {
    const parsed = schema.safeParse(value);

    if (!parsed.success) {
      return c.text("invalid header", 400);
    }

    return parsed.data;
  };
}
