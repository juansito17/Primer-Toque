# Primer Toque - Juego de Reflejos en Tiempo Real

"Primer Toque" es una aplicación web sencilla diseñada para gestionar un juego de reflejos donde múltiples jugadores compiten por ser el primero en presionar un botón. Un administrador modera el juego, inicia rondas y asigna puntuaciones.

**Autor:** Juan Manuel Peña Usuga  
**Institución:** Politécnico Colombiano Jaime Isaza Cadavid  
**Curso:** Aula Taller (Ingeniería Informática - Quinto Semestre)

## Tecnologías Utilizadas

* **Frontend:**
    * HTML5
    * CSS3 (con [Tailwind CSS](https://tailwindcss.com/))
    * JavaScript (Vanilla JS)
    * [Socket.IO Client](https://socket.io/docs/v4/client-api/)
    * [Font Awesome](https://fontawesome.com/) (para iconos)
* **Backend:**
    * [Node.js](https://nodejs.org/)
    * [Express.js](https://expressjs.com/es/)
    * [Socket.IO](https://socket.io/)

## Estructura del Proyecto

El proyecto está organizado en dos carpetas principales:

* `backend/`: Contiene todo el código del servidor Node.js.
    * `server.js`: Lógica principal del servidor, manejo de sockets y estado del juego.
    * `package.json`: Dependencias y scripts del backend.
* `frontend/`: Contiene todos los archivos del lado del cliente.
    * `index.html`: Estructura principal de la aplicación web.
    * `css/style.css`: Estilos personalizados y configuración de Tailwind.
    * `js/client.js`: Lógica del cliente, interacción con la UI y comunicación con el servidor vía Socket.IO.

## Requisitos Previos

* [Node.js](https://nodejs.org/en/download/) (versión 14.x o superior recomendada) y npm (normalmente viene con Node.js).

## Instalación y Ejecución

Sigue estos pasos para poner en marcha la aplicación:

1. **Clonar el Repositorio (o Descargar los Archivos)**
     Si estás usando Git:
     ```bash
     git clone <URL_DEL_REPOSITORIO>
     cd Primer-Toque
     ```
     Si descargaste los archivos, descomprímelos en una carpeta llamada `primer-toque-app`.

2. **Configurar y Ejecutar el Backend:**
     * Navega a la carpeta del backend:
         ```bash
         cd backend
         ```
     * Instala las dependencias del servidor:
         ```bash
         npm install
         ```
     * Inicia el servidor:
         ```bash
         npm start
         ```
         Por defecto, el servidor se ejecutará en `http://localhost:3000`. Verás un mensaje en la consola confirmándolo.

3. **Acceder a la Aplicación (Frontend):**
     * Una vez que el servidor backend esté en ejecución, abre tu navegador web.
     * Dirígete a la siguiente URL:
         ```
         http://localhost:3000
         ```
     El servidor backend está configurado para servir los archivos del frontend desde esta dirección.

## Flujo del Juego (Resumen)

1. **Pantalla de Inicio:** El usuario elige entre "Acceso Administrador" o "Unirse al Juego (Jugador)".
2. **Administrador:**
     * Se autentica (credenciales predefinidas: `admin`/`password`).
     * Crea una nueva partida, obteniendo un código de juego único.
     * Visualiza los jugadores conectados.
     * Inicia las rondas.
     * Durante una ronda, ve quién presionó primero y decide si sumar punto, ver al siguiente jugador más rápido, o invalidar la ronda.
     * Visualiza un ranking actualizado.
     * Puede finalizar la partida.
3. **Jugador:**
     * Ingresa el código de juego proporcionado por el administrador y un nombre/alias.
     * Espera en una sala hasta que el administrador inicie una ronda.
     * Cuando la ronda inicia, ve un botón grande para presionar.
     * Al presionar, espera la resolución del administrador.
     * Ve mensajes sobre el estado de la ronda y, opcionalmente, su puntuación.

## Controles y Funcionalidades

* **Administrador:**
    * **Crear Nueva Partida:** Genera un código único para la partida.
    * **Iniciar Ronda:** Comienza una nueva ronda para los jugadores conectados.
    * **Sumar Punto:** Otorga un punto al jugador que presionó más rápido.
    * **No Sumar Punto / Ver Siguiente:** Descarta al jugador más rápido y muestra al siguiente, si lo hay.
    * **Saltar Ronda:** Invalida la ronda actual sin otorgar puntos.
    * **Finalizar Partida:** Termina la sesión de juego actual.
* **Jugador:**
    * **Unirse al Juego:** Ingresa código y nombre para participar.
    * **¡PRESIONA!:** Botón principal para competir en cada ronda.
    * **Salir de la Partida:** Permite al jugador abandonar el juego.

## Posibles Mejoras Futuras

* Persistencia de datos (puntuaciones, historial de partidas) usando una base de datos (ej. SQLite, MongoDB).
* Sistema de autenticación de administrador más robusto.
* Mejoras en la interfaz de usuario y experiencia de usuario (animaciones, sonidos).
* Salas de juego privadas o con contraseña.
* Personalización de la duración de las rondas o número de rondas.
* Internacionalización (soporte para múltiples idiomas).

---

¡Gracias por usar Primer Toque!
