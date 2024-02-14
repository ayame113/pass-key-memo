import { Chat } from "../islands/Chat.tsx";
import { UserInfo } from "../islands/UserInfo.tsx";

export default function Home() {
  return (
    <main class="max-w-3xl w-11/12 min-h-screen bg-white mx-auto px-4 shadow-md">
      <h1 class="p-4 text-3xl text-center block">2文字チャット</h1>
      <Chat />
      <hr />
      <UserInfo />
    </main>
  );
}
