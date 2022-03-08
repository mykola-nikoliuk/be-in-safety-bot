import { UserStatus } from '../types';

const fs = require('fs');
const path = require('path');

const SAVE_FILE_PATH = path.resolve(__dirname, '../../save.json');

export const storage: {
  lastUserActivity: Record<string, number>;
  lastBotMessage: Record<string, number>;
  chatMembers: Record<string, number[]>;
  userStatus: Record<string, UserStatus>;
} = {
  lastUserActivity: {},
  lastBotMessage: {},
  chatMembers: {},
  userStatus: {},
};

load();

function save() {
  fs.writeFileSync(
    SAVE_FILE_PATH,
    JSON.stringify(storage, null, 2),
  );
}

function load() {
  if (fs.existsSync(SAVE_FILE_PATH)) {
    const file = fs.readFileSync(SAVE_FILE_PATH, 'utf8');
    const data = JSON.parse(file);
    Object.assign(storage, data);
  }
}

export function storeActivity(chatId: number, userId: number) {
  console.log(`activity from ${userId}`);
  storage.lastUserActivity[userId] = Date.now();

  if (!storage.chatMembers[chatId]) {
    storage.chatMembers[chatId] = [];
  }

  if (!storage.chatMembers[chatId].includes(userId)) {
    storage.chatMembers[chatId].push(userId);
  }

  save();
}

export function storePingMessage(chatId: number, messageId: number) {
  storage.lastBotMessage[chatId] = messageId;
  save();
}

export function storeUserStatus(userId: number, status: UserStatus) {
  storage.userStatus[userId] = status;
  save();
}