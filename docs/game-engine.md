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
  "completedConversations": [],
  "completedInvestigations": [],
  "completedLogRows": [],
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
  "targetId": "ev_ayaka_smartphone",
  "operator": "exists"
}
```

判明事項の例：

```json
{
  "type": "fact",
  "targetId": "fact_phishing_site",
  "operator": "exists"
}
```

Conditionは単一条件、`and`、`or`、`not`をサポートする。複合条件の子配列は空にできず、`not`は子Conditionをちょうど1つ持つ。詳細は「ConditionとEffectの確定仕様」を参照する。

## 5. Effect

基本Effect：

```text
add
remove
set
```

EffectはEventだけが保持し実行する。起動元の会話・調査の完了記録とEventの完了記録はエンジンが保存する。`add`、`remove`、`set`の意味と再実行規則は「ConditionとEffectの確定仕様」に従う。事件001専用Effectは作らない。

## 6. Event

Eventはゲーム内で発生する処理単位。会話・証拠調査項目・ログ行・ヒント段階の`completionEventId`とEventの`trigger`は同じ対象を指し、シナリオ読込時に対応関係を検証する。保存形式の詳細と起動元の対応表は[`data-design.md`](data-design.md)を正とする。

```json
{
  "id": "event_ayaka_first_interview",
  "trigger": { "type": "conversation", "targetId": "conv_ayaka_first" },
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
会話 / 証拠調査 / ログ行調査
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
  "startNodeId": "node_001",
  "completionEventId": "event_ayaka_first_interview",
  "nodes": [
    {
      "id": "node_001",
      "speakerId": "ayaka",
      "icon": "assets/characters/ayaka_normal.png",
      "text": "SNSのアカウントに入れなくなってしまって……。",
      "nextNodeId": "node_002"
    }
  ]
}
```

エンジンはspeakerId、icon、background、text、choices、nextNodeId、requires、routes等を解釈する。ノードはIDを持つ配列として保存する。会話・ノード・選択肢の`requires`をサーバー側で評価し、条件を満たすものだけを表示する。各発言の`icon`があればその表情を表示し、省略時は人物の既定アイコン、事件共通アイコン、内蔵アイコンの順に使う。会話中の背景はノード、会話、事件共通、内蔵背景の順で選ぶ。人物・証拠品・ログの選択画面では、その項目の背景、事件共通、内蔵背景の順で選ぶ。セリフ、説明文、ログ行は改行を保持して表示する。人物ごとの性格・動機・台詞をエンジンへ埋め込まない。会話内容をTypeScriptへ直接記述しない。

`routes`だけを持つ空ノードは表示せず、配列順に条件を評価して最初に成立した`nextNodeId`または`nextConversationId`へ自動遷移する。条件なしのrouteは最後のフォールバックにする。別会話へ遷移する場合は、現在の会話を完了してから対象会話を開始する。ルートが1つも成立せずフォールバックもない場合はシナリオ検証エラーとする。

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

## 10. 利用可能な会話

聞き込み、事業者への照会、警部への相談、追及はすべて会話として表現する。会話の`requires`を評価して利用可能かを決め、会話終了時にEventを起動する。証拠調査項目・ログ行・ヒント段階も同様にEventを関連付ける。EventがEffectを実行する唯一の単位である。プレイヤーごとの`usedHints`には提示済みの段階IDを保存する。

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

有効なGM制御セッション中は、判定順を`globalPause`による一時停止 → 個別Lock → Conditionとする。GM制御セッションがないときは一時停止とLockを適用せず、Conditionだけで判定する。Conditionが偽なら要素を表示せず、Conditionが真でLock中なら南京錠を表示する。GM制御セッションの終了時に一時停止と全Lockを解除する。

## 12. UI表示

### 「!」
新しい会話、証拠調査、ログ、麻野巡査へのヒント依頼などが利用可能な場合に表示する。

### 南京錠
Condition未達の要素は表示しない。Conditionを満たしているがGM Lockまたは全体一時停止中の要素には南京錠を表示する。サーバー側で毎回実行可否を検証する。

## 13. GM

GMStateは事件全体で共有し、`currentStage`と全体アナウンスを保持する。有効なGM制御セッションとは、roleが`gm`の認証済みサーバーセッションがログアウトまたは失効していない状態を指す。その間だけ`globalPause`とプレイヤー別の会話・証拠調査・ログ行調査・ヒントLockを有効にする。セッション終了時はこれらの一時制御を解除する。個別Lockは認証済みGMだけが変更できる。GM制御セッションが存在しない間、全PlayerはConditionに従って各自のペースで進行できる。

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
14. 条件による会話解禁
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

Conditionの葉は安定IDを持つ。`evidence`、`log`、`fact`は`operator: "exists"`だけを使い、`conversation`、`investigation`、`logRow`、`event`は`operator: "completed"`だけを使う。複合条件は次のJSON形に固定する：

```json
{ "type": "and", "conditions": [ CONDITION, CONDITION ] }
{ "type": "or", "conditions": [ CONDITION, CONDITION ] }
{ "type": "not", "condition": CONDITION }
```

`and` / `or`の`conditions`配列は1件以上とし、`not`は`condition`を1件だけ否定する。会話の`requires`が省略された場合は無条件（true）とする。最大ネスト深度は16とし、葉の不明なtype、operator、存在しない参照、深度超過はシナリオ読込時にエラーにする。

Effectは次のとおりで、Event内の配列順に実行する。

- `add`: `{ "type": "add", "target": "evidence.ev_id" }`の形。`evidence`、`logs`、`facts`、`usedHints`集合へ追加する。既存IDなら何もしない。
- `remove`: `{ "type": "remove", "target": "evidence.ev_id" }`の形。同じ4集合から削除する。未登録でも何もしない。
- `set`: `{ "type": "set", "target": "cleared", "value": true }`の形。PlayerStateの`cleared`だけをboolean値に置換する。任意パスの書換えやGMState変更は許さない。

状態に存在しない参照先、型不一致、禁止フィールドへの`set`はEvent全体を失敗させ、変更をすべてロールバックする。Eventはプレイヤーごとに一度だけ実行し、成功時に起動元の完了記録と`(playerId, eventId)`の一意な完了記録を同じDBトランザクション内で保存する。二重要求は保存済み結果を返し、Effectsを再適用しない。失敗時の再試行はトランザクション全体を再実行する。

