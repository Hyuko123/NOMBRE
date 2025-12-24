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

// COMPTEUR MEMBRES
const MEMBER_COUNT_CHANNEL_ID = "1453529232360603648";

// AVERTISSEMENTS
const WARN_1_ROLE_ID = "1452056200962113669";
const WARN_2_ROLE_ID = "1452056289751601284";
const WARN_3_ROLE_ID = "1452056340607537364";

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

// ================= COMPTEUR MEMBRES =================
async function updateMemberCount(guild) {
  const channel = guild.channels.cache.get(MEMBER_COUNT_CHANNEL_ID);
  if (channel) channel.setName(`👥 Membres : ${guild.memberCount}`).catch(() => {});
}

client.on("guildMemberAdd", m => updateMemberCount(m.guild));
client.on("guildMemberRemove", m => updateMemberCount(m.guild));

// ================= RADIO =================
cron.schedule("0 15 * * *", async () => {
  const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
  if (!channel) return;

  const random = Math.floor(Math.random() * 999) + 1;
  channel.send({
    content: `<@&${ROLE_ID}> 📻 **Changement de radio — ${SERVER_NAME}**\n🎲 Radio du jour : ${random}`,
    allowedMentions: { roles: [ROLE_ID] }
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
      content: `<@&${ROLE_ID}>`,
      embeds: [embed],
      allowedMentions: { roles: [ROLE_ID] }
    });
  }

  // ---------- AVERT ----------
  if (command === "avert") {
    const member = message.mentions.members.first();
    if (!member) return message.reply("❌ Mentionne un utilisateur.");

    const has1 = member.roles.cache.has(WARN_1_ROLE_ID);
    const has2 = member.roles.cache.has(WARN_2_ROLE_ID);
    const has3 = member.roles.cache.has(WARN_3_ROLE_ID);

    // AVERT 1
    if (!has1 && !has2 && !has3) {
      await member.roles.add(WARN_1_ROLE_ID);
      return message.reply(`⚠️ ${member} reçoit **Avertissement 1**.`);
    }

    // AVERT 2
    if (has1 && !has2) {
      await member.roles.remove(WARN_1_ROLE_ID);
      await member.roles.add(WARN_2_ROLE_ID);
      return message.reply(`⚠️ ${member} passe à **Avertissement 2**.`);
    }

    // AVERT 3 + DM AUTO
    if (has2 && !has3) {
      await member.roles.remove(WARN_2_ROLE_ID);
      await member.roles.add(WARN_3_ROLE_ID);

      await message.reply(`🚨 ${member} reçoit **Avertissement 3**.`);

      // ⛔ DÉRANK AUTOMATIQUE
      await executeDM(member);

      return;
    }

    return message.reply("❌ Cet utilisateur a déjà l'avertissement maximal.");
  }

  // ---------- DM (DÉRANK) ----------
  if (command === "dm") {
    const member = message.mentions.members.first();
    if (!member) return message.reply("❌ Mentionne un utilisateur.");

    await executeDM(member);
    return message.reply(`⛔ ${member} a été dérank.`);
  }

  // ---------- PANEL ----------
  if (command === "ticketpanel" && message.channel.id === PANEL_CHANNEL_ID) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("open_ticket")
        .setLabel("🎫 Ouvrir un ticket")
        .setStyle(ButtonStyle.Primary)
    );

    return message.channel.send({
      content: `🎫 **Support ${SERVER_NAME}**`,
      components: [row]
    });
  }

  // ---------- TICKET ----------
  if (!message.channel.name?.startsWith("ticket-")) return;

  if (command === "close") {
    await message.channel.send("📄 Création du transcript...");

    const filePath = await createTranscriptHTML(message.channel);
    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);

    const user = await client.users.fetch(message.channel.topic).catch(() => null);
    if (user) {
      await user.send({ files: [filePath] }).catch(() => {});
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

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("reason")
          .setLabel("Explique ton problème")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
      )
    );

    return interaction.showModal(modal);
  }

  if (interaction.type === InteractionType.ModalSubmit) {
    await interaction.deferReply({ ephemeral: true });

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

    await channel.send(`🎫 **Ticket ${SERVER_NAME}**\n> ${interaction.fields.getTextInputValue("reason")}`);
    interaction.editReply({ content: `✅ Ticket créé : ${channel}` });
  }
});

// ================= DÉRANK =================
async function executeDM(member) {
  const roles = member.roles.cache.filter(r =>
    r.id !== member.guild.id &&
    ![WARN_1_ROLE_ID, WARN_2_ROLE_ID, WARN_3_ROLE_ID].includes(r.id)
  );

  await member.roles.remove(roles).catch(() => {});
}

// ================= TRANSCRIPT =================
async function createTranscriptHTML(channel) {
  const messages = await channel.messages.fetch({ limit: 100 });
  const sorted = [...messages.values()].reverse();

  let html = `<html><body style="background:#313338;color:#fff;font-family:Arial">
<h2>Transcript ${channel.name}</h2><hr>`;

  for (const msg of sorted) {
    const isStaff = msg.member?.roles.cache.has(STAFF_ROLE_ID);
    html += `<p><b>${msg.author.tag}</b> ${isStaff ? "[STAFF]" : ""}<br>${msg.content}</p>`;
  }

  html += "</body></html>";

  const filePath = path.join(__dirname, `transcript-${channel.id}.html`);
  fs.writeFileSync(filePath, html);
  return filePath;
}

// ================= LOGIN =================
client.login(TOKEN);
