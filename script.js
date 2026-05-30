// Constantes de tipos de celdas
const TILE_PATH = 0;
const TILE_WALL = 1;
const TILE_PLAYER_START = 2;
const TILE_COIN = 3;
const TILE_EXIT = 4;
const TILE_KEY_RED = 5;
const TILE_DOOR_RED = 6;

const TILE_KEY_BLUE = 7;
const TILE_DOOR_BLUE = 8;

// Configuración de niveles (Escalable)
const niveles = [
  {
    // Nivel 1: Dia nevado extendido
    matriz: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 2, 0, 0, 1, 0, 7, 0, 1, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1],
      [1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
      [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1],
      [1, 0, 0, 0, 1, 3, 0, 0, 0, 5, 1, 0, 0, 0, 1],
      [1, 1, 1, 0, 1, 1, 1, 8, 1, 1, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1],
      [1, 0, 1, 3, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1],
      [1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1],
      [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1],
      [1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1],
      [1, 4, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    ],
    totalMonedas: 2
  }
  // Aquí se pueden añadir más niveles en el futuro
];

// Estado del juego
let nivelActualIndex = 0;
let mapa = [];
let jugador = { x: 0, y: 0 };
let inventario = { llaveRoja: false, llaveAzul: false };
let monedasRecolectadas = 0;
let totalMonedasNivel = 0;
let juegoTerminado = false;

// Cooldown para evitar doble pulsación (Accesibilidad motora)
let enCooldown = false;
const COOLDOWN_MS = 250; // Ajustable según necesidad

// Elementos del DOM
const boardEl = document.getElementById('game-board');
const ariaLiveEl = document.getElementById('aria-live');
const coinsCountEl = document.getElementById('coins-count');
const coinsTotalEl = document.getElementById('coins-total');
const inventoryListEl = document.getElementById('inventory-list');
const exitOverlayEl = document.getElementById('exit-open-overlay');
const bgMusic = document.getElementById('bg-music');
const startScreenEl = document.getElementById('start-screen');
const btnStartEl = document.getElementById('btn-start');

btnStartEl.addEventListener('click', () => {
  startScreenEl.style.opacity = '0';
  setTimeout(() => {
    startScreenEl.style.visibility = 'hidden';
  }, 500);
  
  if (bgMusic) {
    bgMusic.play().catch(e => console.log("Audio autoplay prevented", e));
  }
});

function initJuego() {
  cargarNivel(nivelActualIndex);
  configurarControles();
}

function cargarNivel(index) {
  const nivel = niveles[index];
  // Clonar profundamente la matriz para no alterar la original
  mapa = nivel.matriz.map(fila => [...fila]);
  totalMonedasNivel = nivel.totalMonedas;
  monedasRecolectadas = 0;
  inventario.llaveRoja = false;
  inventario.llaveAzul = false;
  juegoTerminado = false;

  actualizarUIStatus();
  exitOverlayEl.classList.add('hidden');
  
  // Encontrar posición inicial del jugador
  for (let y = 0; y < mapa.length; y++) {
    for (let x = 0; x < mapa[y].length; x++) {
      if (mapa[y][x] === TILE_PLAYER_START) {
        jugador.x = x;
        jugador.y = y;
        mapa[y][x] = TILE_PATH; // Limpiar casilla debajo del jugador
      }
    }
  }

  renderizarMapa();
  actualizarCamara();
  anunciar("Nivel cargado. Encuentra las llaves y monedas para llegar a la salida.");
}

function renderizarMapa() {
  boardEl.innerHTML = '';
  const filas = mapa.length;
  const columnas = mapa[0].length;
  
  boardEl.style.gridTemplateColumns = `repeat(${columnas}, 35px)`;
  boardEl.style.gridTemplateRows = `repeat(${filas}, 35px)`;

  for (let y = 0; y < filas; y++) {
    for (let x = 0; x < columnas; x++) {
      const cellEl = document.createElement('div');
      const tipo = mapa[y][x];
      
      let claseCell = 'cell ';

      // Si es la posición del jugador
      if (jugador.x === x && jugador.y === y) {
        claseCell += 'player';
      } else {
        switch (tipo) {
          case TILE_PATH: claseCell += 'path'; break;
          case TILE_WALL: claseCell += 'wall'; break;
          case TILE_COIN: claseCell += 'coin'; break;
          case TILE_KEY_RED: claseCell += 'key'; break;
          case TILE_DOOR_RED: claseCell += 'door'; break;
          case TILE_KEY_BLUE: claseCell += 'key-blue'; break;
          case TILE_DOOR_BLUE: claseCell += 'door-blue'; break;
          case TILE_EXIT: 
            if (monedasRecolectadas >= totalMonedasNivel) {
              claseCell += 'exit-open';
            } else {
              claseCell += 'exit-closed';
            }
            break;
        }
      }

      cellEl.className = claseCell;
      boardEl.appendChild(cellEl);
    }
  }
}

function actualizarUIStatus() {
  coinsCountEl.textContent = monedasRecolectadas;
  coinsTotalEl.textContent = totalMonedasNivel;
  
  let llaves = [];
  if (inventario.llaveRoja) llaves.push('Roja');
  if (inventario.llaveAzul) llaves.push('Azul');
  
  if (llaves.length > 0) {
    inventoryListEl.textContent = `Llaves: ${llaves.join(', ')}`;
  } else {
    inventoryListEl.textContent = 'Vacío';
  }
}

function moverJugador(dx, dy) {
  if (juegoTerminado || enCooldown) return;

  if (bgMusic && bgMusic.paused) {
    bgMusic.play().catch(e => console.log("Audio autoplay prevented", e));
  }

  // Aplicar cooldown (debounce) para accesibilidad motora
  enCooldown = true;
  setTimeout(() => { enCooldown = false; }, COOLDOWN_MS);

  const nx = jugador.x + dx;
  const ny = jugador.y + dy;

  // Evitar salir de los límites
  if (ny < 0 || ny >= mapa.length || nx < 0 || nx >= mapa[0].length) return;

  const destino = mapa[ny][nx];

  // Lógica de colisiones e interacción
  if (destino === TILE_WALL) {
    anunciar("Pared. No puedes avanzar.");
    return;
  }

  if (destino === TILE_DOOR_RED) {
    if (inventario.llaveRoja) {
      anunciar("Has abierto la puerta roja.");
      mapa[ny][nx] = TILE_PATH; // Abrir puerta
    } else {
      anunciar("Puerta roja bloqueada. Necesitas la llave roja.");
      return;
    }
  }

  if (destino === TILE_DOOR_BLUE) {
    if (inventario.llaveAzul) {
      anunciar("Has abierto la puerta azul.");
      mapa[ny][nx] = TILE_PATH; // Abrir puerta
    } else {
      anunciar("Puerta azul bloqueada. Necesitas la llave azul.");
      return;
    }
  }

  if (destino === TILE_EXIT) {
    if (monedasRecolectadas >= totalMonedasNivel) {
      // Mover al jugador y ganar
      jugador.x = nx;
      jugador.y = ny;
      renderizarMapa();
      victoria();
      return;
    } else {
      anunciar("Salida bloqueada. Faltan monedas.");
      return;
    }
  }

  // Movimiento exitoso
  jugador.x = nx;
  jugador.y = ny;
  let mensaje = "Movimiento.";

  // Recoger objetos
  if (destino === TILE_COIN) {
    monedasRecolectadas++;
    mapa[ny][nx] = TILE_PATH;
    if (monedasRecolectadas >= totalMonedasNivel) {
      mensaje = "Todas las monedas recogidas. ¡Encuentra la salida!";
      exitOverlayEl.classList.remove('hidden');
      setTimeout(() => {
        exitOverlayEl.classList.add('fade-out');
        setTimeout(() => {
          exitOverlayEl.classList.add('hidden');
          exitOverlayEl.classList.remove('fade-out');
        }, 300);
      }, 2500);
    } else {
      mensaje = `Moneda recogida. Tienes ${monedasRecolectadas} de ${totalMonedasNivel}.`;
    }
    actualizarUIStatus();
  } else if (destino === TILE_KEY_RED) {
    inventario.llaveRoja = true;
    mapa[ny][nx] = TILE_PATH;
    mensaje = "Llave roja recogida. Revisa tu inventario.";
    actualizarUIStatus();
  } else if (destino === TILE_KEY_BLUE) {
    inventario.llaveAzul = true;
    mapa[ny][nx] = TILE_PATH;
    mensaje = "Llave azul recogida. Revisa tu inventario.";
    actualizarUIStatus();
  }

  anunciar(mensaje);
  renderizarMapa();
  actualizarCamara();
}

function actualizarCamara() {
  const cellTotalSize = 38;
  const viewportCells = 9;
  const halfViewport = Math.floor(viewportCells / 2);

  const maxCamX = mapa[0].length - viewportCells;
  const maxCamY = mapa.length - viewportCells;

  let camX = jugador.x - halfViewport;
  let camY = jugador.y - halfViewport;

  camX = Math.max(0, Math.min(camX, maxCamX));
  camY = Math.max(0, Math.min(camY, maxCamY));

  boardEl.style.transform = `translate(-${camX * cellTotalSize}px, -${camY * cellTotalSize}px)`;
}

function victoria() {
  juegoTerminado = true;
  anunciar("¡Felicidades! Has encontrado la salida y completado el nivel.");
  
  if (bgMusic) {
    bgMusic.pause();
    bgMusic.currentTime = 0;
  }

  document.getElementById('game-info').classList.add('hidden');
  document.getElementById('game-area').classList.add('hidden');
  document.getElementById('level-complete-view').classList.remove('hidden');
}

function avanzarNivel() {
  if (!juegoTerminado) return;
  alert("¡Próximamente más niveles! Reiniciando el Nivel 1 por ahora.");
  
  document.getElementById('game-info').classList.remove('hidden');
  document.getElementById('game-area').classList.remove('hidden');
  document.getElementById('level-complete-view').classList.add('hidden');
  
  cargarNivel(nivelActualIndex);
}

function anunciar(mensaje) {
  // Se añade un pequeño retardo y limpieza previa para forzar al lector de pantalla a anunciar cambios repetidos
  ariaLiveEl.textContent = '';
  setTimeout(() => {
    ariaLiveEl.textContent = mensaje;
  }, 50);
}

function configurarControles() {
  // Teclado físico
  document.addEventListener('keydown', (e) => {
    if (juegoTerminado) {
      avanzarNivel();
      return;
    }

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault(); // Evita que la página haga scroll
    }
    switch(e.key) {
      case 'ArrowUp': moverJugador(0, -1); break;
      case 'ArrowDown': moverJugador(0, 1); break;
      case 'ArrowLeft': moverJugador(-1, 0); break;
      case 'ArrowRight': moverJugador(1, 0); break;
    }
  });

  // Botones en pantalla
  document.getElementById('btn-up').addEventListener('click', () => moverJugador(0, -1));
  document.getElementById('btn-down').addEventListener('click', () => moverJugador(0, 1));
  document.getElementById('btn-left').addEventListener('click', () => moverJugador(-1, 0));
  document.getElementById('btn-right').addEventListener('click', () => moverJugador(1, 0));
  // Botón continuar
  document.getElementById('btn-continue').addEventListener('click', avanzarNivel);
}

// Iniciar juego al cargar
window.onload = initJuego;
