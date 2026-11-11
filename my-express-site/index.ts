import express, { Request, Response } from 'express';
import path from 'path';


const app = express(); // Expressアプリケーションを作成
const port: number = 3000; // ローカルで使用するポート番号


// ------------------------------
// Expressの基本設定
// ------------------------------
app.use(express.urlencoded({ extended: true })); // フォームから送信されたデータを受け取れるようにする
app.use(express.static(path.join(process.cwd(), 'public'))); // CSSや画像などの静的ファイルを公開する
app.engine('ejs', require('ejs').renderFile); // Vercel が EJS を依存関係として検出できるようにする
app.set('view engine', 'ejs'); // テンプレートエンジンにEJSを設定
app.set('views', path.join(process.cwd(), 'views')); // EJSファイルを保存するフォルダーを指定


// ------------------------------
// ルーティング
// ------------------------------


// 「/」にアクセスされたときの処理
app.get('/', (req: Request, res: Response): void => {
    res.render('index');
});



// ------------------------------
// サーバー起動
// ------------------------------


if (require.main === module) {
    app.listen(port, (): void => {
        console.log(`Server started: http://localhost:${port}`);
    });
}

export default app;
