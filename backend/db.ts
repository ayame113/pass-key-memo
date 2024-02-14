import { assert } from "$std/assert/assert.ts";
import { ulid } from "$std/ulid/mod.ts";
import { isoBase64URL } from "$simplewebauthn/server/helpers.ts";
import {
  AuthenticatorTransportFuture,
  CredentialDeviceType,
} from "$simplewebauthn/typescript-types.ts";

export class Database {
  #kvPromise = Deno.openKv();
  /** ユーザー作成 */
  async createUser(userName: string) {
    const kv = await this.#kvPromise;

    const id = crypto.randomUUID();
    const newUser = {
      id,
      name: userName,
    } satisfies User;

    const result = await kv.set(["auth", "users", id], newUser);
    assert(result.ok, "Failed to create user");

    return newUser;
  }
  /** ユーザー取得 */
  async getUser(id: string) {
    const kv = await this.#kvPromise;

    const result = await kv.get<User>(["auth", "users", id]);
    if (result.value === null) {
      throw new Error(`User ${id} not found`);
    }

    return result.value;
  }
  async getUserAuthenticators(userId: string) {
    const kv = await this.#kvPromise;

    const entries = kv.list<Authenticator>({
      prefix: ["auth", "authenticators", userId],
    });

    return (await Array.fromAsync(entries))
      .map((entry) => entry.value);
  }
  /** ユーザー認証器取得 */
  async getUserAuthenticator(
    userId: string,
    authenticatorId: string,
  ) {
    const kv = await this.#kvPromise;

    const result = await kv.get<Authenticator>(
      ["auth", "authenticators", userId, authenticatorId],
    );
    if (result.value === null) {
      throw new Error(`Authenticator ${authenticatorId} not found`);
    }

    return result.value;
  }
  /** ユーザー認証器保存 */
  async saveUserAuthenticator(
    userId: string,
    authenticator: Authenticator,
  ) {
    const kv = await this.#kvPromise;

    const authenticatorId = isoBase64URL.fromBuffer(authenticator.credentialID);

    const getResult = await kv.get([
      "auth",
      "authenticators",
      userId,
      authenticatorId,
    ]);
    if (getResult.value !== null) {
      throw new Error(`Authenticator ${authenticatorId} already exists`);
    }

    const setResult = await kv.atomic()
      .check(getResult)
      .set(["auth", "authenticators", userId, authenticatorId], authenticator)
      .commit();

    if (setResult.ok === false) {
      throw new Error(`Failed to save authenticator ${authenticatorId}`);
    }
  }
  /** ユーザー認証器カウンター更新 */
  async updateUserAuthenticatorCounter(
    userId: string,
    credentialID: Uint8Array,
    newCounter: number,
  ) {
    const kv = await this.#kvPromise;

    const authenticatorId = isoBase64URL.fromBuffer(credentialID);

    while (true) {
      const getResult = await kv.get<Authenticator>([
        "auth",
        "authenticators",
        userId,
        authenticatorId,
      ]);
      if (getResult.value === null) {
        throw new Error(`Authenticator ${authenticatorId} not found`);
      }

      const newAuthenticatorData = {
        ...getResult.value,
        counter: newCounter,
      };

      const updateResult = await kv.atomic()
        .check(getResult)
        .set(
          ["auth", "authenticators", userId, authenticatorId],
          newAuthenticatorData,
        )
        .commit();

      if (updateResult.ok === true) {
        break;
      }
    }
  }
  /** challengeを保存 */
  async rememberChallenge(challenge: string) {
    const kv = await this.#kvPromise;

    const challengeId = crypto.randomUUID();

    const result = await kv.set(
      ["auth", "challenges", challengeId],
      challenge,
      {
        expireIn: Date.now() + 5 * 60 * 1000,
      },
    );
    assert(result.ok, "Failed to set challenge");

    return { challengeId, challenge };
  }
  /** challengeを検証 */
  async checkChallenge(challengeId: string, challenge: string) {
    const kv = await this.#kvPromise;

    const result = await kv.get<string>(["auth", "challenges", challengeId]);
    if (result.value === null) {
      return false;
    }

    if (result.value !== challenge) {
      return false;
    }

    await kv.delete(["auth", "challenges", challengeId]);

    return true;
  }
  async postChat(userId: string, message: string) {
    const kv = await this.#kvPromise;

    const { name: userName } = await this.getUser(userId);

    const chatId = ulid();
    const chat = {
      userId,
      userName,
      message,
      timestamp: Date.now(),
    } satisfies ChatMessage;

    const result = await kv.set(["chat", "messages", chatId], chat);
    assert(result.ok, "Failed to post chat");

    return chat;
  }
  async getChatMessages() {
    const kv = await this.#kvPromise;

    const entries = kv.list<ChatMessage>({ prefix: ["chat", "messages"] }, {
      reverse: true,
      limit: 10,
    });

    return (await Array.fromAsync(entries))
      .map((entry) => entry.value)
      .reverse();
  }

  async close() {
    const kv = await this.#kvPromise;
    kv.close();
  }

  async logAllUsers() {
    const kv = await this.#kvPromise;

    console.table((
      await Array.fromAsync(kv.list<User>({ prefix: ["auth", "users"] }))
    ).map(({ value }) => value));

    console.table((
      await Array.fromAsync(
        kv.list<Authenticator>({ prefix: ["auth", "authenticators"] }),
      )
    ).map(({ key, value }) => ({
      key: key.at(-1),
      counter: value.counter,
      credentialDeviceType: value.credentialDeviceType,
      credentialBackedUp: value.credentialBackedUp,
      transports: value.transports,
    })));
  }
}

export type User = {
  id: string;
  name: string;
};

export type ChatMessage = {
  userId: string;
  userName: string;
  message: string;
  timestamp: number;
};

/**
 * It is strongly advised that authenticators get their own DB
 * table, ideally with a foreign key to a specific UserModel.
 *
 * "SQL" tags below are suggestions for column data types and
 * how best to store data received during registration for use
 * in subsequent authentications.
 */
export type Authenticator = {
  // SQL: Encode to base64url then store as `TEXT`. Index this column
  credentialID: Uint8Array;
  // SQL: Store raw bytes as `BYTEA`/`BLOB`/etc...
  credentialPublicKey: Uint8Array;
  // SQL: Consider `BIGINT` since some authenticators return atomic timestamps as counters
  counter: number;
  // SQL: `VARCHAR(32)` or similar, longest possible value is currently 12 characters
  // Ex: 'singleDevice' | 'multiDevice'
  credentialDeviceType: CredentialDeviceType;
  // SQL: `BOOL` or whatever similar type is supported
  credentialBackedUp: boolean;
  // SQL: `VARCHAR(255)` and store string array as a CSV string
  // Ex: ['usb' | 'ble' | 'nfc' | 'internal']
  transports?: AuthenticatorTransportFuture[];
};
