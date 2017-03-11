import Telebot from 'telebot'
import Moment from 'moment-timezone'
Moment.locale('zh-cn')
import fs from 'fs'

Promise.seq = require('promise-sequential')
Promise.timeout = (time) => new Promise((res) => {
  setTimeout(() => {
    res()
  }, time)
})

const token = '288807406:AAEoxNGZLWnuBCalkcddEI4tJY7Y9-QcDE8',
      bot   = new Telebot({token, polling : {}})

let data = JSON.parse(fs.readFileSync('data.json', {encoding : 'utf8'}))
const userExists = (name) => !!data.users.filter((u) => u.name == name).length
const getUser = (msg) => data.users.filter(u => u.name == msg.from.username)[0]
bot.on('/start', ({text, from}) => {
  let { id } = from
  return bot.sendMessage(id, 'Hi')
})

bot.on('/time', ({text, from, chat}) => {
  let { id } = chat
  let time = Moment(),
      timezones = {
        '日本🇯🇵'  : "Asia/Tokyo",
        '中国🇨🇳'  : "Asia/Shanghai",
        'UIUC🇺🇸' : "America/Chicago",
        '德国🇩🇪' : "Europe/Berlin",
      },
      timeStr = (name) => `${name}`,
      timezoneNames = Object.keys(timezones),
      msg = (name) => `${name} : ${time.tz(timezones[name]).format('lll')}`
  return bot.sendMessage(id, timezoneNames.map(msg).join('\n'))
})

bot.on('/stash', (msg) => {
  let {text, from, chat} = msg
  let { id } = chat
  let stash = text.split(' ').slice(1).join('-')
  const u = getUser(msg)
  data.files[stash] = u.files.slice(0)
  u.files = []
  return bot.sendMessage(id, `已归档${data.files[stash].length}条至 ${stash}，权限为公开`)
})

bot.on('/pop', ({text, from, chat}) => {
  let { id } = chat
  let stash = text.split(' ').slice(1).join(' ')

  if (data.files[stash] && data.files[stash].length) {
    let msgs = data.files[stash].map((msg) => bot.forwardMessage(id, msg.chat.id, msg.message_id, {notify : true}))
    return Promise.seq(msgs.join([Promise.timeout(1000), bot.sendMessage(id, `你要的${stash}，以上。`)]))
  } else {
    return bot.sendMessage(id, '归档空。')
  }
})

bot.on('*', msg => {
  if (!msg.forward_from)
    return
  const u = getUser(msg)
  u.files.push(msg)
  return bot.sendMessage(msg.from.id, '已推入缓冲区')
})

bot.connect()

setInterval(() => {
  fs.writeFile('data.json', JSON.stringify(data), () => {})
}, 2000)



