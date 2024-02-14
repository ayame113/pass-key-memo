import { effect, signal } from "@preact/signals";
import { getChatHistory } from "../client.ts";
import type { ChatMessage } from "../../backend/db.ts";
import { IS_BROWSER } from "$fresh/runtime.ts";
import { firebaseUser } from "./auth.ts";

export const chatHistory = signal<undefined | Omit<ChatMessage, "userId">[]>(
  undefined,
);
const chatHistoryReloadSignal = signal(0);

effect(async () => {
  if (!IS_BROWSER) {
    return;
  }
  // chatHistoryReloadSignalの更新をwatch
  chatHistoryReloadSignal.value;

  if (firebaseUser.value === undefined) {
    return;
  }

  if (firebaseUser.value === null) {
    chatHistory.value = undefined;
    return;
  }

  chatHistory.value = (await getChatHistory()).messages;
});

export function reloadChatHistory() {
  chatHistoryReloadSignal.value++;
}

if (IS_BROWSER) {
  setInterval(reloadChatHistory, 60 * 1000);
}
