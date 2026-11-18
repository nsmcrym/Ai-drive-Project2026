import express, { Request, Response } from 'express';
import path from 'path';
import { pool } from './db';


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

type Product = { id: number; name: string; price: number };

app.get('/db-sample', async (_req, res) => {
    try {
        const result = await pool.query<Product>(
            'SELECT id, name, price FROM products ORDER BY id'
        );
        res.render('db-sample', { products: result.rows });
    } catch (error) {
        console.error('商品一覧の取得に失敗しました', error);
        res.status(503).send('商品一覧を表示できません');
    }
});


app.get('/api/db-check', async (_req, res) => {
    try {
        const result = await pool.query('SELECT 1 AS connection_test');
        res.json({
            status: 'ok',
            database: result.rows[0].connection_test === 1 ? 'connected' : 'error',
        });
    } catch (error) {
        console.error('DB接続確認に失敗しました', error);
        res.status(503).json({ status: 'error', database: 'unavailable' });
    }
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
