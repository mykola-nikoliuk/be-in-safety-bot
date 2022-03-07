import { createCommand } from "./createCommandHandler";
import { botStandalone } from "../classes/botStandalone";
import { messages } from "../messages";
import { CommandAccessLevel } from "../types";

export const startCommand = createCommand(
  /^\/start$/g,
  (regexResult, chatId, msg) => {
    const { from: { id: userId } } = msg;
    if (chatId === userId) {
      botStandalone.sendMessage(chatId, messages.welcomeMessage);
    }
  },
  CommandAccessLevel.ANY,
);

export const chatIdCommand = createCommand(
  /^\/chatid$/g,
  (regexResult, chatId) => {
    botStandalone.sendMessage(chatId, chatId.toString());
  },
  CommandAccessLevel.ANY,
);
