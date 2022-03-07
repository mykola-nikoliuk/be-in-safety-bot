import { Command, CommandAccessLevel, CommandHandler } from "../types";

export function createCommand(regex: RegExp, handler: CommandHandler, accessLevel: CommandAccessLevel = CommandAccessLevel.ADMIN): Command {
  return {
    regex,
    handler,
    accessLevel,
  }
}
