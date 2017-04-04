import Telebot from 'telebot'
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

import Time from './commands/time'
bot.on('/time', Time(bot))
import Poll from './commands/poll'
bot.on('/poll', Poll(bot))

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
    return Promise.seq(msgs.map(p => {
      return function () {
        return p
      }
    }))
      .then(Promise.timeout(1000))
      .then(bot.sendMessage(id, '以上。'))
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



