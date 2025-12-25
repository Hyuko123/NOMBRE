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
  EmbedBuilder,
  StringSelectMenuBuilder
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

// ================= READY =================
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

  // ---------- TICKET PANEL ----------
  if (command === "ticketpanel") {
    if (!message.member.roles.cache.has(STAFF_ROLE_ID))
      return message.reply("❌ Staff uniquement.");

    const menu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("ticket_select")
        .setPlaceholder("🎟️ Ouvrir un ticket")
        .addOptions([
          { label: "Aide", value: "Aide", emoji: "🆘" },
          { label: "Recrutement", value: "Recrutement", emoji: "🧑‍💼" },
          { label: "Problème avec un membre", value: "Problème", emoji: "⚠️" }
        ])
    );

    const embed = new EmbedBuilder()
      .setTitle("🎟️ Support 70’s")
      .setDescription("Choisis une catégorie pour ouvrir un ticket.")
      .setColor("#f1c40f");

    return message.channel.send({ embeds: [embed], components: [menu] });
  }

  // ---------- AVERT ----------
  if (command === "avert") {
    const member = message.mentions.members.first();
    if (!member) return message.reply("❌ Mention manquante.");

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
    }
  }

  // ---------- GANG ----------
  if (command === "gang") {
    const sub = args.shift()?.toLowerCase();

    if (sub === "add") {
      const member = message.mentions.members.first();
      if (!member) return message.reply("❌ Mention manquante.");

      args.shift();
      const rank = args[0]?.toLowerCase();
      if (!GANG_HIERARCHY[rank])
        return message.reply("❌ og | bigg | lilgangsta | lilhomies | littleboys");

      await member.roles.remove(ALL_GANG_ROLES).catch(() => {});
      await member.roles.remove(ROLE_HG_ID).catch(() => {});
      await member.roles.add(GANG_HIERARCHY[rank]);
      await member.roles.add([ROLE_70S_ID, CITIZEN_ROLE_ID]);

      if (rank === "og") await member.roles.add(ROLE_HG_ID);

      return message.reply(`✅ ${member} ajouté **${rank.toUpperCase()}**`);
    }

    if (sub === "remove") {
      const member = message.mentions.members.first();
      if (!member) return message.reply("❌ Mention manquante.");

      await member.roles.remove([...ALL_GANG_ROLES, ROLE_HG_ID, ROLE_70S_ID]);
      return message.reply(`❌ ${member} retiré du gang`);
    }

    if (sub === "list") {
      let desc = "";
      for (const [rank, roleId] of Object.entries(GANG_HIERARCHY)) {
        const role = message.guild.roles.cache.get(roleId);
        const members = role?.members.map(m => `• ${m.user.tag}`).join("\n") || "—";
        desc += `**${rank.toUpperCase()}**\n${members}\n\n`;
      }

      return message.channel.send({
        embeds: [new EmbedBuilder().setTitle("📋 Gang").setDescription(desc)]
      });
    }
  }
});

// ================= INTERACTIONS =================
client.on("interactionCreate", async interaction => {

  if (interaction.isStringSelectMenu() && interaction.customId === "ticket_select") {
    const guild = interaction.guild;
    const user = interaction.user;

    if (guild.channels.cache.find(c => c.topic === user.id))
      return interaction.reply({ content: "❌ Ticket déjà ouvert.", ephemeral: true });

    const channel = await guild.channels.create({
      name: `ticket-${user.username}`,
      parent: TICKET_CATEGORY_ID,
      topic: user.id,
      permissionOverwrites: [
        { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
      ]
    });

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("ticket_claim").setLabel("Claim").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("ticket_close").setLabel("Fermer").setStyle(ButtonStyle.Danger)
    );

    channel.send({
      content: `🎟️ **Ticket ${interaction.values[0]}** — ${user}`,
      components: [buttons]
    });

    return interaction.reply({ content: `✅ Ticket créé : ${channel}`, ephemeral: true });
  }

  if (interaction.isButton() && interaction.customId === "ticket_claim") {
    if (!interaction.member.roles.cache.has(STAFF_ROLE_ID))
      return interaction.reply({ content: "❌ Staff uniquement.", ephemeral: true });

    return interaction.reply(`🧑‍✈️ Claim par ${interaction.user}`);
  }

  if (interaction.isButton() && interaction.customId === "ticket_close") {
    await interaction.reply("🔒 Fermeture...");
    await closeTicket(interaction.channel);
  }
});

// ================= CLOSE TICKET =================
async function closeTicket(channel) {
  const filePath = await createTranscriptHTML(channel);
  const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);

  const userId = channel.topic;
  if (userId) {
    const user = await client.users.fetch(userId).catch(() => null);
    if (user) await user.send({ files: [filePath] }).catch(() => {});
  }

  await logChannel.send({ files: [filePath] });
  setTimeout(() => {
    fs.unlinkSync(filePath);
    channel.delete().catch(() => {});
  }, 4000);
}

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
