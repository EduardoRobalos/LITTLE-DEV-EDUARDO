-- Criar DB e tabelas com esquema compatível com as imagens e código
CREATE DATABASE IF NOT EXISTS reservaSalas;
USE reservaSalas;

-- Tabela salas
CREATE TABLE IF NOT EXISTS salas (
  salasID INT AUTO_INCREMENT PRIMARY KEY,
  numero VARCHAR(10),
  andar VARCHAR(10),
  bloco VARCHAR(10),
  capacidade INT
);

-- Tabela solicitante
CREATE TABLE IF NOT EXISTS solicitante (
  solicitanteID INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(60) NOT NULL
);

-- Tabela reserva (com foreign keys)
CREATE TABLE IF NOT EXISTS reserva (
  reservaID INT AUTO_INCREMENT PRIMARY KEY,
  statusReserva ENUM('Reservada','Disponível') DEFAULT 'Disponível',
  periodo VARCHAR(50),
  salasID INT,
  dataInicio DATETIME,
  dataTermino DATETIME,
  solicitanteID INT,
  FOREIGN KEY (salasID) REFERENCES salas(salasID) ON DELETE CASCADE,
  FOREIGN KEY (solicitanteID) REFERENCES solicitante(solicitanteID) ON DELETE SET NULL
);

-- Tabela relatorio (opcional)
CREATE TABLE IF NOT EXISTS relatorio (
  relatorioID INT AUTO_INCREMENT PRIMARY KEY,
  descricao VARCHAR(250),
  dataInicio DATETIME,
  dataTermino DATETIME
);

INSERT INTO salas (numero, andar, bloco, capacidade) VALUES
('101', '1º', 'A', 20),
('205', '2º', 'B', 50),
('310', '3º', 'C', 15),
('402', '4º', 'A', 30),
('501', '5º', 'B', 10);

-- Inserção de dados na tabela solicitante (5 registros)
INSERT INTO solicitante (nome) VALUES
('Ana Souza'),
('Bruno Lima'),
('Carla Mendes'),
('Daniel Alves'),
('Eduarda Costa');

-- Inserção de dados na tabela reserva (5 registros)
-- Nota: Os IDs de salas e solicitantes referenciam os dados inseridos acima.
INSERT INTO reserva (statusReserva, periodo, salasID, dataInicio, dataTermino, solicitanteID) VALUES
('Reservada', 'Manhã (08h-12h)', 1, '2025-11-10 08:00:00', '2025-11-10 12:00:00', 1),
('Reservada', 'Tarde (14h-18h)', 3, '2025-11-10 14:00:00', '2025-11-10 18:00:00', 2),
('Reservada', 'Integral (08h-18h)', 2, '2025-11-11 08:00:00', '2025-11-11 18:00:00', 3),
('Disponível', 'Noite (19h-22h)', 4, '2025-11-12 19:00:00', '2025-11-12 22:00:00', 4),
('Reservada', 'Manhã (09h-11h)', 5, '2025-11-13 09:00:00', '2025-11-13 11:00:00', 5);

-- Inserção de dados na tabela relatorio (5 registros)
INSERT INTO relatorio (descricao, dataInicio, dataTermino) VALUES
('Relatório de ocupação do Bloco A (Outubro)', '2025-10-01 00:00:00', '2025-10-31 23:59:59'),
('Solicitações canceladas na última semana', '2025-11-01 00:00:00', '2025-11-07 23:59:59'),
('Salas com capacidade acima de 25 pessoas', '2025-01-01 00:00:00', '2025-12-31 23:59:59'),
('Uso de salas por andar (Outubro)', '2025-10-01 00:00:00', '2025-10-31 23:59:59'),
('Reservas futuras confirmadas para Novembro', '2025-11-08 00:00:00', '2025-11-30 23:59:59');
