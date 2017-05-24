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
  if (msg.forward_from) {
    const u = getUser(msg)
    u.files.push(msg)
    return bot.sendMessage(msg.from.id, '已推入缓冲区')
  }
})

const FileLookupFuncGenerator = ({
  filter, slice, msg
}) => (msg) => {
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
  let files = data.files.filter(filter).slice(0, slice)
  if (files)
    return Promise.all(files.map(f => {
      return bot.forwardMessage(chat.id, f.chat.id, f.message_id)
    }).concat([
      bot.sendMessage(chat.id, `${Math.min(slice, files.length)} file(s) shown (${slice} max)`)
    ]))
  else
    return bot.sendMessage(chat.id, `I found no matching file.`)
}
const FileTypeFilterGenerator = (fileType) => (f) => f.document && f.document.file_name.endsWith(`.${fileType}`)


;['mp4', 'pdf', 'docx', 'zip', 'key'].forEach(fileType => {
  bot.on(`/${fileType}`, FileLookupFuncGenerator({
    filter : FileTypeFilterGenerator(fileType),
    slice : 1
  }))
  bot.on(`/${fileType}s`, FileLookupFuncGenerator({
    filter : FileTypeFilterGenerator(fileType),
    slice : 5
  }))
})

bot.on('/files', FileLookupFuncGenerator({
  filter : () => true,
  slice : 5
}))

const parenthesisFillFuncGenerator = (left, right) => ({text, from, chat, message_id}) => {
  let llen = text.split(left).length - 1,
      rlen = text.split(right).length - 1
  if (llen - rlen)
    return bot.sendMessage(chat.id, Array(llen - rlen).fill(right).join(''), {reply : message_id, notify : false})
}

bot.on('text', parenthesisFillFuncGenerator('（','）'))
bot.on('text', parenthesisFillFuncGenerator('(',')'))
bot.on('text', parenthesisFillFuncGenerator('[',']'))
bot.on('text', parenthesisFillFuncGenerator('<','>'))

bot.connect()

setInterval(() => {
  fs.writeFile('data.json', JSON.stringify(data), () => {})
}, 2000)



