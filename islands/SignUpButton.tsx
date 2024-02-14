import { signUp } from "../frontend/signals/auth.ts";
import { useSignal } from "@preact/signals";

export function SignUpButton() {
  const userName = useSignal("");
  return (
    <div>
      <input
        type="text"
        value={userName.peek()}
        onInput={(e) => userName.value = e.currentTarget.value}
        class="p-2 m-2 border-2"
        placeholder="user name"
      />
      <button
        onClick={() => {
          signUp({ userName: userName.value });
        }}
        class="p-2 m-2 border-2"
      >
        アカウント作成
      </button>
    </div>
  );
}
