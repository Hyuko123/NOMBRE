const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  EmbedBuilder,
  StringSelectMenuBuilder
} = require("discord.js");

const discordTranscripts = require("discord-html-transcripts");

// ================= CONFIG =================
const TOKEN = process.env.TOKEN;
const PREFIX = "+";
const SERVER_NAME = "70’s";

// ROLES
const STAFF_ROLE_ID = "1449815862168129708";

// CHANNELS
const LOG_CHANNEL_ID = "1453447170240811069";
const TICKET_CATEGORY_ID = "1453524406499414192";

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
});

// ================= COMMANDES =================
client.on("messageCreate", async message => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const command = message.content.slice(PREFIX.length).trim().toLowerCase();

  // ---------- PANEL TICKET ----------
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
          { label: "Problème", value: "Problème", emoji: "⚠️" }
        ])
    );

    const embed = new EmbedBuilder()
      .setTitle("🎟️ Support 70’s")
      .setDescription("Choisis une catégorie pour ouvrir un ticket.")
      .setColor("#f1c40f");

    await message.channel.send({
      embeds: [embed],
      components: [menu]
    });
  }
});

// ================= INTERACTIONS =================
client.on("interactionCreate", async interaction => {

  // ---------- CREATION TICKET ----------
  if (interaction.isStringSelectMenu() && interaction.customId === "ticket_select") {

    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    const user = interaction.user;

    // Anti double ticket
    if (guild.channels.cache.find(c => c.topic === user.id)) {
      return interaction.editReply("❌ Tu as déjà un ticket ouvert.");
    }

    const channel = await guild.channels.create({
      name: `ticket-${user.username}`,
      parent: TICKET_CATEGORY_ID,
      topic: user.id,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages
          ]
        },
        {
          id: STAFF_ROLE_ID,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages
          ]
        }
      ]
    });

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("ticket_close")
        .setLabel("Fermer")
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({
      content: `🎟️ Ticket ouvert par ${user}`,
      components: [buttons]
    });

    return interaction.editReply(`✅ Ticket créé : ${channel}`);
  }

  // ---------- FERMETURE TICKET ----------
  if (interaction.isButton() && interaction.customId === "ticket_close") {

    if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
      return interaction.reply({ content: "❌ Staff uniquement.", ephemeral: true });
    }

    await interaction.reply({ content: "🔒 Fermeture du ticket...", ephemeral: true });
    await closeTicket(interaction.channel, interaction.user);
  }
});

// ================= FERMETURE + TRANSCRIPT =================
async function closeTicket(channel, staffUser) {
  const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);

  const transcript = await discordTranscripts.createTranscript(channel, {
    limit: -1,
    returnType: "attachment",
    filename: `ticket-${channel.name}.html`,
    saveImages: true,
    poweredBy: true
  });

  const embed = new EmbedBuilder()
    .setTitle("🎟️ Ticket fermé")
    .setColor("#e74c3c")
    .addFields(
      { name: "📁 Ticket", value: channel.name, inline: true },
      { name: "🛡️ Staff", value: `<@${staffUser.id}>`, inline: true }
    )
    .setThumbnail(staffUser.displayAvatarURL({ dynamic: true }))
    .setTimestamp();

  await logChannel.send({
    embeds: [embed],
    files: [transcript]
  });

  setTimeout(() => {
    channel.delete().catch(() => {});
  }, 4000);
}

// ================= LOGIN =================
client.login(TOKEN);
