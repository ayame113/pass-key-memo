import { SignUpButton } from "../islands/SignUpButton.tsx";
import { SignInButton } from "../islands/SignInButton.tsx";
import { UserInfo } from "../islands/UserInfo.tsx";

export default function Home() {
  return (
    <div>
      <SignUpButton />
      <SignInButton />
      <UserInfo />
    </div>
  );
}
