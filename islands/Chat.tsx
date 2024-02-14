import { useSignal } from "@preact/signals";
import { chatHistory, reloadChatHistory } from "../frontend/signals/chat.ts";
import { postChat } from "../frontend/client.ts";
import { userInfo } from "../frontend/signals/auth.ts";

export function Chat() {
  const message = useSignal("");

  async function sendMessage() {
    if (!message.value) {
      alert("メッセージを入力してください");
      return;
    }
    if (!/^[あ-ん]{2}$/.test(message.value)) {
      alert("ひらがな2文字で入力してください");
      return;
    }
    await postChat(message.value);
    chatHistory.value = [...(chatHistory.value ?? []), {
      userName: userInfo.value?.userInfo.name ?? "you",
      message: message.value,
      timestamp: Date.now(),
    }].slice(-10);
    message.value = "";
    reloadChatHistory();
  }

  if (userInfo.value === undefined) {
    return <div>loading...</div>;
  }
  if (userInfo.value === null) {
    return <div />;
  }

  return (
    <div class="my-4">
      <div class="bg-sky-100 py-1 px-4 shadow-inner">
        {chatHistory.value?.map(({ userName, message, timestamp }, i) => (
          <div class="bg-white my-2 p-1 rounded-lg rounded-bl-none">
            <div>
              <span class="font-bold">{userName}</span>{" "}
              ({new Date(timestamp).toLocaleString()}){" "}
              {chatHistory.value!.length - 1 === i ? "[最新]" : ""}
            </div>
            <div>{message}</div>
          </div>
        ))}
      </div>
      <div class="bg-white flex w-full">
        <input
          type="text"
          value={message.peek()}
          onInput={(e) => message.value = e.currentTarget.value}
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              sendMessage();
            }
          }}
          class="block w-20 grow shrink p-1 m-2 border-2 bg-slate-50 focus:bg-white rounded-full"
          placeholder="ひらがな2文字で入力 [Enterで送信]"
          autofocus
        />
        <button
          class="w-12 block p-2 m-2 border-2 rounded hover:bg-slate-100"
          onClick={() => {
            sendMessage();
          }}
        >
          送信
        </button>
      </div>
    </div>
  );
}
