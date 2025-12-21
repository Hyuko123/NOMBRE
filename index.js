const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// 🔧 CONFIGURATION
const CHANNEL_ID = "1449816618187227249";
const ROLE_ID = "1449815862168129708";

// 🔁 Anti double envoi
let lastSentDay = null;

// ✅ BOT PRÊT
client.once("ready", () => {
  console.log("Bot connecté !");
});

// 🧪 COMMANDE TEST
client.on("messageCreate", message => {
  if (message.author.bot) return;

  if (message.content === "!test") {
    const random = Math.floor(Math.random() * 999) + 1;

    message.channel.send({
      content: `<@&${ROLE_ID}> 📻 **Changement de radio journalier**

La programmation radio a été mise à jour automatiquement conformément au planning quotidien.
Cette modification est effective immédiatement et remplace toute diffusion précédente.

Ce contenu est **strictement interne** et ne doit en aucun cas être :
– rediffusé  
– partagé  
– enregistré  
– utilisé hors du cadre autorisé  

Toute utilisation non conforme pourra entraîner des sanctions.
Merci de respecter les consignes en vigueur et de vous référer aux responsables en cas de doute.

🎲 **Radio du jour** : ${random}`,
      allowedMentions: { roles: [ROLE_ID] }
    });
  }
});

// ⏰ MESSAGE AUTOMATIQUE TOUS LES JOURS À 15H
setInterval(() => {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const today = now.toDateString();

  if (hours === 15 && minutes === 0 && lastSentDay !== today) {
    const channel = client.channels.cache.get(CHANNEL_ID);
    if (!channel) return;

    const random = Math.floor(Math.random() * 999) + 1;

    channel.send({
      content: `<@&${ROLE_ID}> 📻 **Changement de radio journalier**

La programmation radio a été mise à jour automatiquement conformément au planning quotidien.
Cette modification est effective immédiatement et remplace toute diffusion précédente.

Ce contenu est **strictement interne** et ne doit en aucun cas être :
– rediffusé  
– partagé  
– enregistré  
– utilisé hors du cadre autorisé  

Toute utilisation non conforme pourra entraîner des sanctions.
Merci de respecter les consignes en vigueur et de vous référer aux responsables en cas de doute.

🎲 **Radio du jour** : ${random}`,
      allowedMentions: { roles: [ROLE_ID] }
    });

    lastSentDay = today;
  }
}, 60 * 1000);

// 🔐 CONNEXION DU BOT
client.login("MTQ1MjA5MjkyODMzMDU2NzcyMA.GJgFyy.XyzuoXEmWF5bKdFBRNiVzr2ZJnzC9fyXDREX3I");
