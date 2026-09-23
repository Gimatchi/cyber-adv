# シナリオ・データ設計

## 1. 基本方針

事件固有の内容をプログラムから分離し、シナリオデータとして管理する。

> 事件をプログラムするのではなく、事件のデータをゲームエンジンに読み込ませる。

## 2. データ構成

```text
scenario/
├─ case001/
│  ├─ case.json
│  ├─ characters.json
│  ├─ conversations.json
│  ├─ evidence.json
│  ├─ logs.json
│  ├─ facts.json
│  ├─ actions.json
│  ├─ events.json
│  └─ hints.json
└─ ...

assets/
└─ case001/
   ├─ characters/
   ├─ backgrounds/
   ├─ evidence/
   └─ ...
```

## 3. データ種別

### case.json
事件全体の基本情報、事件ID、事件名などを定義する。

### characters.json
人物ID、表示名、年齢・役割、画像等を定義する。プレイヤーには名前を設定しない。イニシャルは名字・姓の順、次に名前の順にする。英語のフルネームも姓、名の順で記載する（例：`Kuroda Koichi`）。

### conversations.json
会話をノード形式で定義する。speaker、image、text、choices、next等を持つ。

### evidence.json
プレイヤーが取得・調査できる証拠を定義する。

### logs.json
ログとログ行を定義する。重要行は「？」で選択できるようにする。

### facts.json
証拠やログから判明する情報を定義する。

### actions.json
条件付きで実行可能になる捜査アクションを定義する。

### events.json
会話や捜査の完了をState変更へ接続するイベントを定義する。

### hints.json
麻野優子などから提示する段階的なヒントを定義する。ヒント対象ごとに段階を順序付け、各段階に固有ID、説明文、`completionEvent`を持たせる。プレイヤーがヒントを求めたら、未提示のうち最も低い段階を提示し、その段階のEventでIDを`usedHints`へ記録する。最終段階には解答に近い内容を置ける。

## 4. 会話データ

例：

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
    },
    "node_002": {
      "speaker": "player",
      "text": "何か、その前に変わったことはありませんでしたか？",
      "choices": [
        {
          "text": "メールについて聞く",
          "next": "node_003"
        },
        {
          "text": "SNSについて聞く",
          "next": "node_004"
        }
      ]
    }
  }
}
```

会話終了後のState変更はEvent / Effectで表現する。

## 5. 証拠

事件001の例：

- 彩花のスマートフォン
- 不審なメール
- SNSログ
- NexHost回答
- ISP回答
- 相沢の端末

証拠そのものと、そこから得られる判明事項を分離する。

## 6. ログ

概念例：

```json
{
  "id": "log_mail_header",
  "rows": [
    {
      "id": "row_001",
      "text": "Received: from 198.51.100.5",
      "completionEvent": "event_inspect_mail_header"
    }
  ]
}
```

ログ行を選択した結果はEffectで表現する。

## 7. 判明事項

例：

```json
{
  "id": "fact_phishing_site",
  "name": "フィッシングサイトの存在",
  "description": "SNSのログイン画面を模したフィッシングサイトが使用されていたことが判明した。"
}
```

判明事項は次のConditionに利用できる。

## 8. 捜査Action

例：

```json
{
  "id": "action_inquiry_nexhost",
  "name": "NexHostへ照会する",
  "requires": [
    {
      "type": "fact",
      "target": "fact_phishing_site",
      "operator": "exists"
    }
  ],
  "completionEvent": "event_inquiry_nexhost"
}
```

## 9. Event

例：

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

## 10. Condition

基本例：

```json
{
  "type": "evidence",
  "target": "ev_ayaka_smartphone",
  "operator": "exists"
}
```

判明事項：

```json
{
  "type": "fact",
  "target": "fact_phishing_site",
  "operator": "exists"
}
```

葉Conditionは証拠、ログ、判明事項、会話、Action、Eventの存在または完了を判定する。複合条件は`and`、`or`、`not`で表す。形式・空配列・エラー規則はゲームエンジン仕様の「ConditionとEffectの確定仕様」に従う。

## 11. Effect

確定した基本処理：

```text
add
remove
set
complete
start
```

EffectはEventだけが保持し、配列順に実行する。`add`は集合への重複しない追加、`remove`は未登録でも成功する削除、`set`は許可済みスカラー値の置換、`complete`は対象進行の完了化、`start`は会話またはActionの開始化である。同じ操作の再適用は状態を変えない。Event成功と完了記録を同一トランザクションにし、二重要求ではEffectを再実行しない。詳細はゲームエンジン仕様を参照する。

## 12. 「!」と南京錠

「!」は可能な限りStateから導出する。

南京錠はCondition未達またはGMロックを表す。実行可否はサーバーでも検証する。

## 13. プレイヤー状態

```json
{
  "playerId": "player_001",
  "caseId": "case001",
  "evidence": [],
  "logs": [],
  "facts": [],
  "completedConversations": [],
  "completedActions": [],
  "completedEvents": [],
  "startedConversations": [],
  "startedActions": [],
  "usedHints": [],
  "cleared": false
}
```

## 14. GM状態

```json
{
  "caseId": "case001",
  "globalPause": false,
  "currentStage": "stage_03",
  "announcements": [],
  "actionOverrides": [
    { "playerId": "player_001", "actionId": "action_inquiry_nexhost", "value": "lock" }
  ]
}
```

PlayerStateには証拠、ログ、判明事項、会話・Action・Event進行、ヒント利用、クリア状態を保存する。GMStateは事件全体で1つとし、`currentStage`と全体アナウンスを保持する。有効なGM制御セッション中だけ`globalPause`と個別Player / Action単位の`lock` / `unlock` / `none`上書きを有効にする。これらは一時制御であり、GM制御セッション終了時に解除し、次回へ持ち越さない。

有効なGM制御セッションとは、roleが`gm`の認証済みサーバーセッションがログアウトまたは失効していない状態を指す。セッションがない場合はAction上書きと`globalPause`を適用せず、Conditionだけで判定する。有効なセッション中は`globalPause` → 個別Lock → 個別Unlock → Conditionの順で決める。GM LockはCondition成立後も拒否し、GM UnlockはCondition未達でも許可する。ただし認証と対象妥当性の検証は常に必要。セッション終了時に一時制御を解除する。

## 15. ID

データ間の参照には表示名ではなく安定したIDを使う。

例：

```text
character: ayaka
evidence: ev_ayaka_smartphone
fact: fact_phishing_site
action: action_inquiry_nexhost
event: event_ayaka_first_interview
conversation: conv_ayaka_first
```

## 16. 事件001

シナリオデータに移す内容：

- 藤崎 彩花
- 黒田 恒一
- 相沢 拓海
- 和泉 理子
- 陣内 誠一郎
- 麻野 優子
- Chip
- Mailia
- Lunet
- NexHost
- BrightNet
- IPアドレス
- メールアドレス
- 時系列
- フィッシングサイト
- SNSログ
- ホスティングログ
- ISP照会結果
- 相沢の端末証拠
- 会話
- 捜査ルート
- 判明事項
- ヒント

これらをエンジンへ直接埋め込まない。

## 17. データ関係

```text
会話
 ↓
証拠
 ↓
証拠調査
 ↓
ログ
 ↓
ログ行
 ↓
判明事項
 ↓
Condition
 ↓
捜査Action
 ↓
新しい証拠
 ↓
新しい判明事項
```

## 18. 事件001の基本ルート

```text
彩花への聞き込み
 ↓
彩花のスマートフォン
 ↓
スマートフォンデータ調査
 ↓
不審なメール・フィッシングサイト
 ↓
SNSログ
 ↓
不審なログイン
 ↓
Tor出口IP
 ↓
彩花へ再聞き込み
 ↓
フィッシングメール
 ↓
Mailiaへの照会
 ↓
偽名アカウント
 ↓
フィッシングサイト
 ↓
NexHostへの照会
 ↓
アクセスログ
 ↓
相沢の自宅IP
 ↓
BrightNetへの照会
 ↓
契約者
 ↓
相沢を特定
 ↓
人間関係・動機
 ↓
必要に応じて和泉へ聞き込み
 ↓
捜索・差押え
 ↓
相沢の端末解析
 ↓
決定的証拠
 ↓
相沢を追及
 ↓
相沢が自白
 ↓
クリア
```

実装ではこのルートを手続きとしてハードコードせず、Condition / Effect / Event / Actionの組み合わせで表現する。

## 19. 設計原則

1. 事件固有の内容をTypeScriptへハードコードしない
2. シナリオデータからエンジンを制御する
3. 証拠と判明事項を分離する
4. ログとログ行を分離する
5. 会話と会話終了後のEffectを分離する
6. 利用可能状態はStateとConditionから導出する
7. GMロックは通常のConditionと分離する
8. IDによる参照を基本とする
9. Case 002以降でも同じデータ構造を利用できるようにする
10. 将来的なシナリオエディタから扱える構造を目指す

## 20. Event起動と権限

会話、Action、ログ行、ヒント段階は`completionEvent`にEvent IDを1つ指定し、Effect配列を持たない。Eventは`trigger: { type, target }`で起動元を特定し、`effects`だけを状態変更の正式な定義とする。起動元側のEvent IDとEvent側のtriggerは一対一で一致させ、シナリオ読込時に検証する。ヒント段階Eventは`usedHints`へその段階IDを追加する。EventはPlayerState単位で一度だけ成功し、Effectsと完了記録を同一トランザクションで確定する。

サーバーのセッションroleは`player` / `gm`。Playerは自分のStateだけを操作でき、GM操作は事前発行されたGMアカウントだけが実行できる。サーバーはクライアント要求ごとに認証role、対象player、操作対象ID、Condition、GMState上書きを検証する。認証・Cookieの具体案と利用可否の優先順位はアーキテクチャ仕様を参照する。

## 21. 事件001の予約済みIP

事件内の全IPはRFC 5737の文書・演習用予約範囲（`192.0.2.0/24`、`198.51.100.0/24`、`203.0.113.0/24`）から割り当てる。実在サービスや実ネットワークとの通信、照会、スキャンには使用しない。既存値は次のように変更した：

| 旧IP | 新IP | 用途 |
| --- | --- | --- |
| `122.211.23.45` | `192.0.2.10` | 彩花の自宅回線 |
| `36.240.55.1` | `192.0.2.20` | 黒田のスマートフォン |
| `61.211.192.54` | `192.0.2.30` | 相沢の自宅回線 |
| `203.0.11.45` | `203.0.113.45` | フィッシングサイト |
| `23.191.200.90` | `198.51.100.90` | Tor出口ノードの演習用表記 |
| `13.107.128.5` | `198.51.100.5` | 相沢側メールサーバー |
| `182.22.28.10` | `192.0.2.40` | 藤崎彩花側メールサーバー |

ログ、本文、時系列、IPと主体の関係は維持し、アドレス表記だけを置き換えた。予約範囲のIPを実際のTor出口ノードと誤認しないよう、すべてフィクション上の演習データとして扱う。

