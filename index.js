const { Client, GatewayIntentBits } = require("discord.js");
const { startRadio } = require("./systems/radio");
const { updateMemberCount } = require("./systems/memberCount");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

client.once("ready", () => {
  console.log("✅ Bot connecté");
  startRadio(client);
  client.guilds.cache.forEach(updateMemberCount);
});

client.on("guildMemberAdd", m => updateMemberCount(m.guild));
client.on("guildMemberRemove", m => updateMemberCount(m.guild));

client.login(process.env.TOKEN);
