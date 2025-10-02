create table professores(
  professoresID int auto_increment primary key,
  nome varchar(100)
);

create table salas(
  salasID int auto_increment primary key,
  numero numeric(3),
  andar numeric(3),
  capacidade numeric(3),
  tipo varchar(40),
  professoresID int, 
  foreign key(professoresID) references professores(professoresID),
  periodo varchar(10),
  statusSala enum('reservada','disponível') default 'disponível',
  dataInicio datetime,
  dataTermino datetime
);

create table solicitantes(
  solicitantesID int auto_increment primary key,
  professoresID int, 
  foreign key(ProfessoresID) references professores(ProfessoresID),
  periodo varchar(20)
);

create table cadastroSalas(
  cadastroID int auto_increment primary key,
  numero numeric(3),
  andar numeric(3),
  bloco varchar(3),
  tipo varchar(40)
);

create table notificacao(
   notificacaoID int auto_increment primary key,
   descricao varchar(250)
)