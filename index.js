const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  InteractionType,
  PermissionsBitField,
  EmbedBuilder
} = require("discord.js");

const cron = require("node-cron");
const fs = require("fs");
const path = require("path");

// ================= CONFIG =================
const TOKEN = process.env.TOKEN;
const PREFIX = "+";
const SERVER_NAME = "70’s";

// RADIO
const CHANNEL_ID = "1449816618187227249";
const ROLE_ID = "1449815862168129708";

// TICKETS
const TICKET_CATEGORY_ID = "1453524406499414192";
const STAFF_ROLE_ID = "1449815862168129708";
const LOG_CHANNEL_ID = "1453447170240811069";
const PANEL_CHANNEL_ID = "1449818419083087902";

// ================= CLIENT =================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.once("ready", () => {
  console.log(`✅ Bot ${SERVER_NAME} connecté !`);
});

// ================= RADIO =================
cron.schedule("0 15 * * *", async () => {
  const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
  if (channel) envoyerMessage(channel);
});

async function envoyerMessage(channel) {
  const random = Math.floor(Math.random() * 999) + 1;

  channel.send({
    content: `<@&${ROLE_ID}> 📻 **Changement de radio journalier — ${SERVER_NAME}**

🎲 **Radio du jour** : ${random}`,
    allowedMentions: { roles: [ROLE_ID] }
  });
}

// ================= TRANSCRIPT =================
async function createTranscript(channel) {
  const messages = await channel.messages.fetch({ limit: 100 });
  const sorted = [...messages.values()].reverse();

  let html = `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Transcript ${channel.name}</title>
<style>
body {
  background:#0f0f0f;
  color:#eee;
  font-family:Arial;
  padding:20px;
}
h2 { color:#f1c40f; }
.message {
  border-left:3px solid #f1c40f;
  padding:8px;
  margin-bottom:10px;
}
.author { font-weight:bold; }
.time { font-size:11px; color:#aaa; }
</style>
</head>
<body>

<h2>Transcript — ${channel.name}</h2>
<hr>
`;

  for (const msg of sorted) {
    html += `
<div class="message">
  <div class="author">${msg.author.tag}</div>
  <div class="time">${msg.createdAt.toLocaleString()}</div>
  <div>${msg.content || "<i>Message sans texte</i>"}</div>
</div>`;
  }

  html += "</body></html>";

  const filePath = path.join(__dirname, `${channel.id}.html`);
  fs.writeFileSync(filePath, html);
  return filePath;
}

// ================= COMMANDES =================
client.on("messageCreate", async message => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // ---------- ANNONCE ----------
  if (command === "annonce") {
    const texte = args.join(" ");
    if (!texte) return;

    await message.delete().catch(() => {});

    const embed = new EmbedBuilder()
      .setColor("#f1c40f")
      .setTitle(`📢 Annonce Officielle — ${SERVER_NAME}`)
      .setDescription(`━━━━━━━━━━━━━━━━━━━\n\n${texte}\n\n━━━━━━━━━━━━━━━━━━━`)
      .setFooter({ text: SERVER_NAME })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }

  // ---------- PANEL ----------
  if (command === "ticketpanel" && message.channel.id === PANEL_CHANNEL_ID) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("open_ticket")
        .setLabel("🎫 Ouvrir un ticket")
        .setStyle(ButtonStyle.Primary)
    );

    message.channel.send({
      content: `🎫 **Support ${SERVER_NAME}**`,
      components: [row]
    });
  }

  // ---------- TICKETS ----------
  if (!message.channel.name?.startsWith("ticket-")) return;

  if (command === "close") {
    await message.channel.send("📄 Génération du transcript...");

    const filePath = await createTranscript(message.channel);
    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);

    // MP utilisateur
    const userId = message.channel.topic;
    const user = await client.users.fetch(userId).catch(() => null);
    if (user) {
      user.send({
        content: `📄 **Transcript de ton ticket — ${SERVER_NAME}**`,
        files: [filePath]
      }).catch(() => {});
    }

    // Logs
    logChannel.send({
      content: `📁 **Ticket fermé** : ${message.channel.name}`,
      files: [filePath]
    });

    setTimeout(async () => {
      fs.unlinkSync(filePath);
      message.channel.delete().catch(() => {});
    }, 3000);
  }
});

// ================= INTERACTIONS =================
client.on("interactionCreate", async interaction => {
  if (interaction.isButton() && interaction.customId === "open_ticket") {
    const existing = interaction.guild.channels.cache.find(
      c => c.parentId === TICKET_CATEGORY_ID && c.topic === interaction.user.id
    );

    if (existing) {
      return interaction.reply({ content: "❌ Ticket déjà ouvert.", ephemeral: true });
    }

    const modal = new ModalBuilder()
      .setCustomId("ticket_modal")
      .setTitle(`Créer un ticket — ${SERVER_NAME}`);

    const input = new TextInputBuilder()
      .setCustomId("reason")
      .setLabel("Explique ton problème")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return interaction.showModal(modal);
  }

  if (interaction.type === InteractionType.ModalSubmit && interaction.customId === "ticket_modal") {
    await interaction.deferReply({ ephemeral: true });

    const reason = interaction.fields.getTextInputValue("reason");

    const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`.toLowerCase(),
      parent: TICKET_CATEGORY_ID,
      topic: interaction.user.id,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel] },
        { id: STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel] }
      ]
    });

    channel.send(`🎫 **Ticket ${SERVER_NAME}**\n> ${reason}`);
    interaction.editReply({ content: `✅ Ticket créé : ${channel}` });
  }
});

// ================= LOGIN =================
client.login(TOKEN);
