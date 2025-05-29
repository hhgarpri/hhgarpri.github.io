// Deshabilita clic derecho
document.addEventListener('contextmenu', e => e.preventDefault());

// Deshabilita teclas comunes (F12, Ctrl+Shift+I, Ctrl+U)
document.addEventListener('keydown', e => {
    if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key)) ||
        (e.ctrlKey && e.key === 'U')
    ) {
        e.preventDefault();
    }
});

// Bloqueo de Ctrl + C y Ctrl + V
document.addEventListener('keydown', function (e) {
    if (e.ctrlKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        alert("Copiar está deshabilitado.");
    }

    if (e.ctrlKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        alert("Pegar está deshabilitado.");
    }
});

