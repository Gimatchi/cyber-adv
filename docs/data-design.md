# シナリオ・データ設計

## 1. 基本方針

事件固有の内容はデータで表し、ゲームエンジンへ事件の知識を埋め込まない。作者はシナリオメーカーのフォームで項目や文章を入力し、メーカーがこの仕様に従ったJSONを生成する。通常の作成作業で作者がJSONを直接編集する必要はない。

本書の「確定データ形式」をシナリオデータの規範とする。画面上の入力方法はデータ構造の詳細を隠してよいが、保存する意味と構造は変えてはならない。

`actions`のような捜査アクション用コレクションは持たない。聞き込み、照会、相談、追及、捜索の実施は条件付き会話として作る。証拠品を調べて情報を得る操作は証拠品自身の会話グラフとして作り、ログ調査は重要ログ行として作る。いずれも完了時にEventを起動し、EventのEffectだけが証拠・ログ・判明事項を追加する。

## 2. ファイル構成

1事件を1つのJSONファイルにまとめる。繰り返し編集する項目は配列にし、画像等の素材は別ファイルとして参照する。

```text
scenario/
└─ case001/
   ├─ case.json
   └─ assets/
      ├─ characters/
      ├─ backgrounds/
      └─ evidence/
```

`case.json`は事件の全データを含む。人物ごと・種別ごとにJSONファイルを分けない。これにより、メーカーの読み込み・保存・書き出しを1ファイルで完結させる。ファイル分割が必要になった場合も、分割形式は配布・ビルド時の形式とし、作者が編集する正規形式は本書の`case.json`とする。

## 3. 共通ルール

- `id`は事件内で一意な安定IDとし、表示名やセリフから独立させる。IDはメーカーが自動生成でき、作者は必要な場合に変更できる。
- ConditionやEvent参照から参照されるID（人物、会話、証拠、旧形式の調査項目、ログ、ログ行、Fact、Event、ヒント段階）は事件全体で一意とする。人物会話ノードIDは会話内、証拠品会話ノードIDは証拠品内で一意とする。
- 別項目への参照はIDで保存する。フォーム上では可能な限り表示名を選択肢として見せる。
- プレイヤー向け文章は文字列としてデータに保存する。作者向けの秘密、動機、結末の解説はプレイヤーへ配信するデータに入れず、設計資料で管理する。
- 省略可能な項目は空文字列や空配列として重複保存せず、省略する。必須・省略可能の扱いは各項目に記載する。
- 繰り返し行・選択肢・条件・Effectは配列で表現する。作者はメーカー上の「追加」「削除」「上下移動」で編集し、配列JSONを直接書かない。
- メーカーは参照先選択、ID重複、必須入力、会話接続、条件・Effectの型を検証する。書き出しJSONはエンジンが読み込む形式と一致させる。

## 4. 正規データ形式

以下は各コレクションを示す概形である。実データでは各配列に0件以上の項目を入れる。

実際に参照できる最小サンプルは [`examples/minimal-scenario.json`](examples/minimal-scenario.json) に置く。聞き込み、証拠品会話、ログ行調査、Event、背景、アイコン、改行、条件付き会話を一つのファイルで確認できる。

```json
{
  "schemaVersion": 1,
  "id": "case001",
  "title": "SNS乗っ取り",
  "defaults": {
    "background": "assets/backgrounds/office.png",
    "characterIcon": "assets/ui/default-character.png",
    "evidenceIcon": "assets/ui/default-evidence.png"
  },
  "characters": [],
  "evidence": [],
  "logs": [],
  "facts": [],
  "events": [],
  "hints": []
}
```

### 事件情報

| フィールド | 必須 | 内容 |
| --- | --- | --- |
| `schemaVersion` | 必須 | データ形式の版。初版は`1`。 |
| `id` | 必須 | 事件ID。例：`case001`。 |
| `title` | 必須 | 事件名。 |
| `defaults` | 任意 | 事件内の表示用既定画像。`background`、`characterIcon`、`evidenceIcon`を任意に設定する。設定がない場合はエンジン内蔵の既定表示を使う。 |

画像フィールドは画像ファイルへの相対パス文字列とする。背景は`defaults.background`を事件の既定背景、会話の`background`を会話全体の背景、ノードの`background`をそのノードだけの背景として設定できる。会話中の背景は「ノード → 会話 → 事件既定 → エンジン内蔵背景」の順に選ぶ。人物・証拠品・ログを個別に選択した画面では、その項目の`background`、事件既定、エンジン内蔵背景の順に選ぶ。人物アイコンは「ノード → 人物 → `defaults.characterIcon` → エンジン内蔵アイコン」、証拠アイコンは「証拠 → `defaults.evidenceIcon` → エンジン内蔵アイコン」の順に選ぶ。プレイヤーとナレーターには人物アイコンを表示しない。

資料タブを選択しても、メインペインとセリフペインの表示は変更しない。タブ内の証拠品・ログ・Factを選択したときにだけ資料未選択状態を解除し、メインペインへ対象を表示する。この表示はPlayerStateを変更しない。ログの`background`はログ選択画面に使うが、ログ行を解析している画面ではログ専用の背景を表示せず、ログ表示領域を等幅フォントで表示する。 ログ解析中はセリフペインを表示し、人物・証拠品・判明事項・タブの選択時はセリフペインを閉じる。

### 人物 `characters[]`

```json
{
  "id": "ayaka",
  "name": "土崎 綾香",
  "role": "被害者",
  "icon": "assets/characters/ayaka/normal.png",
  "background": "assets/backgrounds/ayaka-room.png",
  "description": "SNSアカウントを乗っ取られた被害者。"
}
```

`id`、`name`は必須。`icon`、`background`、`role`、`description`は任意。`icon`は人物一覧と会話で使う既定の画像・表情の素材参照である。人物独自の表示条件は持たない。少なくとも一つの会話グラフの`requires`を満たす人物を人物一覧に表示する。省略時は`defaults.characterIcon`、それもなければエンジン内蔵アイコンを使う。人物を選択した画面では`background`を背景として使い、省略時は事件既定の背景を使う。会話グラフは人物項目の`interactions[]`に含め、人物を選択すると利用条件を満たす会話を開始できる。会話の話者は人物IDを参照する。プレイヤーのセリフは特別な話者ID `player`、場面説明は特別な話者ID `narrator` を使い、どちらの人物項目も作らない。人物の秘密・動機・作者向け履歴は含めない。人名は日本語では名字、名前の順、英語表記も姓、名の順とする。

### 人物の会話グラフ `characters[].interactions[]`

シナリオのトップレベルに独立した`conversations[]`は置かない。人物が入口となる会話グラフは、その人物の`interactions[]`に定義する。一人の人物に、条件や進行状況に応じて複数の会話グラフを割り当てられる。人物一覧には、少なくとも一つの会話グラフの`requires`を満たす人物だけを表示し、選択後は利用条件を満たす会話を選択可能にする。会話内容を一つの長いグラフにまとめるか、用途ごとに複数グラフへ分けるかはシナリオに応じて選ぶ。

```json
{
  "id": "conv_ayaka",
  "title": "土崎綾香との会話",
  "background": "assets/backgrounds/interview-room.png",
  "startNodeId": "node_001",  "nodes": [
    {
      "id": "node_001",
      "speakerId": "ayaka",
      "icon": "assets/characters/ayaka/worried.png",
      "background": "assets/backgrounds/interview-room-evening.png",
      "text": "SNSのアカウントに入れなくなってしまって……。",
      "nextNodeId": "node_002"
    },
    {
      "id": "node_002",
      "speakerId": "player",
      "text": "何か、その前に変わったことはありませんでしたか？",
      "choices": [
        {
          "text": "メールについて聞く",
          "requires": { "type": "fact", "targetId": "fact_received_email", "operator": "exists" },
          "nextNodeId": "node_003"
        },
        { "text": "SNSについて聞く", "nextNodeId": "node_004" }
      ]
    }
  ]
}
```

`id`、`title`、`startNodeId`、`nodes`は必須。`background`、`requires`、`repeatable`は任意。旧データ互換用の`completionEventId`も読み込めるが、新規データでは使用しない。`background`は会話中の既定背景。`requires`を省略した会話は、その人物が表示されていれば利用できる。`repeatable: true`の会話は完了後も入口を表示し、会話完了状態を進行条件として記録しない。ノードはオブジェクトのキーではなく配列項目とし、メーカーで順番に追加・編集できるようにする。一人の人物が状況に応じて異なる会話をする場合は、複数のグラフに分けるか、一つのグラフ内の条件付き`routes`で表現できる。天童への初回接触と追及のように同じ相手とのやり取りが続く場合は、条件付きrouteで一つのグラフにまとめる方法もある。

ノードのフィールド：

| フィールド | 必須 | 内容 |
| --- | --- | --- |
| `id` | 必須 | 会話内で一意なノードID。メーカーが生成する。 |
| `speakerId` | 通常ノードで必須 | `player`、`narrator`、または人物ID。ルート専用ノードでは省略する。 |
| `text` | 通常ノードで必須 | 表示するセリフ・文章。ルート専用ノードでは省略する。 |
| `completionEventId` | 任意 | このノードの文章が全文表示された時点で起動するEvent。セリフに対応した情報の取得・解禁に使う。 |
| `icon` | 任意 | この発言で表示する画像・表情の素材参照。省略時は人物の既定アイコンを使う。`player`と`narrator`はアイコンを表示しない。 |
| `background` | 任意 | このノードだけに使う背景。省略時は会話・事件の既定背景を使う。 |
| `requires` | 任意 | このノードを表示・実行する条件。満たさないノードへ進む選択肢は表示しない。 |
| `nextNodeId` | 任意 | 同じ会話内の次ノード。`nextConversationId`とは同時指定しない。 |
| `nextConversationId` | 任意 | 同じ人物に属する別会話のID。対象会話の`startNodeId`から開始する。途中ノードへの遷移はしない。対象会話の`requires`はこの遷移では評価しないため、必要な条件は遷移元に設定する。`nextNodeId`とは同時指定しない。 |
| `choices` | 選択がある場合 | 選択肢配列。各要素は`text`、任意の`requires`、`nextNodeId`または`nextConversationId`、`completionEventId`を持つ。会話遷移先は同じ人物の別会話に限り、開始ノードから開始する。遷移先の`requires`は評価しない。`completionEventId`を指定した選択肢を選ぶと、そのEventを一度だけ起動する。条件を満たさない選択肢は表示しない。 |
| `routes` | ルート専用ノードの場合 | 条件を順番に評価する自動分岐。各要素は任意の`requires`と`nextNodeId`または`nextConversationId`を持つ。 |
| `input` | 入力式の回答を求める場合 | 入力設定オブジェクト。存在する場合、そのノードは入力ノードとなり、`choices`および`routes`とは併用しない。回答が正解した場合だけ次の遷移先へ進む。 |

### 会話中のテキスト入力

`input`を持つノードでは、`text`を質問文として表示し、プレイヤーに文字入力を求める。たとえばログ解析後に「ログから判明したIPアドレスを入力してください」と問い、正答すると次の会話へ進める。入力設定は次の形を基本とする。

```json
{
  "id": "node_ip_answer",
  "speakerId": "player",
  "text": "ログから判明したIPアドレスを入力してください。",
  "input": {
    "placeholder": "例：203.0.113.24",
    "acceptedAnswers": ["203.0.113.24"],
    "match": "exact",
    "ignoreCase": false,
    "ignoreWhitespace": false,
    "incorrectText": "ログをもう一度確認してください。"
  },
  "nextNodeId": "node_followup"
}
```

`acceptedAnswers`には正解と許容する別表記を登録する。照合前に入力値と正解候補の両方へUnicode NFKC正規化を行い、前後の空白を取り除く。これにより全角英数字や全角記号を半角に寄せて比較する。`ignoreCase`が`true`なら英字の大文字・小文字を区別せず、`ignoreWhitespace`が`true`なら文字列内部の空白も無視する。いずれも省略時は区別する。

`match`は`exact`または`contains`を指定し、省略時は`exact`とする。`exact`は正規化後の入力全体が正解候補のいずれかと一致した場合に正解とする。`contains`は正規化後の入力に正解候補のいずれかが含まれる場合に正解とする。部分一致は意図しない文字列まで通す可能性があるため、作者が質問ごとに選び、短すぎる正解候補を避ける。誤答時は`incorrectText`を表示して同じ入力をやり直せる。正解するまで次へ進まず、入力ノードのEventと遷移は正解時に実行する。

入力ノードは`choices`、`routes`と併用しない。遷移先は通常ノードと同様に`nextNodeId`または`nextConversationId`で指定する。入力欄、候補の追加、照合方式などはシナリオメーカーから設定する。現在の試作ゲームとメーカーで利用できる。

本番エンジンでは、正誤判定と遷移可否をサーバー側で検証し、クライアントからの「正解した」という申告を信用しない。正解候補をブラウザへ配信すると閲覧できるため、本番では回答データをクライアント配信データから分離し、サーバー側で保持する。

会話と証拠品会話ノードの`text`、人物・証拠・ログ・Factの`description`、旧形式の証拠調査項目の`description`、選択肢の`text`、ログ行の`text`は複数行を許可し、改行をそのまま表示する。メーカーではこれらを複数行入力欄で編集する。JSONでは改行文字として保存し、書き出し時に正しくエスケープする。`nextNodeId`、`choices`、`routes`は同時に指定しない。`routes`を持つノードは表示用の話者・文章を持たず、条件を満たす最初のルートへ自動的に進む。ノード・選択肢・ルートから別会話へ遷移する場合は、現在の会話を離れる処理（旧会話`completionEventId`を含む）を行い、対象会話の`startNodeId`から開始する。遷移先の会話`requires`は評価しない。別会話の途中ノードへは遷移しない。会話や調査結果に紐づくEvent / Effectは、対応する文章が全文表示されるまで適用しない。入力ノードのEventは文章表示直後ではなく回答正解時に適用する。適用直後に、実際に追加・解禁された対象だけを色付き通知でセリフペインに表示する。汎用の確認を促すセリフは挟まない。新規データの進行状態変更は、通常ノードでは本文が全文表示された時点、入力ノードでは回答が正解した時点で起動するEventに置く。旧データの会話`completionEventId`は互換用に残し、会話を終了または別会話へ移るときに実行する。

### 証拠調査の操作

会話のセリフペインでは会話タイトルを表示せず話者名を大きく表示し、`player`は「あなた」と表示する。証拠品の「証拠品を調べる」を押すと、その証拠品の`startNodeId`から会話と同じノード進行を始める。証拠品は`nodes[]`に会話ノードを持ち、話者は`player`、`narrator`、または任意の人物IDを指定できる。証拠品内で話者を省略した場合は`narrator`として表示する。調査項目を選ぶ中間画面は表示しない。選択肢はメインペイン右下で背景画像に重ねて表示し、セリフペインの位置を押し下げない。選択肢が多い場合は選択肢領域をスクロール可能にし、必要ならセリフペインにも重ねる。ノード文が全文表示された時点で`completionEventId`を実行し、終端ノードに到達したときは証拠品の`completionEventId`も実行する。終了後は証拠品の詳細画面へ戻る。以前の`investigations[]`形式も既存シナリオの読み込み用に扱う。「！」は、人物・証拠品・ログが未選択の場合、または未取得の証拠品・判明事項を得られる場合、新しい会話や選択肢が解禁された場合に表示する。判明事項は未読の場合に表示する。各解禁による「！」は対象の人物では会話開始ボタン、証拠品では調査開始ボタンを押すと消し、他の条件も満たす場合は表示を続ける。各条件はいずれか一つを満たせばよい。捜査資料タブは、そのタブ内に「！」の付いた項目が一つ以上ある場合に表示する。選択済み情報はPlayerStateの`visitedCharacters`、`visitedEvidence`、`visitedLogs`、`readFacts`で管理し、条件付き選択肢の選択済み状態は`seenChoices`で管理する。専用ヒント機能は「！」判定に含めない。新しい証拠・ログ・判明事項を追加したEvent、または新たな人物を解禁したEventの通知は選択肢にせず、セリフペインに色付きで表示する。通常のセリフ本文とは見た目を分け、操作を追加で要求しない。

### 事件001に統合するOSINT調査

事件001の初回聞き取りで公開投稿画面を確認したとき、Eventで投稿画像の証拠を追加する。OSINTによる段階的な推理は、人物の`interactions[]`と証拠品自身の会話グラフ、選択肢、Condition、Eventで表現する。画像証拠の会話グラフでは、開始ノードから目視、メタデータ、Exifの撮影日時・位置情報、座標と架空地図上の交番との照合へ進める。

各段階では正解選択肢のみ次のノードへ進め、不正解選択肢は説明ノードを経由して同じ設問に戻す。最終の交番特定ノードの`completionEventId`がEventを起動し、撮影地点のFactを追加する。スマートフォン調査、ログ、後続の人物会話にはこのFactを`requires`として設定し、OSINTが終わるまで本筋を進められないようにする。GMが解説時間を設けるための一時停止はGMStateのLockで行い、シナリオデータ内にGMロック状態を保存しない。

Exifに記録された座標は撮影位置の手がかりとして扱い、投稿者や実際の待ち伏せを単独で確定する情報として扱わない。シナリオ上は元画像に位置情報が残っている理由（被害者端末に保存された加工前画像など）を説明し、架空の座標・地図を使う。

### 証拠 `evidence[]`

```json
{
  "id": "ev_ayaka_phone",
  "name": "土崎綾香のスマートフォン",
  "icon": "assets/evidence/ayaka-phone.png",
  "background": "assets/backgrounds/evidence-desk.png",
  "description": "保存されたメールや閲覧履歴を調べられる。",
  "startNodeId": "node_001",
  "completionEventId": "event_phone_examined",
  "nodes": [
    {
      "id": "node_001",
      "speakerId": "narrator",
      "text": "どのデータを確認しますか？",
      "choices": [
        { "id": "choice_mail", "text": "保存されたメールを見る", "nextNodeId": "node_002" },
        { "id": "choice_history", "text": "閲覧履歴を見る", "nextNodeId": "node_003" }
      ]
    },
    {
      "id": "node_002",
      "speakerId": "player",
      "text": "保存されたメールを確認する。"
    },
    {
      "id": "node_003",
      "speakerId": "narrator",
      "text": "閲覧履歴を確認する。"
    }
  ]
}
```

証拠の`id`、`name`は必須。`icon`、`background`、`description`、`startNodeId`、`nodes`、`completionEventId`は任意。`icon`は証拠一覧・詳細で使う画像の素材参照で、省略時は`defaults.evidenceIcon`、それもなければエンジン内蔵アイコンを使う。証拠を選択した画面では`background`を背景として使い、省略時は事件既定の背景を使う。証拠はプレイヤーが取得・調査できる資料で、調査結果として得る知識はFactに分ける。会話ノードと同じ形式の`nodes[]`を持つ場合は`startNodeId`も指定し、`nextNodeId`・`choices[].nextNodeId`・`routes[].nextNodeId`は同じ証拠品内のノードIDを参照する。終了後の状態変更は証拠品の`completionEventId`、個別ノードの文章に対応する状態変更はノードの`completionEventId`でEventを実行する。人物を話者にする必要はなく、通常は`player`か`narrator`を指定する。既存の`investigations[]`は旧形式の読み込み互換として残す。

### ログ `logs[]` と行 `rows[]`

```json
{
  "id": "log_sns_access",
  "name": "SNSアクセスログ",
  "background": "assets/backgrounds/log-analysis-room.png",
  "description": "アカウントへのログインと投稿の記録。",
  "rows": [
    {
      "id": "row_tor_login",
      "time": "17:20:37",
      "text": "198.51.100.90  ログイン成功",
      "important": true,
      "completionEventId": "event_inspect_tor_login"
    }
  ]
}
```

ログの`id`、`name`は必須。`background`、`description`は任意。ログを選択した画面では`background`を背景として使い、省略時は事件既定の背景を使う。各行は`id`、`text`を必須とし、`time`は任意。`important`はプレイヤーが調査できる行なら`true`とし、省略時は`false`。正解行・不正解行の両方を調査可能にできる。正解行のEventは`completionEventId`で指定し、不正解行では省略する。`result`を指定した行は調査直後に結果文をセリフペインへ表示する。調査した行は結果文が全文表示された時点でPlayerStateの`completedLogRows`へ追加し、再表示時には通常「？」を付けない。正解行（`completionEventId`がある行）は同じ時点でEventを実行してPlayerStateの`discoveredLogRows`にも追加し、色付きの取得通知と結果を示す「✓」・「結果を見る」を表示して、何度でも結果を振り返れるようにする。不正解行は結果を表示した後に再選択できない。メール本文とヘッダも特別処理を作らず、改行を含む通常のログ行として記述する。

### 判明事項 `facts[]`

```json
{
  "id": "fact_phishing_site",
  "name": "フィッシングサイトが使われた",
  "description": "SNSのログイン画面を模したサイトが使われた。",
  "sortOrder": 10
}
```

`id`、`name`は必須。`description`、`sortOrder`は任意。Factは調査によって判明した情報で、証拠そのものではない。`sortOrder`は一覧の表示順を決め、取得順には使わない。

### Condition

Conditionの保存形式は以下に固定する。

```json
{ "type": "evidence", "targetId": "ev_ayaka_phone", "operator": "exists" }\n{ "type": "evidence", "targetId": "ev_ayaka_phone", "operator": "notExists" }
{ "type": "log", "targetId": "log_sns_access", "operator": "exists" }
{ "type": "fact", "targetId": "fact_phishing_site", "operator": "exists" }\n{ "type": "fact", "targetId": "fact_phishing_site", "operator": "notExists" }
{ "type": "conversation", "targetId": "conv_ayaka_first", "operator": "completed" }\n{ "type": "conversation", "targetId": "conv_ayaka_first", "operator": "notCompleted" }
{ "type": "investigation", "targetId": "inspect_saved_email", "operator": "completed" }
{ "type": "logRow", "targetId": "row_tor_login", "operator": "completed" }
{ "type": "event", "targetId": "event_ayaka_first", "operator": "completed" }\n{ "type": "event", "targetId": "event_ayaka_first", "operator": "notCompleted" }
{ "type": "and", "conditions": [ CONDITION, CONDITION ] }
{ "type": "or", "conditions": [ CONDITION, CONDITION ] }
{ "type": "not", "condition": CONDITION }
```

`evidence`、`log`、`fact`は`exists`（所持・取得済み）または`notExists`（未所持・未取得）を使用する。`conversation`（人物会話または証拠品会話）、`logRow`、`event`は`completed`（完了済み）または`notCompleted`（未完了）を使用する。`investigation`は旧形式の証拠調査項目との互換用である。AND/ORは1件以上の子を持ち、NOTはConditionをちょうど1件持つ。最大ネスト深度は16。メーカーではJSONを入力させず、種別・対象・演算子と条件グループの追加操作で編集する。会話の`requires`は単一Conditionとして保存する。

### Event `events[]` と Effect

```json
{
  "id": "event_inspect_tor_login",
  "requires": { "type": "fact", "targetId": "fact_phishing_site", "operator": "exists" }\n{ "type": "fact", "targetId": "fact_phishing_site", "operator": "notExists" },
  "effects": [
    { "type": "add", "target": "facts.fact_tor_access" }
  ]
}
```

Eventは状態変更の唯一の定義場所。`id`と`effects`は必須、`requires`は任意。呼び出し元の`completionEventId`がEventを指定し、Event自身の`requires`は呼び出し時に実行してよいかを判定する。条件を省略した場合は無条件で実行し、条件を満たさない場合はEffectを適用せず、Eventを完了済みにもしない。メーカーでは会話・選択肢などと同じCondition編集UIを使う。Eventは一度だけ実行し、成功とEffect適用を同一トランザクションで確定する。

Effectは型を選び、型に応じて参照先を選択する。

| type | 入力項目 | 効果 |
| --- | --- | --- |
| `add` | 追加先と項目 | `evidence`、`logs`、`facts`、`usedHints`の集合へ追加する。例：`{ "type": "add", "target": "facts.fact_phishing_site" }` |
| `remove` | 削除先と項目 | 同じ集合から削除する。未登録でも成功する。 |
| `set` | 許可された状態項目と値 | `cleared`をboolean値にする。任意パス変更はできない。 |

Effectの配列順に実行する。対象の不存在、型不一致、禁止された状態変更があればEvent全体をロールバックする。Eventの完了記録とEffectsは同一トランザクションで保存し、重複要求でEffectsを再適用しない。

### Eventとの関連付け

会話、会話ノード、会話中の選択肢、証拠品会話、証拠品会話ノード、重要ログ行、ヒント段階は、状態変更が必要な場合にEvent IDを1つ参照する。複数の呼び出し元から同じEventを呼び出してよい。会話は照会・聞き込み・相談・追及を含む、人物または事業者とのやり取りを表す。セリフに対応して情報を取得する場合は、会話全体ではなく該当ノードの`completionEventId`を使う。ノード文が全文表示された時点でEventを呼び出し、取得・解禁通知も同時に表示する。証拠や判明事項の取得は、会話・証拠品会話・ログ調査のEventに集約する。

Eventの起動条件は呼び出し元の指定とは独立して評価する。エンジンは起動条件を満たしたEventについて、Eventの完了記録とEffect適用を同一トランザクションで保存する。

### ヒント `hints[]`

```json
{
  "id": "hint_tor_access",
  "targetId": "log_sns_access",
  "stages": [
    {
      "id": "hint_tor_access_1",
      "text": "普段と異なる接続元がないか、ログを確認してください。",
      "completionEventId": "event_hint_tor_access_1"
    }
  ]
}
```

ヒントは対象ごとに段階を持つ。段階は配列順に提示し、各段階の`id`、`text`、`completionEventId`を必須とする。Eventはその段階IDを`usedHints`に追加する。ヒントの依頼・提示は麻布など担当人物の`interactions[]`内にある会話グラフから始め、通常の人物会話と同じ条件分岐・ノード表示を使う。ヒント段階データは提示文と利用状態を管理し、人物の会話グラフから参照する。ヒントは答えや必須証拠を直接与えず、考え方を補助する。

## 5. プレイヤー状態との対応

シナリオJSONは定義データであり、参加者の進行状態を含めない。各PlayerStateはサーバー側で別に保存する。

```json
{
  "playerId": "player_001",
  "caseId": "case001",
  "evidence": [],
  "logs": [],
  "facts": [],
  "completedConversations": [],
  "completedInvestigations": [],
  "completedLogRows": [],
  "discoveredLogRows": [],
  "readFacts": [],
  "visitedCharacters": [],
  "visitedEvidence": [],
  "visitedLogs": [],
  "seenChoices": [],
  "completedEvents": [],
  "usedHints": [],
  "cleared": false
}
```

利用可能状態はPlayerStateとConditionから導出する。GMの一時LockはGMStateと認証済みGMセッションで別に管理し、シナリオJSONへ保存しない。

会話・ノード・選択肢は、それぞれの`requires`を満たした場合だけ表示対象になる。条件を満たさない要素は一覧や選択肢に表示しない。条件を満たしている要素にGM Lockが設定されている場合だけ南京錠を表示し、選択時は実行を拒否する。GM LockはConditionを変更せず、条件未達の要素を表示するためには使わない。

## 6. 事件001のデータ化

事件001の人物、事業者、IPアドレス、メールアドレス、時系列、フィッシングサイト、ログ、証拠、会話、Fact、ヒントはすべてこの形式のデータとして表現する。固有の進行は会話のConditionとEvent / Effectの組み合わせで作り、エンジンに事件001専用処理を追加しない。

事件001の基本ルートは以下の通り。画像OSINTを必須段階として統合し、これはデータ作成時の内容確認に使い、エンジンの手続きにはしない。

```text
彩花への聞き込み
 ↓
投稿画像を証拠品として取得し、OSINTを完了
 ↓
彩花のスマートフォン
 ↓
端末・メール・SNSログ調査
 ↓
Mailia / NexHost / BrightNetへの照会
 ↓
天童の特定と捜索相談
 ↓
端末証拠4点の調査
 ↓
天童への追及と自白
 ↓
クリア
```

事件001で扱うプレイヤー向け証拠品は土崎綾香のスマートフォン、待ち伏せ場所とされるSNS投稿画像、Mailia・NexHost・BrightNetの照会回答書、Chirpログ、天童拓海のスマートフォン。ログはChirpのログイン・投稿ログ、フィッシングメールのメールヘッダ、NexHostのアクセスログとする。麻布優子のヒントは通常の会話ノードに記述し、専用ヒント機能や`hints[]`を使わない。ログ行は進行に必要な最小限から作成する。

各照会は院内との通常会話グラフに3択問題として記述する。誤答は説明ノードから設問へ戻し、正答確認ノードのセリフが全文表示された時点でEventを実行する。OSINT画像、土崎のスマートフォン、フィッシングメールのヘッダーは初回聞き込みまたは端末調査から取得する。黒見・雛泉・麻布との任意会話から事件の証拠品・Factは追加しない。麻布の助言は人物会話ノードに記述し、専用ヒント機能および`hints[]`を使わない。ログ本文は進行に必要な最小限から作成する。

天童のスマートフォンから犯行を裏付ける4項目を確認した後に追及会話を利用可能にする。自白会話の完了Eventで`cleared`をtrueにする。黒見は被害関係者であり、犯人・自白する人物ではない。

事件内のIPはRFC 5737の文書・演習用予約範囲（`192.0.2.0/24`、`198.51.100.0/24`、`203.0.113.0/24`）から割り当てる。実在サービスや実ネットワークへの通信・照会・スキャンには使用しない。予約範囲のIPはフィクション上の演習データとして扱う。

## 7. ID・参照の例

```text
人物: ayaka
証拠: ev_ayaka_phone
Fact: fact_phishing_site
Event: event_inquiry_nexhost
Conversation: conv_ayaka_first
会話ノード: node_001 (会話内で一意)
証拠調査項目: inspect_saved_email
ログ行: row_tor_login
ヒント段階: hint_tor_access_1
```

表示名を変更しても参照が壊れないよう、参照は必ずIDで行う。イベント等のIDは種類ごとに接頭辞を付け、種類を越えて一意にする。

## 8. 未確定事項と変更管理

この形式では、会話・ノード・選択肢・ルートのConditionと、Conditionの`and` / `or` / `not`を初版に含める。任意のフラグ、数値変数、複数言語対応、素材バリアントは初版に含めない。必要になった場合は、既存データとの互換性とエンジンへの影響を確認し、`schemaVersion`を更新してから追加する。初版のCondition / Effectで表現できない仕様を作者が自由記述で補わない。

旧形式の`prototype/case001.json`と旧シナリオメーカー試作版は、本書確定形式より前のデータ形式である。現在の`prototype/case001.json`は`schemaVersion: 1`の新形式を使用する。旧形式を読み込む場合は、移行処理またはCase 001の変換を明示的に行い、旧形式を暗黙に新形式として扱わない。









