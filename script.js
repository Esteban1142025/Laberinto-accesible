// Constantes de tipos de celdas
const TILE_PATH = 0;
const TILE_WALL = 1;
const TILE_PLAYER_START = 2;
const TILE_COIN = 3;
const TILE_EXIT = 4;
const TILE_KEY_RED = 5;
const TILE_DOOR_RED = 6;

// Configuración de niveles (Escalable)
const niveles = [
  {
    // Nivel 1: Tutorial
    matriz: [
      [1, 1, 1, 1, 1, 1, 1],
      [1, 2, 0, 3, 1, 4, 1],
      [1, 1, 1, 0, 1, 6, 1],
      [1, 5, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 3, 1],
      [1, 1, 1, 1, 1, 1, 1]
    ],
    totalMonedas: 2
  }
  // Aquí se pueden añadir más niveles en el futuro
];

// Estado del juego
let nivelActualIndex = 0;
let mapa = [];
let jugador = { x: 0, y: 0 };
let inventario = { llaveRoja: false };
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
const victoryMessageEl = document.getElementById('victory-message');

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
  juegoTerminado = false;

  actualizarUIStatus();
  victoryMessageEl.classList.add('hidden');
  
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
  anunciar("Nivel cargado. Encuentra las llaves y monedas para llegar a la salida.");
}

function renderizarMapa() {
  boardEl.innerHTML = '';
  const filas = mapa.length;
  const columnas = mapa[0].length;
  
  boardEl.style.gridTemplateColumns = `repeat(${columnas}, 1fr)`;
  boardEl.style.gridTemplateRows = `repeat(${filas}, 1fr)`;

  for (let y = 0; y < filas; y++) {
    for (let x = 0; x < columnas; x++) {
      const cellEl = document.createElement('div');
      const tipo = mapa[y][x];
      
      let claseCell = 'cell ';
      let contenido = '';

      // Si es la posición del jugador
      if (jugador.x === x && jugador.y === y) {
        claseCell += 'player';
      } else {
        switch (tipo) {
          case TILE_PATH: claseCell += 'path'; break;
          case TILE_WALL: claseCell += 'wall'; break;
          case TILE_COIN: claseCell += 'coin'; contenido = '🟡'; break;
          case TILE_KEY_RED: claseCell += 'key'; contenido = '🔑'; break;
          case TILE_DOOR_RED: claseCell += 'door'; contenido = '🚪'; break;
          case TILE_EXIT: 
            if (monedasRecolectadas >= totalMonedasNivel) {
              claseCell += 'exit-open';
              contenido = '🏁';
            } else {
              claseCell += 'exit-closed';
              contenido = '🔒';
            }
            break;
        }
      }

      cellEl.className = claseCell;
      cellEl.textContent = contenido;
      boardEl.appendChild(cellEl);
    }
  }
}

function actualizarUIStatus() {
  coinsCountEl.textContent = monedasRecolectadas;
  coinsTotalEl.textContent = totalMonedasNivel;
  
  if (inventario.llaveRoja) {
    inventoryListEl.textContent = 'Llave Roja 🔑';
  } else {
    inventoryListEl.textContent = 'Vacío';
  }
}

function moverJugador(dx, dy) {
  if (juegoTerminado || enCooldown) return;

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
    mensaje = `Moneda recogida. Tienes ${monedasRecolectadas} de ${totalMonedasNivel}.`;
    actualizarUIStatus();
  } else if (destino === TILE_KEY_RED) {
    inventario.llaveRoja = true;
    mapa[ny][nx] = TILE_PATH;
    mensaje = "Llave roja recogida. Revisa tu inventario.";
    actualizarUIStatus();
  }

  anunciar(mensaje);
  renderizarMapa();
}

function victoria() {
  juegoTerminado = true;
  anunciar("¡Encuentra la salida! Has ganado el Nivel 1.");
  victoryMessageEl.classList.remove('hidden');
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
}

// Iniciar juego al cargar
window.onload = initJuego;
