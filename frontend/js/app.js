// Configuración de la API
const API_URL = 'http://localhost:3000';

// Estado de la aplicación
let tareas = [];

// Funciones de LocalStorage
function guardarEnLocalStorage() {
    localStorage.setItem('tareas', JSON.stringify(tareas));
}

function cargarDeLocalStorage() {
    const tareasGuardadas = localStorage.getItem('tareas');
    if (tareasGuardadas) {
        tareas = JSON.parse(tareasGuardadas);
        actualizarTablero();
    }
}

// Funciones de UI
function mostrarFormulario() {
    const form = document.getElementById('formulario');
    form.style.display = 'block';
}

function cerrarFormulario() {
    const form = document.getElementById('formulario');
    form.style.display = 'none';
    document.getElementById('titulo').value = '';
    document.getElementById('descripcion').value = '';
}

async function crearTarea() {
    const titulo = document.getElementById('titulo').value.trim();
    const descripcion = document.getElementById('descripcion').value.trim();
    const prioridad = document.getElementById('prioridad').value;
    const fechaVencimiento = document.getElementById('fechaVencimiento').value;

    if (!titulo || !descripcion) {
        alert('Por favor, completa todos los campos.');
        return;
    }

    const nuevaTarea = {
        titulo,
        descripcion,
        estado: 'todo',
        prioridad,
        fechaVencimiento,
        subtareas: [],
        fechaCreacion: new Date().toISOString()
    };

    try {
        const response = await fetch(`${API_URL}/tareas`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(nuevaTarea)
        });

        if (!response.ok) {
            throw new Error('Error al crear la tarea');
        }

        const tareaCreada = await response.json();
        tareas.push(tareaCreada);
        guardarEnLocalStorage();
        actualizarTablero();
        cerrarFormulario();
    } catch (error) {
        console.error('Error:', error);
        alert('Error al crear la tarea');
    }
}

// Funciones para actualizar el UI
function actualizarTablero() {
    const columnas = {
        todo: document.getElementById('lista-tareas-todo'),
        inprogress: document.getElementById('lista-tareas-inprogress'),
        review: document.getElementById('lista-tareas-review'),
        done: document.getElementById('lista-tareas-done')
    };

    // Limpiar columnas
    Object.values(columnas).forEach(columna => columna.innerHTML = '');

    // Distribuir tareas
    tareas.forEach(tarea => {
        const tarjetaTarea = crearTarjetaTarea(tarea);
        const columnaDestino = tarea.estado === 'progress' ? columnas.inprogress : columnas[tarea.estado];
        if (columnaDestino) {
            columnaDestino.appendChild(tarjetaTarea);
        }
    });
}

function crearTarjetaTarea(tarea) {
    const div = document.createElement('div');
    div.className = 'tarea-card';
    div.dataset.id = tarea.id;
    
    const prioridades = {
        alta: { color: '#EF4444', texto: 'Alta' },
        media: { color: '#F59E0B', texto: 'Media' },
        baja: { color: '#10B981', texto: 'Baja' }
    };

    const fechaVencimiento = tarea.fechaVencimiento ? new Date(tarea.fechaVencimiento).toLocaleDateString() : 'Sin fecha';
    
    div.innerHTML = `
        <div class="tarea-header">
            <h3>${tarea.titulo}</h3>
            <div class="tarea-acciones">
                <button class="btn-editar" onclick="editarTarea(${tarea.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-eliminar" onclick="eliminarTarea(${tarea.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        <p class="tarea-descripcion">${tarea.descripcion}</p>
        <div class="tarea-metadata">
            <span class="tarea-prioridad" style="background-color: ${prioridades[tarea.prioridad]?.color || '#6B7280'}">
                ${prioridades[tarea.prioridad]?.texto || 'Normal'}
            </span>
            <span class="tarea-fecha">
                <i class="fas fa-calendar"></i> ${fechaVencimiento}
            </span>
        </div>
        ${tarea.subtareas && tarea.subtareas.length > 0 ? `
            <div class="tarea-subtareas">
                <h4>Subtareas</h4>
                <ul>
                    ${tarea.subtareas.map(subtarea => `
                        <li>
                            <input type="checkbox" ${subtarea.completada ? 'checked' : ''} 
                                   onchange="toggleSubtarea(${tarea.id}, ${subtarea.id})">
                            <span>${subtarea.texto}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
        ` : ''}
    `;
    return div;
}

// Configurar Drag & Drop con SortableJS
function configurarDragAndDrop() {
    const columnas = document.querySelectorAll('.lista-tareas-columna');
    
    columnas.forEach(columna => {
        new Sortable(columna, {
            group: 'tareas',
            animation: 150,
            ghostClass: 'tarea-fantasma',
            onEnd: async function(evt) {
                const tareaId = evt.item.dataset.id;
                let nuevoEstado = evt.to.id.replace('lista-tareas-', '');
                
                // Convertir 'inprogress' a 'progress' para la API
                if (nuevoEstado === 'inprogress') nuevoEstado = 'progress';

                try {
                    const response = await fetch(`${API_URL}/tareas/${tareaId}`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ estado: nuevoEstado })
                    });

                    if (!response.ok) {
                        throw new Error('Error al actualizar la tarea');
                    }

                    const tareaActualizada = await response.json();
                    tareas = tareas.map(t => t.id === parseInt(tareaId) ? tareaActualizada : t);
                    guardarEnLocalStorage();
                } catch (error) {
                    console.error('Error:', error);
                    alert('Error al actualizar el estado de la tarea');
                    actualizarTablero(); // Revertir cambios visuales
                }
            }
        });
    });
}

// Cargar tareas al iniciar
async function cargarTareas() {
    try {
        // Primero intentamos cargar del localStorage
        cargarDeLocalStorage();

        // Luego intentamos sincronizar con el servidor
        const response = await fetch(`${API_URL}/tareas`);
        if (!response.ok) throw new Error('Error al cargar tareas');
        
        const tareasServidor = await response.json();
        
        // Mezclamos las tareas del servidor con las locales
        if (tareasServidor.length > 0) {
            // Si hay tareas en el servidor, las usamos y actualizamos el localStorage
            tareas = tareasServidor;
            guardarEnLocalStorage();
        } else if (tareas.length > 0) {
            // Si tenemos tareas locales pero el servidor está vacío, 
            // sincronizamos las tareas locales con el servidor
            for (const tarea of tareas) {
                await fetch(`${API_URL}/tareas`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(tarea)
                });
            }
        }
        
        actualizarTablero();
    } catch (error) {
        console.error('Error:', error);
        // Si hay un error con el servidor, al menos mostramos las tareas locales
        cargarDeLocalStorage();
        actualizarTablero();
    }
}

// Variables para el modal
let tareaEditandoId = null;

// Funciones del modal
function mostrarModal(id) {
    const tarea = tareas.find(t => t.id === parseInt(id));
    if (!tarea) return;

    tareaEditandoId = tarea.id;

    // Llenar los campos del modal con los datos de la tarea
    document.getElementById('editTitulo').value = tarea.titulo;
    document.getElementById('editDescripcion').value = tarea.descripcion;
    document.getElementById('editPrioridad').value = tarea.prioridad || 'media';
    document.getElementById('editFechaVencimiento').value = tarea.fechaVencimiento || '';

    // Mostrar el modal
    document.getElementById('modalEditar').style.display = 'flex';
}

function cerrarModal() {
    document.getElementById('modalEditar').style.display = 'none';
    tareaEditandoId = null;
}

// Funciones de edición y eliminación
async function editarTarea(id) {
    mostrarModal(id);
}

async function guardarEdicion() {
    if (!tareaEditandoId) return;

    const nuevaTarea = {
        titulo: document.getElementById('editTitulo').value.trim(),
        descripcion: document.getElementById('editDescripcion').value.trim(),
        prioridad: document.getElementById('editPrioridad').value,
        fechaVencimiento: document.getElementById('editFechaVencimiento').value
    };

    if (!nuevaTarea.titulo || !nuevaTarea.descripcion) {
        alert('Los campos título y descripción son obligatorios');
        return;
    }

    try {
        // Obtener la tarea actual para mantener los campos que no se editan
        const tareaActual = tareas.find(t => t.id === tareaEditandoId);
        
        const response = await fetch(`${API_URL}/tareas/${tareaEditandoId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...tareaActual,
                ...nuevaTarea
            })
        });

        if (!response.ok) throw new Error('Error al actualizar la tarea');

        const tareaActualizada = await response.json();
        tareas = tareas.map(t => t.id === tareaEditandoId ? tareaActualizada : t);
        guardarEnLocalStorage();
        actualizarTablero();
        cerrarModal(); // Cerrar el modal después de guardar
    } catch (error) {
        console.error('Error:', error);
        alert('Error al actualizar la tarea');
    }
}

async function eliminarTarea(id) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta tarea?')) return;

    try {
        const response = await fetch(`${API_URL}/tareas/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Error al eliminar la tarea');

        tareas = tareas.filter(t => t.id !== parseInt(id));
        guardarEnLocalStorage();
        actualizarTablero();
    } catch (error) {
        console.error('Error:', error);
        alert('Error al eliminar la tarea');
    }
}

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => {
    cargarTareas();
    configurarDragAndDrop();

    // Cerrar el modal si se hace clic fuera de él
    document.getElementById('modalEditar').addEventListener('click', function(e) {
        if (e.target === this) {
            cerrarModal();
        }
    });

    // Cerrar el modal con la tecla Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && document.getElementById('modalEditar').style.display === 'flex') {
            cerrarModal();
        }
    });
});

