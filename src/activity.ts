import { botStandalone } from './classes/botStandalone';
import { messages } from './messages';
import { CallbackCommands, ChatMember } from './types';
import { storage, storeActivity, storePingMessage } from './classes/storage';
import { UserStatusIcon } from './constants';

const { MEMBER_MAX_UPDATE_PERIOD, IGNORE_USERS = '[]' } = process.env;

export function memberActivity(chatId: number, userId: number) {
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
        getPingButtons(),
        messageId,
      );
    }
  } catch (e) {
    console.error(e);
  }
}

export async function sendPing(chatId: number) {
  try {
    const messageText = await getPingMessage(chatId);

    const { message_id: messageId } = await botStandalone.sendMessage(
      chatId,
      messageText,
      {},
      getPingButtons(),
    );
    storePingMessage(chatId, messageId);
    botStandalone.pinChatMessage(chatId, messageId);
  } catch (e) {
    console.error(e);
  }
}

function getPingButtons() {
  return [
    [
      { text: messages.stay, callback_data: CallbackCommands.STAY },
      { text: messages.move, callback_data: CallbackCommands.MOVE }
    ]
  ];
}

async function getPingMessage(chatId: number) {
  const [okMembers, notOkMembers] = await getMembersGroups(chatId);

  let messageText = messages.pingMessage;

  if (okMembers.length) {
    messageText += messages.activeMembers;
    okMembers.forEach((member) => {
      messageText += ['✅', getUserStatus(member.id), member.name, getHours(member.lastUpdate), '\n'].filter(v => v).join(' ');
    });
  }

  if (notOkMembers.length) {
    messageText += `\n${messages.notActiveMembers}`;
    notOkMembers.forEach((member) => {
      messageText += ['⚠️', getUserStatus(member.id), member.name, getHours(member.lastUpdate), '\n'].filter(v => v)
        .join(' ');
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
  if (!date) return '(н/д)';
  let delta = (Date.now() - date) / 1000 / 60 / 60;

  const hours = delta | 0;
  if (hours === 0) return '';

  return `(${hours}г)`;
}

function getUserStatus(userId: number) {
  const status = storage.userStatus[userId];
  return status ? UserStatusIcon[status] : '';
}