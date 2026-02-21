class Hazi{
        constructor(){

        }
        lanzar(){}
}

// --- REGISTRO DEL VIGILANTE (PWA) ---

if ('serviceWorker' in navigator) {
    // Usamos el evento 'load' de la ventana para no interferir con la carga crítica
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log("Service Worker HAZI activo en el scope:", reg.scope))
            .catch(err => console.error("Error al registrar Service Worker:", err));
    });
}

window.appHazi = new Hazi();
window.appHazi.lanzar();