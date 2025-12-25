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
const ROLE_70S_ID = "1449815862168129708";
const ROLE_HG_ID = "1453173029072011424";
const CITIZEN_ROLE_ID = "1452059862723985541";
const STAFF_ROLE_ID = "1449815862168129708";

// WARN
const WARN_1_ROLE_ID = "1452056200962113669";
const WARN_2_ROLE_ID = "1452056289751601284";
const WARN_3_ROLE_ID = "1452056340607537364";

// GANG
const GANG_HIERARCHY = {
  og: "1449814259935739996",
  bigg: "1449814244001448157",
  lilgangsta: "1449814507244490772",
  lilhomies: "1449814880428232744",
  littleboys: "1449814948141338634"
};
const ALL_GANG_ROLES = Object.values(GANG_HIERARCHY);

// CHANNELS
const RADIO_CHANNEL_ID = "1449816618187227249";
const PANEL_CHANNEL_ID = "1449818419083087902";
const LOG_CHANNEL_ID = "1453447170240811069";
const TICKET_CATEGORY_ID = "1453524406499414192";
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
    content: `<@&${ROLE_70S_ID}> 📻 **Radio du jour — ${SERVER_NAME}**\n🎲 Radio : ${random}`,
    allowedMentions: { roles: [ROLE_70S_ID] }
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
      content: `<@&${ROLE_70S_ID}>`,
      embeds: [embed],
      allowedMentions: { roles: [ROLE_70S_ID] }
    });
  }

  // ---------- AVERT ----------
  if (command === "avert") {
    const member = message.mentions.members.first();
    if (!member) return message.reply("❌ Mentionne un utilisateur.");
    const reason = args.slice(1).join(" ");
    if (!reason) return message.reply("❌ Raison obligatoire.");

    if (!member.roles.cache.has(WARN_1_ROLE_ID)) {
      await member.roles.add(WARN_1_ROLE_ID);
      return message.reply(`⚠️ ${member} → **Avertissement 1**\n📄 ${reason}`);
    }

    if (member.roles.cache.has(WARN_1_ROLE_ID) && !member.roles.cache.has(WARN_2_ROLE_ID)) {
      await member.roles.remove(WARN_1_ROLE_ID);
      await member.roles.add(WARN_2_ROLE_ID);
      return message.reply(`⚠️ ${member} → **Avertissement 2**\n📄 ${reason}`);
    }

    if (member.roles.cache.has(WARN_2_ROLE_ID)) {
      await member.roles.remove(WARN_2_ROLE_ID);
      await member.roles.add(WARN_3_ROLE_ID);

      await message.reply(`🚨 ${member} → **Avertissement 3**\n📄 ${reason}`);
      await executeDM(member);
      return;
    }
  }

  // ---------- GANG ----------
  if (command === "gang") {
    const sub = args.shift()?.toLowerCase();

    // ADD
    if (sub === "add") {
      const member = message.mentions.members.first();
      const rank = args[0]?.toLowerCase();
      if (!member || !GANG_HIERARCHY[rank]) {
        return message.reply("❌ `+gang add @user og|bigg|lilgangsta|lilhomies|littleboys`");
      }

      await member.roles.remove(ALL_GANG_ROLES).catch(() => {});
      await member.roles.remove(ROLE_HG_ID).catch(() => {});
      await member.roles.add(GANG_HIERARCHY[rank]);

      if (!member.roles.cache.has(CITIZEN_ROLE_ID))
        await member.roles.add(CITIZEN_ROLE_ID);

      if (!member.roles.cache.has(ROLE_70S_ID))
        await member.roles.add(ROLE_70S_ID);

      if (rank === "og")
        await member.roles.add(ROLE_HG_ID);

      return message.reply(`✅ ${member} ajouté comme **${rank.toUpperCase()}**`);
    }

    // REMOVE
    if (sub === "remove") {
      const member = message.mentions.members.first();
      if (!member) return message.reply("❌ Mention manquante.");

      await member.roles.remove(ALL_GANG_ROLES).catch(() => {});
      await member.roles.remove([ROLE_HG_ID, ROLE_70S_ID]).catch(() => {});
      return message.reply(`❌ ${member} retiré du gang`);
    }

    // LIST
    if (sub === "list") {
      let desc = "";
      for (const [rank, id] of Object.entries(GANG_HIERARCHY)) {
        const role = message.guild.roles.cache.get(id);
        const members = role?.members.map(m => `• ${m.user.tag}`).join("\n") || "—";
        desc += `**${rank.toUpperCase()}**\n${members}\n\n`;
      }

      const embed = new EmbedBuilder()
        .setTitle("📋 Hiérarchie du Gang")
        .setColor("#f1c40f")
        .setDescription(desc);

      return message.channel.send({ embeds: [embed] });
    }
  }

  // ---------- CLOSE TICKET ----------
  if (command === "close" && message.channel.name?.startsWith("ticket-")) {
    const filePath = await createTranscriptHTML(message.channel);
    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);

    const userId = message.channel.topic;
    if (userId) {
      const user = await client.users.fetch(userId).catch(() => null);
      if (user) await user.send({ files: [filePath] }).catch(() => {});
    }

    await logChannel.send({ files: [filePath] });
    setTimeout(() => {
      fs.unlinkSync(filePath);
      message.channel.delete().catch(() => {});
    }, 4000);
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

    if (role.editable) await member.roles.remove(role).catch(() => {});
  }
  await member.roles.remove(WARN_3_ROLE_ID).catch(() => {});
}

// ================= TRANSCRIPT =================
async function createTranscriptHTML(channel) {
  const messages = await channel.messages.fetch({ limit: 100 });
  const sorted = [...messages.values()].reverse();

  let html = `<html><body style="background:#313338;color:#dcddde;font-family:Arial">`;
  for (const msg of sorted) {
    html += `<p><b>${msg.author.tag}</b> : ${msg.content || ""}</p>`;
  }
  html += "</body></html>";

  const filePath = path.join(__dirname, `transcript-${channel.id}.html`);
  fs.writeFileSync(filePath, html);
  return filePath;
}

// ================= LOGIN =================
client.login(TOKEN);
