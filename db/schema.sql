CREATE DATABASE IF NOT EXISTS financas
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE financas;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS financial_settings (
  user_id INT UNSIGNED NOT NULL,
  monthly_income DECIMAL(12, 2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_settings_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS transactions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  type ENUM('income', 'expense', 'transfer') NOT NULL,
  description VARCHAR(160) NOT NULL,
  category VARCHAR(80) NOT NULL DEFAULT 'Geral',
  amount DECIMAL(12, 2) NOT NULL,
  transaction_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_transactions_user_date (user_id, transaction_date),
  CONSTRAINT fk_transactions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS investments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL,
  type VARCHAR(80) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  profitability DECIMAL(6, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_investments_user (user_id),
  CONSTRAINT fk_investments_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB;
