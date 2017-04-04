import Moment from 'moment-timezone'
Moment.locale('zh-cn')

export default (bot) => ({text, from, chat}) => {
  let { id } = chat
  let time = Moment(),
      timezones = {
        '日本🇯🇵'  : "Asia/Tokyo",
        '中国🇨🇳'  : "Asia/Shanghai",
        '湾区🇺🇸' : "America/Los_Angeles",
        'UIUC🇺🇸' : "America/Chicago",
        '德国🇩🇪' : "Europe/Berlin",
      },
      timeStr = (name) => `${name}`,
      timezoneNames = Object.keys(timezones),
      msg = (name) => `${name} : ${time.tz(timezones[name]).format('lll')}`
  return bot.sendMessage(id, timezoneNames.map(msg).join('\n'))
}