#!/usr/bin/env node
const { v4: uuidv4 } = require('uuid');
const express = require('express');
const mysql = require('mysql');
const request = require('request')
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const fs = require('fs');

const app = express();
app.use(bodyParser.json())
app.use(cors());

/*ip y puerto donde correra el sevidor nodejs*/
const ip = "0.0.0.0";
const port = 3000;

/*PUBLIC KEY  */

var publicKEY  = fs.readFileSync('./publica.pem', 'utf8');

/*conexion con la base de datos mysql*/
var conn = mysql.createConnection({
    host: "35.224.121.88",
    port: "3306",
    user: "sa",
    password: "tP1AsPJr9fnDP8Jf",
    database: "torneos"
});

app.listen(port, () => {
    console.log('Se escucha en el puerto: %d y con la ip: %s',port);
});

/*Nuevo juego */
app.post('/nuevojuego/',(req,res)=>{
    var nombre = req.body.nombre;
    var ipjuego = req.body.ip;
    var sql = "INSERT INTO Juego(nombre,ip) VALUES('"+nombre+"','"+ipjuego+"');";
    conn.query(sql, function (err, result) {
        if (err) {
            newlog('Error al crear nuevo nuevo juego')
            res.send({status: err});
        }
        else {
            newlog('Juego nuevo creado')
            res.send({status:req.body});
        }
    });
});

/*Ver juegos */
app.get('/verjuegos/',(req,res)=>{
    var sql = "SELECT * FROM Juego;"
    envio = []
    conn.query(sql, function (err, result) {
        if (err) {
            newlog('Error al ver juegos')
            res.send({status:err}) 
            return
        }
        result.forEach(element => {
            envio.push({nombre: element.nombre,ip:element.ip,id:element.id})
        });
        newlog('Ver jeugos')
        res.send(envio)
    });
})


/* Crear nuevo torneo */
app.post('/nuevotorneo/', function (req, res) {
    var nombre = req.body.nombre;
    var juegoid = req.body.juegoid;
    var llave = req.body.llave;
    var sql = "INSERT INTO Torneo(nombre,juegoid,llave) VALUES('"+nombre+"',"+juegoid+","+llave+");";
    conn.query(sql, function (err, result) {
        if (err) {
            newlog('Error al crear nuevo troneo')
            res.send({status: err});
        }
        else {
            newlog('Torneo nuevo creado')
            res.send({status:req.body});
        }
    });
});

/* Indica la conclusion de la partida */
app.put('/partidas/:id',(req,res)=>{
    var token = req.headers['authorization']
    if(!token){
        newlog('Error al recibir token')
        res.status(401).send({
          error: "Es necesario el token de autenticación"
        })
        return
    }
    token = token.replace('Bearer ', '')
    var verifyOptions = {
        algorithm:  ["RS256"]
    };
    
    jwt.verify(token, publicKEY, verifyOptions, function(err, user) {
        if (err) {
            console.log(err)
            newlog('Error token vencido')
            res.status(401).send({error: "Token vencido"})
            return
        }
        var partida = req.params.id

        var sql = "UPDATE Partida "+
            "SET estado = 2 "+
            "WHERE id = '"+ partida +"';";
        conn.query(sql, function (err, result) {
            if (err) {
                newlog('Error partida '+partida+ ' no encontrada')
                res.send({status:err}) 
                return
            }
            newlog('Partida '+partida+ ' actualizada')
        });

        var marcador = req.body.marcador
        var ganadorid = 0
        var llave=-1
        var sql = "SELECT * FROM Partida WHERE id = \""+partida+"\";"
        conn.query(sql, function (err, result) {
            if (err) {
                newlog('Error partida '+partida+ ' no encontrada')
                res.sendStatus(406) 
                return
            }
            if (result.length == 0){
                newlog('Error partida '+partida+ ' no encontrada')
                res.sendStatus(404)
                return
            }
            if(marcador[0]>marcador[1]){ganadorid = result[0].jugador1}
            else{ganadorid = result[0].jugador2}
            llave = result[0].llave - 1
            if (llave>0){
                var torneoid = result[0].torneoid;
                var sql =" SELECT * "
                        +" FROM Partida WHERE"
                        +" torneoid = " + result[0].torneoid
                        +" AND jugador2 IS NULL "
                        +" ORDER BY id;"

                conn.query(sql, function(err,result){
                    if(err){
                        newlog('Error partida '+partida+ ' no encontrada')
                        console.log(err)
                        res.sendStatus(406)
                        return
                    }
                    if (result.length == 0){
                        var id = uuidv4();
                        var sql = "INSERT INTO Partida(id, jugador1, llave, torneoid, estado) VALUES('"+id+"',"+ganadorid+","+llave+","+torneoid+",0);"
                        conn.query(sql, function(err,result){
                            if (err) {
                                newlog('Error partida '+partida+ ' no encontrada')
                                res.sendStatus(406) 
                                return
                            }
                            newlog('Ganador de partida '+partida+ ' registrado')
                            res.sendStatus(201)
                            return
                        });
                    }else{
                        var sql = "UPDATE Partida SET jugador2 = "+ganadorid+" WHERE id = \""+result[0].id+"\";"
                        conn.query(sql, function(err,result){
                            if (err) {
                                newlog('Error partida '+partida+ ' no encontrada')
                                res.sendStatus(406) 
                                return
                            }
                            newlog('Ganador de partida '+partida+ ' registrado')
                            res.sendStatus(201)
                            return
                        });
                    }
                });
            }else{
                var torneowin = result[0].torneoid;
                var sql = "UPDATE Torneo SET ganadorid = "+ganadorid+" WHERE id = "+torneowin+";"
                conn.query(sql, function (err, result) {
                    newlog('Ganador de partida '+partida+ ' registrado, partida define ganador de torneo '+torneowin)
                    res.sendStatus(201)
                    return
                });
            }
        });
    });   
    
});

/*Asignar llaves aleartorias*/
app.get('/asignarllaves/:torneo',(req,res)=>{
    var torneo = req.params.torneo
    var lista = []
    var llave = 0
    var sql = "SELECT p.id as id, t.llave as llave "+
            "FROM Participacion p, Torneo t "+
            "WHERE p.torneoid = t.id "+
            "AND p.torneoid = "+torneo+";";
    conn.query(sql, function (err, result) {
        if (err) {
            newlog('Error al buscar torneo '+torneo+' para asignar llaves')
            res.send({status:err}) 
            return
        }
        result.forEach(element => {
            lista.push(element.id)
            llave = element.llave
        });
        lista=shuffle(lista)
        partida =[]
        bandera = false
        lista.forEach(element => {
            partida.push(element)
            if (!bandera){bandera = true}
            else{
                var id = uuidv4();
                var sql="INSERT INTO Partida(id,jugador1,jugador2,llave,torneoid,estado) VALUES('"+id+"',"+partida[0]+","+partida[1]+","+llave+","+torneo+",0);"
                conn.query(sql,function(err,result){
                    if(err) {
                        newlog('Error al crear partidas de torneo '+torneo)
                        res.send({status:err})
                        return
                    }
                });
                bandera=false
                partida=[]
            } 
        });
        newlog('Llaves aleatorias de torneo '+torneo + ' asignadas')
        res.send({lista:lista})
    });
});

/*Asignar usuarios al torneo*/
app.post('/asignarparticipacion/', (req, res,next)=> {
    var usuario = req.body.usuarioid
    var torneo = req.body.torneoid

    var datostorneo = []
    var disponibles = 0
    
    var sql = "SELECT llave,ganadorid FROM Torneo WHERE id = "+torneo+";";
    
    conn.query(sql, function (err, result) {
        if (err) {
            newlog('Error al asignar participacion de user '+usuario + ' a torneo '+torneo)
            res.send({status:err}) 
            return
        }
        
        datostorneo = JSON.parse(JSON.stringify(result));
        
        if (datostorneo.length == 0){
            newlog('Torneo '+torneo+' no existe para asignar participacion de user '+usuario)
            res.send({status : "No existe torneo"})
        }
        else{datostorneo=datostorneo[0]}
        if( datostorneo.ganadorid != null){
            newlog('Torneo '+torneo+' ya finalizado para asignar participacion de user '+usuario)
            res.send({status : "Torneo ya finalizado"})
        }
        else{
            var sql = "SELECT count(*) as num FROM Participacion WHERE torneoid = "+torneo+";";
            conn.query(sql, function (err, result) {
                if (err) {
                    newlog('Error al asignar participacion de user '+usuario + ' a torneo '+torneo)
                    res.send({status:err}) 
                    return
                }
                disponibles = result[0].num;
                maxusers = Math.pow(2,datostorneo.llave)
                if (disponibles<maxusers){
                    var sql = "SELECT * FROM Participacion WHERE usuarioid = "+usuario+" AND torneoid = "+torneo+";";
                    conn.query(sql, function (err, result) {
                        if (err) {
                            newlog('Error al asignar participacion de user '+usuario + ' a torneo '+torneo)
                            res.send({status:err}) 
                            return
                        }
                        if (JSON.parse(JSON.stringify(result)).length > 0){
                            newlog('Error user '+usuario + ' ya registrado a torneo '+torneo)
                            res.send({status:"Usuario ya registrado en el torneo"})
                        }
                        else{
                            var sql = "INSERT INTO Participacion(usuarioid,torneoid) VALUES("+usuario+","+torneo+");";
                            conn.query(sql, function (err, result) {
                                if (err) {
                                    newlog('Error al asignar participacion de user '+usuario + ' a torneo '+torneo)
                                    res.send({status:err}) 
                                    return
                                }
                                disponibles = disponibles+1
                                if (disponibles == maxusers){

                                }
                                newlog('User '+usuario + ' asignado a torneo '+torneo)
                                res.send({status: "Usuario "+usuario+" asignado a torneo "+torneo, registrados: disponibles });
                            });
                        }
                    });
                }else{
                    newlog('Torneo '+torneo+' lleno para asignar participacion de user '+usuario)
                    res.send({status:"Torneo lleno", registrados: disponibles})
                }
            });
        }
    });
});

/* Obtener las llaves de un torneo*/
app.get('/verllaves/:torneo',(req,res)=>{
    var torneo = req.params.torneo
    var sql = "SELECT nombre, llave, ganadorid, (SELECT usuarioid FROM Participacion p WHERE p.torneoid = t.id AND p.id = t.ganadorid) AS ganador FROM Torneo t WHERE id = "+torneo+";"
    var JSONtxt = "{"
    conn.query(sql, function (err, result) {
        if (err) {
            newlog('Error al ver llaves de torneo '+torneo)
            res.send({status:err}) 
            return
        }
        JSONtxt = JSONtxt + '\"nombre\": "'+result[0].nombre+'",'
        JSONtxt = JSONtxt + '\"ganador\": '+result[0].ganador+","
        JSONtxt = JSONtxt + '\"llave\": '+result[0].llave+","
        var llaves = result[0].llave
        sql = "SELECT Part1.usuarioid as id1, Part2.usuarioid as id2, p.llave as llavepart, p.id as id, p.estado "
            + "FROM Partida p "
            + "INNER JOIN Participacion Part1 on p.jugador1 =Part1.id "
            + "INNER JOIN Participacion Part2 on p.jugador2 =Part2.id "
            + "WHERE Part1.torneoid = "+torneo +" AND p.torneoid = " +torneo+ ";"
        conn.query(sql, function (err, result) {
            if (err) {
                newlog('Error al ver llaves de torneo '+torneo)
                res.send({status:err}) 
                return
            }
            while(llaves>0){
                JSONtxt = JSONtxt + '\"fase' + llaves + '\":['
                result.forEach(element => {
                    if(element.llavepart == llaves){
                        JSONtxt = JSONtxt + "{"
                        JSONtxt = JSONtxt + '\"partida\": "'+element.id+'",'
                        JSONtxt = JSONtxt + '\"jugador1\": '+element.id1+','
                        JSONtxt = JSONtxt + '\"jugador2\": '+element.id2+','
                        JSONtxt = JSONtxt + '\"estado\": '+element.estado
                        JSONtxt = JSONtxt + "},"
                    }
                });
                if (JSONtxt[JSONtxt.length-1]==","){JSONtxt = JSONtxt.slice(0,-1)}
                JSONtxt=JSONtxt+"],"
                llaves = llaves -1
            }
            if (JSONtxt[JSONtxt.length-1]==","){JSONtxt = JSONtxt.slice(0,-1)}
            JSONtxt = JSONtxt + "}"
            JSONtxt = JSON.parse(JSONtxt)
            newlog('Mostrando llaves de torneo '+torneo)
            res.send(JSONtxt)
        });
        
    });
});

/*Ver torneos ya ganados */
app.get('/verganados/',(req,res)=>{
    var sql = "SELECT t.id, t.nombre AS nombre, t.ganadorid, t.llave, j.nombre AS nombrej FROM Torneo t, Juego j WHERE ganadorid IS NOT NULL AND j.id = t.juegoid;"
    envio = []
    conn.query(sql, function (err, result) {
        if (err) {
            newlog('Error al ver torneos ganados')
            res.send({status:err}) 
            return
        }
        result.forEach(element => {
            envio.push({nombre: element.nombre, ganador:element.ganadorid, llaves:element.llave, nombrej: element.nombrej, id: element.id})
        });
        newlog('Ver torneos ganados')
        res.send(envio)
    });
});

/*Ver torneos presentes */
app.get('/verpresentes/',(req,res)=>{
    var sql = "SELECT t.id as torneo, (SELECT COUNT(*) FROM Partida p WHERE p.torneoid = t.id) as state, j.nombre as nombrej, count(p.usuarioid) as numusers, t.llave as llave, t.nombre as nombre "
            + "FROM Torneo t, Participacion p, Juego j "
            + "WHERE t.id = p.torneoid "
            + "AND t.ganadorid IS NULL "
            + "AND j.id = t.juegoid "
            + "GROUP BY p.torneoid "
            + "HAVING numusers = pow(2,llave); "
    envio = []
    conn.query(sql, function (err, result) {
        if (err) {
            newlog('Error al ver torneos presentes')
            res.send({status:err}) 
            return
        }
        result.forEach(element => {
            envio.push({nombre: element.nombre, state: element.state, nombrej: element.nombrej,llaves:element.llave,id:element.torneo})
        });
        newlog('Ver torneos presentes')
        res.send(envio)
    });
});

/*Ver torneos futuros */
app.get('/verfuturos/',(req,res)=>{
    var sql = "SELECT t.id as torneo, j.nombre as nombrej, (SELECT COUNT(*) FROM Participacion p WHERE p.torneoid = t.id) as numusers, t.llave as llave, t.nombre as nombre " +
            "FROM Torneo t, Juego j WHERE j.id = t.juegoid AND t.ganadorid IS NULL GROUP BY t.id HAVING numusers < pow(2,llave);";

    envio = []
    conn.query(sql, function (err, result) {
        if (err) {
            newlog('Error al ver torneos futuros')
            res.send({status:err}) 
            return
        }
        result.forEach(element => {
            envio.push({nombre: element.nombre, nombrej: element.nombrej,llaves:element.llave,id:element.torneo,registrados: element.numusers})
        });
        newlog('Ver torneos futuros')
        res.send(envio)
    });
});

/*Ver participantes de un torneo */
app.get('/participantes/:id',(req,res)=>{
    var id = req.params.id
    var sql = "SELECT * FROM Participacion p WHERE torneoid ="+id+";"

    envio = []
    conn.query(sql, function (err, result) {
        if (err) {
            newlog('Error al obtener los participantes del torneo')
            res.send({status:err}) 
            return
        }
        result.forEach(element => {
            envio.push({particpante: element.usuarioid})
        });
        newlog('Ver participantes del torneo')
        res.send(envio)
    });
});

/*Asignar llaves aleartorias*/
app.get('/iniciarpartida/:id',(req,res)=>{
    var id = req.params.id
    var sql = "UPDATE Partida "+
            "SET estado = 1 "+
            "WHERE id = '"+ id +"';";
    conn.query(sql, function (err, result) {
        if (err) {
            newlog('Error al iniciar la partida ' + id)
            res.send({status:err}) 
            return
        }
        newlog('Partida ' + id + 'iniciada')
        res.send('Partida iniciada')
    });
});

/*Ver torneos User ganados*/
app.get('/userganados/:usuario',(req,res)=>{
    var usuario = req.params.usuario
    var sql = "SELECT t.id, t.nombre AS nombre, t.ganadorid, t.llave, j.nombre AS nombrej, (SELECT COUNT(*) FROM Participacion p WHERE p.torneoid = t.id AND p.usuarioid = " + usuario + ") as num " 
            + " FROM Torneo t, Juego j " 
            + " WHERE ganadorid IS NOT NULL AND j.id = t.juegoid HAVING num > 0;"
    
    envio = []
    conn.query(sql, function (err, result) {
        if (err) {
            newlog('Error al ver torneos ganados por usuario '+usuario)
            res.send({status:err}) 
            return
        }
        result.forEach(element => {
            envio.push({nombre: element.nombre, ganador:element.ganadorid, llaves:element.llave, nombrej: element.nombrej, id: element.id})
        });
        newlog('Ver torneos ganados pur usuario '+usuario)
        res.send(envio)
    });
});

/*Ver torneos User no terminados */
app.get('/userparticipacion/:usuario',(req,res)=>{
    var usuario = req.params.usuario
    var sql = "SELECT t.id as id, t.nombre as nombre, MIN(p.llave) as llave "
            + "FROM Participacion part, Partida p, Torneo t "
            + "WHERE part.torneoid = t.id "
            + "AND (part.id  = p.jugador1 OR part.id = p.jugador2) "
            + "AND part.usuarioid = "+usuario
            + " GROUP BY t.id; "
    envio = []
    conn.query(sql, function (err, result) {
        if (err) {
            newlog('Error al ver torneos futuros')
            res.send({status:err}) 
            return
        }
        result.forEach(element => {
            envio.push({nombre: element.nombre,llave:element.llave,id:element.id})
        });
        newlog('Ver torneos no finalizados de usuario '+usuario)
        res.send(envio)
    });
});




/*------------------------- FUNCIONES -------------------------*/
function shuffle(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;
  
    // While there remain elements to shuffle...
    while (0 !== currentIndex) {
  
      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;
  
      // And swap it with the current element.
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }
  
    return array;
}


function newlog(data){
    let now= new Date();
    fecha = now.getDate()+"/"+now.getMonth()+"/"+now.getFullYear()+" "+now.getHours()+":"+now.getMinutes()
    data = '[torneos]'+fecha+'-> '+data
    console.log(data)
}


