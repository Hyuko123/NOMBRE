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

/* ================= CONFIG ================= */

const TOKEN = process.env.TOKEN;
const SERVER_NAME = "70’s";

const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

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

/* ================= CLIENT ================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

/* ================= READY ================= */

client.once("ready", async () => {
  console.log(`✅ Bot ${SERVER_NAME} connecté`);

  /* SLASH COMMANDS */
  const commands = [
    new SlashCommandBuilder().setName("cmd").setDescription("📜 Liste des commandes"),

    new SlashCommandBuilder().setName("ticketpanel").setDescription("🎟️ Panel tickets"),

    new SlashCommandBuilder()
      .setName("annonce")
      .setDescription("📢 Envoyer une annonce")
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
      .setDescription("🧑 Gestion du gang")
      .addSubcommand(s =>
        s.setName("add")
          .setDescription("Ajouter un membre")
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
          .setDescription("Retirer du gang")
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

/* ================= INTERACTIONS ================= */

client.on("interactionCreate", async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      await interaction.deferReply({ ephemeral: true });
    }

    if (interaction.commandName === "cmd") {
      const embed = new EmbedBuilder()
        .setTitle("📜 Commandes")
        .setColor("#3498db")
        .setDescription(
          "**🎟️ Tickets**\n`/ticketpanel`\n\n" +
          "**⚠️ Modération**\n`/avert`\n\n" +
          "**🧑 Gang**\n`/gang add | remove | list`\n\n" +
          "**📢 Annonce**\n`/annonce`"
        );

      return interaction.editReply({ embeds: [embed] });
    }

  } catch (err) {
    console.error("❌ ERREUR INTERACTION :", err);
    if (!interaction.replied)
      interaction.reply({ content: "❌ Erreur interne.", ephemeral: true });
  }
});


  /* ================= /cmd ================= */
  if (interaction.isChatInputCommand() && interaction.commandName === "cmd") {
    const embed = new EmbedBuilder()
      .setColor("#3498db")
      .setTitle("📜 Commandes disponibles")
      .setDescription(`
🎟️ **Tickets**
• \`/ticketpanel\`

⚠️ **Modération**
• \`/avert\`

🧑 **Gang**
• \`/gang add | remove | list\`

📢 **Annonce**
• \`/annonce\`
`);
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  /* ================= TICKET PANEL ================= */
  if (interaction.isChatInputCommand() && interaction.commandName === "ticketpanel") {
    if (!interaction.member.roles.cache.has(STAFF_ROLE_ID))
      return interaction.reply({ content: "❌ Staff uniquement", ephemeral: true });

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
      .setTitle("🎟️ Support 70’s")
      .setDescription("Choisis une catégorie")
      .setColor("#f1c40f");

    interaction.guild.channels.cache
      .get(PANEL_CHANNEL_ID)
      .send({ embeds: [embed], components: [menu] });

    return interaction.reply({ content: "✅ Panel envoyé", ephemeral: true });
  }

  /* ================= TICKET CREATE ================= */
  if (interaction.isStringSelectMenu() && interaction.customId === "ticket_select") {
    const guild = interaction.guild;
    const user = interaction.user;

    if (guild.channels.cache.find(c => c.topic === user.id))
      return interaction.reply({ content: "❌ Ticket déjà ouvert", ephemeral: true });

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
      new ButtonBuilder().setCustomId("claim").setLabel("Claim").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("close").setLabel("Fermer").setStyle(ButtonStyle.Danger)
    );

    channel.send({ content: `🎟️ Ticket de ${user}`, components: [buttons] });
    return interaction.reply({ content: `✅ Ticket créé ${channel}`, ephemeral: true });
  }

  /* ================= CLAIM ================= */
  if (interaction.isButton() && interaction.customId === "claim") {
    if (!interaction.member.roles.cache.has(STAFF_ROLE_ID))
      return interaction.reply({ content: "❌ Staff uniquement", ephemeral: true });

    return interaction.reply(`🧑‍✈️ Ticket claim par ${interaction.user}`);
  }

  /* ================= CLOSE ================= */
  if (interaction.isButton() && interaction.customId === "close") {
    await interaction.channel.delete().catch(() => {});
  }
});

/* ================= LOGIN ================= */

client.login(TOKEN);
