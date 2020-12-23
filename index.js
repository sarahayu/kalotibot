const Discord = require('discord.js')
const fetch = require('node-fetch')
const TurndownService = require('turndown')

const responses = require('./responses.json')
const { token, key, id } = require('./secure.json')
const client = new Discord.Client()
const turndown  = new TurndownService({ codeBlockStyle: 'fenced' })

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
          throw new Error('Could not retrieve information: There are too many requests!')
        })
        .then(data => {
          
          if (data.searchInformation.totalResults == 0 || !data.items[0].pagemap.answer || data.items[0].pagemap.answer.length == 0)
            throw new Error(`Uh oh, there were no answers on StackOverflow for \`${question}\`! Try another query`)
          
          // use answer id with SO API
          // an example url for the top answer would be https://stackoverflow.com/questions/9751845/apt-get-for-cygwin/9914095#9914095
          // it would be possible to just use the Google API for this project, but it only gives a snippet of the answer
          // so we need to use SO API to get the full answer
          // it would also be possible to just use SO search API on its own, but documentation states it is
          // "intentionally limited" and I found it to not be quite robust, so we'll use Google for the general search
          // and SO API to get the full version of the answer
          // pog
          const answerID = data.items[0].pagemap.answer[0].url.split('#')[1]
          return fetch(`https://api.stackexchange.com/2.2/answers/${answerID}?order=desc&sort=votes&site=stackoverflow&filter=!)Q2ANGPK-PaVQyL*qqBBXAue`)
        })
        .then(res => {
          if (res.ok)
            return res.json()
          throw new Error('Could not retrieve information: There are too many requests!')
        })
        .then(data => {
          const answer = data.items[0]

          // set default language to that delicious c code highlighting, after all most people in this discord chat
          // will be using C/C++
          let wasCut = false
          let answerBody = answer.body.replace(/<code>/g, '<code class="language-c">')
          if (answerBody.length > 1100) 
          {
            answerBody = answerBody.substring(0, 1100)
            wasCut = true
          }
          
          // turndown converts html to standard Markdown that Discord uses
          // conveniently, turndown will close any open tags that could have been a result of substringing
          // also, replace double newlines after code fence with just one newline
          let answerStr = turndown.turndown(answerBody).replace(/```\n\n/g,'```\n')

          // if the cut answer ended with a fenced code block, put the ellipses inside code block
          if (wasCut)
          {
            if (answerStr.endsWith('\n```'))
              answerStr = answerStr.slice(0, -4) + '…' + '```'
            else
              answerStr += '…'
          }
          
          channel.send({
            embed: {
              color: 0xff8e42,
              author: {
                // turndown also unescapes html entities i.e. &amp; which is convenient
                name: turndown.turndown(answer.owner.display_name)
              },
              title: turndown.turndown(answer.title),
              url: answer.link,
              description: answerStr
            }
          })
        })
        .catch(err => {
          console.log(err)
          channel.send(err.message)
        })
    }
  }
  else if (messageStr.startsWith('?') || message.mentions.has(client.user))
  {
    log(message)
    channel.send(responses[Math.floor(Math.random() * responses.length)])
  }
})

client.login(token)