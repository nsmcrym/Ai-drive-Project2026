import { json, Router } from 'express';
import { handleTodoError } from '../todoController';
import { create, list, remove, update } from './todoController';
import { priorities } from './todoModel';

export const todoPageRouterV2 = Router();
todoPageRouterV2.get('/', (_req, res) => {
    res.render('todo/v2/index', { priorities });
});

export const todoRouterV2 = Router();
todoRouterV2.get('/', list);
todoRouterV2.post('/', json(), create);
todoRouterV2.patch('/:id', json(), update);
todoRouterV2.delete('/:id', remove);
todoRouterV2.use(handleTodoError);
