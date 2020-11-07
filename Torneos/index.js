#!/usr/bin/env node
const { v4: uuidv4 } = require('uuid')
const express = require('express')
const mysql = require('mysql')
const cors = require('cors')
const bodyParser = require('body-parser')
const jwt = require('jsonwebtoken')
const fs = require('fs')

const app = express()
app.use(bodyParser.json())
app.use(cors())

/* ip y puerto donde correra el sevidor nodejs */
const ip = '0.0.0.0'
const port = 3000

/* PUBLIC KEY  */

const publicKEY = fs.readFileSync('./publica.pem', 'utf8')

/* conexion con la base de datos mysql */
const conn = mysql.createConnection({
  host: '35.224.121.88',
  port: '3306',
  user: 'sa',
  password: 'tP1AsPJr9fnDP8Jf',
  database: 'torneos',
  insecureAuth: true
})
/* El servidor se inicia en el puerto indicado */
app.listen(port, () => {
  console.log('Se escucha en el puerto: %d y con la ip: %s', port, ip)
})

/* Nuevo juego */
// Crea un nuevo tipo de juego, se registra la ip y el nombre
app.post('/nuevojuego/', (req, res) => {
  const nombre = req.body.nombre
  const ipjuego = req.body.ip
  const sql = "INSERT INTO Juego(nombre,ip) VALUES('" + nombre + "','" + ipjuego + "');"
  // Registra el Juego
  conn.query(sql, function (err, result) {
    if (err) {
      newlog('Error al crear nuevo nuevo juego')
      res.send({ status: err })
    } else {
      newlog('Juego nuevo creado')
      res.send({ status: req.body })
    }
  })
})

/* Ver juegos */
// Devuelve la lista de juegos registrados en la Base de datos
app.get('/verjuegos/', (req, res) => {
  const sql = 'SELECT * FROM Juego;'
  const envio = []
  conn.query(sql, function (err, result) {
    if (err) {
      newlog('Error al ver juegos')
      res.send({ status: err })
      return
    }
    // Obtiene los juegos registrados en la base de datos
    result.forEach(element => {
      envio.push({ nombre: element.nombre, ip: element.ip, id: element.id })
    })
    newlog('Ver jeugos')
    res.send(envio)
  })
})

/* Crear nuevo torneo */
// Registra un nuevo torneo en la base de datos
app.post('/nuevotorneo/', function (req, res) {
  const nombre = req.body.nombre
  const juegoid = req.body.juegoid
  const llave = req.body.llave
  const sql = "INSERT INTO Torneo(nombre,juegoid,llave) VALUES('" + nombre + "'," + juegoid + ',' + llave + ');'
  // Registra el nuevo torneo
  conn.query(sql, function (err, result) {
    if (err) {
      newlog('Error al crear nuevo troneo')
      res.send({ status: err })
    } else {
      newlog('Torneo nuevo creado')
      res.send({ status: req.body })
    }
  })
})

/* Indica la conclusion de la partida */
// Funcion PUT que recibe en los parametros el id de la partida y en el body el marcador
// Define cual de los dos jugadores tiene mayor marcador y registra al ganador en la
// siguiente fase del torneo o lo declara como ganador del mismo
app.put('/partidas/:id', (req, res) => {
  let token = req.headers.authorization
  // Verifica si viene un token de seguridad en los headers
  if (!token) {
    newlog('Error al recibir token')
    res.status(401).send({
      error: 'Es necesario el token de autenticación'
    })
    return
  }
  // Elimina la palabre Bearer del token
  token = token.replace('Bearer ', '')
  const verifyOptions = {
    algorithm: ['RS256']
  }
  // Verifica el token con la llave publica
  jwt.verify(token, publicKEY, verifyOptions, function (err, user) {
    if (err) {
      // El token utilizado caducó
      newlog('Error token vencido')
      res.status(401).send({ error: 'Token vencido' })
      return
    }
    const partida = req.params.id
    // Si la autenticación es correcta se procede a ingresar los datos
    let sql = 'UPDATE Partida ' +
                'SET estado = 2 ' +
                "WHERE id = '" + partida + "';"
    conn.query(sql, function (err, result) {
      if (err) {
        newlog('Error partida ' + partida + ' no encontrada')
        res.send({ status: err })
        return
      }
      newlog('Partida ' + partida + ' actualizada')
    })
    // Se obtiene el marcador del body
    const marcador = req.body.marcador
    let ganadorid = 0
    let llave = -1
    // Se corrobora si el id de la partida existe
    sql = 'SELECT * FROM Partida WHERE id = "' + partida + '";'
    conn.query(sql, function (err, result) {
      if (err) {
        newlog('Error partida ' + partida + ' no encontrada')
        res.sendStatus(406)
        return
      }
      if (Number(result.length) === 0) {
        newlog('Error partida ' + partida + ' no encontrada')
        res.sendStatus(404)
        return
      }
      // Se define si el ganador es el jugador 1 o el jugador 2
      if (marcador[0] > marcador[1]) { ganadorid = result[0].jugador1 } else { ganadorid = result[0].jugador2 }
      llave = result[0].llave - 1
      // Se define si la partida jugada es una final o una llave simple
      if (llave > 0) {
        // Si no es una final
        const torneoid = result[0].torneoid
        sql = ' SELECT * ' +
                                ' FROM Partida WHERE' +
                                ' torneoid = ' + result[0].torneoid +
                                ' AND jugador2 IS NULL ' +
                                ' ORDER BY id;'
        conn.query(sql, function (err, result) {
          if (err) {
            newlog('Error partida ' + partida + ' no encontrada')
            console.log(err)
            res.sendStatus(406)
            return
          }
          // se registra como una nueva partida y se espera a contrincante
          if (Number(result.length) === 0) {
            const id = uuidv4()
            sql = "INSERT INTO Partida(id, jugador1, llave, torneoid, estado) VALUES('" + id + "'," + ganadorid + ',' + llave + ',' + torneoid + ',0);'
            conn.query(sql, function (err, result) {
              if (err) {
                newlog('Error partida ' + partida + ' no encontrada')
                res.sendStatus(406)
                return
              }
              newlog('Ganador de partida ' + partida + ' registrado')
              res.sendStatus(201)
            })

          // Se registra como contrincante a una partida ya creada
          } else {
            sql = 'UPDATE Partida SET jugador2 = ' + ganadorid + ' WHERE id = "' + result[0].id + '";'
            conn.query(sql, function (err, result) {
              if (err) {
                newlog('Error partida ' + partida + ' no encontrada')
                res.sendStatus(406)
                return
              }
              newlog('Ganador de partida ' + partida + ' registrado')
              res.sendStatus(201)
            })
          }
        })
      } else {
        // En caso de que la partida sea una final
        // Se declara al ganador como ganador del torneo
        const torneowin = result[0].torneoid
        sql = 'UPDATE Torneo SET ganadorid = ' + ganadorid + ' WHERE id = ' + torneowin + ';'
        conn.query(sql, function (err, result) {
          if (err) {
            res.sendStatus(401).send(err)
          } else {
            newlog('Ganador de partida ' + partida + ' registrado, partida define ganador de torneo ' + torneowin)
            res.sendStatus(201)
          }
        })
      }
    })
  })
})

/* Asignar llaves aleartorias */
// Recibe como parametro el id de un torneo con el numero de participantes completos
// y los registra en las llaves de manera aleatoria.
app.get('/asignarllaves/:torneo', (req, res) => {
  const torneo = req.params.torneo
  let lista = []
  let llave = 0
  const sql = 'SELECT p.id as id, t.llave as llave ' +
            'FROM Participacion p, Torneo t ' +
            'WHERE p.torneoid = t.id ' +
            'AND p.torneoid = ' + torneo + ';'
  // Se busacn los participantes inscritos al torneo
  conn.query(sql, function (err, result) {
    if (err) {
      newlog('Error al buscar torneo ' + torneo + ' para asignar llaves')
      res.send({ status: err })
      return
    }
    result.forEach(element => {
      lista.push(element.id)
      llave = element.llave
    })
    // La lista de participantes se ordena aleatoriamente
    lista = shuffle(lista)
    let partida = []
    let bandera = false
    lista.forEach(element => {
      partida.push(element)
      // Se asignan las partidas
      if (!bandera) { bandera = true } else {
        const id = uuidv4()
        const sql = "INSERT INTO Partida(id,jugador1,jugador2,llave,torneoid,estado) VALUES('" + id + "'," + partida[0] + ',' + partida[1] + ',' + llave + ',' + torneo + ',0);'
        conn.query(sql, function (err, result) {
          if (err) {
            newlog('Error al crear partidas de torneo ' + torneo)
            res.send({ status: err })
          }
        })
        bandera = false
        partida = []
      }
    })
    newlog('Llaves aleatorias de torneo ' + torneo + ' asignadas')
    res.send({ lista: lista })
  })
})

/* Asignar usuarios al torneo */
// Registra la participacion de un usario en un torneo.
app.post('/asignarparticipacion/', (req, res, next) => {
  const usuario = req.body.usuarioid
  const torneo = req.body.torneoid

  let datostorneo = []
  let disponibles = 0

  const sql = 'SELECT llave,ganadorid FROM Torneo WHERE id = ' + torneo + ';'
  // Se busca informacion del torneo
  conn.query(sql, function (err, result) {
    if (err) {
      newlog('Error al asignar participacion de user ' + usuario + ' a torneo ' + torneo)
      res.send({ status: err })
      return
    }

    datostorneo = JSON.parse(JSON.stringify(result))
    // Se verifica si existe el torneo
    if (Number(datostorneo.length) === 0) {
      newlog('Torneo ' + torneo + ' no existe para asignar participacion de user ' + usuario)
      res.send({ status: 'No existe torneo' })
    } else { datostorneo = datostorneo[0] }
    // Se verifica que el torneo no haya terminado
    if (datostorneo.ganadorid != null) {
      newlog('Torneo ' + torneo + ' ya finalizado para asignar participacion de user ' + usuario)
      res.send({ status: 'Torneo ya finalizado' })
    } else {
      const sql = 'SELECT count(*) as num FROM Participacion WHERE torneoid = ' + torneo + ';'
      conn.query(sql, function (err, result) {
        if (err) {
          newlog('Error al asignar participacion de user ' + usuario + ' a torneo ' + torneo)
          res.send({ status: err })
          return
        }
        // Se cuenta el numero de participantes que tiene el torneo
        disponibles = result[0].num
        const maxusers = Math.pow(2, datostorneo.llave)
        // Se verifica que el torneo no esté lleno
        if (disponibles < maxusers) {
          const sql = 'SELECT * FROM Participacion WHERE usuarioid = ' + usuario + ' AND torneoid = ' + torneo + ';'
          conn.query(sql, function (err, result) {
            if (err) {
              newlog('Error al asignar participacion de user ' + usuario + ' a torneo ' + torneo)
              res.send({ status: err })
              return
            }
            // Se verifica que el usuario no este registrado ya en el torneo
            if (JSON.parse(JSON.stringify(result)).length > 0) {
              newlog('Error user ' + usuario + ' ya registrado a torneo ' + torneo)
              res.send({ status: 'Usuario ya registrado en el torneo' })
            } else {
              // Se asigna la participacion al torneo
              const sql = 'INSERT INTO Participacion(usuarioid,torneoid) VALUES(' + usuario + ',' + torneo + ');'
              conn.query(sql, function (err, result) {
                if (err) {
                  newlog('Error al asignar participacion de user ' + usuario + ' a torneo ' + torneo)
                  res.send({ status: err })
                  return
                }
                disponibles = disponibles + 1
                newlog('User ' + usuario + ' asignado a torneo ' + torneo)
                res.send({ status: 'Usuario ' + usuario + ' asignado a torneo ' + torneo, registrados: disponibles })
              })
            }
          })
        } else {
          newlog('Torneo ' + torneo + ' lleno para asignar participacion de user ' + usuario)
          res.send({ status: 'Torneo lleno', registrados: disponibles })
        }
      })
    }
  })
})

/* Obtener las llaves de un torneo */
// Se crea un archivo JSON con la informacion del torneo y sus llaves
app.get('/verllaves/:torneo', (req, res) => {
  const torneo = req.params.torneo
  let sql = 'SELECT nombre, llave, ganadorid, (SELECT usuarioid FROM Participacion p WHERE p.torneoid = t.id AND p.id = t.ganadorid) AS ganador FROM Torneo t WHERE id = ' + torneo + ';'
  // Se inicia el archivo JSON y se busca la informacion del torneo
  let JSONtxt = '{'
  conn.query(sql, function (err, result) {
    if (err) {
      newlog('Error al ver llaves de torneo ' + torneo)
      res.send({ status: err })
      return
    }
    // Se agrega la informacion GENERAL del torneo al JSON
    JSONtxt = JSONtxt + '"nombre": "' + result[0].nombre + '",'
    JSONtxt = JSONtxt + '"ganador": ' + result[0].ganador + ','
    JSONtxt = JSONtxt + '"llave": ' + result[0].llave + ','
    let llaves = result[0].llave
    sql = 'SELECT Part1.usuarioid as id1, Part2.usuarioid as id2, p.llave as llavepart, p.id as id, p.estado ' +
                'FROM Partida p ' +
                'INNER JOIN Participacion Part1 on p.jugador1 =Part1.id ' +
                'INNER JOIN Participacion Part2 on p.jugador2 =Part2.id ' +
                'WHERE Part1.torneoid = ' + torneo + ' AND p.torneoid = ' + torneo + ';'
    // Se buscan las partidas que pertenezcan al torneo
    conn.query(sql, function (err, result) {
      if (err) {
        newlog('Error al ver llaves de torneo ' + torneo)
        res.send({ status: err })
        return
      }
      // Se divide el JSON segun las fases del torneo
      while (llaves > 0) {
        JSONtxt = JSONtxt + '"fase' + llaves + '":['
        result.forEach(element => {
          // Se agrega la informacion de cada partida
          if (Number(element.llavepart) === llaves) {
            JSONtxt = JSONtxt + '{'
            JSONtxt = JSONtxt + '"partida": "' + element.id + '",'
            JSONtxt = JSONtxt + '"jugador1": ' + element.id1 + ','
            JSONtxt = JSONtxt + '"jugador2": ' + element.id2 + ','
            JSONtxt = JSONtxt + '"estado": ' + element.estado
            JSONtxt = JSONtxt + '},'
          }
        })
        // Se eliminan caracteres no deseados del JSON
        if (JSONtxt[JSONtxt.length - 1] === ',') { JSONtxt = JSONtxt.slice(0, -1) }
        JSONtxt = JSONtxt + '],'
        llaves = llaves - 1
      }
      if (JSONtxt[JSONtxt.length - 1] === ',') { JSONtxt = JSONtxt.slice(0, -1) }
      JSONtxt = JSONtxt + '}'
      JSONtxt = JSON.parse(JSONtxt)
      newlog('Mostrando llaves de torneo ' + torneo)
      res.send(JSONtxt)
    })
  })
})

/* Ver torneos ya ganados */
// Devuelve los torneos que ya cuentan con un ganador
app.get('/verganados/', (req, res) => {
  const sql = 'SELECT t.id, t.nombre AS nombre, t.ganadorid, t.llave, j.nombre AS nombrej FROM Torneo t, Juego j WHERE ganadorid IS NOT NULL AND j.id = t.juegoid;'
  const envio = []
  conn.query(sql, function (err, result) {
    if (err) {
      newlog('Error al ver torneos ganados')
      res.send({ status: err })
      return
    }
    result.forEach(element => {
      envio.push({ nombre: element.nombre, ganador: element.ganadorid, llaves: element.llave, nombrej: element.nombrej, id: element.id })
    })
    newlog('Ver torneos ganados')
    res.send(envio)
  })
})

/* Ver torneos presentes */
// Devuelve los torneos que ya iniciaron pero no han terminado
app.get('/verpresentes/', (req, res) => {
  const sql = 'SELECT t.id as torneo, (SELECT COUNT(*) FROM Partida p WHERE p.torneoid = t.id) as state, j.nombre as nombrej, count(p.usuarioid) as numusers, t.llave as llave, t.nombre as nombre ' +
            'FROM Torneo t, Participacion p, Juego j ' +
            'WHERE t.id = p.torneoid ' +
            'AND t.ganadorid IS NULL ' +
            'AND j.id = t.juegoid ' +
            'GROUP BY p.torneoid ' +
            'HAVING numusers = pow(2,llave); '
  const envio = []
  conn.query(sql, function (err, result) {
    if (err) {
      newlog('Error al ver torneos presentes')
      res.send({ status: err })
      return
    }
    result.forEach(element => {
      envio.push({ nombre: element.nombre, state: element.state, nombrej: element.nombrej, llaves: element.llave, id: element.torneo })
    })
    newlog('Ver torneos presentes')
    res.send(envio)
  })
})

/* Ver torneos futuros */
// Devuelve los torneos que no tienen participaciones registradas
// o las participaciones son insuficientes para iniciar el torneo
app.get('/verfuturos/', (req, res) => {
  const sql = 'SELECT t.id as torneo, j.nombre as nombrej, (SELECT COUNT(*) FROM Participacion p WHERE p.torneoid = t.id) as numusers, t.llave as llave, t.nombre as nombre ' +
            'FROM Torneo t, Juego j WHERE j.id = t.juegoid AND t.ganadorid IS NULL GROUP BY t.id HAVING numusers < pow(2,llave);'

  const envio = []
  conn.query(sql, function (err, result) {
    if (err) {
      newlog('Error al ver torneos futuros')
      res.send({ status: err })
      return
    }
    result.forEach(element => {
      envio.push({ nombre: element.nombre, nombrej: element.nombrej, llaves: element.llave, id: element.torneo, registrados: element.numusers })
    })
    newlog('Ver torneos futuros')
    res.send(envio)
  })
})

/* Ver participantes de un torneo */
// Devuelve los usuarios que participan en un torneo
app.get('/participantes/:id', (req, res) => {
  const id = req.params.id
  const sql = 'SELECT * FROM Participacion p WHERE torneoid =' + id + ';'

  const envio = []
  conn.query(sql, function (err, result) {
    if (err) {
      newlog('Error al obtener los participantes del torneo')
      res.send({ status: err })
      return
    }
    result.forEach(element => {
      envio.push({ particpante: element.usuarioid })
    })
    newlog('Ver participantes del torneo')
    res.send(envio)
  })
})

/* Asignar llaves aleartorias */
// Inicia una partida
app.get('/iniciarpartida/:id', (req, res) => {
  const id = req.params.id
  const sql = 'UPDATE Partida ' +
            'SET estado = 1 ' +
            "WHERE id = '" + id + "';"
  conn.query(sql, function (err, result) {
    if (err) {
      newlog('Error al iniciar la partida ' + id)
      res.send({ status: err })
      return
    }
    newlog('Partida ' + id + 'iniciada')
    res.send('Partida iniciada')
  })
})

/* Ver torneos User ganados */
// Devuelve los torneos ganados por cierto usuario
app.get('/userganados/:usuario', (req, res) => {
  const usuario = req.params.usuario
  const sql = 'SELECT t.id, t.nombre AS nombre, t.ganadorid, t.llave, j.nombre AS nombrej, (SELECT COUNT(*) FROM Participacion p WHERE p.torneoid = t.id AND p.usuarioid = ' + usuario + ') as num ' +
            ' FROM Torneo t, Juego j ' +
            ' WHERE ganadorid IS NOT NULL AND j.id = t.juegoid HAVING num > 0;'

  const envio = []
  conn.query(sql, function (err, result) {
    if (err) {
      newlog('Error al ver torneos ganados por usuario ' + usuario)
      res.send({ status: err })
      return
    }
    result.forEach(element => {
      envio.push({ nombre: element.nombre, ganador: element.ganadorid, llaves: element.llave, nombrej: element.nombrej, id: element.id })
    })
    newlog('Ver torneos ganados por usuario ' + usuario)
    res.send(envio)
  })
})

/* Ver torneos User no terminados */
// Devuelve los torneos en los que está participado un usuario
app.get('/userparticipacion/:usuario', (req, res) => {
  const usuario = req.params.usuario
  const sql = 'SELECT t.id as id, t.nombre as nombre, MIN(p.llave) as llave ' +
            'FROM Participacion part, Partida p, Torneo t ' +
            'WHERE part.torneoid = t.id ' +
            'AND (part.id  = p.jugador1 OR part.id = p.jugador2) ' +
            'AND part.usuarioid = ' + usuario +
            ' GROUP BY t.id; '
  const envio = []
  conn.query(sql, function (err, result) {
    if (err) {
      newlog('Error al ver torneos futuros')
      res.send({ status: err })
      return
    }
    result.forEach(element => {
      envio.push({ nombre: element.nombre, llave: element.llave, id: element.id })
    })
    newlog('Ver torneos no finalizados de usuario ' + usuario)
    res.send(envio)
  })
})

/* ------------------------- FUNCIONES ------------------------- */
function shuffle (array) {
  let currentIndex = array.length; let temporaryValue; let randomIndex

  // While there remain elements to shuffle...
  while (currentIndex !== 0) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex)
    currentIndex -= 1

    // And swap it with the current element.
    temporaryValue = array[currentIndex]
    array[currentIndex] = array[randomIndex]
    array[randomIndex] = temporaryValue
  }
  return array
}
// Registra fecha y hora de un log
function newlog (data) {
  const now = new Date()
  const fecha = now.getDate() + '/' + now.getMonth() + '/' + now.getFullYear() + ' ' + now.getHours() + ':' + now.getMinutes()
  data = '[torneos]' + fecha + '-> ' + data
  console.log(data)
  convert(data);
}

function convert(data) {
  fs.appendFile("log.txt", data + "\n", function (err) {
    if (err) throw err;
    console.log("Saved!");
  });
}