CREATE SCHEMA IF NOT EXISTS `reservaSalas` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ;
USE `reservaSalas` ;
CREATE TABLE IF NOT EXISTS `reservaSalas`.`arquivos` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(255) NOT NULL,
  `tipo_mime` VARCHAR(50) NOT NULL,
  `dados` LONGBLOB NOT NULL,
  `data_upload` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`))
