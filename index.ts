import express, { Request, Response } from 'express';
import path from 'path';
import { pool } from './db';
import { todoPageRouter, todoRouter } from './src/apps/todo/todoRouter';
import { todoPageRouterV2, todoRouterV2 } from './src/apps/todo/v2/todoRouter';


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

// ------------------------------
// 新規登録機能の追加
// ------------------------------


// 1. 新規登録フォーム画面の表示
app.get('/db-sample/new', (_req, res) => {
    res.render('db-new.ejs');
});


// 2. 新規登録データの受け取りとデータベースへの保存
app.post('/db-sample', async (req, res) => {
    const { name, price } = req.body;
    try {
        // 1. 現在の最大のidを取得し、次のID（最大値 + 1）を計算する
        const maxIdResult = await pool.query('SELECT MAX(id) as max_id FROM products');
        // テーブルが空（データが0件）の場合は 0 になるため、+1 して 1 からスタートする
        const newId = (maxIdResult.rows[0].max_id || 0) + 1;


        // 2. 採番したidを含めてデータベースに挿入する
        await pool.query(
            'INSERT INTO products (id, name, price) VALUES ($1, $2, $3)',
            [newId, name, price]
        );

        res.redirect('/db-sample'); // 登録後は一覧画面へリダイレクト
    } catch (error) {
        console.error('商品の登録に失敗しました', error);
        res.status(500).send('商品の登録に失敗しました');
    }
});


// ------------------------------
// 削除機能の追加
// ------------------------------


// 3. 指定したIDのデータを削除
app.post('/db-sample/:id/delete', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM products WHERE id = $1', [id]);
        res.redirect('/db-sample'); // 削除後は一覧画面へリダイレクト
    } catch (error) {
        console.error('商品の削除に失敗しました', error);
        res.status(500).send('商品の削除に失敗しました');
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


app.use('/todo', todoPageRouter);
app.use('/api/v1/todos', todoRouter);
app.use('/todo-v2', todoPageRouterV2);
app.use('/api/v2/todos', todoRouterV2);

if (require.main === module) {
    app.listen(port, (): void => {
        console.log(`Server started: http://localhost:${port}`);
    });
}

export default app;
