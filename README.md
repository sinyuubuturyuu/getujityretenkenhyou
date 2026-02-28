# 月次タイヤ点検表

## アイコン生成

PWA用アイコンは次のコマンドで生成します。

```bash
npm run gen:icons
```

デフォルト入力画像は `./assets/tire.png` です。別画像を使う場合:

```bash
npm run gen:icons -- ./path/to/tire-image.png
```

出力先:

- `public/icons/icon-1024.png`
- `public/icons/icon-512.png`
- `public/icons/icon-192.png`
