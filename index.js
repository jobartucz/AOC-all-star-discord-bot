const token = process.env['TOKEN']
const { Client, Intents } = require('discord.js');
var { get } = require("axios")
var channels = require("./channels.js")
// Create a new client instance
const client = new Client({ intents: ["GUILDS", "GUILD_MESSAGES", "GUILD_PRESENCES", "GUILD_MEMBERS"] });
Object.filter = (obj, predicate) =>
  Object.fromEntries(Object.entries(obj).filter(predicate));
// When the client is ready, run this code (only once)
client.once('ready', () => {
  console.log('Ready!');
  client.user.setActivity(`you solve aoc`, { type: 'WATCHING' });

  function getCompletedStars(member) {
    return Object.keys(Object.filter(member.completion_day_level, ([key, value]) => value.hasOwnProperty("1") && value.hasOwnProperty("2")))
  }
  setInterval(() => {
  get("https://saturn.rochesterschools.org/python/AOCbot/data_file.json").then((resp) => {
    get("https://saturn.rochesterschools.org/python/AOCbot/users.json").then((resp2) => {
      var members = Object.values(resp.data.members)
      var discords = {};
      for (var name in resp2.data) {
        var discord = resp2.data[name]["If you are participating in the RCC Discord server, you will be automatically added to specific channels when you complete stars. You can join here: https://discord.gg/hsN92V4  - Please enter your Discord username so we can verify you."]
        if (discord) discords[name] = discord
      }
      let list = client.users.cache
      //  let guild = client.guilds.cache.get("918880187318403073");


      members.forEach((member) => {

        var duser = list.find(u => discords[member.name] == u.tag)
        if (duser) {
          var user = { discord: { id: duser.id, tag: discords[member.name] }, completed: getCompletedStars(member), name: member.name, id: member.id }

          user.completed.forEach((completed) => {
            var channel = client.channels.cache.find(x => x.id.toString() == channels[completed])
            if (channel) {
              if(!channel.permissionOverwrites.cache.find(x=>x.id == user.discord.id)) {
              channel.permissionOverwrites.create(duser, {
                SEND_MESSAGES: true,
                VIEW_CHANNEL: true
              });
              channel.send(user.name+" has completed Day "+completed+"!")
              } else {
                //already is in channel
              }
              
            }

          })
          


        }

      })




    })
  })

  },60000)


});

// Login to Discord with your client's token
client.login(token);
