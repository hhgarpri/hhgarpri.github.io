document.addEventListener("DOMContentLoaded", () => {
    const tiempoTotalSegundos = 50 * 60; // 50 minutos
    const cronometroElemento = document.getElementById("cronometro");

    function iniciarCronometro() {
        let inicio = parseInt(localStorage.getItem("inicioCronometro"), 10);
        const ahora = Date.now();

        if (!inicio) {
            inicio = ahora;
            localStorage.setItem("inicioCronometro", inicio);
        }

        function actualizarCronometro() {
            const tiempoPasado = Math.floor((Date.now() - inicio) / 1000);
            const tiempoRestante = Math.max(0, tiempoTotalSegundos - tiempoPasado);

            const horas = String(Math.floor(tiempoRestante / 3600)).padStart(2, '0');
            const minutos = String(Math.floor((tiempoRestante % 3600) / 60)).padStart(2, '0');
            const segundos = String(tiempoRestante % 60).padStart(2, '0');

            cronometroElemento.textContent = `Tiempo Restante: ${horas}:${minutos}:${segundos}`;

            if (tiempoRestante > 0) {
                setTimeout(actualizarCronometro, 1000);
            } else {
                cronometroElemento.textContent = "⏰ Tiempo finalizado";

                // Aquí llamamos a generatePDF automáticamente cuando llegue a cero
                if (typeof generatePDF === "function") {
                    generatePDF();
                } else {
                    // Si la función no está definida todavía, disparar el click en el botón submit-button
                    const btn = document.querySelector('.submit-button');
                    if (btn) btn.click();
                }
            }
        }

        actualizarCronometro();
    }

    document.getElementById('btn-reiniciar').addEventListener('click', () => {
        localStorage.removeItem("inicioCronometro");

        // También puedes limpiar otras claves usadas para guardar inputs, textareas y checkboxes
        // Por ejemplo, si quieres limpiar todo el localStorage:
        localStorage.clear();

        // Recarga la página para iniciar desde cero
        location.reload();
    });


    // Iniciar cronómetro
    iniciarCronometro();

    // --- Código para textareas, inputs y checkboxes ---
    const textareas = document.querySelectorAll("textarea");
    textareas.forEach((textarea, index) => {
        const id = textarea.id || `textarea_${index}`;
        const saved = localStorage.getItem(id);
        if (saved !== null) textarea.value = saved;

        textarea.addEventListener("input", () => {
            localStorage.setItem(id, textarea.value);
        });
    });

    const inputs = document.querySelectorAll("input[type='text']");
    inputs.forEach((input, index) => {
        const id = input.id || `input_${index}`;
        const saved = localStorage.getItem(id);
        if (saved !== null) input.value = saved;

        input.addEventListener("input", () => {
            localStorage.setItem(id, input.value);
        });
    });

    const checkboxes = document.querySelectorAll("input[type='checkbox']");
    checkboxes.forEach((checkbox, index) => {
        const key = `checkbox_${checkbox.name}_${checkbox.value}`;
        const saved = localStorage.getItem(key);

        if (saved !== null) {
            checkbox.checked = saved === "true";
        }

        checkbox.addEventListener("change", () => {
            localStorage.setItem(key, checkbox.checked.toString());
        });
    });
});
