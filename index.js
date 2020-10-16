const Discord = require('discord.js');
const utf8 = require('utf8');
const https = require('https');
const client = new Discord.Client();

const statusUrl = 'https://api.mcsrvstat.us/2/minecraft.arsip.net';
const quotesJSON = require('./quotes.json');
const token = require('./token.json').token;
keywords = [];
aliases = [];
quotes = [];
mutedServers = [];

const commandInfoStr = '\n< Commands >\n!rb shutup [minutes] OR !rb mute [minutes] to mute me temporarily\n!rb unmute to unmute me\n!rb status to get status\n\n';

const mcserver = channel => {

  https.get(statusUrl,(res) => {
      let body = '';

      res.on('data', (chunk) => {
          body += chunk;
      });

      res.on('end', () => {
          try {
              let server = JSON.parse(body);
              let message = '';
              if (server.online)
              {
                const amt = server.players.online;
                if (amt == 1)
                  message += 'There is currently `1` player online on the Corona Break Minecraft server';
                else
                  message += `There are currently \`${amt}\` players online on the Corona Break Minecraft server`;
                if (amt != 0)
                  message += ' : `' + server.players.list.join(', ') + '`';
              }
              else
                message += 'Server is offline!';
              channel.send(message);
          } catch (error) {
              console.error(error.message);
          };
      });

  }).on('error', (error) => {
      console.error(error.message);
  });
}

const log = message => {
  console.log(`[${new Date().toLocaleString()}] ${message.author.username} sent: ${message.content}`);
}

const getRemainingMins = cid => {
  return Math.ceil((mutedServers[cid] - new Date()) / 60000);
}

const sendInfo = user => {
  let table = '```markdown\n< Current Media Sources and Trigger Words >\n';
  let tables = [];

  for (let key in aliases)
    if (aliases.hasOwnProperty(key))
    {
      let newline = key.padEnd(45) + aliases[key] + '\n';
      if ((table + newline).length > (2000 - 3))
      {
        tables.push(table + '```');
        table = '```markdown\n< Current Media Sources and Trigger Words (Continued) >\n';
      }

      table += newline;
    }

  if ((table + commandInfoStr).length > (2000 - 3))
    tables.push(table + '```', '```markdown\n' + commandInfoStr + '```');
  else 
    tables.push(table + commandInfoStr + '```');

  for (const t of tables)
    user.send(t);
}

const getUntil = minutes => {
  let until = new Date();
  until.setMinutes(until.getMinutes() + minutes);
  until = new Date(until);
  return until;
}

for (let i = 0; i < quotesJSON.quotes.length; i++)
{
  const quoteInfo = quotesJSON.quotes[i];
  aliases[quoteInfo.origin] = quoteInfo.aliases;
  for (const alias of quoteInfo.aliases)
    keywords[alias] = quoteInfo.origin;
  quotes[quoteInfo.origin] = quoteInfo.quotes;
}

client.on('ready', () => {
  let clientUser = client.user;
  clientUser.setActivity('Type !rb for info');
  console.log(`Hullo! From ${clientUser.username} (${clientUser.id})`);
})

client.on('guildCreate', guild => {
  let cid;
  let channels = guild.channels.cache;

  for (let c in channels)
    if (channels[c].type === 'text')
    {
      cid = channels[c].id;
      break;
    }

  let channel = client.channels.cache.get(guild.systemChannelID || cid);
  channel.send('I detect trigger words and spout nonsense quotes from movies, vines, and the like\nType `!rb` to see what quotes I have in store');
});

client.on('message', message => {
  if (message.author.bot) return;
  client.user.setActivity('Type !rb for info');

  const channel = message.channel;
  const cid = channel.id;
  const messageStr = message.content.toLowerCase();

  if (messageStr === '!mcserver' && message.guild && message.guild.id == '688960101666521094')
  {
     mcserver(channel);
     log(message);
  }
  else if (messageStr.startsWith('!rb'))
  {
    log(message);

    let args = messageStr.split(/ +/); args.shift();

    if (args.length >= 1 && (args[0] === 'shutup' || args[0] === 'mute') && (args.length == 1 || !isNaN(args[1])))
    {
      let mins = args.length == 2 ? parseInt(args[1]) : 1;
      mutedServers[cid] = getUntil(mins);

      channel.send(`You have now muted me for ${mins} minute(s). Type \`!rb status\` to check how many more minutes remain before I unleash havoc once more`);
    }
    else if (args.length == 1 && args[0] === 'unmute')
    {
      delete mutedServers[cid];
      channel.send('I am now unmuted and ready to wreak havoc');
    }
    else if (args.length == 1 && args[0] === 'status')
    {
      if (cid in mutedServers)
      {
        let remainingMins = getRemainingMins(cid);

        if (remainingMins > 0)
        {
          channel.send(`I'm muted for ${remainingMins} more minute(s)! Type\`!rb unmute\` to unmute me`);
          return;
        }

        delete mutedServers[cid];
      }

      channel.send('I am not muted and ready to wreak havoc');
    }
    else if (!args.length)
      sendInfo(message.author);
    else
      channel.send(`I'm sorry, I don't recognize that command. If you're unsure, type\`!rb\` for information`)
  }
  else
  {
    if (cid in mutedServers)
    {
      let remainingMins = getRemainingMins(cid);

      if (remainingMins > 0) return;
      delete mutedServers[cid];
    }

    let words = messageStr.split(/[\s,\?\,\.!]+/);

    for (const keyword in keywords)
      // if keyword includes space, search for whole phrase; otherwise, look for word within array that is split by spaces or puncuation
      if ((keyword.includes(" ") && messageStr.includes(keyword)) || words.some(w => w === keyword))
      {
        log(message);

        let possibleQuotes = quotes[keywords[keyword]];
	// I can't Javascript send help, best I can do for now
        channel.send(utf8.decode(utf8.encode(possibleQuotes[Math.floor(Math.random() * possibleQuotes.length)])));
        return;   // return on first instance to avoid spamming multiple quotes at once
      }
  }

});

client.login(token);