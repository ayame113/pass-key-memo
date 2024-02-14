import { signIn } from "../frontend/signals/auth.ts";
import { useSignal } from "@preact/signals";

export function SignInButton() {
  const result = useSignal<
    { verified: boolean; message: string } | null
  >(null);
  return (
    <div>
      <button
        onClick={async () => {
          result.value = await signIn();
        }}
        class="p-2 m-2 border-2 rounded hover:bg-slate-100"
      >
        ログイン
      </button>
      <br />
      <span class="text-red-500">
        {result.value?.verified === false ? "failed to verified. " : null}
        {result.value?.message ? `${result.value?.message}` : null}
      </span>
    </div>
  );
}
