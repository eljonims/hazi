class Hazi {
        constructor() {
                this.bla = { // traducciones al idioma base de textos de interfaz, mensajes ...

                };
        }
        t(clave){
                return this.bla[clave] || clave;
        }
        lanzar() { }
        notificarActualizacion(reg) {
                const aviso = document.createElement('div');
                aviso.className = 'aviso-actualizacion-neon';
                aviso.innerHTML = ` <p>¡Nueva versión lista!</p>
                                <button id="btn-actualizar-hazi">ACTUALIZAR</button>
                `;
                document.body.appendChild(aviso);

                document.getElementById('btn-actualizar-hazi').addEventListener('click', () => {
                        // Ordenamos al SW que se active ya
                        if (reg.waiting) {
                                reg.waiting.postMessage('SKIP_WAITING');
                        }
                        // Recargamos la pagina para ver los cambios
                        window.location.reload();
                });
        }
}

// --- REGISTRO DEL VIGILANTE (PWA) ---

if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js').then(reg => {
                        // Vigilamos si hay un SW esperando (una version nueva ya descargada)
                        reg.addEventListener('updatefound', () => {
                                const newWorker = reg.installing;
                                newWorker.addEventListener('statechange', () => {
                                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                                // Lanzamos aviso visual al usuario
                                                window.appHazi.notificarActualizacion(reg);
                                        }
                                });
                        });
                });
        });
}

window.appHazi = new Hazi();
window.appHazi.lanzar();