# ゲームエンジン仕様

## 1. 基本原則

ゲームエンジンは事件固有の内容を知らず、複数事件で共通利用できる機能を提供する。

中心となる考え方は、

```text
State → Condition / GM判定 → Event → Effect → State
```

である。

## 2. エンジンの担当機能

- 会話表示
- 選択肢表示
- キャラクター画像表示
- 背景・証拠画像表示
- 証拠表示
- ログ表示
- ログ重要行の調査
- Condition評価
- Effect実行
- State更新
- Event処理
- 捜査アクション
- セーブ
- GM操作
- ヒント
- クリア判定

## 3. State

例：

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

これはPlayerStateの例であり、GM制御は含めない。証拠、ログ、判明事項、個別の進行履歴はプレイヤー単位で保存する。GM制御はGMStateに保存し、利用可能状態はPlayerState、Condition、GMStateから導出する。

## 4. Condition

例：

```json
{
  "type": "evidence",
  "target": "ev_ayaka_smartphone",
  "operator": "exists"
}
```

判明事項の例：

```json
{
  "type": "fact",
  "target": "fact_phishing_site",
  "operator": "exists"
}
```

Conditionは単一条件、`and`、`or`、`not`をサポートする。複合条件の子配列は空にできず、`not`は子Conditionをちょうど1つ持つ。詳細は「ConditionとEffectの確定仕様」を参照する。

## 5. Effect

想定する基本処理：

```text
add
remove
set
complete
start
```

EffectはEventだけが保持し実行する。`add`、`remove`、`set`、`complete`、`start`の意味と再実行規則は「ConditionとEffectの確定仕様」に従う。事件001専用Effectは作らない。

## 6. Event

Eventはゲーム内で発生する処理単位。会話・Action・ログ行・ヒント段階の`completionEvent`とEventの`trigger`は同じ対象を指し、シナリオ読込時に対応関係を検証する。

```json
{
  "id": "event_ayaka_first_interview",
  "trigger": { "type": "conversation", "target": "conv_ayaka_first" },
  "effects": [
    {
      "type": "add",
      "target": "evidence.ev_ayaka_smartphone"
    },
    {
      "type": "add",
      "target": "facts.fact_received_suspicious_email"
    }
  ]
}
```

基本フロー：

```text
会話 / Action
 ↓
完了時に参照先Eventを起動
 ↓
Effect実行
 ↓
State更新
 ↓
Condition再評価
 ↓
UI更新
```

## 7. 会話

会話はシナリオデータで定義する。

```json
{
  "id": "conv_ayaka_first",
  "start": "node_001",
  "completionEvent": "event_ayaka_first_interview",
  "nodes": {
    "node_001": {
      "speaker": "ayaka",
      "image": "characters/ayaka_normal.png",
      "text": "SNSのアカウントに入れなくなってしまって……。",
      "next": "node_002"
    }
  }
}
```

エンジンはspeaker、image、text、choices、next等を解釈する。人物IDと立ち絵・表情画像の対応はシナリオデータで定義し、表情差分の切り替えも共通の画像参照機能で表示する。人物ごとの性格・動機・台詞をエンジンへ埋め込まない。会話内容をTypeScriptへ直接記述しない。

## 8. 証拠・判明事項

証拠は取得・調査できる物または記録。判明事項は証拠やログを調査した結果として得られる情報。

```text
証拠
 ↓ 調査
判明事項
 ↓ Condition
次の捜査
```

## 9. ログ

ログには複数行があり、重要な行に「？」を表示する。

```text
ログ表示
 ↓
重要行を選択
 ↓
Effect
 ↓
情報・判明事項を取得
```

メールヘッダも同じログ調査方式で扱う。

## 10. 捜査Action

```json
{
  "id": "action_investigate_ayaka_smartphone",
  "name": "彩花のスマートフォンを調べる",
  "requires": [
    {
      "type": "evidence",
      "target": "ev_ayaka_smartphone",
      "operator": "exists"
    }
  ],
  "completionEvent": "event_investigate_ayaka_smartphone"
}
```

会話やActionはEffectを持たず、完了時にEvent IDを1つ参照する。EventがEffectを実行する唯一の単位である。ログ行調査とヒント段階の提示も同じ方式でEventを起動する。プレイヤーごとの`usedHints`には提示済みの段階IDを保存する。

## 11. 利用可能状態

```text
現在State
+
Condition
+
GMState
↓
利用可能 / 不可
```

有効なGM制御セッション中は、判定順を`globalPause`による一時停止 → 個別Lock → 個別Unlock → Conditionとする。GM制御セッションがないときは一時停止と上書きを適用せず、Conditionだけで判定する。GM制御セッションの終了時に一時停止と全上書きを解除する。GM Unlockでも認証、対象IDの妥当性、未完了Eventの検証は省略しない。

## 12. UI表示

### 「!」
新しい会話、証拠調査、ログ、捜査Action、麻野巡査へのヒント依頼、警部への相談などが利用可能な場合に表示する。

### 南京錠
Condition未達、GM Lock、全体一時停止のいずれかで実行できない場合に表示する。GM UnlockでCondition未達を許可した場合は南京錠を外す。サーバー側で毎回実行可否を検証する。

## 13. GM

GMStateは事件全体で共有し、`currentStage`と全体アナウンスを保持する。有効なGM制御セッションとは、roleが`gm`の認証済みサーバーセッションがログアウトまたは失効していない状態を指す。その間だけ`globalPause`とプレイヤー別Action上書きを有効にする。セッション終了時はこれらの一時制御を解除する。個別上書き値は`lock` / `unlock` / `none`で、認証済みGMだけが変更できる。GM制御セッションが存在しない間、全PlayerはConditionに従って各自のペースで進行できる。

警部は差押えや令状請求の目的・根拠について、誤った判断を正しい方向へ導く。麻野巡査はサイバー知識の説明と段階的なヒントを担当する。エンジンは両者の役割を人物固有のコードにせず、シナリオデータの会話・ヒントとして扱う。

## 14. クリア

事件001では、相沢のスマートフォンを解析して犯行を裏付ける4点の証拠を発見した後、相沢に再度話しかける。追及の会話を通じて相沢が自白した時点でクリアとする。黒田は被害関係者であり、犯人・自白する人物ではない。

エンジン自体は事件内の人物IDをハードコードせず、クリア条件もシナリオデータとして表現する。

## 15. 最小実装

最初は以下を順に実装する。

1. サーバー起動
2. ブラウザ接続
3. 基本UI
4. キャラクター表示
5. 会話
6. 選択肢
7. State
8. Condition
9. Effect
10. Event
11. 証拠
12. 判明事項
13. 簡単なログ
14. 条件によるAction解禁
15. サーバー保存

その後にCase 001をシナリオデータとして載せる。

## 16. 実装原則

- エンジンは事件を知らない
- シナリオはエンジン内部実装を知らない
- 会話をハードコードしない
- 証拠と判明事項を混同しない
- Conditionによる利用可能判定を基本とする
- サーバーをゲーム状態の正とする
- GMロックをサーバー側でも検証する
- Case 002以降でも同じ仕組みを利用する

## 17. ConditionとEffectの確定仕様

Conditionの葉は安定IDを持つ。`evidence`、`log`、`fact`は`operator: "exists"`だけを使い、`conversation`、`action`、`event`は`operator: "completed"`だけを使う。複合条件は次のJSON形に固定する：

```json
{ "type": "and", "conditions": [ CONDITION, CONDITION ] }
{ "type": "or", "conditions": [ CONDITION, CONDITION ] }
{ "type": "not", "condition": CONDITION }
```

`and` / `or`の`conditions`配列は1件以上とし、`not`は`condition`を1件だけ否定する。Actionの`requires`が省略された場合は無条件（true）、配列の場合は全条件のANDとして評価する。最大ネスト深度は16とし、葉の不明なtype、operator、存在しない参照、深度超過はシナリオ読込時にエラーにする。

Effectは次のとおりで、Event内の配列順に実行する。

- `add`: `{ "type": "add", "target": "evidence.ev_id" }`の形。`evidence`、`logs`、`facts`、`usedHints`集合へ追加する。既存IDなら何もしない。
- `remove`: `{ "type": "remove", "target": "evidence.ev_id" }`の形。同じ4集合から削除する。未登録でも何もしない。
- `set`: `{ "type": "set", "target": "cleared", "value": true }`の形。PlayerStateの`cleared`だけをboolean値に置換する。任意パスの書換えやGMState変更は許さない。
- `complete`: `{ "type": "complete", "target": "action.action_id" }`の形。会話、Action、Eventの対象を対応する完了集合へ追加する。完了済みなら何もしない。Event自身の完了は実行トランザクションが必ず記録する。
- `start`: `{ "type": "start", "target": "conversation.conv_id" }`の形。会話またはActionを対応する開始集合へ追加する。既に開始・完了済みなら重複登録しない。

状態に存在しない参照先、型不一致、禁止フィールドへの`set`はEvent全体を失敗させ、変更をすべてロールバックする。Eventはプレイヤーごとに一度だけ実行し、成功時に同じDBトランザクション内で`(playerId, eventId)`の一意な完了記録を保存する。二重要求は保存済み結果を返し、Effectsを再適用しない。失敗時の再試行はトランザクション全体を再実行する。

