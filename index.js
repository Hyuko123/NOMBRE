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

// ================= CONFIG =================
const TOKEN = process.env.TOKEN;
const PREFIX = "+";
const SERVER_NAME = "70’s";

// RADIO
const CHANNEL_ID = "1449816618187227249";
const ROLE_ID = "1449815862168129708";

// TICKETS
const TICKET_CATEGORY_ID = "1453447245323042896";
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
  console.log(`✅ Bot ${SERVER_NAME} connecté !`);
});

// ================= RADIO =================
cron.schedule("0 15 * * *", async () => {
  const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
  if (channel) envoyerMessage(channel);
});

async function envoyerMessage(channel) {
  const random = Math.floor(Math.random() * 999) + 1;

  channel.send({
    content: `<@&${ROLE_ID}> 📻 **Changement de radio journalier — ${SERVER_NAME}**

🎲 **Radio du jour** : ${random}`,
    allowedMentions: { roles: [ROLE_ID] }
  });
}

// ================= COMMANDES =================
client.on("messageCreate", async message => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // ---------- TEST ----------
  if (command === "test") {
    envoyerMessage(message.channel);
  }

  // ---------- ANNONCE ----------
  if (command === "annonce") {
    const texte = args.join(" ");
    if (!texte) {
      return message.reply("❌ Merci d'indiquer le contenu de l'annonce.");
    }

    await message.delete().catch(() => {});

    const embed = new EmbedBuilder()
      .setColor("#f1c40f")
      .setTitle(`📢 Annonce Officielle — ${SERVER_NAME}`)
      .setDescription(`
━━━━━━━━━━━━━━━━━━━

📝 **Information importante**

${texte}

━━━━━━━━━━━━━━━━━━━
`)
      .setThumbnail(message.guild.iconURL({ dynamic: true }))
      .addFields(
        { name: "👤 Auteur", value: `<@${message.author.id}>`, inline: true },
        { name: "🕒 Date", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
      )
      .setFooter({
        text: `${SERVER_NAME} • Restez informés`,
        iconURL: client.user.displayAvatarURL()
      })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }

  // ---------- PANEL ----------
  if (command === "ticketpanel") {
    if (message.channel.id !== PANEL_CHANNEL_ID) return;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("open_ticket")
        .setLabel("🎫 Ouvrir un ticket")
        .setStyle(ButtonStyle.Primary)
    );

    message.channel.send({
      content: `🎫 **Support ${SERVER_NAME}**\nClique sur le bouton ci-dessous et explique ton problème.`,
      components: [row]
    });
  }

  // ---------- COMMANDES TICKET ----------
  if (!message.channel.name?.startsWith("ticket-")) return;

  if (command === "close") {
    await message.channel.send("🔒 Ticket fermé.");
    await message.channel.delete().catch(() => {});
  }

  if (command === "add") {
    const user = message.mentions.users.first();
    if (!user) return;

    await message.channel.permissionOverwrites.edit(user.id, {
      ViewChannel: true,
      SendMessages: true
    });

    message.channel.send(`➕ ${user} ajouté au ticket.`);
    log(`➕ ${user.tag} ajouté à ${message.channel.name}`);
  }

  if (command === "remove") {
    const user = message.mentions.users.first();
    if (!user) return;

    await message.channel.permissionOverwrites.delete(user.id);
    message.channel.send(`➖ ${user} retiré du ticket.`);
    log(`➖ ${user.tag} retiré de ${message.channel.name}`);
  }
});

// ================= INTERACTIONS =================
client.on("interactionCreate", async interaction => {
  if (interaction.isButton() && interaction.customId === "open_ticket") {
    const existing = interaction.guild.channels.cache.find(
      c => c.parentId === TICKET_CATEGORY_ID && c.topic === interaction.user.id
    );

    if (existing) {
      return interaction.reply({
        content: `❌ Tu as déjà un ticket ouvert : ${existing}`,
        ephemeral: true
      });
    }

    const modal = new ModalBuilder()
      .setCustomId("ticket_modal")
      .setTitle(`Créer un ticket — ${SERVER_NAME}`);

    const input = new TextInputBuilder()
      .setCustomId("reason")
      .setLabel("Explique ton problème")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    await interaction.showModal(modal);
  }

  if (interaction.type === InteractionType.ModalSubmit && interaction.customId === "ticket_modal") {
    const reason = interaction.fields.getTextInputValue("reason");

    const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      parent: TICKET_CATEGORY_ID,
      topic: interaction.user.id,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
      ]
    });

    channel.send(
`🎫 **NOUVEAU TICKET — ${SERVER_NAME}**

👤 Utilisateur : ${interaction.user}
📝 Problème :
> ${reason}

Commandes :
\`+close\` • \`+add @user\` • \`+remove @user\``
    );

    log(`📩 Ticket créé | ${channel.name} | ${interaction.user.tag}`);

    interaction.reply({
      content: `✅ Ton ticket a été créé : ${channel}`,
      ephemeral: true
    });
  }
});

// ================= LOGS =================
async function log(content) {
  const channel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
  if (channel) channel.send(content);
}

// ================= LOGIN =================
client.login(TOKEN);
