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

/* ================= CONFIG ================= */

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const SERVER_NAME = "70’s";

/* ================= ROLES ================= */

const STAFF_ROLE_ID = "1449815862168129708";
const ROLE_70S_ID = "1449815862168129708";
const ROLE_HG_ID = "1453173029072011424";
const ROLE_CITIZEN_ID = "1452059862723985541";

/* ================= GANG ================= */

const GANG_HIERARCHY = {
  og: "1449814259935739996",
  bigg: "1449814244001448157",
  lilgangsta: "1449814507244490772",
  lilhomies: "1449814880428232744",
  littleboys: "1449814948141338634"
};

const ALL_GANG_ROLES = Object.values(GANG_HIERARCHY);

/* ================= CHANNELS ================= */

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
    new SlashCommandBuilder().setName("cmd").setDescription("📜 Liste des commandes"),

    new SlashCommandBuilder().setName("ticketpanel").setDescription("🎟️ Envoyer le panel ticket"),

    new SlashCommandBuilder()
      .setName("annonce")
      .setDescription("📢 Envoyer une annonce")
      .addStringOption(o =>
        o.setName("texte").setDescription("Contenu").setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName("gang")
      .setDescription("🧑 Gestion du gang")
      .addSubcommand(s =>
        s.setName("list").setDescription("Voir la hiérarchie")
      )
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

    /* ================= /cmd ================= */

    if (interaction.commandName === "cmd") {
      const embed = new EmbedBuilder()
        .setColor("#3498db")
        .setTitle("📜 Commandes disponibles")
        .setDescription(`
🎟️ **Tickets**
• /ticketpanel

🧑 **Gang**
• /gang list
• /gang add
• /gang remove

📢 **Annonce**
• /annonce
        `);

      return interaction.editReply({ embeds: [embed] });
    }

    /* ================= /gang list ================= */

    if (interaction.commandName === "gang" && interaction.options.getSubcommand() === "list") {
      const guild = interaction.guild;

      const desc = Object.entries(GANG_HIERARCHY)
        .map(([_, id]) => {
          const role = guild.roles.cache.get(id);
          return role ? `• **${role.name}**` : null;
        })
        .filter(Boolean)
        .join("\n");

      const embed = new EmbedBuilder()
        .setTitle("🧑 Hiérarchie du gang")
        .setColor("#e67e22")
        .setDescription(desc || "Aucun rang");

      return interaction.editReply({ embeds: [embed] });
    }

    /* ================= /gang add ================= */

    if (interaction.commandName === "gang" && interaction.options.getSubcommand() === "add") {
      if (!interaction.member.roles.cache.has(STAFF_ROLE_ID))
        return interaction.editReply({ content: "❌ Staff uniquement" });

      const member = interaction.options.getMember("utilisateur");
      const rank = interaction.options.getString("rang");

      const roleId = GANG_HIERARCHY[rank];
      const guild = interaction.guild;

      await member.roles.remove(ALL_GANG_ROLES).catch(() => {});
      await member.roles.add([ROLE_CITIZEN_ID, ROLE_70S_ID, roleId]);

      if (rank === "og") {
        await member.roles.add(ROLE_HG_ID).catch(() => {});
      } else {
        await member.roles.remove(ROLE_HG_ID).catch(() => {});
      }

      return interaction.editReply(`✅ ${member} ajouté au rang **${rank.toUpperCase()}**`);
    }

    /* ================= /gang remove ================= */

    if (interaction.commandName === "gang" && interaction.options.getSubcommand() === "remove") {
      if (!interaction.member.roles.cache.has(STAFF_ROLE_ID))
        return interaction.editReply({ content: "❌ Staff uniquement" });

      const member = interaction.options.getMember("utilisateur");

      await member.roles.remove([...ALL_GANG_ROLES, ROLE_HG_ID]).catch(() => {});
      await member.roles.add([ROLE_CITIZEN_ID, ROLE_70S_ID]).catch(() => {});

      return interaction.editReply(`❌ ${member} retiré du gang`);
    }

  } catch (err) {
    console.error("❌ ERREUR INTERACTION :", err);
    if (!interaction.replied && !interaction.deferred) {
      interaction.reply({ content: "❌ Erreur interne.", ephemeral: true });
    }
  }
});

/* ================= LOGIN ================= */

client.login(TOKEN);
