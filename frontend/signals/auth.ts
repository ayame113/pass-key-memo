import {
  startAuthentication,
  startRegistration,
} from "$simplewebauthn/browser";
import { effect, signal } from "@preact/signals";
import {
  createUser,
  generateAuthenticationOptions,
  generateRegistrationOptions,
  getUserInfo,
  verifyAuthentication,
  verifyRegistration,
} from "../client.ts";
import {
  auth,
  onAuthStateChanged,
  signInWithCustomToken,
} from "../deps/firebase.ts";
import { IS_BROWSER } from "$fresh/runtime.ts";

/** loading user => undefined, authenticated => uid, unauthenticated => null */
const firebaseUser = signal<string | null | undefined>(undefined);
onAuthStateChanged(auth, (user) => {
  firebaseUser.value = user?.uid ?? null;
});

export const userInfo = signal<
  Awaited<ReturnType<typeof getUserInfo>> | null | undefined
>(
  undefined,
);
effect(async () => {
  if (!IS_BROWSER) {
    return;
  }
  if (firebaseUser.value === undefined) {
    return;
  }

  if (firebaseUser.value === null) {
    userInfo.value = null;
    return;
  }

  userInfo.value = await getUserInfo();
});

export async function signIn() {
  // GET authentication options from the endpoint that calls
  // @simplewebauthn/server -> generateAuthenticationOptions()
  const { authenticationOptions, challengeId } =
    await generateAuthenticationOptions();

  let authenticationResponse;
  try {
    // Pass the options to the authenticator and wait for a response
    authenticationResponse = await startAuthentication(authenticationOptions);
  } catch (error) {
    console.error(error);
    return {
      verified: false,
      message: "failed to authentication" + error,
    };
  }

  // POST the response to the endpoint that calls
  // @simplewebauthn/server -> verifyAuthenticationResponse()
  // Wait for the results of verification
  const verificationResult = await verifyAuthentication({
    authenticationResponse,
    challengeId,
  });

  // Show UI appropriate for the `verified` status
  if (verificationResult.verified) {
    await signInWithCustomToken(
      auth,
      verificationResult.firebaseCustomToken,
    );

    return {
      verified: true,
      message: "Successfully authenticated!",
    };
  } else {
    return { verified: false, message: "Failed to Verification" };
  }
}

// create account
export async function signUp({ userName }: { userName: string }) {
  // 1. ユーザーを作成
  const { firebaseCustomToken } = await createUser({ userName });
  await signInWithCustomToken(
    auth,
    firebaseCustomToken,
  );

  // 2. 認証器を登録
  const verificationResult = await registerAuthenticator();

  if (verificationResult.verified) {
    return { verified: true, message: "Successfully registered!" };
  } else {
    return { verified: false, message: "Failed to Verification" };
  }
}

/** 認証器を新規登録する */
export async function registerAuthenticator() {
  // GET registration options from the endpoint that calls
  // @simplewebauthn/server -> generateRegistrationOptions()
  const {
    registrationOptions,
    challengeId,
  } = await generateRegistrationOptions();

  let registrationResponse;
  try {
    // Pass the options to the authenticator and wait for a response
    registrationResponse = await startRegistration(registrationOptions);
  } catch (error) {
    console.error(error);
    return { verified: false, message: "Failed to Register" + error };
  }

  // POST the response to the endpoint that calls
  // @simplewebauthn/server -> verifyRegistrationResponse()

  // Wait for the results of verification
  return await verifyRegistration({
    registrationResponse,
    challengeId,
  });
}

export async function signOut() {
  await auth.signOut();
}
