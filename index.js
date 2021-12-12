require('dotenv').config();
const token = process.env['TOKEN']

const Discord = require('discord.js');
var {
  get
} = require("axios")

const client = new Discord.Client({
  intents: ["GUILDS", "GUILD_MESSAGES", "GUILD_PRESENCES", "GUILD_MEMBERS"]
});

var channels = require("./channels.js")

Object.filter = (obj, predicate) =>
  Object.fromEntries(Object.entries(obj).filter(predicate));

function getCompletedStars(member) {
  return Object.keys(Object.filter(member.completion_day_level, ([key, value]) => value.hasOwnProperty("1") && value.hasOwnProperty("2")))
}
function convertTZ(date, tzString) {
  return new Date((typeof date === "string" ? new Date(date) : date).toLocaleString("en-US", {
    timeZone: tzString
  }));
}
var usersObj = {};
var allUsersObj = {};
function refresh() {
  var d = new Date();
  d = convertTZ(d, "America/Chicago")

  get("https://saturn.rochesterschools.org/python/AOCbot/data_file.json").then((resp) => {
    get("https://saturn.rochesterschools.org/python/AOCbot/team_file.json").then((resp3) => {
    get("https://saturn.rochesterschools.org/python/AOCbot/users.json").then((resp2) => {
      var members = Object.values(resp.data.members)
      Object.values(resp3.data.members).forEach(member => {
        if(!members.hasOwnProperty(member.id)) {
          members[member.id] = member
        }
      })
      var discords = {};
      for (var name in resp2.data) {
        var discord = resp2.data[name]["If you are participating in the RCC Discord server, you will be automatically added to specific channels when you complete stars. You can join here: https://discord.gg/hsN92V4  - Please enter your Discord username so we can verify you."]
        if (discord) discords[name] = discord
      }
      let list = client.users.cache
      usersObj = {}
      allUsersObj = {}
      members.forEach((member) => {
        allUsersObj[member.id] = member
     
        var duser = list.find(u => discords[member.name] == u.tag)
        if (duser) {
          

          var user = {
            discord: {
              id: duser.id,
              tag: discords[member.name]
            },
            completed: getCompletedStars(member),
            name: member.name,
            id: member.id,
            full: member
          }
          usersObj[duser.id] = user

          var now = convertTZ(new Date(), "America/Chicago")
          var aocStart = convertTZ(new Date("2021/12/01 11:0:0 +0000"), "America/Chicago")
          var puzzlesNeeded = Math.floor((now.getTime() - aocStart.getTime()) / (1000 * 3600 * 24)) + 1;
          var allChannel = client.channels.cache.find(x => x.id.toString() == channels.all)
          if(allChannel) {
          if (user.completed.length == puzzlesNeeded) {
            if (!allChannel.permissionOverwrites.cache.find(x => x.id == user.discord.id)) {
              allChannel.permissionOverwrites.create(duser, {
                SEND_MESSAGES: true,
                VIEW_CHANNEL: true
              });

            }
          } else if (allChannel.permissionOverwrites.cache.find(x => x.id == user.discord.id)) {
            allChannel.permissionOverwrites.delete(duser)
          }
        }



          user.completed.forEach((completed) => {
            var channel = client.channels.cache.find(x => x.id.toString() == channels[completed])
            if (channel) {
              if (!channel.permissionOverwrites.cache.find(x => x.id == user.discord.id)) {
                channel.permissionOverwrites.create(duser, {
                  SEND_MESSAGES: true,
                  VIEW_CHANNEL: true
                });

              } else {
                //already is in channel
              }

            }

          })



        }

      })

      if (d.getHours() == 23 && d.getMinutes == 0) {
        var channel = client.channels.cache.find(x => x.id.toString() == channels.all)

      }
    })
  })
});
}

// When the client is ready, run this code (only once)
client.once('ready', () => {

  console.log('Ready!');

  var guild = client.guilds.cache.get(process.env.GUILD_ID)
//console.log(client.guilds.cache)
    commands = guild.commands

  
  commands.create({
    name: "stats",
    description: "View your AOC stats!",
  })
  commands.create({
    name: "leaderboard",
    description: "View the AOC leaderboard!",
  })

  client.user.setActivity(`you solve aoc`, {
    type: 'WATCHING'
  });

  client.on('interactionCreate', async (interaction) => {
    if(!interaction.isCommand()) {
      return;
    }


    const {commandName, options} = interaction

    if(commandName === 'stats') {
      var user = usersObj[interaction.member.id]
      if(user) {
        var scores = Object.values(allUsersObj).sort((a, b) => b.local_score - a.local_score)


      var compliments = [
        "You're doing great! But you can do better!",
        "You look great today! But I'm not sure about that t-shirt!",
        "Languages are your power and variables are your slaves",
        "Your code is very beautiful, but I'm not sure if it's production-ready!",
        "Fantastic skills, but I'm not sure if you're the best!",
        "Good job! But I'm sure you can do better!",
        "Hooray! You're doing great! ...or are you?",
      ]
//get random compliment
      var compliment = compliments[Math.floor(Math.random() * compliments.length)]
      
       var embed = new Discord.MessageEmbed()
       embed.setTitle("AOC Stats")
       embed.setDescription(`${user.full.stars}⭐\nLocal score: ${user.full.local_score}\n\nRank: #${scores.findIndex(x => x.id == user.id) + 1}\n\n**“${compliment}”**`)
      embed.setFooter(user.name)
       interaction.reply({embeds: [embed], ephemeral: true})
      } else {
        interaction.reply("You are not in the database! \nContact Gautam or Mr. B for assistance.")
      }
    }

    if(commandName === 'leaderboard') {
      var scores = Object.values(allUsersObj).sort((a, b) => b.local_score - a.local_score)
      var embed = new Discord.MessageEmbed()
      var lbArr = scores.map((x, i) => `#${i + 1} ${x.name} (${x.local_score}⭐)`)
      //only show op 10
      lbArr = lbArr.slice(0, 10)
      //if not in top 10, show their rank
      var user = usersObj[interaction.member.id]
      if(user) {
        var rank = scores.findIndex(x => x.id == user.id) + 1
        if(rank > 10) {
          lbArr.push(`...\n#${rank} ${user.name} (${user.full.local_score}⭐)`)
        }
      }
      var lb = `${lbArr.join("\n")}`
      embed.setTitle("AOC Leaderboard")
      embed.setDescription(lb)
      embed.setFooter("Sorted by Local Score")
      interaction.reply({embeds: [embed], ephemeral: true})
    }

  })

  setInterval(() => {
 refresh()

  }, 30000)
  refresh()


});

// Login to Discord with your client's token
client.login(token);