const Discord = require('discord.js')
const fetch = require('node-fetch')
const decode = require('unescape')
const TurndownService = require('turndown')
const commonmark = require('commonmark')
const client = new Discord.Client()

const responses = require('./responses.json')
const { token, key, id } = require('./secure.json')
const turndown  = new TurndownService()

function log(message) 
{
  console.log(`[${new Date().toLocaleString()}] ${message.author.username} sent: ${message.content}`)
}

client.on('ready', () => {
  let clientUser = client.user
  clientUser.setActivity('finna mute chat')
  console.log(`Hullo! From ${clientUser.username} (${clientUser.id})`)
})

client.on('guildCreate', guild => {

  let channels = guild.channels.cache
  let textChannel

  if (guild.systemChannelID) textChannel = channels.get(guild.systemChannelID)
  else textChannel = channels.find(channel => channel.type == 'text')

  textChannel.send('Ask me questions by mentioning me or by beginning your message with `?`')
})

client.on('message', message => {
  if (message.author.id == client.user.id) return

  // sometimes user activity gets unset so just reset periodically when someone messages
  client.user.setActivity('finna mute chat')

  const channel = message.channel
  const messageStr = message.content

  if (messageStr.startsWith('?search'))
  {
    log(message)
    const question = messageStr.substring(8).trim()
    if (question.length == 0)
      channel.send("Your question is empty! Use `?search <question>` to search StackOverflow for questions!")
    else
    {
      fetch(`https://www.googleapis.com/customsearch/v1?key=${key}&num=1&cx=${id}&q=${escape(question)}`)
        .then(res => {
          if (res.ok)
            return res.json()
          throw Error('Too many requests!')
        })
        .then(data => {
          console.log(data)
          if (data.searchInformation.totalResults == 0 || !data.items[0].pagemap.answer || data.items[0].pagemap.answer.length == 0)
          {
            channel.send(`Uh oh, there were no answers on StackOverflow for \`${question}\`! Try another query`)
            throw Error('There were no search results!')
          }
          else
            // return answer id to use with SO API
            return data.items[0].pagemap.answer[0].url.split('#')[1]
        })
        .then(answerID => {
          fetch(`https://api.stackexchange.com/2.2/answers/${answerID}?order=desc&sort=votes&site=stackoverflow&filter=!)Q2ANGPK-PaVQyL*qqBBXAue`)
          .then(res => {
            if (res.ok)
              return res.json()
            throw Error('Too many requests!')
          })
          .then(data => {
            const answer = data.items[0]
            // console.log(answer.owner.display_name)
            // console.log(answer.link)
            // console.log(answer.is_accepted)
            // console.log(decode(answer.body))
            // console.log(answer.score)
            // channel.send(decode(answer.body))
            const reader = new commonmark.Parser()
            const writer = new commonmark.HtmlRenderer()

            let answerStr = turndown.turndown(unescape(answer.body)).replace(/>/g, '\\>')
            if (answerStr.length > 1024) answerStr = answerStr.substring(0, 1021) + '...'

            channel.send({embed: {
              color: 0xff8e42,
              author: {
                name: answer.owner.display_name
              },
              title: answer.title,
              url: answer.link,
              description: answerStr
            }
          });

            // // const reader = new commonmark.Parser()
            // // const writer = new commonmark.HtmlRenderer()
            // // console.log(decode(answer.body))
            // console.log(turndown.turndown(unescape(answer.body)).replace(/>/g, '\\>'))
          })

        })
      // request.get({
      //   url: `https://www.googleapis.com/customsearch/v1?key=${key}&num=1&cx=${id}&q=${escape(question)}`,
      //   json: true
      // }, (err, res, data) => {
      //   if (!err && res.statusCode === 200)
      //   {
      //     console.log(data)
      //     if (data.searchInformation.totalResults == 0)
      //       channel.send(`Uh oh, there were no answers on StackOverflow for \`${question}\`! Try another query`)
      //     else
      //       console.log(data.items[0].pagemap.answer[0].text)
      //   }
      // })
    }
  }
  else if (messageStr.startsWith('?') || message.mentions.has(client.user))
  {
    log(message)
    channel.send(responses[Math.floor(Math.random() * responses.length)])
  }
})

client.login(token)