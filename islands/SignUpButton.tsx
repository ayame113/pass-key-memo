import { signUp } from "../signals/auth.ts";
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
      />
      <button
        onClick={() => {
          signUp({ userName: userName.value });
        }}
        class="p-2 m-2 border-2"
      >
        sign up
      </button>
    </div>
  );
}
