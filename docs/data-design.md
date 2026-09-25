# シナリオ・データ設計

## 1. 基本方針

事件固有の内容はデータで表し、ゲームエンジンへ事件の知識を埋め込まない。作者はシナリオメーカーのフォームで項目や文章を入力し、メーカーがこの仕様に従ったJSONを生成する。通常の作成作業で作者がJSONを直接編集する必要はない。

本書の「確定データ形式」をシナリオデータの規範とする。画面上の入力方法はデータ構造の詳細を隠してよいが、保存する意味と構造は変えてはならない。

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
- Eventの起動元やConditionから参照されるID（人物、会話、証拠、調査項目、ログ、ログ行、Fact、Action、Event、ヒント段階）は事件全体で一意とする。会話ノードIDだけは会話内で一意とする。
- 別項目への参照はIDで保存する。フォーム上では可能な限り表示名を選択肢として見せる。
- プレイヤー向け文章は文字列としてデータに保存する。作者向けの秘密、動機、結末の解説はプレイヤーへ配信するデータに入れず、設計資料で管理する。
- 省略可能な項目は空文字列や空配列として重複保存せず、省略する。必須・省略可能の扱いは各項目に記載する。
- 繰り返し行・選択肢・条件・Effectは配列で表現する。作者はメーカー上の「追加」「削除」「上下移動」で編集し、配列JSONを直接書かない。
- メーカーは参照先選択、ID重複、必須入力、会話接続、条件・Effectの型を検証する。書き出しJSONはエンジンが読み込む形式と一致させる。

## 4. 正規データ形式

以下は各コレクションを示す概形である。実データでは各配列に0件以上の項目を入れる。

```json
{
  "schemaVersion": 1,
  "id": "case001",
  "title": "SNS乗っ取り",
  "defaults": {},
  "characters": [],
  "conversations": [],
  "evidence": [],
  "logs": [],
  "facts": [],
  "actions": [],
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
| `defaults` | 任意 | 背景など種類ごとに適用する共通表示設定。初期版では空オブジェクトを許可する。 |

### 人物 `characters[]`

```json
{
  "id": "ayaka",
  "name": "藤崎 彩花",
  "role": "被害者",
  "portrait": "assets/characters/ayaka.png",
  "description": "SNSアカウントを乗っ取られた被害者。"
}
```

`id`、`name`は必須。`role`、`portrait`、`description`は任意。会話の話者は人物IDを参照する。プレイヤーのセリフは特別な話者ID `player` を使い、人物項目は作らない。人物の秘密・動機・作者向け履歴は含めない。人名は日本語では名字、名前の順、英語表記も姓、名の順とする。

### 会話 `conversations[]`

```json
{
  "id": "conv_ayaka_first",
  "title": "彩花への聞き込み",
  "startNodeId": "node_001",
  "completionEventId": "event_ayaka_first",
  "nodes": [
    {
      "id": "node_001",
      "speakerId": "ayaka",
      "text": "SNSのアカウントに入れなくなってしまって……。",
      "nextNodeId": "node_002"
    },
    {
      "id": "node_002",
      "speakerId": "player",
      "text": "何か、その前に変わったことはありませんでしたか？",
      "choices": [
        { "text": "メールについて聞く", "nextNodeId": "node_003" },
        { "text": "SNSについて聞く", "nextNodeId": "node_004" }
      ]
    }
  ]
}
```

`id`、`title`、`startNodeId`、`nodes`は必須。`completionEventId`は会話終了時に状態変更が必要な場合に必須。ノードはオブジェクトのキーではなく配列項目とし、メーカーで順番に追加・編集できるようにする。

ノードのフィールド：

| フィールド | 必須 | 内容 |
| --- | --- | --- |
| `id` | 必須 | 会話内で一意なノードID。メーカーが生成する。 |
| `speakerId` | 必須 | `player`または人物ID。 |
| `text` | 必須 | 表示するセリフ・文章。 |
| `portrait` | 任意 | 既定の人物画像と異なる画像・表情を使う場合の素材参照。 |
| `nextNodeId` | 分岐なしの場合 | 次のノード。会話末尾では省略して終了する。 |
| `choices` | 選択がある場合 | 選択肢配列。各要素は`text`と`nextNodeId`を持つ。 |

`nextNodeId`と`choices`は同時に指定しない。選択肢の条件分岐は初版では扱わず、全選択肢を表示する。会話の完了時に進行状態を変更する処理は、会話データへ直接書かずEventに置く。

### 証拠 `evidence[]`

```json
{
  "id": "ev_ayaka_phone",
  "name": "藤崎彩花のスマートフォン",
  "portrait": "PH",
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

証拠の`id`、`name`は必須。`portrait`、`description`、`investigations`は任意。証拠はプレイヤーが取得・調査できる資料で、調査結果として得る知識はFactに分ける。調査項目の`id`は事件内で一意とする。調査項目は`label`を必須とし、状態変更が必要な場合は`completionEventId`を指定する。

### ログ `logs[]` と行 `rows[]`

```json
{
  "id": "log_sns_access",
  "name": "SNSアクセスログ",
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

ログの`id`、`name`は必須。`description`は任意。各行は`id`、`text`を必須とし、`time`は任意。`important`はプレイヤーが調査できる行なら`true`とし、省略時は`false`。重要行のEventは`completionEventId`で指定する。通常行はEventを持たない。メール本文とヘッダも特別処理を作らず、必要な内容を通常のログ行として記述する。

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

### 捜査アクション `actions[]`

```json
{
  "id": "action_inquiry_nexhost",
  "name": "NexHostへ照会する",
  "description": "フィッシングサイトのアクセス記録を照会する。",
  "requires": {
    "type": "fact",
    "targetId": "fact_phishing_site",
    "operator": "exists"
  },
  "conversationId": "conv_nexhost_inquiry"
}
```

`id`、`name`は必須。`description`、`requires`、`conversationId`は任意。`requires`省略時は無条件で利用可能。Actionはプレイヤーが選ぶ捜査上の操作で、会話を伴う場合は`conversationId`を参照する。Conditionはフォームで「必要な証拠・ログ・判明事項・完了済み項目」を選び、AND/OR/NOTを組み立てる。

### Condition

Conditionの保存形式は以下に固定する。

```json
{ "type": "evidence", "targetId": "ev_ayaka_phone", "operator": "exists" }
{ "type": "log", "targetId": "log_sns_access", "operator": "exists" }
{ "type": "fact", "targetId": "fact_phishing_site", "operator": "exists" }
{ "type": "conversation", "targetId": "conv_ayaka_first", "operator": "completed" }
{ "type": "action", "targetId": "action_inquiry_nexhost", "operator": "completed" }
{ "type": "event", "targetId": "event_ayaka_first", "operator": "completed" }
{ "type": "and", "conditions": [ CONDITION, CONDITION ] }
{ "type": "or", "conditions": [ CONDITION, CONDITION ] }
{ "type": "not", "condition": CONDITION }
```

`evidence`、`log`、`fact`は`exists`、`conversation`、`action`、`event`は`completed`だけを使用する。AND/ORは1件以上の子を持ち、NOTはConditionをちょうど1件持つ。最大ネスト深度は16。メーカーではJSONを入力させず、種別・対象・演算子と条件グループの追加操作で編集する。Actionの`requires`は単一Conditionとして保存する。

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
| `action` | 捜査アクションID |
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
| `complete` | `conversation`、`action`、`event`とID | 対象を完了済みにする。 |
| `start` | `conversation`または`action`とID | 対象を開始済みにする。 |

Effectの配列順に実行する。対象の不存在、型不一致、禁止された状態変更があればEvent全体をロールバックする。Eventの完了記録とEffectsは同一トランザクションで保存し、重複要求でEffectsを再適用しない。

### Eventとの関連付け

会話、Action、証拠調査項目、重要ログ行、ヒント段階は、状態変更が必要な場合にEvent IDを1つ参照する。同じEventに複数の起動元を結び付けない。会話付きActionはActionが会話を開始し、会話の最終ノード到達を会話完了とする。会話完了Eventから`complete` Effectで親Actionを完了させる。会話自体に追加処理が必要な場合も、その会話のEventにまとめる。

Event triggerは完了した起動元を表す。Actionが会話を開始しただけではAction完了Eventを起動しない。会話付きActionの効果は上記の会話完了Eventに集約し、Action自身の別Eventと二重に起動しない。

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

ヒントは対象ごとに段階を持つ。段階は配列順に提示し、各段階の`id`、`text`、`completionEventId`を必須とする。Eventはその段階IDを`usedHints`に追加する。ヒントは答えや必須証拠を直接与えず、考え方を補助する。

## 5. プレイヤー状態との対応

シナリオJSONは定義データであり、参加者の進行状態を含めない。各PlayerStateはサーバー側で別に保存する。

```json
{
  "playerId": "player_001",
  "caseId": "case001",
  "evidence": [],
  "logs": [],
  "facts": [],
  "startedConversations": [],
  "startedActions": [],
  "completedConversations": [],
  "completedActions": [],
  "completedEvents": [],
  "usedHints": [],
  "cleared": false
}
```

利用可能状態はPlayerStateとConditionから導出する。GMの一時Lock/UnlockはGMStateと認証済みGMセッションで別に管理し、シナリオJSONへ保存しない。

## 6. 事件001のデータ化

事件001の人物、事業者、IPアドレス、メールアドレス、時系列、フィッシングサイト、ログ、証拠、会話、捜査ルート、Fact、ヒントはすべてこの形式のデータとして表現する。固有の進行はActionのConditionとEvent / Effectの組み合わせで作り、エンジンに事件001専用処理を追加しない。

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

相沢のスマートフォンから犯行を裏付ける4項目を確認した後に追及Actionを利用可能にする。自白会話の完了Eventで`cleared`をtrueにする。黒田は被害関係者であり、犯人・自白する人物ではない。

事件内のIPはRFC 5737の文書・演習用予約範囲（`192.0.2.0/24`、`198.51.100.0/24`、`203.0.113.0/24`）から割り当てる。実在サービスや実ネットワークへの通信・照会・スキャンには使用しない。予約範囲のIPはフィクション上の演習データとして扱う。

## 7. ID・参照の例

```text
人物: ayaka
証拠: ev_ayaka_phone
Fact: fact_phishing_site
Action: action_inquiry_nexhost
Event: event_inquiry_nexhost
Conversation: conv_ayaka_first
会話ノード: node_001 (会話内で一意)
証拠調査項目: inspect_saved_email
ログ行: row_tor_login
ヒント段階: hint_tor_access_1
```

表示名を変更しても参照が壊れないよう、参照は必ずIDで行う。イベント等のIDは種類ごとに接頭辞を付け、種類を越えて一意にする。

## 8. 未確定事項と変更管理

この形式では、会話選択肢ごとのCondition、任意のフラグ、数値変数、複数言語対応、素材バリアントは初版に含めない。必要になった場合は、既存データとの互換性とエンジンへの影響を確認し、`schemaVersion`を更新してから追加する。初版のCondition / Effectで表現できない仕様を作者が自由記述で補わない。

現行の`prototype/case001.json`とシナリオメーカー試作版は、本書確定形式より前のデータ形式である。新形式を読み書きするメーカー・エンジンを実装する際に、旧形式からの移行処理またはCase 001の変換を行う。旧形式を暗黙に新形式として扱わない。
