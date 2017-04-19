import Telebot from 'telebot'
import fs from 'fs'

Promise.seq = require('promise-sequential')
Promise.timeout = (time) => new Promise((res) => {
  setTimeout(() => {
    res()
  }, time)
})

const token = '288807406:AAEoxNGZLWnuBCalkcddEI4tJY7Y9-QcDE8',
      bot   = new Telebot({token, polling : {}}),
      PandasGroup = -178851802,
      Self = 59886156

let data = JSON.parse(fs.readFileSync('data.json', {encoding : 'utf8'}))
const userExists = (name) => !!data.users.filter((u) => u.name == name).length
const getUser = (msg) => data.users.filter(u => u.name == msg.from.username)[0]
bot.on('/start', ({text, from}) => {
  let { id } = from
  return bot.sendMessage(id, 'Hi')
})

const accessToFile = (msg) => {
  return msg.chat.id == PandasGroup || msg.from.username == 'hipvb'
}

import Time from './commands/time'
bot.on('/time', Time(bot))
import Poll from './commands/poll'
bot.on('/poll', Poll(bot))

bot.on('*', (msg) => {
  let {
    message_id,
    from,
    chat,
    date,
    text,
    reply_to_message,
    document,
    audio,
    video
  } = msg
  if (document && accessToFile(msg)) {
    data.files.push(msg)
    return bot.sendMessage(chat.id, `File ${document.file_name} saved.`)
  }
})

;['mp4', 'pdf', 'docx'].forEach(fileType => {
  bot.on(`/${fileType}`, (msg) => {
    let {
      message_id,
      from,
      chat,
      date,
      text,
      reply_to_message,
      document,
      audio,
      video
    } = msg
    if (!accessToFile(msg))
      return bot.sendMessage(chat.id, 'Access Denied.')
    let firstFile = data.files.filter(f => f.document && f.document.file_name.endsWith(`.${fileType}`))[0]
    if (firstFile)
      return bot.forwardMessage(chat.id, firstFile.chat.id, firstFile.message_id)
    else
      return bot.sendMessage(chat.id, `I found no .${fileType} file.`)
  })
  bot.on(`/${fileType}s`, (msg) => {
    const maxNumber = 5
    let {
      message_id,
      from,
      chat,
      date,
      text,
      reply_to_message,
      document,
      audio,
      video
    } = msg
    if (!accessToFile(msg))
      return bot.sendMessage(chat.id, 'Access Denied.')
    let files = data.files.filter(f => f.document && f.document.file_name.endsWith(`.${fileType}`)).slice(0,maxNumber)
    console.log(files)
    if (files)
      return Promise.all(files.map(f => {
        return bot.forwardMessage(chat.id, f.chat.id, f.message_id)
      }).concat([
        bot.sendMessage(chat.id, `${Math.min(maxNumber, files.length)} file(s) shown (${maxNumber} max)`)
      ]))
    else
      return bot.sendMessage(chat.id, `I found no .${fileType} file.`)
  })
})

const parenthesisFillFuncGenerator = (left, right) => ({text, from, chat, message_id}) => {
  let llen = text.split(left).length - 1,
      rlen = text.split(right).length - 1
  if (llen - rlen)
    return bot.sendMessage(chat.id, Array(llen - rlen).fill(right).join(''), {reply : message_id, notify : false})
}

bot.on('text', parenthesisFillFuncGenerator('（','）'))
bot.on('text', parenthesisFillFuncGenerator('(',')'))
bot.on('text', parenthesisFillFuncGenerator('[',']'))

bot.connect()

setInterval(() => {
  fs.writeFile('data.json', JSON.stringify(data), () => {})
}, 2000)



