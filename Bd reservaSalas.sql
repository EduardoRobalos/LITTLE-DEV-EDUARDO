create table reserva(
   reservaID int auto_increment primary key,
   statusReserva enum('Reservada', 'Disponível') default 'Disponível',
   periodo varchar (20),
   salasID int,
   foreign key(salasID) references salas(salasID),
   dataInicio datetime,
   dataTermino datetime
);

create table salas(
 salasID int auto_increment primary key,
 numero numeric(3),
 andar varchar(3),
 bloco varchar(3),
 capacidade varchar(3)
);

create table solicitante(
  solicitante int auto_increment primary key,
  nome varchar(60),
   salasID int,
   foreign key(salasID) references salas(salasID)
);

create table cadastroSalas(
cadastroID int auto_increment primary key,
 numero numeric(3),
 andar varchar(3),
 bloco varchar(3),
 tipo varchar (20)
);

create table relatorio(
  relatorioID int auto_increment primary key,
  descricao varchar(250),
   dataInicio datetime,
   dataTermino datetime
)