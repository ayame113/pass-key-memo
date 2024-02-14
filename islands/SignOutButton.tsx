import { signOut } from "../frontend/signals/auth.ts";
import { useSignal } from "@preact/signals";

export function SignOutButton() {
  const result = useSignal<
    { success: boolean; message?: string } | null
  >(null);
  return (
    <div>
      <button
        onClick={async () => {
          try {
            await signOut();
            result.value = {
              success: true,
              message: "successfully signed out",
            };
          } catch (error) {
            result.value = { success: false, message: "failed to signed out" };
          }
        }}
        class="p-2 m-2 border-2"
      >
        ログアウト
      </button>
      <br />
      <span>
        {result.value?.success === true
          ? "✅"
          : result.value?.success === false
          ? "❌"
          : ""}
        {result.value?.message}
      </span>
    </div>
  );
}
