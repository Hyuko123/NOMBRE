const { Client, GatewayIntentBits, Collection } = require("discord.js");

/* ================= ENV ================= */

const TOKEN = process.env.TOKEN;
if (!TOKEN) {
  console.error("❌ TOKEN manquant (process.env.TOKEN)");
  process.exit(1);
}

/* ================= CLIENT ================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

/* ================= COLLECTIONS ================= */

client.commands = new Collection();

/* ================= LOAD SYSTEMS ================= */

const radioSystem = require("./systems/radio");
const memberCountSystem = require("./systems/memberCount");
const warnSystem = require("./systems/warns");

/* ================= LOAD COMMANDS ================= */

const fs = require("fs");
const path = require("path");

const commandsPath = path.join(__dirname, "commands");
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith(".js"));

  for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    if (command.data && command.execute) {
      client.commands.set(command.data.name, command);
    }
  }
}

/* ================= LOAD INTERACTIONS ================= */

const interactionsPath = path.join(__dirname, "interactions");
if (fs.existsSync(interactionsPath)) {
  const interactionFiles = fs.readdirSync(interactionsPath).filter(f => f.endsWith(".js"));

  for (const file of interactionFiles) {
    require(`./interactions/${file}`)(client);
  }
}

/* ================= READY ================= */

client.once("ready", () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);

  // Systems
  radioSystem(client);
  memberCountSystem(client);
  warnSystem(client);

  console.log("🚀 Tous les systèmes chargés");
});

/* ================= SLASH COMMAND HANDLER ================= */

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, client);
  } catch (err) {
    console.error("❌ Erreur commande :", err);

    if (!interaction.replied && !interaction.deferred) {
      interaction.reply({ content: "❌ Erreur interne.", ephemeral: true });
    }
  }
});

/* ================= SAFETY ================= */

process.on("unhandledRejection", err => {
  console.error("UNHANDLED REJECTION:", err);
});

process.on("uncaughtException", err => {
  console.error("UNCAUGHT EXCEPTION:", err);
});

/* ================= LOGIN ================= */

client.login(TOKEN);
