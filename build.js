const path = require("path");
const spawnSync = require('child_process').spawnSync;

const pathToMyExe = path.join(__dirname, 'telegram-bot.exe'); //just path to exe
const input = process.argv.slice(2); //minus "node" and "this js" arguments

spawnSync(pathToMyExe, input, {stdio: 'inherit'});
