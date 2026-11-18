import express, { Router } from 'express';
import { create, handleTodoError, list, remove, setCompleted } from './todoController';

export const todoPageRouter = Router();
todoPageRouter.get('/', (_req, res) => {
    res.render('todo/index');
});

export const todoRouter = Router();
todoRouter.use(express.json());
todoRouter.get('/', list);
todoRouter.post('/', create);
todoRouter.patch('/:id', setCompleted);
todoRouter.delete('/:id', remove);
todoRouter.use(handleTodoError);
