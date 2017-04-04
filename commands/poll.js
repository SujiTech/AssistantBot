import axios from 'axios'
import cheerio from 'cheerio'

export default (bot) => ({text, from, chat}) => {
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
    else
      res.push(`投票数第一了可是革命尚未成功，同志仍需努力`)

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
}