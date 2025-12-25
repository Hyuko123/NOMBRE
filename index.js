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

// ROLES
const PING_ROLE_ID = "1449815862168129708";
const STAFF_ROLE_ID = "1449815862168129708";
const CITIZEN_ROLE_ID = "1452059862723985541";

const WARN_1_ROLE_ID = "1452056200962113669";
const WARN_2_ROLE_ID = "1452056289751601284";
const WARN_3_ROLE_ID = "1452056340607537364";

// CHANNELS
const RADIO_CHANNEL_ID = "1449816618187227249";
const PANEL_CHANNEL_ID = "1449818419083087902";
const LOG_CHANNEL_ID = "1453447170240811069";
const TICKET_CATEGORY_ID = "1453524406499414192";

// MEMBER COUNT
const MEMBER_COUNT_CHANNEL_ID = "1453529232360603648";

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
  client.guilds.cache.forEach(updateMemberCount);
});

// ================= MEMBER COUNT =================
async function updateMemberCount(guild) {
  const channel = guild.channels.cache.get(MEMBER_COUNT_CHANNEL_ID);
  if (channel) channel.setName(`👥 Membres : ${guild.memberCount}`).catch(() => {});
}

client.on("guildMemberAdd", m => updateMemberCount(m.guild));
client.on("guildMemberRemove", m => updateMemberCount(m.guild));

// ================= RADIO =================
cron.schedule("0 15 * * *", async () => {
  const channel = await client.channels.fetch(RADIO_CHANNEL_ID).catch(() => null);
  if (!channel) return;

  const random = Math.floor(Math.random() * 999) + 1;
  channel.send({
    content: `<@&${PING_ROLE_ID}> 📻 **Radio du jour — ${SERVER_NAME}**\n🎲 Radio : ${random}`,
    allowedMentions: { roles: [PING_ROLE_ID] }
  });
});

// ================= COMMANDES =================
client.on("messageCreate", async message => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // ---------- ANNONCE ----------
  if (command === "annonce") {
    const texte = args.join(" ");
    if (!texte) return message.reply("❌ Contenu manquant.");

    await message.delete().catch(() => {});

    const embed = new EmbedBuilder()
      .setColor("#f1c40f")
      .setTitle(`📢 Annonce — ${SERVER_NAME}`)
      .setDescription(texte)
      .setTimestamp();

    return message.channel.send({
      content: `<@&${PING_ROLE_ID}>`,
      embeds: [embed],
      allowedMentions: { roles: [PING_ROLE_ID] }
    });
  }

  // ---------- AVERT ----------
  if (command === "avert") {
    const member = message.mentions.members.first();
    if (!member) return message.reply("❌ Mentionne un utilisateur.");

    const reason = args.slice(1).join(" ");
    if (!reason) return message.reply("❌ Raison obligatoire.");

    const has1 = member.roles.cache.has(WARN_1_ROLE_ID);
    const has2 = member.roles.cache.has(WARN_2_ROLE_ID);
    const has3 = member.roles.cache.has(WARN_3_ROLE_ID);

    if (!has1 && !has2) {
      await member.roles.add(WARN_1_ROLE_ID);
      return message.reply(`⚠️ ${member} reçoit **Avertissement 1**\n📄 ${reason}`);
    }

    if (has1 && !has2) {
      await member.roles.remove(WARN_1_ROLE_ID);
      await member.roles.add(WARN_2_ROLE_ID);
      return message.reply(`⚠️ ${member} passe à **Avertissement 2**\n📄 ${reason}`);
    }

    if (has2 && !has3) {
      await member.roles.remove(WARN_2_ROLE_ID);
      await member.roles.add(WARN_3_ROLE_ID);

      await message.reply(`🚨 ${member} reçoit **Avertissement 3**\n📄 ${reason}`);

      await executeDM(member);
      return;
    }

    return message.reply("⛔ L'utilisateur a déjà été sanctionné.");
  }

  // ---------- PANEL ----------
  if (command === "ticketpanel" && message.channel.id === PANEL_CHANNEL_ID) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("open_ticket")
        .setLabel("🎫 Ouvrir un ticket")
        .setStyle(ButtonStyle.Primary)
    );

    return message.channel.send({ content: "🎫 Support", components: [row] });
  }

  // ---------- CLOSE ----------
  if (command === "close" && message.channel.name?.startsWith("ticket-")) {
    const filePath = await createTranscriptHTML(message.channel);
    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);

    const userId = message.channel.topic;
    if (userId) {
      const user = await client.users.fetch(userId).catch(() => null);
      if (user) {
        await user.send({ files: [filePath] }).catch(() => {});
      }
    }

    await logChannel.send({ files: [filePath] });
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

// ================= DERANK =================
async function executeDM(member) {
  for (const role of member.roles.cache.values()) {
    if (
      role.id === member.guild.id ||
      role.id === CITIZEN_ROLE_ID ||
      [WARN_1_ROLE_ID, WARN_2_ROLE_ID].includes(role.id)
    ) continue;

    if (!role.editable) continue;
    await member.roles.remove(role).catch(() => {});
  }

  if (member.roles.cache.has(WARN_3_ROLE_ID)) {
    await member.roles.remove(WARN_3_ROLE_ID).catch(() => {});
  }
}

// ================= TRANSCRIPT =================
async function createTranscriptHTML(channel) {
  const messages = await channel.messages.fetch({ limit: 100 });
  const sorted = [...messages.values()].reverse();

  let html = `<html><body style="background:#313338;color:#dcddde;font-family:Arial">`;
  for (const msg of sorted) {
    html += `<p><b>${msg.author.tag}</b> : ${msg.content}</p>`;
  }
  html += "</body></html>";

  const filePath = path.join(__dirname, `transcript-${channel.id}.html`);
  fs.writeFileSync(filePath, html);
  return filePath;
}

// ================= LOGIN =================
client.login(TOKEN);
