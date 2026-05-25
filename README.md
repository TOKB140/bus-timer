# 荻60 バスタイマー

関東バス 荻60系統（宮前三丁目経由）の「春日神社 ↔ 荻窪駅」を、スマホで開くだけで「次のバスまであと何分」がわかる個人用PWAアプリ。

## 機能

- ① 次のバス（大きく表示・残り3分以下で警告色）
- ② 2本目 / ③ 3本目（小さく表示）
- 朝 5:00〜13:00 は自宅→駅、それ以外は駅→自宅に **自動切替**（手動切替も可）
- 平日 / 土曜 / 日祝 を日付から自動判定（祝日リストはJSONに同梱）
- オフライン動作（PWA）

## ⚠️ 重要：時刻表データの差し替え

[timetable.json](timetable.json) に入っているのは **架空のサンプル値** です。実用前に必ず公式時刻表に差し替えてください。

### 差し替え方法

1. 関東バス公式の時刻表を確認（公式アプリ／公式サイトの「関東バスナビ」）
   - 春日神社 停留所（荻窪駅方面）
   - 荻窪駅南口 のりば（宮前三丁目方面）
2. 各方向について、**平日 / 土曜 / 日祝** の発車時刻をすべて拾う
3. [timetable.json](timetable.json) の `directions.home_to_station` / `directions.station_to_home` の3つの配列を上書き
4. `_revisedDate` に改正日（例: `"2025-10-01"`）を記入
5. アプリで「再読み込み」ボタンを押す（または開き直す）

> サンプルからの差し替えが面倒なら、公式時刻表のスクショ／PDFを送ってもらえれば僕（Claude）の方でJSON化します。

### 祝日リスト

`holidays` 配列に2026〜2027年初の祝日を入れています。年が変わったらここに翌年分を追記してください（春分・秋分・振替休日があるので機械判定より列挙が確実）。

## ローカルで動作確認する

`file://` で開くとPWAのservice workerが動かないので、簡易HTTPサーバーを立てます。

```powershell
cd C:\Users\oerir\bus-timer
python -m http.server 8000
```

ブラウザで `http://localhost:8000/` を開く。

## スマホで使う（PCで動作したら）

### 同じWi-Fi内で見る方式（一番簡単）

1. PCのIPアドレスを調べる（PowerShell: `ipconfig` → `IPv4 アドレス`、例 `192.168.1.10`）
2. PCで `python -m http.server 8000` を起動
3. スマホのブラウザで `http://192.168.1.10:8000/` を開く
4. iPhoneは Safari の共有 → 「ホーム画面に追加」、Androidは Chrome のメニュー → 「ホーム画面に追加」
5. ※PCが起動中＆同じWi-Fi内でしか開けません

### どこからでも使いたい場合（GitHub Pages）

1. GitHubにリポジトリを作って `bus-timer/` の中身を push
2. リポジトリの Settings → Pages → main ブランチを公開
3. 払い出されたURLをスマホで開いてホーム画面に追加
4. URLは推測しにくいので実質非公開になりますが、心配ならprivate repo + Cloudflare Pages なども選択肢

## ファイル構成

```
bus-timer/
├─ index.html          画面構造
├─ style.css           スタイル（ダークテーマ）
├─ app.js              次のバス計算・自動切替ロジック
├─ timetable.json      時刻表データ（差し替え対象）
├─ manifest.json       PWA設定
├─ service-worker.js   オフラインキャッシュ
└─ icons/              ホーム画面アイコン
```

## カスタマイズしたい時のヒント

- **方向の自動切替の境目を変える**: [app.js](app.js) の `autoDirection` 関数（`hour >= 5 && hour < 13` の部分）
- **警告色になる残り分数を変える**: [app.js](app.js) の `if (m1 <= 3)` の数字
- **2本目・3本目だけでなく4〜5本目も出したい**: [index.html](index.html) に `.row` をコピペし、[app.js](app.js) の `getUpcoming(now, dir, 3)` の `3` を増やす
- **色を変えたい**: [style.css](style.css) 冒頭の `:root` 内のカラー変数
