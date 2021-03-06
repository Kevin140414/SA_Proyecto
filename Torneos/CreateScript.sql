create table Juego(
    id int auto_increment primary key,
    nombre varchar(100),
    ip varchar(50)
);

create table Torneo(
    id int auto_increment primary key,
    nombre varchar(100),
    juegoid int,
    ganadorid int,
    llave int,
    FOREIGN KEY (juegoid) REFERENCES Juego(id)
);

create table Participacion(
    id int auto_increment primary key,
    usuarioid int,
    torneoid int,
    FOREIGN KEY (torneoid) REFERENCES Torneo(id)
);

create table Partida(
    id VARCHAR(64) primary key,
    jugador1 int,
    jugador2 int,
    llave int,
    torneoid int,
    estado int,
    FOREIGN KEY (jugador1) REFERENCES Participacion(id),
    FOREIGN KEY (jugador2) REFERENCES Participacion(id)
);
