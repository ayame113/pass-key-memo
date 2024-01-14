import { HTTPException } from "$hono/mod.ts";
import { decodeProtectedHeader, importX509, jwtVerify } from "$jose/index.ts";
import { getAuth } from "npm:firebase-admin@12.0.0/auth";

export async function getFirebaseToken(uid: string) {
  return await getAuth().createCustomToken(
    uid,
  );
}

export async function verifyFirebaseToken(
  { authorization }: { authorization: string },
  { projectId }: { projectId: string },
) {
  if (!authorization.startsWith("Bearer ")) {
    throw new HTTPException(401, { message: "missing access token" });
  }

  const jwt = authorization.slice("Bearer ".length);

  const { kid } = decodeProtectedHeader(jwt);
  if (typeof kid !== "string") {
    throw new HTTPException(401, { message: "invalid access token" });
  }

  const publicKeys = await getFirebasePublicKeys();
  const publicKey = publicKeys[kid];

  const key = await importX509(publicKey, "RS256");
  const result = await jwtVerify(jwt, key, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
    algorithms: ["RS256"],
  });

  if (!result.payload.sub) {
    throw new HTTPException(401, { message: "invalid access token" });
  }

  return { uid: result.payload.sub };
}

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
  const maxAge = +(cacheControl?.match(/max-age=(\d+)/)?.[1] ?? 60);

  Deno.unrefTimer(
    setTimeout(() => {
      publicKeys = undefined;
    }, maxAge * 1000),
  );
  return await res.json();
}
