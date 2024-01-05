import { Handler } from "$fresh/server.ts";
import { Hono, validator } from "$hono/mod.ts";
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
import { getAuth } from "npm:firebase-admin@12.0.0/auth";
import { Database } from "../../backend/db.ts";
import { decode, verify } from "https://deno.land/x/djwt@v3.0.1/mod.ts";

// Human-readable title for your website
const rpName = "pass key memo";
// A unique identifier for your website
const rpID = Deno.env.get("DENO_DEPLOYMENT_ID")
  ? "pass-key-memo.deno.dev"
  : "localhost";
// The URL at which registrations and authentications should occur
const origin = ["http://localhost:8001", `https://${rpID}`];
const db = new Database();
initializeApp({
  credential: cert({
    projectId: Deno.env.get("FIREBASE_PROJECT_ID"),
    clientEmail: Deno.env.get("FIREBASE_CLIENT_EMAIL"),
    privateKey: Deno.env.get("FIREBASE_PRIVATE_KEY"),
  }),
});

const app = new Hono().basePath("/api");

// ルーティングの設定
const route = app
  .post(
    "/generate_registration_options",
    validator("json", (value, c) => {
      const schema = z.object({
        userName: z.string().min(1).max(255),
      });
      const parsed = schema.safeParse(value);
      if (!parsed.success) {
        return c.text("invalid body", 400);
      }
      return parsed.data;
    }),
    async (c) => {
      const body = c.req.valid("json");

      // (Pseudocode) Retrieve the user from the database
      // after they've logged in
      const user = await db.createUser(body.userName);
      // (Pseudocode) Retrieve any of the user's previously-
      // registered authenticators
      const userAuthenticators = await db.getUserAuthenticators(user.id);

      const options = await generateRegistrationOptions({
        rpName,
        rpID,
        userID: user.id,
        userName: `${body.userName}-${Math.random().toString(36).slice(-8)}`,
        userDisplayName: body.userName,
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

      // (Pseudocode) Remember the challenge for this user
      const { challengeId } = await db.rememberChallenge(options.challenge);

      await db.logAllUsers();

      return c.json({ registrationOptions: options, challengeId });
    },
  )
  .post(
    "/verify_registration",
    validator("json", (value, c) => {
      const schema = z.object({
        userId: z.string().min(1).max(255),
        challengeId: z.string(),
        registrationResponse: z.record(z.unknown()),
      });
      const parsed = schema.safeParse(value);
      if (!parsed.success) {
        return c.text("invalid body", 400);
      }

      return {
        userId: parsed.data.userId,
        challengeId: parsed.data.challengeId,
        registrationResponse: parsed.data
          .registrationResponse as unknown as RegistrationResponseJSON,
      };
    }),
    async (c) => {
      const { userId, challengeId, registrationResponse } = c.req.valid("json");

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

      await db.saveUserAuthenticator(userId, {
        credentialID: registrationInfo.credentialID,
        credentialPublicKey: registrationInfo.credentialPublicKey,
        counter: registrationInfo.counter,
        credentialDeviceType: registrationInfo.credentialDeviceType,
        credentialBackedUp: registrationInfo.credentialBackedUp,
        transports: registrationResponse.response.transports,
      });

      await db.logAllUsers();

      const user = await db.getUser(userId);

      const firebaseCustomToken = await getAuth().createCustomToken(
        userId,
      );

      return c.json({ verified: true, user, firebaseCustomToken } as const);
    },
  )
  .post("/generate_authentication_options", async (c) => {
    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: "preferred",
    });

    // (Pseudocode) Remember this challenge for this user
    const { challengeId } = await db.rememberChallenge(options.challenge);

    await db.logAllUsers();

    return c.json({ authenticationOptions: options, challengeId });
  })
  .post(
    "/verify_authentication",
    validator("json", (value, c) => {
      const schema = z.object({
        challengeId: z.string(),
        authenticationResponse: z.record(z.unknown()),
      });
      const parsed = schema.safeParse(value);
      if (!parsed.success) {
        return c.text("invalid body", 400);
      }

      return {
        challengeId: parsed.data.challengeId,
        authenticationResponse: parsed.data
          .authenticationResponse as unknown as AuthenticationResponseJSON,
      };
    }),
    async (c) => {
      const { authenticationResponse, challengeId } = c.req.valid("json");
      const { userHandle } = authenticationResponse.response;

      if (!userHandle) {
        c.status(401);
        return c.json({ verified: false } as const);
      }

      // (Pseudocode} Retrieve an authenticator from the DB that
      // should match the `id` in the returned credential
      const authenticator = await db.getUserAuthenticator(
        userHandle,
        authenticationResponse.id,
      );

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

      if (!verification.verified) {
        c.status(401);
        return c.json({ verified: false } as const);
      }

      await db.updateUserAuthenticatorCounter(
        userHandle,
        authenticator.credentialID,
        verification.authenticationInfo.newCounter,
      );

      await db.logAllUsers();

      const user = await db.getUser(userHandle);

      const firebaseCustomToken = await getAuth().createCustomToken(
        userHandle,
      );

      return c.json({ verified: true, user, firebaseCustomToken } as const);
    },
  )
  .get(
    "/user_info",
    validator("header", (value, c) => {
      const schema = z.object({
        authorization: z.string(),
      });

      const parsed = schema.safeParse(value);

      if (!parsed.success) {
        return c.text("invalid header", 400);
      }

      if (!parsed.data.authorization.startsWith("Bearer ")) {
        return c.text("invalid header", 400);
      }

      return parsed.data;
    }),
    async (c) => {
      const { authorization } = c.req.valid("header");

      console.log("jwt:", authorization.slice("Bearer ".length));

      const auth = getAuth();
      console.log("aaaa", auth.idTokenVerifier.verifySignature);
      auth.idTokenVerifier.verifySignature = async (jwt) => {
        console.log(jwt);
        const [header, _payload, _signature] = decode(jwt);
        const publicKeys = await getFirebasePublicKeys();
        if (
          !header || typeof header !== "object" || !("kid" in header) ||
          typeof header.kid !== "string"
        ) {
          throw new Error("invalid jwt (kid header not found.)");
        }
        const publicKey = publicKeys[header.kid];
        console.log(publicKey);
        if (!publicKey) {
          throw new Error("invalid jwt (public key not found.)");
        }

        console.log(publicKey.split("\n").slice(1, -2));

        const cryptoKey = await crypto.subtle.importKey(
          "pkcs8",
          Uint8Array.from(
            atob(publicKey.split("\n").slice(1, -2).join("")),
            (c) => c.charCodeAt(0),
          ),
          {
            name: "RSASSA-PKCS1-v1_5",
            hash: "SHA-256",
          },
          true,
          ["verify"],
        );

        console.log(cryptoKey);

        await verify(jwt, cryptoKey);
        // throw new Error("wwwww");
      };
      const { uid } = await auth.verifyIdToken(
        authorization.slice("Bearer ".length),
      );

      console.log({ uid });

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

let publicKeys: Promise<Record<string, string>> | undefined;
function getFirebasePublicKeys() {
  return publicKeys ??= getFirebasePublicKeysInternal();
}
async function getFirebasePublicKeysInternal(): Promise<
  Record<string, string>
> {
  const res = await fetch(
    "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com",
  );
  const cacheControl = res.headers.get("cache-control");
  const maxAge = cacheControl?.match(/max-age=(\d+)/)?.[1];
  console.log({ maxAge });
  Deno.unrefTimer(setTimeout(() => {
    publicKeys = undefined;
  }, +(maxAge ?? 60) * 1000));
  return await res.json();
}
export const handler: Handler = (req) => app.fetch(req);
export type AppType = typeof route; // rpcモードを使用するときはこのAppTypeをexportする
