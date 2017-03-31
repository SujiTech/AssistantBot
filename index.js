import Telebot from 'telebot'
import Moment from 'moment-timezone'
import axios from 'axios'
import cheerio from 'cheerio'
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
        '湾区🇺🇸' : "America/Los_Angeles",
        'UIUC🇺🇸' : "America/Chicago",
        '德国🇩🇪' : "Europe/Berlin",
      },
      timeStr = (name) => `${name}`,
      timezoneNames = Object.keys(timezones),
      msg = (name) => `${name} : ${time.tz(timezones[name]).format('lll')}`
  return bot.sendMessage(id, timezoneNames.map(msg).join('\n'))
})

bot.on('/poll', ({text, from, chat}) => {
  let { id } = chat
  let suji_likes, first_likes, res
  return Promise.all([
    axios.get('https://askwhale.com/p/0c7435/elevator-pitch-contest'),
    axios.get('https://askwhale.com/api/v1/users/yanhan02008/questions_answered.json?limit=20&offset=0'),
  ])
  .then(function ([contestPage, personalPage]) {
    let $ = cheerio.load(contestPage.data)
    let data = JSON.parse($('div[data-react-class="V.PodPage"]').attr('data-react-props'))
    let {questions} = data
    res = questions
      .map(q => {
        if (q.askee.name == 'Suji Yan')
          suji_likes = q.likes_count
        return q
      })
      .filter(a => a.likes_count >= 67)
      .sort((a, b) => parseInt(a.likes_count) < parseInt(b.likes_count))
      .map((q, idx) => {
        if (idx == 0)
          first_likes = q.likes_count
        return q
      })
      .map(q => `${q.askee.name} got ${q.likes_count}`)
    res.push('')
    const diff = first_likes - suji_likes
    res.push(`${diff} likes needed`)
    if (diff > 0)
      res.push(`革命尚未成功，同志仍需努力`)

    let q = personalPage.data.filter(q => q.guid == '4ea5cf')[0]
    if (q) {
      let unlocks = q.calculated_unlocks_count
      res.push(`${suji_likes}❤️️over ${unlocks}👀 yields conversion rate ${suji_likes / unlocks}`) 
    }


    return bot.sendMessage(id, res.join('\n'))
  })
  .catch(function (error) {
    console.log(error);
  })
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



