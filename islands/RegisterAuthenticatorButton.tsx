import { registerAuthenticator } from "../frontend/signals/auth.ts";
import { useSignal } from "@preact/signals";

export function RegisterAuthenticatorButton() {
  const result = useSignal<
    { verified: boolean; message?: string } | null
  >(null);
  return (
    <div>
      <button
        onClick={async () => {
          result.value = await registerAuthenticator();
        }}
        class="p-2 m-2 border-2"
      >
        新しいパスキーを登録
      </button>
      <br />
      <span class="text-red-500">
        {result.value?.verified === false ? "failed to verified. " : null}
        {result.value?.message ? `${result.value?.message}` : null}
      </span>
    </div>
  );
}
