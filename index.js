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
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const SERVER_NAME = "70’s";

/* ROLES */
const STAFF_ROLE_ID = "1449815862168129708";

/* CHANNELS */
const PANEL_CHANNEL_ID = "1449818419083087902";
const TICKET_CATEGORY_ID = "1453524406499414192";

/* ================= CLIENT ================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages
  ]
});

/* ================= READY ================= */

client.once("ready", async () => {
  console.log(`✅ Bot ${SERVER_NAME} connecté`);

  const commands = [
    new SlashCommandBuilder()
      .setName("cmd")
      .setDescription("📜 Liste des commandes"),

    new SlashCommandBuilder()
      .setName("ticketpanel")
      .setDescription("🎟️ Envoyer le panel ticket"),

    new SlashCommandBuilder()
      .setName("annonce")
      .setDescription("📢 Envoyer une annonce")
      .addStringOption(o =>
        o.setName("texte").setDescription("Contenu").setRequired(true)
      )
  ].map(c => c.toJSON());

  const rest = new REST({ version: "10" }).setToken(TOKEN);
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );

  console.log("✅ Slash commands enregistrées");
});

/* ================= INTERACTIONS ================= */

client.on("interactionCreate", async interaction => {
  try {
    /* ================= SLASH COMMANDS ================= */

    if (interaction.isChatInputCommand()) {
      await interaction.deferReply({ ephemeral: true });
    }

    /* /cmd */
    if (interaction.isChatInputCommand() && interaction.commandName === "cmd") {
      const embed = new EmbedBuilder()
        .setColor("#3498db")
        .setTitle("📜 Commandes disponibles")
        .setDescription(`
🎟️ **Tickets**
• \`/ticketpanel\`

📢 **Annonce**
• \`/annonce\`
        `);

      return interaction.editReply({ embeds: [embed] });
    }

    /* /ticketpanel */
    if (interaction.isChatInputCommand() && interaction.commandName === "ticketpanel") {
      if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
        return interaction.editReply({ content: "❌ Staff uniquement" });
      }

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

      const panelChannel = interaction.guild.channels.cache.get(PANEL_CHANNEL_ID);
      if (!panelChannel) {
        return interaction.editReply({ content: "❌ Salon panel introuvable" });
      }

      await panelChannel.send({ embeds: [embed], components: [menu] });
      return interaction.editReply({ content: "✅ Panel envoyé" });
    }

    /* ================= SELECT MENU ================= */

    if (interaction.isStringSelectMenu() && interaction.customId === "ticket_select") {
      const guild = interaction.guild;
      const user = interaction.user;

      if (guild.channels.cache.find(c => c.topic === user.id)) {
        return interaction.reply({ content: "❌ Ticket déjà ouvert", ephemeral: true });
      }

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

      await channel.send({
        content: `🎟️ Ticket de ${user}`,
        components: [buttons]
      });

      return interaction.reply({ content: `✅ Ticket créé : ${channel}`, ephemeral: true });
    }

    /* ================= BUTTONS ================= */

    if (interaction.isButton() && interaction.customId === "claim") {
      if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
        return interaction.reply({ content: "❌ Staff uniquement", ephemeral: true });
      }

      return interaction.reply(`🧑‍✈️ Ticket claim par ${interaction.user}`);
    }

    if (interaction.isButton() && interaction.customId === "close") {
      await interaction.channel.delete().catch(() => {});
    }

  } catch (err) {
    console.error("❌ ERREUR INTERACTION :", err);

    if (!interaction.replied && !interaction.deferred) {
      interaction.reply({ content: "❌ Erreur interne.", ephemeral: true });
    }
  }
});

/* ================= SAFETY ================= */

process.on("unhandledRejection", err => {
  console.error("UNHANDLED REJECTION:", err);
});

/* ================= LOGIN ================= */

client.login(TOKEN);
