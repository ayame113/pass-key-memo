import { signIn } from "../signals/auth.ts";
import { useSignal } from "@preact/signals";

export function SignInButton() {
  const result = useSignal<
    { verified: boolean; message: string; userName?: string } | null
  >(null);
  return (
    <div>
      <button
        onClick={async () => {
          result.value = await signIn();
        }}
        class="p-2 m-2 border-2"
      >
        sign up
      </button>
      <br />
      <span>
        verified: {result.value?.verified.toString()} / message:{" "}
        {result.value?.message}
      </span>
      <br />
      <span>hello {result.value?.userName ?? "---"}</span>
    </div>
  );
}
