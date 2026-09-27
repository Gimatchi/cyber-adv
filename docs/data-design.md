# シナリオ・データ設計

## 1. 基本方針

事件固有の内容はデータで表し、ゲームエンジンへ事件の知識を埋め込まない。作者はシナリオメーカーのフォームで項目や文章を入力し、メーカーがこの仕様に従ったJSONを生成する。通常の作成作業で作者がJSONを直接編集する必要はない。

本書の「確定データ形式」をシナリオデータの規範とする。画面上の入力方法はデータ構造の詳細を隠してよいが、保存する意味と構造は変えてはならない。

`actions`のような捜査アクション用コレクションは持たない。聞き込み、照会、相談、追及、捜索の実施は条件付き会話として作る。証拠・ログを調べて情報を得る操作は、証拠の調査項目または重要ログ行として作る。いずれも完了時にEventを起動し、EventのEffectだけが証拠・ログ・判明事項を追加する。

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
- Eventの起動元やConditionから参照されるID（人物、会話、証拠、調査項目、ログ、ログ行、Fact、Event、ヒント段階）は事件全体で一意とする。会話ノードIDだけは会話内で一意とする。
- 別項目への参照はIDで保存する。フォーム上では可能な限り表示名を選択肢として見せる。
- プレイヤー向け文章は文字列としてデータに保存する。作者向けの秘密、動機、結末の解説はプレイヤーへ配信するデータに入れず、設計資料で管理する。
- 省略可能な項目は空文字列や空配列として重複保存せず、省略する。必須・省略可能の扱いは各項目に記載する。
- 繰り返し行・選択肢・条件・Effectは配列で表現する。作者はメーカー上の「追加」「削除」「上下移動」で編集し、配列JSONを直接書かない。
- メーカーは参照先選択、ID重複、必須入力、会話接続、条件・Effectの型を検証する。書き出しJSONはエンジンが読み込む形式と一致させる。

## 4. 正規データ形式

以下は各コレクションを示す概形である。実データでは各配列に0件以上の項目を入れる。

実際に参照できる最小サンプルは [`examples/minimal-scenario.json`](examples/minimal-scenario.json) に置く。聞き込み、証拠調査、ログ行調査、Event、背景、アイコン、改行、条件付き会話を一つのファイルで確認できる。

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
  "name": "藤崎 彩花",
  "role": "被害者",
  "icon": "assets/characters/ayaka/normal.png",
  "background": "assets/backgrounds/ayaka-room.png",
  "description": "SNSアカウントを乗っ取られた被害者。"
}
```

`id`、`name`は必須。`icon`、`background`、`role`、`description`、`requires`は任意。`icon`は人物一覧と会話で使う既定の画像・表情の素材参照である。`requires`を指定した人物は、条件を満たすまで人物一覧に表示しない。省略時は`defaults.characterIcon`、それもなければエンジン内蔵アイコンを使う。人物を選択した画面では`background`を背景として使い、省略時は事件既定の背景を使う。会話グラフは人物項目の`interactions[]`に含め、人物を選択すると利用条件を満たすグラフを開始する。これにより人物と人物とのやり取りを一つのデータ単位で作成する。会話の話者は人物IDを参照する。プレイヤーのセリフは特別な話者ID `player`、場面説明は特別な話者ID `narrator` を使い、どちらの人物項目も作らない。人物の秘密・動機・作者向け履歴は含めない。人名は日本語では名字、名前の順、英語表記も姓、名の順とする。

### 人物の会話グラフ `characters[].interactions[]`

シナリオのトップレベルに独立した`conversations[]`は置かない。人物が入口となる会話グラフは、その人物の`interactions[]`に定義する。旧形式からの移行期間は読み込み時の互換変換を許容するが、メーカーの保存・書き出し形式は人物内へ統合した形にする。

```json
{
  "id": "conv_ayaka",
  "title": "藤崎彩花との会話",
  "background": "assets/backgrounds/interview-room.png",
  "startNodeId": "node_001",
  "completionEventId": "event_ayaka_first",
  "nodes": [
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

`id`、`title`、`startNodeId`、`nodes`は必須。`background`、`requires`、`completionEventId`、`repeatable`は任意。`background`は会話中の既定背景。`requires`を省略した会話は、その人物が表示されていれば利用できる。`repeatable: true`の会話は完了後も入口を表示し、会話完了状態を進行条件として記録しない。ノードはオブジェクトのキーではなく配列項目とし、メーカーで順番に追加・編集できるようにする。一人の人物が状況に応じて異なる会話をする場合も、人物の`interactions[]`に複数のグラフを持たせるか、一つのグラフ内の条件付き`routes`で表現する。相沢への初回接触と追及のように同じ相手とのやり取りが続く場合は、条件付きrouteで一つのグラフにまとめられる。

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
| `nextNodeId` | 分岐なしの場合 | 次のノード。会話末尾では省略して終了する。 |
| `choices` | 選択がある場合 | 選択肢配列。各要素は`text`、任意の`requires`、`nextNodeId`、`completionEventId`を持つ。`completionEventId`を指定した選択肢を選ぶと、そのEventを一度だけ起動する。条件を満たさない選択肢は表示しない。 |
| `routes` | ルート専用ノードの場合 | 条件を順番に評価する自動分岐。各要素は任意の`requires`と`nextNodeId`または`nextConversationId`を持つ。 |

会話の`text`、人物・証拠・ログ・Factの`description`、証拠調査項目の`description`、選択肢の`text`、ログ行の`text`は複数行を許可し、改行をそのまま表示する。メーカーではこれらを複数行入力欄で編集する。JSONでは改行文字として保存し、書き出し時に正しくエスケープする。`nextNodeId`、`choices`、`routes`は同時に指定しない。`routes`を持つノードは表示用の話者・文章を持たず、条件を満たす最初のルートへ自動的に進む。ルートの遷移先が別会話の場合は、現在の会話を完了して対象会話を開始する。会話や調査結果に紐づくEvent / Effectは、対応する文章が全文表示されるまで適用しない。適用直後に、実際に追加・解禁された対象だけを色付き通知でセリフペインに表示する。汎用の確認を促すセリフは挟まない。会話の完了時に進行状態を変更する処理は、会話データへ直接書かずEventに置く。

### 証拠調査の操作

会話のセリフペインでは会話タイトルを表示せず話者名を大きく表示し、`player`は「あなた」と表示する。証拠調査中は証拠品名を大きく表示する。選択肢はメインペイン右下で背景画像に重ねて表示し、セリフペインの位置を押し下げない。選択肢が多い場合は選択肢領域をスクロール可能にし、必要ならセリフペインにも重ねる。証拠調査の選択肢には「調査を終了する」を末尾に置く。調査項目を選んだ後の結果表示では「戻る」を表示し、「証拠品を調べる」を押した直後の調査項目選択画面へ戻る。「！」は新しい情報を取得できる未完了の会話・証拠調査・ログ調査、未読の判明事項、未使用のヒント段階がある場合に状態から導出する。対象には人物・証拠品・ログ・判明事項の各アイコンと資料タブを含める。判明事項の既読状態はPlayerStateの`readFacts`で管理する。新しい証拠・ログ・判明事項を追加したEvent、または新たな人物を解禁したEventの通知は選択肢にせず、セリフペインに色付きで表示する。通常のセリフ本文とは見た目を分け、操作を追加で要求しない。

### 証拠 `evidence[]`

```json
{
  "id": "ev_ayaka_phone",
  "name": "藤崎彩花のスマートフォン",
  "icon": "assets/evidence/ayaka-phone.png",
  "background": "assets/backgrounds/evidence-desk.png",
  "description": "保存されたメールや閲覧履歴を調べられる。",
  "investigations": [
    {
      "id": "inspect_saved_email",
      "label": "保存されたメールを確認する",
      "description": "受信メールを確認する。",
      "completionEventId": "event_inspect_saved_email"
    }
  ]
}
```

証拠の`id`、`name`は必須。`icon`、`background`、`description`、`investigations`は任意。`icon`は証拠一覧・詳細で使う画像の素材参照で、省略時は`defaults.evidenceIcon`、それもなければエンジン内蔵アイコンを使う。証拠を選択した画面では`background`を背景として使い、省略時は事件既定の背景を使う。証拠はプレイヤーが取得・調査できる資料で、調査結果として得る知識はFactに分ける。調査項目の`id`は事件内で一意とする。調査項目は`label`を必須とし、状態変更が必要な場合は`completionEventId`を指定する。

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
{ "type": "evidence", "targetId": "ev_ayaka_phone", "operator": "exists" }
{ "type": "log", "targetId": "log_sns_access", "operator": "exists" }
{ "type": "fact", "targetId": "fact_phishing_site", "operator": "exists" }
{ "type": "conversation", "targetId": "conv_ayaka_first", "operator": "completed" }
{ "type": "investigation", "targetId": "inspect_saved_email", "operator": "completed" }
{ "type": "logRow", "targetId": "row_tor_login", "operator": "completed" }
{ "type": "event", "targetId": "event_ayaka_first", "operator": "completed" }
{ "type": "and", "conditions": [ CONDITION, CONDITION ] }
{ "type": "or", "conditions": [ CONDITION, CONDITION ] }
{ "type": "not", "condition": CONDITION }
```

`evidence`、`log`、`fact`は`exists`、`conversation`、`investigation`、`logRow`、`event`は`completed`だけを使用する。AND/ORは1件以上の子を持ち、NOTはConditionをちょうど1件持つ。最大ネスト深度は16。メーカーではJSONを入力させず、種別・対象・演算子と条件グループの追加操作で編集する。会話の`requires`は単一Conditionとして保存する。

### Event `events[]` と Effect

```json
{
  "id": "event_inspect_tor_login",
  "trigger": { "type": "logRow", "targetId": "row_tor_login" },
  "effects": [
    { "type": "add", "target": "facts.fact_tor_access" }
  ]
}
```

Eventは状態変更の唯一の定義場所。`id`、`trigger`、`effects`は必須。`trigger`の種別と対象は以下に限定する。

| trigger.type | targetIdが参照する対象 |
| --- | --- |
| `conversation` | 会話ID |
| `conversationNode` | `会話ID/ノードID`形式のノード参照 |
| `choice` | 選択肢ID |
| `investigation` | 証拠調査項目ID |
| `logRow` | ログ行ID |
| `hintStage` | ヒント段階ID |

起動元側の`completionEventId`とEventのtriggerは一対一で一致させる。メーカーでは起動元を選んでEventを関連付ける操作とし、参照文字列を作者に手入力させない。Eventは一度だけ実行し、成功とEffect適用を同一トランザクションで確定する。

Effectは型を選び、型に応じて参照先を選択する。

| type | 入力項目 | 効果 |
| --- | --- | --- |
| `add` | 追加先と項目 | `evidence`、`logs`、`facts`、`usedHints`の集合へ追加する。例：`{ "type": "add", "target": "facts.fact_phishing_site" }` |
| `remove` | 削除先と項目 | 同じ集合から削除する。未登録でも成功する。 |
| `set` | 許可された状態項目と値 | `cleared`をboolean値にする。任意パス変更はできない。 |

Effectの配列順に実行する。対象の不存在、型不一致、禁止された状態変更があればEvent全体をロールバックする。Eventの完了記録とEffectsは同一トランザクションで保存し、重複要求でEffectsを再適用しない。

### Eventとの関連付け

会話、会話ノード、会話中の選択肢、証拠調査項目、重要ログ行、ヒント段階は、状態変更が必要な場合にEvent IDを1つ参照する。同じEventに複数の起動元を結び付けない。会話は照会・聞き込み・相談・追及を含む、人物または事業者とのやり取りを表す。セリフに対応して情報を取得する場合は、会話全体ではなく該当ノードの`completionEventId`を使う。ノード文が全文表示された時点でEventを適用し、取得・解禁通知も同時に表示する。証拠や判明事項の取得は、会話・証拠調査・ログ調査のEventに集約する。

Event triggerは完了した起動元を表す。エンジンは起動元の完了記録、Eventの完了記録、Effect適用を同一トランザクションで保存する。

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

ヒントは対象ごとに段階を持つ。段階は配列順に提示し、各段階の`id`、`text`、`completionEventId`を必須とする。Eventはその段階IDを`usedHints`に追加する。ヒントの依頼・提示は麻野など担当人物の`interactions[]`内の会話グラフから始め、通常の人物会話と同じ条件分岐・ノード表示を使う。ヒント段階データは提示文と利用状態を管理し、人物の会話グラフから参照する。これにより会話入口を人物にまとめつつ、段階的ヒントの再利用可能なデータは維持する。ヒントは答えや必須証拠を直接与えず、考え方を補助する。

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
  "completedEvents": [],
  "usedHints": [],
  "cleared": false
}
```

利用可能状態はPlayerStateとConditionから導出する。GMの一時LockはGMStateと認証済みGMセッションで別に管理し、シナリオJSONへ保存しない。

会話・ノード・選択肢は、それぞれの`requires`を満たした場合だけ表示対象になる。条件を満たさない要素は一覧や選択肢に表示しない。条件を満たしている要素にGM Lockが設定されている場合だけ南京錠を表示し、選択時は実行を拒否する。GM LockはConditionを変更せず、条件未達の要素を表示するためには使わない。

## 6. 事件001のデータ化

事件001の人物、事業者、IPアドレス、メールアドレス、時系列、フィッシングサイト、ログ、証拠、会話、Fact、ヒントはすべてこの形式のデータとして表現する。固有の進行は会話のConditionとEvent / Effectの組み合わせで作り、エンジンに事件001専用処理を追加しない。

事件001の基本ルートは以下の通り。これはデータ作成時の内容確認に使い、エンジンの手続きにはしない。

```text
彩花への聞き込み
 ↓
彩花のスマートフォン
 ↓
端末・メール・SNSログ調査
 ↓
Mailia / NexHost / BrightNetへの照会
 ↓
相沢の特定と捜索相談
 ↓
端末証拠4点の調査
 ↓
相沢への追及と自白
 ↓
クリア
```

相沢のスマートフォンから犯行を裏付ける4項目を確認した後に追及会話を利用可能にする。自白会話の完了Eventで`cleared`をtrueにする。黒田は被害関係者であり、犯人・自白する人物ではない。

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










