export function formatMessage(pattern, params) {
  let result = pattern;
  Object.keys(params).forEach(key => {
    result = result.replace(new RegExp(`{${key}}`, 'g'), params[key]);
  });
  return result;
}

export function createButtonsOptions(buttons) {
  return {
    reply_markup: {
      inline_keyboard: buttons,
      // resize_keyboard: true,
      // one_time_keyboard: true
    },
  };
}
