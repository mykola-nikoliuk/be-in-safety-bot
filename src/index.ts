import { config } from 'dotenv';
import { CallbackCommands, ChatMember, TelegramEventTypes, TelegramMessage } from './types';
import { botStandalone } from './classes/botStandalone';
import { CallbackQuery } from "node-telegram-bot-api";
import { chatIdCommand, startCommand } from './commands/common';
import { storage, storeActivity, storePingMessage } from './classes/storage';
import * as schedule from 'node-schedule';
import { messages } from './messages';

config();

process.env.NTBA_FIX_319 = "NTBA_FIX_319";
process.env.NTBA_FIX_350 = "NTBA_FIX_350";

const TelegramBot = require('node-telegram-bot-api');

const { TELEGRAM_BOT_TOKEN, CHAT_WHITELIST, MEMBER_MAX_UPDATE_PERIOD, IGNORE_USERS = '[]' } = process.env;
const chatWhitelist = CHAT_WHITELIST ? JSON.parse(CHAT_WHITELIST) : null;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
botStandalone.bot = bot;

const allCommands = [
  startCommand,
  chatIdCommand,
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


  // console.log(await botStandalone.getChatMember(chatId, (userId - 1).toString()));
});

function memberActivity(chatId: number, userId: number) {
  if (JSON.parse(IGNORE_USERS).includes(userId)) return;
  storeActivity(chatId, userId);
  updatePingMessage(chatId);
}

async function updatePingMessage(chatId: number) {
  try {
    const messageText = await getPingMessage(chatId);
    const messageId = storage.lastBotMessage[chatId];

    if (messageId) {
      await botStandalone.sendMessage(
        chatId,
        messageText,
        {},
        [[{ text: messages.imOnline, callback_data: CallbackCommands.I_AM_ONLINE }]],
        messageId,
      );
    }
  } catch (e) {
    console.error(e);
  }
}

async function sendPing(chatId: number) {
  try {
    const messageText = await getPingMessage(chatId);

    const { message_id: messageId } = await botStandalone.sendMessage(chatId, messageText, {},
      [[{ text: messages.imOnline, callback_data: CallbackCommands.I_AM_ONLINE }]],
    );
    storePingMessage(chatId, messageId);
    botStandalone.pinChatMessage(chatId, messageId);
  } catch (e) {
    console.error(e);
  }
}

async function getPingMessage(chatId: number) {
  const [okMembers, notOkMembers] = await getMembersGroups(chatId);

  let messageText = messages.pingMessage;

  if (okMembers.length) {
    messageText += messages.activeMembers;
    okMembers.forEach((member) => {
      messageText += `✅ ${member.name}\n`
    });
  }

  if (notOkMembers.length) {
    messageText += `\n${messages.notActiveMembers}`;
    notOkMembers.forEach((member) => {
      messageText += `⚠️ ${member.name} (${getHours(member.lastUpdate)})\n`
    });
  }

  messageText += `\n${messages.pressActivityButton}`;
  return messageText;
}

async function getMembers(chatId: number) {
  const memberIds = storage.chatMembers[chatId] || [];
  try {
    return Promise.all(
      memberIds.map((memberId) => botStandalone.getChatMember(chatId, memberId)),
    )
  } catch (e) {
    console.error(e);
    return [];
  }
}

async function getMembersGroups(chatId: number) {
  const members: ChatMember[] = await getMembers(chatId);

  type ActiveMember = {
    id: number;
    name: string;
    lastUpdate: number;
  }

  const membersList: ActiveMember[] = members.map(({
    user: {
      id,
      first_name,
      last_name,
      username,
    },
  }) => {
    return {
      id,
      name: `@${[username, first_name, last_name].filter(v => v).join(' ')}`,
      lastUpdate: storage.lastUserActivity[id] || null,
    }
  });

  const sortedMembers = membersList.sort((a, b) => b.lastUpdate - a.lastUpdate);

  const okMembers: ActiveMember[] = [];
  const notOkMembers: ActiveMember[] = [];

  sortedMembers.forEach(member => {
    let isMemberActive = Date.now() - member.lastUpdate < +MEMBER_MAX_UPDATE_PERIOD;
    isMemberActive ? okMembers.push(member) : notOkMembers.push(member);
  });

  return [okMembers, notOkMembers];
}

function getHours(date: number) {
  if (!date) return '-';
  let delta = (Date.now() - date) / 1000 / 60 / 60;
  return delta.toFixed(0) + 'г';
}

// sendPing(chatWhitelist[0])

schedule.scheduleJob({ hour: 7, minute: 0 }, () => {
  Object.keys(storage.lastBotMessage).forEach((chatId) => {
    sendPing(+chatId);
  })
});

