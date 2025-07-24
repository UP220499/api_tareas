
function mostrarFormulario() {
    const form = document.getElementById('formulario');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

function crearTarea() {
    const titulo = document.getElementById('titulo').value;
    const descripcion = document.getElementById('descripcion').value;

    if (!titulo || !descripcion) {
        alert('Por favor, completa todos los campos.');
        return;
    }

    const tareaHTML = `<div><h3>${titulo}</h3><p>${descripcion}</p></div>`;
    document.getElementById('lista-tareas').innerHTML += tareaHTML;

    document.getElementById('titulo').value = '';
    document.getElementById('descripcion').value = '';
}
