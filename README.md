# Servidor de torneos y usuarios

## Servidor de torneos
Esta parte se encarga del control de torneos del juego. Maneja la información de los usuarios, los puntajes del juego y los ganadores de cada ronda.


## Servidor de usuarios
Este servidor se encarga del manejo de usuarios. Esto incluye el inicio de sesión, creación de usuarios y manejo de credenciales.


## Historial de versiones
* 1.3.0
    * Add docker-compose.yml and Dockerfiles. 
* 1.2.2
    * Actualizar algunos métodos de usuarios.
* 1.2.1
    * Conección con la base de datos.
* 1.2.0
    * Creación de nuevos métodos en el servicio de torneos
    * Actualización del esquema de la base de datos.
* 1.1.0
    * Creación de servicios de jugadores y vista de jugadores.
* 1.0.0
    * Creación de torneo y vista de torneos.


## Getting Started

Para ejecutar el proyecto será necesario acceder la siguiente [dirección](http://34.67.137.28/). Acá se podrá ver el servidor de usuarios y torneos.

La dirección de usuarios es la siguiente:
```
http://34.67.137.28:3002/  
```
La dirección de torneos en la siguiente:
```
http://34.67.137.28:3000/
```

En cada uno de estos apartados se encuentran los API para cada una de las funciones.


### Prerequisitos

Esta aplicación sera implementada utilizando JavaScript y será necesario tener instalado NodeJS para compilarlo.

### Instalación de dependencias

Para instalar todas las dependencias es necesario utilizar el siguiente comando
```
npm install
```

### Construido con

* **NodeJS** - El framework de desarrollo
* **Express** - Utilizado un servidor mediante la utilización de express para que pueda consumir la API externa


# Author

Authores del proyecto como parte del curso de Software avanzado de la Universidad de San Carlos de Guatemala.

Grupo 2