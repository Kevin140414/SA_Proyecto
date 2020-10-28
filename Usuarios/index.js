#!/usr/bin/env node
const express = require('express');
const mysql = require('mysql');
const request = require('request')
const cors = require('cors');
const bodyParser = require('body-parser');
const e = require('express');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(bodyParser.json())
app.use(cors());

/*
*   Se establecen las variables para la conexión con la base de datos
*   Seran utlizadas las variables de entorno o las que se encuentran posteriormente
*   @DB_HOST, es el host o IP de en donde se encuentra el servidor de base de datos
*   @DB_USERNAME, es el usuario mediante el cual se conectara a la base de datos
*   @DB_PASSWORD, es la contraseña por medio de la cual se conectara a la base de datos
*   @DB_NAME, es el nombre de la base de datos a la cual se conectara la app
*/
const DB_HOST = process.env.DB_HOST || "34.70.55.236";
const DB_USERNAME = process.env.DB_USERNAME || "sa";
const DB_PASSWORD = process.env.DB_PASSWORD || "tP1AsPJr9fnDP8Jf";
const DB_NAME = process.env.DB_NAME || "usuarios";

/*
*   Conexión a la base de datos
*/
var conn = mysql.createConnection({
    host: DB_HOST,
    port: '3306',
    user: DB_USERNAME,
    password: DB_PASSWORD,
    database: DB_NAME
    //insecureAuth : true
});

var publicKEY  = fs.readFileSync('./publica.pem', 'utf8');
var verifyOptions = {
    algorithm:  ["RS256"]
};

var dateTime = require('node-datetime')
var dt = dateTime.create()
dt.format('m/d/Y H:M:S')

function log_message_text(str_Message, request){
  console.log(new Date(dt.now()), request, str_Message)
}

/*
*   @IP, es la ip en la que se estara ejecutando la aplicación
*   @PORT, el puerto en el que escucha la aplicación.
*   utlilizando las varibles de entorno o las establecidas posteriormente.
*/
const PORT = process.env.PORT || 3002;
const IP = process.env.IP || "127.0.0.1";

app.listen(PORT, IP, () => {
  log_message_text('INICIO MICROSERVICIO Usuarios - Corriendo en http://' + IP + ':' + PORT, '780 SA -')
})

/*
*   Metodo GET
*   Obtiene todos los jugadores registrados en el microservicio de torneos
*   No recibe parametros
*/
app.get('/jugadores', function (req, res) {
    log_message_text(' * PETICION RECIBIDA', '/jugadores -> GET')

    var sql = "SELECT * FROM usuario;";
    conn.query(sql, function (err, records) {
        if (err) throw err;
        res.status(200).send(JSON.parse(JSON.stringify(records)))
    });
    log_message_text(' * SE TERMINO DE PROCESAR LA PETICION', '/jugadores -> GET')
});

/*
*   Metodo POST
*   Registra un nuevo usuario  en el microservicio de torneos
*   En el body se envian:
*   @nombres: nombres del usuario
*   @apellidos: apellidos del usuario
*   @emial: correo electronico del usuario
*   @password: contraseña para ingresar al sistema
*   @administrador: es un booleano que indica si cuenta con permisos de administrador o no 
*
*   response:
*   200: retorna la información del usuario e indica que el usuario fue registrado correctamente.
*   406: Un error al registrar el usuario, posiblemente por datos inválidos.
*/
app.post('/jugadores', (req, res) => {
  var authorization = req.headers.authorization
  if(authorization !== undefined){
    token = authorization.replace('Bearer ', "")
    var legit = jwt.verify(token, publicKEY, verifyOptions)
    if(legit.scope[0] !== 'usuarios.registro'){
        log_message_text(' * NO AUTORIZADO', '/jugadores/:id -> PUT') 
        res.status(401).send({ 'message': 'No autorizado' })  
        return
    }
  }
  else {
    log_message_text(' * NO AUTORIZADO', '/jugadores/:id -> PUT') 
    res.status(401).send({ 'message': 'No autorizado' })  
    return
  }

  log_message_text(' * PETICION RECIBIDA', '/jugadores -> POST')
  log_message_text(' * Los datos recibidos fueron: ' + JSON.stringify(req.body), '/jugadores -> POST')  

  if(req.body.nombres !== undefined && req.body.apellidos != undefined && req.body.email != undefined && req.body.administrador !== undefined && req.body.password  !== undefined){
    log_message_text(' * Los datos recibidos son correctos', '/jugadores -> POST')
    var sql = 'INSERT INTO usuario (nombres, apellidos, email, password, administrador)' + 
        'VALUES ("' + req.body.nombres + '", "' + req.body.apellidos + '", "' + req.body.email + '", "' + req.body.password + '", ' + (req.body.administrador?1:0) + ');'
    conn.query(sql, function (err, records) {
        if (err) { 
            log_message_text(' * Error al registrar el usuaro ' + JSON.stringify(err), '/jugadores -> POST')
            res.status(406).send(JSON.parse(JSON.stringify(err)))  
            return;
        }
        log_message_text(' * Usuario registrado correctamente, con id: ' + JSON.parse(JSON.stringify(records)).insertId, '/jugadores -> POST')
        res.status(200).send({ 'id': JSON.parse(JSON.stringify(records)).insertId, 'nombres': req.body.nombres, 'apellidos': req.body.apellidos, 'email': req.body.email, 'administrador': req.body.administrador })
    });
  }
  else {
    log_message_text(' * Los datos recibidos son incorrectos', '/jugadores -> POST')
    res.status(406).send( {'message':'Datos inválidos'} )  
  }

  log_message_text(' * SE TERMINO DE PROCESAR LA PETICION', '/jugadores -> POST')
})

/*
*   Metodo PUT
*   Actualiza la información de un usuario  en el microservicio de torneos
*   En params se envian:
*   @id: identificador del usuario
*
*   En el body se envian:
*   @nombres: nombres del usuario
*   @apellidos: apellidos del usuario
*   @emial: correo electronico del usuario
*   @password: contraseña para ingresar al sistema
*   @administrador: es un booleano que indica si cuenta con permisos de administrador o no 
*
*   response:
*   200: retorna la información del usuario e indica que el usuario fue actualizado correctamente.
*   406: Un error al actualizar el usuario, posiblemente por que el usuario no fue eonctrado
*/
app.put('/jugadores/:id', (req, res) => {
  var authorization = req.headers.authorization
  if(authorization !== undefined){
    token = authorization.replace('Bearer ', "")
    var legit = jwt.verify(token, publicKEY, verifyOptions)
    if(legit.scope[2] !== 'usuarios.actualizarusuario'){
        log_message_text(' * NO AUTORIZADO', '/jugadores/:id -> PUT') 
        res.status(401).send({ 'message': 'No autorizado' }) 
        return
    }
  }
  else {
    log_message_text(' * NO AUTORIZADO', '/jugadores/:id -> PUT') 
    res.status(401).send({ 'message': 'No autorizado' })  
    return
  }

  log_message_text(' * PETICION RECIBIDA', '/jugadores/:id -> PUT')
  log_message_text(' * Los datos recibidos fueron: ' + JSON.stringify(req.body), '/jugadores/:id -> PUT')
  
  if(req.body.nombres !== undefined && req.body.apellidos != undefined && req.body.email != undefined && req.body.administrador !== undefined && req.body.password  !== undefined){
    log_message_text(' * Los datos recibidos son correctos', '/jugadores/:id -> PUT')
    var sql = 'UPDATE usuario SET nombres = "' + req.body.nombres + '",' 
            + 'apellidos = "' + req.body.apellidos + '",' 
            + 'email = "' + req.body.email + '",' 
            + 'password = "'  + req.body.password + '",' 
            + 'administrador =' + (req.body.administrador?1:0) 
            + ' WHERE id = ' + req.params.id + ';'

    conn.query(sql, function (err, records) {
        if (err) { 
            log_message_text(' * Error al actualizar el usuaro ' + JSON.stringify(err), '/jugadores/:id -> PUT')
            res.status(404).send(JSON.parse(JSON.stringify(err)))  
            return;
        }

        if(JSON.parse(JSON.stringify(records)).affectedRows == 0){
            res.status(404).send( {'message':'Usuario no encontrado'} )  
            return;
        }
    
        log_message_text(' * Usuario actualizado correctamente, con id: ' + req.params.id, '/jugadores/:id -> PUT')
        res.status(200).send({ 'id': parseInt(req.params.id), 'nombres': req.body.nombres, 'apellidos': req.body.apellidos, 'email': req.body.email, 'administrador': req.body.administrador })
    });
  }
  else {
    log_message_text(' * Los datos recibidos son incorrectos', '/jugadores/:id -> PUT')
    res.status(406).send( {'message':'Datos inválidos'} )  
  }

  log_message_text(' * SE TERMINO DE PROCESAR LA PETICION', '/jugadores/:id -> PUT')
})


/*
*   Metodo GET
*   Obtener la información de un usuario en el microservicio de torneos
*   En params se envian:
*   @id: identificador del usuario
*
*   response:
*   200: retorna la información del usuario e indica que el usuario obtenido correctamente.
*   406: Un error al obtener el usuario, posiblemente por que no se ncontro el usuario
*/
app.get('/jugadores/:id', (req, res) => {
  var authorization = req.headers.authorization
  if(authorization !== undefined){
    token = authorization.replace('Bearer ', "")
    var legit = jwt.verify(token, publicKEY, verifyOptions)
    if(legit.scope[1] !== 'usuarios.obtenerusuario'){
        log_message_text(' * NO AUTORIZADO', '/jugadores/:id -> PUT') 
        res.status(401).send({ 'message': 'No autorizado' })  
        return
    }
  }
  else {
    log_message_text(' * NO AUTORIZADO', '/jugadores/:id -> PUT') 
    res.status(401).send({ 'message': 'No autorizado' })  
    return
  }

  log_message_text(' * PETICION RECIBIDA', '/jugadores/:id -> GET')
  log_message_text(' * Los datos recibidos fueron: ' + JSON.stringify(req.body), '/jugadores/:id -> GET')
  
  log_message_text(' * Los datos recibidos son correctos', '/jugadores/:id -> GET')
  var sql = 'SELECT * FROM usuario WHERE id = ' + req.params.id + ';'

  conn.query(sql, function (err, records) {
    if (err) { 
        log_message_text(' * Error al obtener el usuaro ' + JSON.stringify(err), '/jugadores/:id -> GET')
        res.status(404).send(JSON.parse(JSON.stringify(err)))  
        return;
    }

    if(records.length == 0){
        res.status(404).send({ 'message': 'Usuario no encontrado' })  
        return;
    }

    log_message_text(' * Usuario obtenido correctamente, con id: ' + req.params.id, '/jugadores/:id -> GET')
    var json = JSON.parse(JSON.stringify(records))[0]
    res.status(200).send({ 'id': json.id, 'nombres': json.nombres, 'apellidos': json.apellidos, 'email': json.email, 'administrador': json.administrador })
  });

  log_message_text(' * SE TERMINO DE PROCESAR LA PETICION', '/jugadores/:id -> GET')
})


/*
*   Metodo GET
*   Obtener la información de un usuario en el microservicio de torneos
*   En params se envian:
*   @id: identificador del usuario
*
*   response:
*   200: retorna la información del usuario e indica que el usuario obtenido correctamente.
*   406: Un error al obtener el usuario, posiblemente por que no se ncontro el usuario
*/
app.get('/login', (req, res) => {
  var authorization = req.headers.authorization
  if(authorization !== undefined){
    token = authorization.replace('Bearer ', "")
    var legit = jwt.verify(token, publicKEY, verifyOptions)
    if(legit.scope[3] !== 'usuarios.login'){
        log_message_text(' * NO AUTORIZADO', '/jugadores/:id -> PUT') 
        res.status(401).send({ 'message': 'No autorizado' })  
        return
    }
  }
  else {
    log_message_text(' * NO AUTORIZADO', '/jugadores/:id -> PUT') 
    res.status(401).send({ 'message': 'No autorizado' })  
    return
  }

  log_message_text(' * PETICION RECIBIDA', '/login -> GET')
  log_message_text(' * Los datos recibidos fueron: ' + JSON.stringify(req.query), '/login -> GET')
  
  if(req.query.email != undefined && req.query.password  !== undefined){
    log_message_text(' * Los datos recibidos son correctos', '/login -> GET')
    var sql = 'SELECT * FROM usuario WHERE email = "' + req.query.email + '" AND ' 
            + 'password = "'  + req.query.password + '";'

    conn.query(sql, function (err, records) {
        if (err) { 
            log_message_text(' * Error al obtener el usuaro ' + JSON.stringify(err), '/login -> GET')
            res.status(404).send(JSON.parse(JSON.stringify(err)))  
            return;
        }

        if(records.length == 0){
            res.status(404).send({ 'message': 'Usuario o contraseña no coinciden' })  
            return;
        }
        
        var json = JSON.parse(JSON.stringify(records))[0]
        log_message_text(' * Usuario obtenido correctamente, con id: ' + json.id, '/login -> GET')
        res.status(200).send({ 'id': json.id, 'nombres': json.nombres, 'apellidos': json.apellidos, 'email': json.email, 'administrador': json.administrador })
    });
  }
  else {
    log_message_text(' * Los datos recibidos son incorrectos', '/login -> GET')
    res.status(404).send( {'message':'Datos inválidos'} )  
  }

  log_message_text(' * SE TERMINO DE PROCESAR LA PETICION', '/login -> GET')
})