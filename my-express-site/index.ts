import express, { Request, Response } from 'express';
import path from 'path';


const app = express(); // Expressアプリケーションを作成
const port: number = 3000; // ローカルで使用するポート番号
// npm start は dist/index.js を実行するため、その場合は親フォルダーを使う。
const appDirectory = path.basename(__dirname) === 'dist' ? path.dirname(__dirname) : __dirname;


// ------------------------------
// Expressの基本設定
// ------------------------------
app.use(express.urlencoded({ extended: true })); // フォームから送信されたデータを受け取れるようにする
app.use(express.static(path.join(appDirectory, 'public'))); // CSSや画像などの静的ファイルを公開する
app.engine('ejs', require('ejs').renderFile); // Vercel が EJS を依存関係として検出できるようにする
app.set('view engine', 'ejs'); // テンプレートエンジンにEJSを設定
app.set('views', path.join(appDirectory, 'views')); // EJSファイルを保存するフォルダーを指定


// ------------------------------
// ルーティング
// ------------------------------


// 「/」にアクセスされたときの処理
app.get('/', (req: Request, res: Response): void => {
    res.render('index', {
        title: 'My Express Site',
        message: 'Vercelで公開しました！'
    });
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
