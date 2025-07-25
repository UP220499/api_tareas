const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Simulamos una base de datos en memoria
let tareas = [];
let nextId = 1;

// Validaciones
const validarTarea = [
    body('titulo').trim().notEmpty().withMessage('El título es requerido'),
    body('descripcion').trim().notEmpty().withMessage('La descripción es requerida'),
    body('estado').optional().isIn(['todo', 'progress', 'review', 'done'])
        .withMessage('Estado inválido'),
    body('prioridad').optional().isIn(['alta', 'media', 'baja'])
        .withMessage('Prioridad inválida'),
    body('fechaVencimiento').optional().isISO8601().withMessage('Formato de fecha inválido'),
    body('subtareas').optional().isArray().withMessage('Formato de subtareas inválido'),
    body('subtareas.*.texto').optional().isString().withMessage('Texto de subtarea inválido'),
    body('subtareas.*.completada').optional().isBoolean().withMessage('Estado de subtarea inválido')
];

// Obtener todas las tareas
router.get('/', (req, res) => {
    res.json(tareas);
});

// Crear una nueva tarea
router.post('/', validarTarea, (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        return res.status(400).json({ errores: errores.array() });
    }

    const nuevaTarea = {
        id: nextId++,
        titulo: req.body.titulo,
        descripcion: req.body.descripcion,
        estado: req.body.estado || 'todo',
        prioridad: req.body.prioridad || 'media',
        fechaVencimiento: req.body.fechaVencimiento,
        fechaCreacion: new Date(),
        subtareas: req.body.subtareas || []
    };

    tareas.push(nuevaTarea);
    res.status(201).json(nuevaTarea);
});

// Actualizar estado de una tarea
router.patch('/:id', [
    body('estado').isIn(['todo', 'progress', 'review', 'done'])
        .withMessage('Estado inválido')
], (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        return res.status(400).json({ errores: errores.array() });
    }

    const id = parseInt(req.params.id);
    const tareaIndex = tareas.findIndex(t => t.id === id);

    if (tareaIndex === -1) {
        return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    tareas[tareaIndex] = {
        ...tareas[tareaIndex],
        estado: req.body.estado
    };

    res.json(tareas[tareaIndex]);
});

// Actualizar una tarea completa
router.put('/:id', validarTarea, (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        return res.status(400).json({ errores: errores.array() });
    }

    const id = parseInt(req.params.id);
    const tareaIndex = tareas.findIndex(t => t.id === id);

    if (tareaIndex === -1) {
        return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    tareas[tareaIndex] = {
        ...tareas[tareaIndex],
        ...req.body,
        id: id // Mantenemos el ID original
    };

    res.json(tareas[tareaIndex]);
});

// Eliminar una tarea
router.delete('/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const tareaIndex = tareas.findIndex(t => t.id === id);

    if (tareaIndex === -1) {
        return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    tareas.splice(tareaIndex, 1);
    res.status(204).send();
});

module.exports = { tareasRouter: router };
