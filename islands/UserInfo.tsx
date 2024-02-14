import { userInfo } from "../frontend/signals/auth.ts";
import { SignInButton } from "./SignInButton.tsx";
import { SignUpButton } from "./SignUpButton.tsx";
import { RegisterAuthenticatorButton } from "./RegisterAuthenticatorButton.tsx";
import { SignOutButton } from "./SignOutButton.tsx";

export function UserInfo() {
  if (userInfo.value === undefined) {
    return <div>loading...</div>;
  }
  if (userInfo.value === null) {
    return (
      <div>
        <h2></h2>
        <SignUpButton />
        <hr />
        または
        <SignInButton />
      </div>
    );
  }
  const { userInfo: { id, name }, authenticators } = userInfo.value;
  return (
    <div>
      <h2 class="text-xl">登録済みパスキー</h2>
      <section>
        <span>ユーザーid: {id}</span>
        <br />
        <span>ユーザー名: {name}</span>
      </section>
      <section class="p-4">
        <table>
          <tr class="border-b-2">
            <th class="break-all">credentialID</th>
            <th class="break-all">credentialBackedUp</th>
            <th class="break-all">credentialDeviceType</th>
            <th class="break-all">counter</th>
          </tr>
          {authenticators.map((authenticator) => (
            <tr class="border-b-2">
              <td class="break-all">{authenticator.credentialID}</td>
              <td>{authenticator.credentialBackedUp.toString()}</td>
              <td>{authenticator.credentialDeviceType}</td>
              <td>{authenticator.counter}</td>
            </tr>
          ))}
        </table>
      </section>
      <RegisterAuthenticatorButton />
      <hr />
      <SignOutButton />
    </div>
  );
}
