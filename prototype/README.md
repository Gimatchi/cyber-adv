# Case 001 UI 試作

人物・証拠品・ログの選択画面、小さな捜査操作、ブラウザ再起動後の画面復元を確認する独立した試作です。GM操作、ログイン・参加者アカウント、会話中の保存は含みません。試作データはブラウザのプロファイル内に保存され、本体で予定しているサーバー側の正式なセーブデータではありません。

## Run

Node.js 20以降が必要です。リポジトリのルートで実行します。

```powershell
node prototype/server.mjs
```

その後 <http://localhost:4173> を開いてください。**保存**で手動保存でき、画面選択や捜査結果もこのブラウザへ自動保存されます。

## Share through GitHub Pages

この試作は静的ファイルだけで動くため、GitHub Pagesでインターネット公開できます。リポジトリの Settings → Pages → Build and deployment で Source を **GitHub Actions** に設定し、ルートの`save-to-github.bat`で`main`へpushしてください。`.github/workflows/deploy-prototype.yml`が`prototype/`を公開し、完了後はSettings → PagesまたはActionsのデプロイ結果に表示されたURLからアクセスできます（通常は`https://gimatchi.github.io/cyber-adv/`）。

GitHub Pagesで公開したサイトはインターネット上で誰でも閲覧できます。公開前に試作データに非公開情報がないことを確認してください。ゲーム状態は各参加者のブラウザに別々に保存され、参加者間で共有されません。この方法は個別の画面体験向けで、GM操作や30人規模の共有進行には本番用サーバーが必要です。

## Scope

画面は`case001.json`のサンプルシナリオを読み込みます。藤崎彩花に話をしてスマートフォンを取得し、ダイアログの選択肢から調査項目を一つずつ調べられます。判明事項は証拠品・ログと同じ資料タブに並び、選択すると捜査報告書の形式で内容を読み返せます。

ページを再読み込みすると、選択中のタブ・対象、取得した証拠と判明事項、調査済みの証拠項目、完了Eventが復元されます。会話や調査ダイアログの途中状態は保存しません。初期化するには画面下の「試作データをリセット」を使ってください。

## Fonts

画面には同梱した[Noto Sans JP](https://github.com/google/fonts/tree/main/ofl/notosansjp)を、ログや英数字には[Noto Sans Mono](https://github.com/google/fonts/tree/main/ofl/notosansmono)を使います。どちらもSIL Open Font License 1.1で、フォント単体の販売を除き商用利用・ソフトウェアへの同梱が可能です。画面上の作者クレジットは不要ですが、フォントを再配布するときは同梱した各OFLファイルと著作権表示をフォントと一緒に保管してください。ライセンス本文は`assets/fonts/`にあります。
