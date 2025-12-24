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
  console.log(`✅ Bot ${SERVER_NAME} connecté (Railway safe)`);
});

// ================= RADIO =================
cron.schedule("0 15 * * *", async () => {
  const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
  if (channel) envoyerMessage(channel);
});

function envoyerMessage(channel) {
  const random = Math.floor(Math.random() * 999) + 1;
  channel.send({
    content: `<@&${ROLE_ID}> 📻 **Changement de radio — ${SERVER_NAME}**\n🎲 Radio du jour : ${random}`,
    allowedMentions: { roles: [ROLE_ID] }
  });
}

// ================= COMMANDES =================
client.on("messageCreate", async message => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // ---------- ANNONCE ----------
  if (command === "annonce") {
    const texte = args.join(" ");
    if (!texte) return;

    await message.delete().catch(() => {});
    const embed = new EmbedBuilder()
      .setColor("#f1c40f")
      .setTitle(`📢 Annonce — ${SERVER_NAME}`)
      .setDescription(texte)
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

  // ---------- COMMANDES TICKET ----------
  if (!message.channel.name?.startsWith("ticket-")) return;

  if (command === "close") {
    await message.channel.send("📄 Création du transcript...");

    const filePath = await createTranscriptHTML(message.channel);
    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);

    const userId = message.channel.topic;
    if (userId) {
      const user = await client.users.fetch(userId).catch(() => null);
      if (user) {
        await user.send({
          content: `📄 Transcript du ticket — ${SERVER_NAME}`,
          files: [filePath]
        }).catch(() => {});
      }
    }

    await logChannel.send({
      content: `🔒 Ticket fermé : ${message.channel.name}`,
      files: [filePath]
    });

    setTimeout(() => {
      fs.unlinkSync(filePath);
      message.channel.delete().catch(() => {});
    }, 4000);
  }
});

// ================= INTERACTIONS =================
client.on("interactionCreate", async interaction => {
  if (interaction.isButton() && interaction.customId === "open_ticket") {
    const modal = new ModalBuilder()
      .setCustomId("ticket_modal")
      .setTitle(`Ticket — ${SERVER_NAME}`);

    const input = new TextInputBuilder()
      .setCustomId("reason")
      .setLabel("Explique ton problème")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return interaction.showModal(modal);
  }

  if (interaction.type === InteractionType.ModalSubmit) {
    await interaction.deferReply({ ephemeral: true });

    const reason = interaction.fields.getTextInputValue("reason");

    const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`.toLowerCase(),
      parent: TICKET_CATEGORY_ID,
      topic: interaction.user.id,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
      ]
    });

    channel.send(`🎫 **Ticket ${SERVER_NAME}**\n> ${reason}`);
    interaction.editReply({ content: `✅ Ticket créé : ${channel}` });
  }
});

// ================= TRANSCRIPT HTML (DISCORD STYLE + STAFF) =================
async function createTranscriptHTML(channel) {
  const messages = await channel.messages.fetch({ limit: 100 });
  const sorted = [...messages.values()].reverse();

  let html = `
<html><head>
<style>
body { background:#313338; color:#dcddde; font-family:Arial; padding:20px }
.message { margin-bottom:14px }
.author { font-weight:600 }
.staff { background:#5865F2; color:white; font-size:11px; padding:2px 6px; border-radius:4px; margin-left:6px }
.time { color:#949ba4; font-size:11px }
</style>
</head><body>
<h2>Transcript — ${channel.name}</h2><hr>
`;

  for (const msg of sorted) {
    const member = channel.guild.members.cache.get(msg.author.id);
    const isStaff = member?.roles.cache.has(STAFF_ROLE_ID);

    html += `
<div class="message">
  <span class="author">${msg.author.tag}</span>
  ${isStaff ? `<span class="staff">STAFF</span>` : ""}
  <div class="time">${msg.createdAt.toLocaleString()}</div>
  <div>${msg.content || "<i>Message vide</i>"}</div>
</div>
`;
  }

  html += "</body></html>";

  const filePath = path.join(__dirname, `transcript-${channel.id}.html`);
  fs.writeFileSync(filePath, html);
  return filePath;
}

// ================= LOGIN =================
client.login(TOKEN);
