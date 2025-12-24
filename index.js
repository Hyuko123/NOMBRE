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
const puppeteer = require("puppeteer");
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
  console.log(`✅ Bot ${SERVER_NAME} connecté`);
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
      .setFooter({ text: `${SERVER_NAME}` })
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
    await message.channel.send("📸 Génération du transcript...");

    const imagePath = await createTranscriptImage(message.channel);
    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);

    const userId = message.channel.topic;
    if (userId) {
      const user = await client.users.fetch(userId).catch(() => null);
      if (user) {
        await user.send({
          content: `📁 Transcript du ticket — ${SERVER_NAME}`,
          files: [imagePath]
        }).catch(() => {});
      }
    }

    await logChannel.send({
      content: `🔒 Ticket fermé : ${message.channel.name}`,
      files: [imagePath]
    });

    setTimeout(() => {
      fs.unlinkSync(imagePath);
      message.channel.delete().catch(() => {});
    }, 4000);
  }

  if (command === "add") {
    const user = message.mentions.users.first();
    if (!user) return;

    await message.channel.permissionOverwrites.edit(user.id, {
      ViewChannel: true,
      SendMessages: true
    });
  }

  if (command === "remove") {
    const user = message.mentions.users.first();
    if (!user) return;

    await message.channel.permissionOverwrites.delete(user.id);
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

// ================= TRANSCRIPT IMAGE (DISCORD STYLE + BADGE STAFF) =================
async function createTranscriptImage(channel) {
  const messages = await channel.messages.fetch({ limit: 100 });
  const sorted = [...messages.values()].reverse();

  let html = `
<!DOCTYPE html>
<html>
<head>
<style>
body { background:#313338; font-family: Arial; color:#dcddde; padding:20px; }
.message { display:flex; gap:12px; margin-bottom:14px; }
.avatar { width:40px; height:40px; border-radius:50%; }
.username { font-weight:600; color:#f2f3f5; }
.staff { background:#5865F2; color:white; font-size:10px; padding:2px 6px; border-radius:4px; margin-left:6px; }
.time { font-size:11px; color:#949ba4; margin-left:6px; }
.content { margin-left:52px; margin-top:-18px; white-space:pre-wrap; }
</style>
</head>
<body>
<h2>Transcript — ${channel.name}</h2>
<hr>
`;

  for (const msg of sorted) {
    const member = channel.guild.members.cache.get(msg.author.id);
    const isStaff = member?.roles.cache.has(STAFF_ROLE_ID);

    html += `
<div class="message">
<img class="avatar" src="${msg.author.displayAvatarURL({ extension: "png", size: 64 })}">
<div>
  <span class="username">${msg.author.username}</span>
  ${isStaff ? `<span class="staff">STAFF</span>` : ""}
  <span class="time">${msg.createdAt.toLocaleString()}</span>
  <div class="content">${msg.content || "<i>Message vide</i>"}</div>
</div>
</div>
`;
  }

  html += "</body></html>";

  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  await page.setViewport({ width: 900, height: 2000 });

  const filePath = path.join(__dirname, `transcript-${channel.id}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  await browser.close();

  return filePath;
}

// ================= LOGIN =================
client.login(TOKEN);
