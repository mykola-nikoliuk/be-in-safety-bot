import { config } from 'dotenv';

config();

import { CallbackCommands, TelegramEventTypes, TelegramMessage } from './types';
import { botStandalone } from './classes/botStandalone';
import { CallbackQuery } from "node-telegram-bot-api";
import { addChatCommand, chatIdCommand, startCommand } from './commands/common';
import { storage } from './classes/storage';
import * as schedule from 'node-schedule';
import { memberActivity, sendPing } from './activity';


process.env.NTBA_FIX_319 = "NTBA_FIX_319";
process.env.NTBA_FIX_350 = "NTBA_FIX_350";

const TelegramBot = require('node-telegram-bot-api');

const { TELEGRAM_BOT_TOKEN, CHAT_WHITELIST } = process.env;
const chatWhitelist = CHAT_WHITELIST ? JSON.parse(CHAT_WHITELIST) : null;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
botStandalone.bot = bot;

const allCommands = [
  startCommand,
  chatIdCommand,
  addChatCommand,
]

bot.on(TelegramEventTypes.TEXT, (msg: TelegramMessage) => {
  const { chat: { id: chatId }, text = '' } = msg;

  console.log({ text });
  // handle commands
  for (let i = 0; i < allCommands.length; i++) {
    const { regex, handler } = allCommands[i];
    regex.lastIndex = -1;

    const regexResult = regex.exec(text.toLowerCase());
    if (regexResult) {
      handler(regexResult, chatId, msg);
      break;
    }
  }
});

bot.on('callback_query', (query: CallbackQuery) => {
  const { data, message: { chat: { id: chatId } }, from: { id: userId } } = query;
  const [command] = data.split(':');

  switch (command) {
    case CallbackCommands.I_AM_ONLINE: {
      memberActivity(chatId, userId);
      break;
    }
  }
});

bot.on('message', async (msg: TelegramMessage) => {
  const { chat: { id: chatId }, from: { id: userId } } = msg;
  console.log(chatId, chatWhitelist);
  if (chatWhitelist && !chatWhitelist.includes(chatId)) return;
  memberActivity(chatId, userId);
});

schedule.scheduleJob({ hour: 7, minute: 0 }, () => {
  Object.keys(storage.lastBotMessage).forEach((chatId) => {
    sendPing(+chatId);
  })
});

