import { Chat } from "../islands/Chat.tsx";
import { UserInfo } from "../islands/UserInfo.tsx";
import IconQuestionMark from "https://deno.land/x/tabler_icons_tsx@0.0.5/tsx/question-mark.tsx";

export default function Home() {
  return (
    <main class="max-w-3xl w-11/12 min-h-screen bg-white mx-auto px-4 shadow-md">
      <h1 class="p-4 text-3xl text-center block">2文字チャット</h1>
      <section class="bg-green-100 p-4 rounded">
        <IconQuestionMark class="w-4 h-4 m-2 inline-block bg-green-700 text-white rounded-full" />
        このサイトは2文字しか送信できないチャットです。
        パスキーを使ってログインしてください。<br />
        最新10件の投稿のみが表示されます。
      </section>
      <Chat />
      <hr />
      <UserInfo />
    </main>
  );
}
