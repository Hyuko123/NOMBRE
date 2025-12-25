const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

const cron = require("node-cron");
const fs = require("fs");
const path = require("path");

/* ================= CONFIG ================= */

const TOKEN = process.env.TOKEN; // Railway / GitHub
const SERVER_NAME = "70’s";

const CLIENT_ID = "1451234567890123456";
const GUILD_ID = "1449813863649509389";

/* ROLES */
const ROLE_70S_ID = "1449815862168129708";
const ROLE_HG_ID = "1453173029072011424";
const CITIZEN_ROLE_ID = "1452059862723985541";
const STAFF_ROLE_ID = "1449815862168129708";

/* WARN */
const WARN_1_ROLE_ID = "1452056200962113669";
const WARN_2_ROLE_ID = "1452056289751601284";
const WARN_3_ROLE_ID = "1452056340607537364";

/* GANG */
const GANG_HIERARCHY = {
  og: "1449814259935739996",
  bigg: "1449814244001448157",
  lilgangsta: "1449814507244490772",
  lilhomies: "1449814880428232744",
  littleboys: "1449814948141338634"
};
const ALL_GANG_ROLES = Object.values(GANG_HIERARCHY);

/* CHANNELS */
const RADIO_CHANNEL_ID = "1449816618187227249";
const PANEL_CHANNEL_ID = "1449818419083087902";
const LOG_CHANNEL_ID = "1453447170240811069";
const TICKET_CATEGORY_ID = "1453524406499414192";
const MEMBER_COUNT_CHANNEL_ID = "1453529232360603648";

/* ================= CLIENT ================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ]
});

/* ================= READY ================= */

client.once("ready", async () => {
  console.log(`✅ Bot ${SERVER_NAME} connecté`);

  /* MEMBER COUNT */
  client.guilds.cache.forEach(updateMemberCount);

  /* SLASH COMMANDS */
  const commands = [
    new SlashCommandBuilder().setName("cmd").setDescription("📜 Liste des commandes"),

    new SlashCommandBuilder().setName("ticketpanel").setDescription("🎟️ Panneau tickets"),

    new SlashCommandBuilder()
      .setName("annonce")
      .setDescription("📢 Annonce")
      .addStringOption(o =>
        o.setName("texte").setDescription("Contenu").setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName("avert")
      .setDescription("⚠️ Avertir un membre")
      .addUserOption(o => o.setName("utilisateur").setRequired(true))
      .addStringOption(o => o.setName("raison").setRequired(true)),

    new SlashCommandBuilder()
      .setName("gang")
      .setDescription("🧑 Gestion gang")
      .addSubcommand(s =>
        s.setName("add")
          .setDescription("Ajouter")
          .addUserOption(o => o.setName("utilisateur").setRequired(true))
          .addStringOption(o =>
            o.setName("rang").setRequired(true).addChoices(
              { name: "OG", value: "og" },
              { name: "BIG G", value: "bigg" },
              { name: "LIL GANGSTA", value: "lilgangsta" },
              { name: "LIL HOMIES", value: "lilhomies" },
              { name: "LITTLE BOYS", value: "littleboys" }
            )
          )
      )
      .addSubcommand(s =>
        s.setName("remove")
          .setDescription("Retirer")
          .addUserOption(o => o.setName("utilisateur").setRequired(true))
      )
      .addSubcommand(s =>
        s.setName("list").setDescription("Voir la hiérarchie")
      )
  ].map(c => c.toJSON());

  const rest = new REST({ version: "10" }).setToken(TOKEN);
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });

  console.log("✅ Slash commands enregistrées");
});

/* ================= MEMBER COUNT ================= */

async function updateMemberCount(guild) {
  const channel = guild.channels.cache.get(MEMBER_COUNT_CHANNEL_ID);
  if (channel) channel.setName(`👥 Membres : ${guild.memberCount}`).catch(() => {});
}

client.on("guildMemberAdd", m => updateMemberCount(m.guild));
client.on("guildMemberRemove", m => updateMemberCount(m.guild));

/* ================= RADIO ================= */

cron.schedule("0 15 * * *", async () => {
  const channel = await client.channels.fetch(RADIO_CHANNEL_ID).catch(() => null);
  if (!channel) return;

  channel.send({
    content: `<@&${ROLE_70S_ID}> 📻 Radio du jour`,
    allowedMentions: { roles: [ROLE_70S_ID] }
  });
});

/* ================= INTERACTIONS ================= */

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand() && !interaction.isStringSelectMenu() && !interaction.isButton()) return;

  /* /cmd */
  if (interaction.isChatInputCommand() && interaction.commandName === "cmd") {
    const embed = new EmbedBuilder()
      .setTitle("📜 Commandes")
      .setColor("#3498db")
      .setDescription(
        "**🎟️ Tickets**\n`/ticketpanel`\n\n" +
        "**⚠️ Modération**\n`/avert`\n\n" +
        "**🧑 Gang**\n`/gang add | remove | list`\n\n" +
        "**📢 Annonce**\n`/annonce`"
      );
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  /* /ticketpanel */
  if (interaction.commandName === "ticketpanel") {
    const menu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("ticket_select")
        .setPlaceholder("🎟️ Ouvrir un ticket")
        .addOptions(
          { label: "Aide", value: "aide", emoji: "🆘" },
          { label: "Recrutement", value: "recrutement", emoji: "🧑‍💼" },
          { label: "Problème", value: "probleme", emoji: "⚠️" }
        )
    );

    const embed = new EmbedBuilder()
      .setTitle("🎟️ Support")
      .setDescription("Choisis une catégorie")
      .setColor("#f1c40f");

    const channel = interaction.guild.channels.cache.get(PANEL_CHANNEL_ID);
    channel.send({ embeds: [embed], components: [menu] });

    return interaction.reply({ content: "✅ Panel envoyé", ephemeral: true });
  }

  /* TICKET CREATE */
  if (interaction.isStringSelectMenu() && interaction.customId === "ticket_select") {
    const user = interaction.user;
    const guild = interaction.guild;

    if (guild.channels.cache.find(c => c.topic === user.id))
      return interaction.reply({ content: "❌ Ticket déjà ouvert", ephemeral: true });

    const channel = await guild.channels.create({
      name: `ticket-${user.username}`,
      parent: TICKET_CATEGORY_ID,
      topic: user.id,
      permissionOverwrites: [
        { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel] }
      ]
    });

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("claim").setLabel("Claim").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("close").setLabel("Fermer").setStyle(ButtonStyle.Danger)
    );

    channel.send({ content: `🎟️ Ticket de ${user}`, components: [buttons] });
    return interaction.reply({ content: `✅ Ticket créé ${channel}`, ephemeral: true });
  }

  /* CLAIM */
  if (interaction.isButton() && interaction.customId === "claim") {
    return interaction.reply(`🧑‍✈️ Claim par ${interaction.user}`);
  }

  /* CLOSE */
  if (interaction.isButton() && interaction.customId === "close") {
    await closeTicket(interaction.channel);
    return interaction.reply("🔒 Ticket fermé");
  }
});

/* ================= DERANK ================= */

async function executeDM(member) {
  for (const role of member.roles.cache.values()) {
    if (
      role.id === member.guild.id ||
      role.id === CITIZEN_ROLE_ID ||
      [WARN_1_ROLE_ID, WARN_2_ROLE_ID].includes(role.id)
    ) continue;
    if (role.editable) await member.roles.remove(role);
  }
  await member.roles.remove(WARN_3_ROLE_ID).catch(() => {});
}

/* ================= TICKET CLOSE ================= */

async function closeTicket(channel) {
  const log = await client.channels.fetch(LOG_CHANNEL_ID);
  log.send(`📁 Ticket fermé : ${channel.name}`);
  channel.delete().catch(() => {});
}

/* ================= LOGIN ================= */

client.login(TOKEN);
