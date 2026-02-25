class Hazi {
        constructor() {
                this.bla = { // desvincula el texto literal en el html. se recupera con el método this.t(clave) 
                        'Iniciando-app': "iniciando sistema.",
                        'abriendo-bd': "conectando con base de datos",
                        'critico': 'Error crítico',
                        "error-db": "base de datos inaccesible.",
                        'descargando-catalogo': "descargando catálogo de categorías",
                        'error-catalogo': 'catálogo no encontrado ',
                        "carga-finalizada": "listo.",
                        'btn-iniciar-partida': "Iniciar partida",
                        'nvl-1' : 'Básico',
                        "nvl-2" : "Medio",
                        "nvl-3" : 'Experto',
                        'btn-comenzar': 'comenzar',
                };
                this.bd = null;
                this.temasActivos = [];
        }
        t(clave) {
                return this.bla[clave] || clave;
        }
        lanzar() { }
        establecerEventos() {
                document.addEventListener('click', (evento) => {//Delegación de eventos al click
                        const objetivo = evento.target.closest('[data-action]');
                        if (!objetivo) return; // click sobre otra cosa distinta de un elemento de accion

                        // Extraemos el data-action e id (si la acción requiere discernir entre varios candidatos)
                        const action = objetivo.dataset.action;
                        const id = objetivo.dataset.id || null; // porsiaca

                        // El Cerebro que decide según la acción
                        switch (action) {
                                default:
                                        console.warn(`data-action="${action}" no contemplado en la delegación`)

                        }
                });

        }
        notificarActualizacion(reg) {
                const aviso = document.createElement('div');
                aviso.className = 'aviso-actualizacion-neon';
                aviso.innerHTML = ` <p>${"disponible-actualizar"}</p>
                                <button id="btn-actualizar-hazi">${this.t("actualizar-ahora")}</button>
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
        bitacora(mensaje, porcentaje) {
                const display = document.getElementById('bitacora-display');
                const barra = document.getElementById('bitacora-barra-interior');
                if (display) {
                        const linea = document.createElement('div');
                        linea.className = 'bitacora-mensaje';
                        linea.innerHTML = `<span class="bitacora-display-prompt">&gt;</span> ${mensaje}`;
                        display.appendChild(linea);
                        display.scrollTop = display.scrollHeight;
                }
                if (barra && porcentaje !== undefined) barra.style.width = `${porcentaje}%`;
        }
        esperar(ms) {
                return new Promise(res => setTimeout(res, ms));
        }
        async iniciarApp(urlCatalogo) {
                // 1. Iniciamos la bitácora con el nombre del motor
                this.bitacora(`<b>Hazi</b>: ${this.t('Iniciando-app')}`, 10);
                await this.esperar(500)
                try {
                        // -A: tareas de inicio

                        this.bitacora(`${this.t('abriendo-bd')} ...`, 30);
                        await this.abrirBaseDatos();
                        await this.esperar(2000);


                        this.bitacora(`${this.t('descargando-catalogo')} ...`, 50);
                        const [respuesta] = await Promise.all( [fetch(urlCatalogo),  this.esperar(1500)]);
                        if (!respuesta.ok) throw new Error(`${this.t('critico')}: ${this.t('error-catalogo')}`);
                        const catalogo = await respuesta.json();


                        // -B: llenado de barra y mensaje listo

                        this.bitacora(`${this.t('carga-finalizada')}`, 100);
                        await this.esperar(400);

                        // -C: transición de desvanecimiento de la capa de carga hacia la app

                        const bitacora = document.getElementById('capa-bitacora');
                        const principal = document.getElementById('capa-principal');

                        const transicionar = (e) => {
                                if (!bitacora.parentNode || !e.target === e.currentTarget) return;
                                bitacora.remove();
                                principal.classList.remove('oculto');
                                this.establecerEventos();
                                this.mostrarConfiguracionPartida(catalogo);

                        };
                        bitacora.addEventListener('transitionend', transicionar, { once: true });
                        bitacora.style.opacity = 0; //dispara la transición

                        const tiempoMaximoDeTransicion = () => {
                                const estilos = window.getComputedStyle(bitacora);
                                const duraciones = estilos.transitionDuration.split(',').map(s => parseFloat(s) * 1000);
                                const delays = estilos.transitionDelay.split(',').map(s => parseFloat(s) * 1000);
                                const tiemposTotales = duraciones.map((dur, i) => dur + (delays[i] || 0));

                                return Math.max(...tiemposTotales);
                        };
                        setTimeout(transicionar, tiempoMaximoDeTransicion() + 100); //seguro por si el css no tiene transición


                } catch (error) {
                        this.bitacora(`${this.t('critico')}: ${error.message || error}`, 100);
                }
        }
        abrirBaseDatos() {
                return new Promise((resolver, rechazar) => {
                        // Abrimos la base de datos (Versión 1)
                        const peticion = indexedDB.open("hazi_DB", 1);

                        // Solo ocurre la primera vez: Definimos el diseño de los compartimentos
                        peticion.onupgradeneeded = (e) => {
                                const bd = e.target.result;

                                if (!bd.objectStoreNames.contains("records")) {
                                        bd.createObjectStore("records", { keyPath: "id" });
                                }
                                if (!bd.objectStoreNames.contains("lexico")) {
                                        bd.createObjectStore("lexico", { keyPath: "id" });
                                }
                                if (!bd.objectStoreNames.contains("ajustes")) {
                                        bd.createObjectStore("ajustes", { keyPath: "id" });
                                }
                        };

                        peticion.onsuccess = (e) => {
                                this.bd = e.target.result;
                                resolver();
                        };

                        peticion.onerror = () => rechazar(`${this.t('critico')}: ${this.t("error-bd")}`);
                });
        }
        mostrarConfiguracionPartida(catalogo){
                const cuerpo = document.getElementById('capa-principal');
                cuerpo.innerHTML = "";
                const titulo = '<div class="titulo-app">Hazi</div>';
                const menu = '<div class="menu" data-action="abrir-menu">☰</div>'
                const comenzar = `<button class="comenzar" data-action="comenzar-partida">${this.t('btn-comenzar')}</button>`;
                const dificultades = `
                        <div class="dificultad">
                                <button class="nivel seleccionado" data-action="cambiar-dificultad" data-id="1">
                                        <span class="icono">🌱</span>
                                        <span class="texto">${this.t('nvl-1')}</span>
                                </button>
                                <button class="nivel" data-action="cambiar-dificultad" data-id="2">
                                        <span class="icono">🌿</span>
                                        <span class="texto">${this.t('nvl-2')}</span>
                                </button>
                                <button class="nivel" data-action="cambiar-dificultad" data-id="3">
                                        <span class="icono">🌳</span>
                                        <span class="texto">${this.t('nvl-3')}</span>
                                </button>
                        </div>
                `;

                let temario = '<div class="temario">';
                this.temasActivos = [];
                catalogo.forEach( tema => {
                        temario += `
                        <div    class="tema marcado"  data-action="seleccionar-tema" data-id="${tema.id}">
                                <span class="titulo">${tema.titulo}</span>
                                <span class="icono">🌱</span>
                        </div>`;
                        this.temasActivos.push(tema.id);
                });
                temario += '</div>';
                cuerpo.innerHTML = titulo + menu + temario + dificultades + comenzar;


        }

}

// --- REGISTRO DEL SERVICE WORKER (VIGILANTE) (PWA) ---
/*
        El navegador tiene una regla de hierro para las PWA: el archivo sw.js es el único que nunca 
        se fía de la caché al 100%. Funcionamiento técnico de esa "vigilancia":
1.              La comprobación de 24 horas (o cada apertura)
        Aunque La estrategia sea Cache First o Stale-While-Revalidate, 
        el navegador realiza una petición HTTP especial para el archivo sw.js:
        Al abrir la App: Cada vez que el usuario lanza HAZI, el navegador pregunta al servidor: 
        "¿Ha cambiado el sw.js?".
        En segundo plano: Si el usuario deja la App abierta mucho tiempo, el navegador lo comprueba 
        automáticamente cada 24 horas.
2.              Comparación byte a bit
        El navegador descarga el sw.js nuevo y lo compara con el que tiene instalado:
        Si son idénticos: No hace nada. El vigilante actual sigue al mando.
        Si hay un solo carácter diferente (por ejemplo, cambia v1 por v2): Se dispara 
        el evento updatefound.
3.              El proceso de "Instalación en la sombra"
        Cuando detecta el cambio, sucede lo siguiente:
        - El nuevo sw.js se descarga y se ejecuta el evento install.
        - Se queda en espera (waiting): No mata al vigilante viejo mientras el usuario 
          está jugando para no romper la partida.

El navegador es extremadamente desconfiado con este archivo. No se fía de la fecha ni de un 
hash enviado por el servidor: lo descarga por completo y lo compara byte a byte.
Proceso exacto que sigue el navegador cada vez que se abre HAZI:
1. La Descarga Silenciosa
Cuando se entra en la App, el navegador lanza una petición HTTP especial para el 
archivo sw.js (el nombre puede ser otro, pero obligatoriamente debe estar en la raiz del proyecto). 
Esta petición se salta la caché normal del navegador para ir directa a la fuente (github, por ejemplo).
2. Comparación Binaria (Byte a Byte)
Una vez descargado en una zona temporal de la memoria:
El navegador pone el sw.js viejo (el que está funcionando ahora) al lado del nuevo que acaba de bajar.
Los compara carácter a carácter.
Si son idénticos: Borra el nuevo y el vigilante viejo sigue patrullando como si nada. No pasa nada.
Si hay un solo cambio: (Incluso un espacio en blanco o un comentario nuevo), el navegador dice: 
" ¡Alerta! Hay un nuevo vigilante".
3. El estado "En Espera" (Waiting)
En ese momento, el navegador instala el nuevo, pero no lo deja entrar. Lo deja en la puerta (waiting).
Aquí es cuando este código detecta el evento updatefound y muestro el cartel neón de: "¡Nueva versión lista!".


Si no existiera el botón de actualizar (es decir, si no se usara skipWaiting()), el Vigilante (Service Worker) 
nuevo se quedaría en una fase de "limbo" técnico llamada Waiting (En espera). 
Esto es lo que sucedería exactamente la próxima vez que el usuario interactúe con HAZI:
1. El escenario de "Cerrar y Abrir"
Si el usuario simplemente minimiza la App o la cierra y la vuelve a abrir rápido, no vería ningún cambio. 
Por qué: El navegador mantiene vivo el Service Worker viejo mientras detecte que hay alguna pestaña o ventana de la App abierta (o en segundo plano).
Consecuencia: El usuario seguiría jugando con la versión antigua, aunque exista el código nuevo en el repositorio fuente. 

2. ¿Cuándo se activaría por fin?
La nueva versión solo tomaría el control cuando se cumpla la "Regla de las Cero Pestañas": 

El usuario debe cerrar todas las pestañas o instancias de la App.
En móviles, a veces hace falta "matar" el proceso de la App (deslizarla hacia arriba en el selector de tareas).
Al abrirla de nuevo tras ese cierre total, el navegador ve que ya no hay nadie al mando,
 descarta al viejo y activa al nuevo vigilante. 

3. El problema del "Refresco Infinito"
Curiosamente, pulsar F5 o refrescar la página no sirve para actualizar el Service Worker por defecto. 
Durante un segundo, mientras la página se refresca, el navegador mantiene ambas instancias en memoria para que la transición no sea brusca.
Como nunca llega a haber "cero clientes", el nuevo vigilante nunca recibe el permiso para entrar. 




El navegador es un coleccionista ordenado, pero no borra por impulsividad. La limpieza de los 
vigilantes (Service Workers) y sus cachés depende totalmente de cómo hayas programado el evento activate.
Aquí tienes las reglas de limpieza del "Averno" de los navegadores:

1. ¿Cuándo se borra el VIGILANTE viejo? (El archivo sw.js o como sea que se llame)

        - SÍ se borra automáticamente: 

        Cuando todas las pestañas de HAZI se han cerrado y el nuevo vigilante toma el mando. 
        El navegador detecta que el viejo ya no tiene "clientes" que proteger y lo fulmina de 
        la memoria.


        - NO se borra: 
        
        Mientras el usuario tenga la App abierta (aunque sea en segundo plano). 
        El viejo sigue vivo "en el corredor de la muerte" hasta que la sesión muere o 
        tú fuerzas el skipWaiting() con tu botón de actualizar.

2. ¿Cuándo se borra la CACHÉ vieja? (La maleta de archivos)

        Aquí es donde la mayoría de desarrolladores fallan. 
        El navegador NO borra la caché vieja por sí solo aunque el vigilante cambie.
        Si cambias de v1 a v2: El navegador guardará AMBAS maletas en el disco duro del usuario.
        El riesgo: Si no programas una limpieza, podrías llenar el móvil del usuario con gigas de versiones antiguas de HAZI.
        La Solución: El "Protocolo de Limpieza" (en sw.js)
        Para que el borrado sea realmente automático, se incluye esta lógica en el evento activate. 
        Es el momento en que el nuevo vigilante dice: "Ahora mando yo, tirad la basura de los anteriores".

 */
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
window.appHazi.iniciarApp("./datos/catalogo.json");