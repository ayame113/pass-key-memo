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
        not signed in
        <SignUpButton />
        <SignInButton />
      </div>
    );
  }
  const { userInfo: { id, name }, authenticators } = userInfo.value;
  return (
    <div>
      <span>user id: {id}</span>
      <br />
      <span>user name: {name}</span>
      <br />
      <table>
        <tr class="border-b-2">
          <th>credentialID</th>
          <th>credentialBackedUp</th>
          <th>credentialDeviceType</th>
          <th>counter</th>
        </tr>
        {authenticators.map((authenticator) => (
          <tr class="border-b-2">
            <td>{authenticator.credentialID}</td>
            <td>{authenticator.credentialBackedUp}</td>
            <td>{authenticator.credentialDeviceType}</td>
            <td>{authenticator.counter}</td>
          </tr>
        ))}
      </table>
      <RegisterAuthenticatorButton />
      <SignOutButton />
    </div>
  );
}
