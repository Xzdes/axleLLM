#!/usr/bin/env node

// Этот файл — точка входа для нашего командного интерфейса (CLI).
// Он определяет, какую команду запустил пользователь (`dev`, `start` и т.д.)
// и вызывает соответствующую внутреннюю логику движка.

const path = require('path');
const { runDev, runStart, runPackage } = require('./core/commands');

// process.argv содержит аргументы командной строки.
// [0] = 'node', [1] = '.../cli.js', [2] = 'dev' (или другая команда)
const command = process.argv[2];

// process.cwd() — это путь к папке, из которой была вызвана команда.
// Для нас это будет корневая папка `example-app`.
const appPath = process.cwd();

// Простой роутер для команд.
switch (command) {
  case 'dev':
    // Вызываем функцию, отвечающую за режим разработки.
    runDev(appPath);
    break;

  case 'start':
    // Вызываем функцию, отвечающую за запуск в продакшен-режиме.
    runStart(appPath);
    break;

  case 'package':
    // Вызываем функцию, отвечающую за сборку дистрибутива.
    runPackage(appPath);
    break;

  case 'help':
  default:
    // Если команда не распознана или это 'help', показываем справку.
    showHelp();
    break;
}

/**
 * Отображает справочную информацию по использованию CLI.
 */
function showHelp() {
  console.log(`
  Usage: axle-cli <command>

  Commands:
    dev       Starts the application in development mode.
              (Includes validation, hot-reloading, and DevTools)

    start     Starts the application in production mode.

    package   Packages the application into distributable formats
              for your operating system.

    help      Displays this help message.
  `);
}