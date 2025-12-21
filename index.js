const { Client, GatewayIntentBits } = require("discord.js");
const cron = require("node-cron");

// 🤖 CLIENT DISCORD
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

// ✅ BOT PRÊT
client.once("ready", () => {
  console.log("Bot connecté !");
  console.log("Heure serveur :", new Date().toString());
});

// 🧪 COMMANDE TEST MANUELLE
client.on("messageCreate", async message => {
  if (message.author.bot) return;

  if (message.content === "!test") {
    envoyerMessage(message.channel);
  }
});

// ⏰ MESSAGE AUTOMATIQUE TOUS LES JOURS À 14h59 (HEURE FR)
cron.schedule(
  "59 14 * * *",
  async () => {
    try {
      const channel = await client.channels.fetch(CHANNEL_ID);
      if (!channel) return;

      envoyerMessage(channel);
    } catch (err) {
      console.error("Erreur cron :", err);
    }
  },
  {
    timezone: "Europe/Paris" // ✅ CORRECTION ICI
  }
);

// 📤 FONCTION D’ENVOI
async function envoyerMessage(channel) {
  const random = Math.floor(Math.random() * 999) + 1;

  await channel.send({
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

// 🔐 CONNEXION
client.login(process.env.TOKEN);
