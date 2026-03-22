class Hazi {
        static VERSION = "1.0.0";
        static #PERFIL_POR_DEFECTO = {
                id: "perfil",
                usuario: { nombre: "invitado" },
                partida: {
                        dificultad: 1, categorias: [], modoPregunta: "img-txt-audio",
                        modoRespuesta: "txt", temas: new Set()
                },
                interfaz: { idioma: "es", sonido: true },
                estado: { tutorialVisto: false, totalPartidas: 0, ultimaConexion: Date.now(), versionApp: Hazi.VERSION }
        };
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
                        'nvl-1': 'Básico',
                        "nvl-2": "Medio",
                        "nvl-3": 'Experto',
                        'btn-comenzar': 'comenzar',
                        'recuperando-perfil': 'recuperando perfil',
                };

                this.perfil = null; //se guarda y se recupera
                this.rt = null; //runtime, datos volátiles de ejecución

                this.bd = null;

        }
        async iniciarApp(urlCatalogo) {

                const esperar = (ms) => new Promise(res => setTimeout(res, ms));
                const abrirBD = () => {
                        return new Promise((resolver, rechazar) => {
                                // Abrimos la base de datos (Versión 1)
                                const peticion = indexedDB.open("hazi_DB", 1);

                                // Solo ocurre la primera vez: Definimos el diseño de los compartimentos
                                peticion.onupgradeneeded = (e) => {
                                        const bd = e.target.result;

                                        ["records", "lexico", "ajustes"].forEach(s => {
                                                if (!bd.objectStoreNames.contains(s))
                                                        bd.createObjectStore(s, { keyPath: "id" });
                                        });

                                        const storeLexico = e.target.transaction.objectStore("lexico");
                                        [
                                                { name: "por_catalogo", path: "cat", multi: true },
                                                { name: "por_maestria", path: "stats.maes", multi: false },
                                                { name: "por_ultimo_acceso", path: "stats.date", multi: false },
                                                { name: "por_rareza", path: "raro", multi: false },
                                                { name: "por_etiqueta", path: "etiq", multi: true },
                                        ].forEach(i => {
                                                if (!storeLexico.indexNames.contains(i.name))
                                                        storeLexico.createIndex(i.name, i.path, { unique: false, multiEntry: i.multi });

                                        });


                                };

                                peticion.onsuccess = (e) => {
                                        resolver(e.target.result);
                                };

                                peticion.onerror = () => rechazar(`${this.t('critico')}: ${this.t("error-bd")}`);
                        });
                };
                // 1. Iniciamos la bitácora con el nombre del motor
                this.bitacora(`<b>Hazi</b>: ${this.t('Iniciando-app')}`, 10);
                await esperar(150);
                try {
                        // -A: tareas de inicio

                        this.bitacora(`${this.t('abriendo-bd')} ...`, 30);
                        const [bd] = await Promise.all([abrirBD(), esperar(300)]);
                        this.bd = bd;

                        this.bitacora(`${this.t('recuperando-perfil')} ...`, 40);
                        const [guardado] = await Promise.all([this.#recuperar("ajustes", "perfil"), esperar(300)]);
                        this.perfil = guardado ?? structuredClone(Hazi.#PERFIL_POR_DEFECTO);
                        this.perfil.estado.ultimaConexion = Date.now();


                        this.bitacora(`${this.t('descargando-catalogo')} ...`, 50);
                        const [respuesta] = await Promise.all([fetch(urlCatalogo), esperar(300)]);
                        if (!respuesta.ok) throw new Error(`${this.t('critico')}: ${this.t('error-catalogo')}`);
                        this.catalogo = await respuesta.json();


                        // -B: llenado de barra y mensaje listo

                        this.bitacora(`${this.t('carga-finalizada')}`, 100);
                        await esperar(500);

                        // -C: transición de desvanecimiento de la capa de carga hacia la app

                        const bitacora = document.getElementById('capa-bitacora');
                        const principal = document.getElementById('capa-principal');

                        const transicionar = (e) => {
                                if (!bitacora.parentNode || !e.target === e.currentTarget) return;
                                bitacora.remove();
                                principal.classList.remove('oculto');
                                this.establecerEventos();
                                this.mostrarConfiguracionPartida();

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
        t(clave) {
                return this.bla[clave] || clave;
        }
        establecerEventos() {
                document.addEventListener('click', (evento) => {//Delegación de eventos al click
                        const target = evento.target.closest('[data-action]');
                        if (!target) return; // click sobre otra cosa distinta de un elemento de accion

                        // Extraemos el data-action e id (si la acción requiere discernir entre varios candidatos)
                        const action = target.dataset.action;
                        const id = target.dataset.id || null; // porsiaca

                        // El Cerebro que decide según la acción
                        switch (action) {
                                case "cambiar-dificultad": {
                                        this.cambiarDificultad(target, Number(id));
                                        break;
                                }
                                case "seleccionar-tema": {
                                        this.seleccionarTema(target, id);
                                        break;
                                }
                                case "comenzar-partida": {
                                        this.comenzarPartida();
                                        break;
                                }
                                case "frenar-ruleta": {
                                        this.#frenarRuleta();
                                        break;
                                }
                                case "cambiar-check": {
                                        console.log("cambiar-check")
                                        evento.preventDefault();
                                        if (target.indeterminate) {
                                                target.checked = true;
                                                target.indeterminate = false;
                                        } else {
                                                target.checked = !target.checked;
                                        }
                                        const container = target.closest('details');
                                        // propagar hacia abaj o
                                        if (container) {
                                                const descendants = container.querySelectorAll('[data-action="cambiar-check"]');
                                                descendants.forEach(child => {
                                                        child.checked = target.checked;
                                                        child.indeterminate = false;
                                                });
                                        }

                                        const propagarHaciaArriba = (elem) => {
                                                const detailsActual = elem.closest('details');
                                                if (!detailsActual) return;

                                                const detailsPadre = detailsActual.parentElement.closest('details');
                                                if (!detailsPadre) return;

                                                const checkPadre = detailsPadre.querySelector(':scope > summary [data-action="cambiar-check"]');
                                                if (!checkPadre) return;

                                                const hijos = Array.from(detailsPadre.querySelectorAll(':scope > .content [data-action="cambiar-check"], :scope > details > summary [data-action="cambiar-check"]'));

                                                const marcados = hijos.filter(h => h.checked).lentgth;
                                                const hayGrises = hijos.some(h => h.indeterminate);
                                                const total = hijos.length;

                                                if (marcados == total) {
                                                        checkPadre.checked = true;
                                                        checkPadre.indeterminate = false;
                                                } else if (marcados === 0 && !hayGrises) {
                                                        checkPadre.checked = false;
                                                        checkPadre.indeterminate = false;
                                                } else {
                                                        checkPadre.checked = false;
                                                        checkPadre.indeterminate = true;
                                                }
                                                propagarHaciaArriba(checkPadre);
                                        };
                                        propagarHaciaArriba(target);
                                        break;
                                }

                                default:
                                        console.warn(`data-action="${action}" no contemplado en la delegación`)

                        }
                });

        }
        cambiarDificultad(elemento, dificultad) {
                this.perfil.partida.dificultad = Number(dificultad); // "1", "2", o "3"
                document.querySelector('.nivel.seleccionado')?.classList.remove('seleccionado');
                elemento.classList.add('seleccionado');
        }
        seleccionarTema(elemento, t) {
                elemento.classList.toggle('seleccionado');
                this.perfil.partida.temas.has(t) ? this.perfil.partida.temas.delete(t) : this.perfil.partida.temas.add(t);
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
        mostrarConfiguracionPartida() {

                //this.perfil.partida.temas.clear();

                const cuerpo = document.getElementById('capa-principal');
                cuerpo.className = "";
                cuerpo.innerHTML = "";
                const titulo = '<div class="titulo-app">Hazi</div>';
                const menu = '<div class="menu" data-action="abrir-menu">☰</div>'
                const comenzar = `<button class="comenzar" data-action="comenzar-partida">${this.t('btn-comenzar')}</button>`;
                const dificultades = `
                        <div class="dificultad">
                                <button class="nivel ${this.perfil.partida.dificultad == 1 ? "seleccionado" : ""}" data-action="cambiar-dificultad" data-id="1">
                                        <span class="icono">🌱</span>
                                        <span class="texto">${this.t('nvl-1')}</span>
                                </button>
                                <button class="nivel ${this.perfil.partida.dificultad == 2 ? "seleccionado" : ""}" data-action="cambiar-dificultad" data-id="2">
                                        <span class="icono">🌿</span>
                                        <span class="texto">${this.t('nvl-2')}</span>
                                </button>
                                <button class="nivel ${this.perfil.partida.dificultad == 3 ? "seleccionado" : ""}" data-action="cambiar-dificultad" data-id="3">
                                        <span class="icono">🌳</span>
                                        <span class="texto">${this.t('nvl-3')}</span>
                                </button>
                        </div>
                `;

                let temario = '<div class="temario">';
                const arbol = this.catalogo.arbol;
                const biblio = this.catalogo.biblioteca;
                const construyeNivel = (arrayNodos) => {
                        let result = "";
                        arrayNodos.forEach(nodo => {
                                if (nodo.hijos && nodo.hijos.length > 0) {
                                        result += `<details class="grupo"><summary>
                                        <input type="checkbox" data-action="cambiar-check">${nodo.titulo}</summary>`
                                        result += construyeNivel(nodo.hijos)
                                        result += '</details>';
                                }
                                else {
                                        const seleccionar = this.perfil.partida.temas.has(nodo.id);
                                        result += `
                                        <div class="tema ${seleccionar ? "seleccionado" : ""}"
                                                data-action="seleccionar-tema" data-id="${nodo.id}">
                                                <span class="titulo">${biblio[nodo.id].titulo}</span>
                                                <span class="icono">${biblio[nodo.id].icono ? biblio[nodo.id].icono : "🌱"}</span>
                                        </div>
                                        `;
                                        if (seleccionar) this.perfil.partida.temas.add(nodo.id);
                                }
                        });
                        return result;
                };
                const construyeArbol = () => {
                        temario += construyeNivel(arbol);
                        temario += '</div>';
                };
                construyeArbol();
                /*
                arbol.forEach(tema => {
                        temario += `
                        <div    class="tema ${this.perfil.partida.temas.has(tema.id) ? "seleccionado" : ""}"  
                                        data-action="seleccionar-tema" data-id="${tema.id}">
                                <span class="titulo">${tema.titulo}</span>
                                <span class="icono">🌱</span>
                        </div>`;
                        this.perfil.partida.temas.add(tema.id);
                });
                temario += '</div>';
                */
                cuerpo.innerHTML = titulo + menu + temario + dificultades + comenzar;


        }
        async descargarTemas() {
                try {
                        const promesas = [...this.temas].map(id => {
                                return fetch(`datos/biblioteca/${id}.json`).then(res => {
                                        if (!res.ok) throw new Error(`No existe el archivo: ./datos/biblioteca/${id}.json`);
                                        return res.json();
                                });
                        });
                        const lista = await Promise.all(promesas);
                        this.vocabulario = [];
                        lista.forEach(json => {
                                this.vocabulario.push(...json.vocabulario);// reune todo el vocabulario seleccionado
                        });
                        this.#guardarVocabularioEnBD(lista);
                } catch (error) {

                }
        }
        async #guardarVocabularioEnBD(lista) {
                return new Promise((resolve, reject) => {
                        const transaccion = this.bd.transaction(["lexico"], "readwrite");
                        const store = transaccion.objectStore("lexico");

                        lista.forEach(json => {
                                json.vocabulario.forEach(palabra => {
                                        const idUnico = `${json.id}_${palabra.k}`;

                                        const peticion = store.add({
                                                id: idUnico,
                                                lema: palabra.k,
                                                acep: palabra.def,
                                                cat: json.id, //índice "por_catalogo"
                                                stats: {
                                                        maes: 0,
                                                        date: Date.now(),
                                                        vistas: 0,
                                                        dist: [], //distractores con los que se confunde
                                                }
                                        });

                                        peticion.onerror = (e) => {
                                                if (e.target.error.name === "ConstraintError") {//error de duplicidad
                                                        e.preventDefault(); // Evita que la transacción se detenga
                                                        e.stopPropagation(); // Evita que el error suba a la transacción
                                                }
                                        };
                                });
                        });

                        transaccion.oncomplete = () => {
                                console.log("Vocabulario sincronizado con éxito.");
                                resolve();
                        };

                        transaccion.onerror = () => reject("Error crítico en la base de datos.");
                });
        }

        crearUrlDeImagenWiki(imgPath, width = 300) {
                if (!imgPath) return "";

                const fileName = imgPath.split('/').pop();
                // url base de miniaturas de Wikimedia
                const baseUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/";

                // Wikimedia genera un PNG de la miniatura del SVG
                let thumbName = fileName;
                if (fileName.toLowerCase().endsWith('.svg')) {
                        thumbName += ".png";
                }
                // 4. Construcción de la URL de miniatura (Thumbnail)
                // Estructura: base + ruta/del/hash + / + ancho + px- + nombre_para_miniatura
                return `${baseUrl}${imgPath}/${width}px-${thumbName}`;
        }
        crearElementoImg(item, width = 300) {
                const aleatorio = Math.floor(Math.ramdom() * item.img.length);
                const url = this.crearUrlDeImagenWiki(item.img[aleatorio], width);
                return ` <img src="${url}" alt="${item.k}" loading="eager" title="${item.k}">`;
        }
        async comenzarPartida() {
                this.perfil.estado.totalPartidas++;
                await this.#guardar("ajustes", this.perfil);
                this.rt = {
                        dificultad: this.perfil.partida.dificultad,
                        vidas: 6 - this.perfil.partida.dificultad,
                        puntos: 0,
                        rachas: 0,
                        tiempoCongelado: false,
                        temporizador: null,
                        marca: 0,
                        rachiObjetivo: 5,
                        rachiObjetivoBASE: 5,
                        rachiMarcador: 0,

                        tiempoBase: 10,
                        respuesta: null,
                        respuestaEsperada: null,
                        tiempoReaccion: null,
                        ruleta: {
                                temporizador: null,
                                y: 0,
                                premios: [
                                        { id: 'bizia', t: '❤️ BIZIA (+1)', c: '#00ff88' },
                                        { id: 'izoztuta', t: '❄️ IZOZTUTA', c: '#00ccff' },
                                        { id: 'infernua', t: '🔥 INFERNUA', c: '#ff4400', m: true },
                                        { id: 'marea', t: '🌪️ MAREA', c: '#ff00cc' },
                                        { id: 'laster', t: '⚡ LASTER', c: '#ffff00' }
                                ]
                        }

                };

                this.generarPregunta();
        }
        generarPregunta() {
                this.#detenerBarraTiempo();
                this.rt.respuesta = null;
                this.rt.respuestaEsperada = null;
                // ... 


                this.generarOpciones();
                this.#regenerarEscenario();
                this.iniciarTemporizador();
                this.#interaccion(true);
        }
        #regenerarEscenario() {
                const tablero = document.querySelector("#capa-principal");
                tablero.classList.add("zona-juego");
                tablero.innerHTML = `
               <div class="vidas">${"❤️".repeat(this.rt.vidas)}</div>
               <div class="racha"> ${this.rt.rachiMarcador} / ${this.rt.rachiObjetivo}</div>
               <div class="barra-ext"><div class="barra-int" style="width: 100%;"></div></div>
               <div class="puntos">${this.rt.puntos}</div>
               <div class="pregunta"></div>
               <div class="opciones"></div>
               `;
        }
        generarOpciones() { }
        iniciarTemporizador() {
                this.#detenerBarraTiempo();

                const interna = document.querySelector(".barra-int");
                const externa = document.querySelector(".barra-ext");
                if (!interna || !externa) return;

                interna.className = "barra-int verde";
                externa.classList.remove('rojo');

                const total = this.rt.tiempoBase * 1000; // en ms
                this.rt.marca = Date.now(); // en ms
                this.rt.temporizador = setInterval(() => {
                        this.rt.tiempoReaccion = Date.now() - this.rt.marca;
                        const porcentaje = Math.max(0, 100 - (this.rt.tiempoReaccion / total * 100));
                        if (!this.rt.tiempoCongelado) {
                                interna.style.width = `${porcentaje}%`;
                                if (this.rt.tiempoReaccion >= total) {
                                        this.rt.tiempoReaccion = this.rt.tiempoBase * 1000;
                                        this.comprobarRespuesta();
                                }
                        }

                }, 100);

        }
        comprobarRespuesta() {
                this.#detenerBarraTiempo();
                this.#interaccion(false);
                this.#evaluarRespuesta();

                if (this.rt.respuesta === this.rt.respuestaEsperada) {
                        this.#gestionarAcierto();

                } else {
                        this.#gestionarFallo();
                }
        }
        #lanzarRuleta() {

                const capa = document.querySelector("#capa-principal");
                let htmlPremios = "";
                for (let i = 0; i < 30; i++) {
                        const p = this.rt.ruleta.premios[i % this.rt.ruleta.premios.length];
                        htmlPremios += `<div class="item-premio ${p.m ? 'maldito' : ''}">${p.t}</div>`;
                }
                capa.innerHTML = `
                <div class="capa-ruleta-sistema">
                    <div class="visor-ruleta">
                        <div id="tira-premios" class="tira-premios" style="transform: translateY(0px);">${htmlPremios}</div>
                    </div>
                    <button class="boton-disparador-juego-neon" id="btn-frenar-ruleta" data-action="frenar-ruleta" style="margin-top: 40px">
                        GELDI! / ¡PARAR!
                    </button>
                </div>`;
                this.rt.ruleta.y = 0;
                const tira = document.querySelector("#tira-premios");
                this.rt.ruleta.temporizador = setInterval(() => {
                        this.rt.ruleta.y -= 40;
                        if (Math.abs(this.rt.ruleta.y) > (this.rt.ruleta.premios.length * 120 * 4 - 40)) {
                                this.rt.ruleta.y = 0;
                        }
                        tira.style.transform = `translateY(${this.rt.ruleta.y}px)`;
                }, 30);
        }
        #frenarRuleta() {
                clearInterval(this.rt.ruleta.temporizador);
                const tira = document.getElementById('tira-premios');
                const btn = document.getElementById('btn-frenar-ruleta');
                if (btn) btn.style.display = 'none';

                // A. CAPTURAR POSICIÓN EXACTA (Evita saltos visuales)
                // Obtenemos dónde está la tira justo en este milisegundo
                const estiloComputado = window.getComputedStyle(tira);
                const matrix = new WebKitCSSMatrix(estiloComputado.transform);
                const posicionActualY = matrix.m42; // Captura el valor real de translateY

                // B. SINCRONIZACIÓN
                // Fijamos la posición actual sin transición para "congelar" el movimiento
                tira.style.transition = "none";
                tira.style.transform = `translateY(${posicionActualY}px)`;

                // C. CÁLCULO DE DESTINO (Mantenemos tu lógica de itemsExtra)
                const itemsExtra = Math.floor(Math.random() * 4) + 8;
                // Forzamos que el destino sea un múltiplo exacto de 120 para que quede centrado
                const destinoFinalY = Math.round((posicionActualY - (itemsExtra * 120)) / 120) * 120;

                // D. EJECUCIÓN (Usamos un pequeño delay para que el navegador registre el cambio de 'none' a 'cubic-bezier')
                setTimeout(() => {
                        tira.style.transition = "transform 2.5s cubic-bezier(0.1, 0.9, 0.2, 1)";
                        tira.style.transform = `translateY(${destinoFinalY}px)`;
                }, 20);

                // E. IDENTIFICAR PREMIO
                // Usamos el destinoFinalY para saber qué premio quedará bajo el visor
                const totalItemsPasados = Math.round(Math.abs(destinoFinalY) / 120);
                const indiceReal = totalItemsPasados % this.rt.ruleta.premios.length;
                const premio = this.rt.ruleta.premios[indiceReal];

                setTimeout(() => {
                        this.#aplicarPremio(premio);
                }, 2600); // 100ms después de que termine la transición de 2.5s
        }

        #aplicarPremio() {
                this.generarPregunta()
        }
        #interaccion(permitida) { }
        #evaluarRespuesta() { }
        #gestionarAcierto() {
                this.#progresarEnLaRacha();
        }
        #progresarEnLaRacha() {
                this.rt.rachiMarcador++;
                if (this.rt.rachiMarcador == this.rt.rachiObjetivo) {
                        this.#completarRacha();
                } else {

                        this.generarPregunta();
                }
        }
        #completarRacha() {
                this.rt.rachas++;
                this.rt.rachiMarcador = 0;

                if (this.rt.rachas % 3 == 0 && this.rt.rachiObjetivo < 10) {
                        this.rt.rachiObjetivo++;
                        // resaltar el incremento en la interfaz mediante latido 
                }
                this.#lanzarRuleta();
        }
        #gestionarFallo() {
                this.rt.vidas--;
                this.rt.rachiMarcador = 0;
                if (this.rt.vidas <= 0) {
                        this.#finalizarPartida();
                } else {
                        setTimeout(() => this.generarPregunta(), 1200);
                }
        }
        #finalizarPartida() {
                this.#generarResumen();
        }
        #generarResumen() {
                this.mostrarConfiguracionPartida();
        }
        #detenerBarraTiempo() {
                if (this.rt.temporizador) {
                        clearInterval(this.rt.temporizador);
                        this.rt.temporizador = null;
                }
        }
        async #recuperar(almacen, id) {
                return new Promise((resolver, rechazar) => {
                        const tx = this.bd.transaction(almacen, "readonly");
                        const store = tx.objectStore(almacen);
                        const peticion = store.get(id);

                        peticion.onsuccess = () => resolver(peticion.result ?? null);
                        peticion.onerror = () => rechazar(`Error al leer ${id} en ${almacen}`);
                });
        }
        async #guardar(almacen, objeto) {
                return new Promise((resolver, rechazar) => {
                        const tx = this.bd.transaction(almacen, "readwrite");
                        const store = tx.objectStore(almacen);

                        store.put(objeto);

                        // Esperamos al 'oncomplete' de la transacción para máxima seguridad
                        tx.oncomplete = () => resolver(true);
                        tx.onerror = () => rechazar(`Error al escribir en ${almacen}`);
                });
        }
        async #eliminar(almacen, id) {
                return new Promise((resolver, rechazar) => {
                        const tx = this.bd.transaction(almacen, "readwrite");
                        const store = tx.objectStore(almacen);
                        const peticion = store.delete(id);

                        peticion.onsuccess = () => resolver(true);
                        tx.onerror = () => rechazar(`Error al borrar ${id} en ${almacen}`);
                });
        }
        #prepararCatalogo() {
                const idsEnArbol = new Set();
                const idsInaccesibles = new Set();

                // detecta y registra los ids de temas que aparecen en el arbol, ve si también existen en
                // la biblioteca.
                const escanearNivel = (lista) => {
                        lista.forEach(nodo => {
                                if (nodo.hijos) {
                                        escanearNivel(nodo.hijos);
                                } else {
                                        if (!this.catalogo.biblioteca[nodo.id]) {
                                                idsInaccesibles.add(nodo.id);
                                        } else {
                                                idsEnArbol.add(nodo.id);
                                        }

                                }
                        });
                };
                escanearNivel(this.catalogo.arbol);
                if (idsInaccesibles.size > 0)
                        console.error("Temas en árbol que NO existen en biblioteca:", [...idsInexistentes]);
                // buscar temas "huérfanos" (están en biblioteca pero no en árbol)
                const huerfanos = Object.keys(this.biblioteca).filter(id => !idsEnArbol.has(id));

                // Si hay huérfanos, van al Supertema "+ Otros"
                if (huerfanos.length > 0) {
                        this.arbol.push({
                                id: "+otros",
                                titulo: "Otros temas",
                                icono: "📦",
                                hijos: huerfanos.map(id => ({ id })) // Solo el ID, el título se sacará de la biblioteca
                        });
                }
        }

}



{
/* --- REGISTRO DEL SERVICE WORKER (VIGILANTE) (PWA) ---

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

 */}

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