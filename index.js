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
  PermissionsBitField
} = require("discord.js");

const cron = require("node-cron");
const fs = require("fs");

// 🔧 CONFIG
const TOKEN = process.env.TOKEN;
const PREFIX = "+";

// RADIO
const CHANNEL_ID = "1449816618187227249";
const ROLE_ID = "1449815862168129708";

// TICKETS
const TICKET_CATEGORY_ID = "1453447245323042896";
const STAFF_ROLE_ID = "1449815862168129708";
const LOG_CHANNEL_ID = "1453447170240811069";
const PANEL_CHANNEL_ID = "1449818419083087902";

// 🤖 CLIENT
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.once("ready", () => {
  console.log("Bot connecté !");
});

// ================= RADIO =================

client.on("messageCreate", async message => {
  if (message.author.bot) return;

  if (message.content === "+test") {
    envoyerMessage(message.channel);
  }
});

cron.schedule("0 15 * * *", async () => {
  const channel = await client.channels.fetch(CHANNEL_ID);
  if (channel) envoyerMessage(channel);
});

async function envoyerMessage(channel) {
  const random = Math.floor(Math.random() * 999) + 1;

  channel.send({
    content: `<@&${ROLE_ID}> 📻 **Changement de radio journalier**

🎲 **Radio du jour** : ${random}`,
    allowedMentions: { roles: [ROLE_ID] }
  });
}

// ================= PANEL =================

client.on("messageCreate", async message => {
  if (message.author.bot) return;

  if (message.content === "+ticketpanel") {
    if (message.channel.id !== PANEL_CHANNEL_ID) return;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("open_ticket")
        .setLabel("🎫 Ouvrir un ticket")
        .setStyle(ButtonStyle.Primary)
    );

    message.channel.send({
      content: "🎫 **Support**\nClique sur le bouton ci-dessous et explique ton problème.",
      components: [row]
    });
  }

  // COMMANDES TICKET
  if (!message.channel.name?.startsWith("ticket-")) return;

  // CLOSE
  if (message.content === "+close") {
    await envoyerTranscriptHTML(message.channel);
    await log(`🔒 Ticket fermé | ${message.channel.name} | par ${message.author.tag}`);
    message.channel.delete();
  }

  // ADD
  if (message.content.startsWith("+add")) {
    const user = message.mentions.users.first();
    if (!user) return;

    await message.channel.permissionOverwrites.edit(user.id, {
      ViewChannel: true,
      SendMessages: true
    });

    message.channel.send(`➕ ${user} ajouté au ticket.`);
    log(`➕ ${user.tag} ajouté à ${message.channel.name} par ${message.author.tag}`);
  }

  // REMOVE
  if (message.content.startsWith("+remove")) {
    const user = message.mentions.users.first();
    if (!user) return;

    await message.channel.permissionOverwrites.delete(user.id);
    message.channel.send(`➖ ${user} retiré du ticket.`);
    log(`➖ ${user.tag} retiré de ${message.channel.name} par ${message.author.tag}`);
  }
});

// ================= INTERACTIONS =================

client.on("interactionCreate", async interaction => {
  // BOUTON
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
      .setTitle("Créer un ticket");

    const input = new TextInputBuilder()
      .setCustomId("reason")
      .setLabel("Explique ton problème")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    await interaction.showModal(modal);
  }

  // MODAL
  if (interaction.type === InteractionType.ModalSubmit) {
    if (interaction.customId !== "ticket_modal") return;

    const reason = interaction.fields.getTextInputValue("reason");

    const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      parent: TICKET_CATEGORY_ID,
      topic: interaction.user.id,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: interaction.user.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
        },
        {
          id: STAFF_ROLE_ID,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
        }
      ]
    });

    channel.send(
      `🎫 **NOUVEAU TICKET**

👤 **Utilisateur :** ${interaction.user}
📝 **Problème :**
> ${reason}

Commandes :
\`+close\` • \`+add @user\` • \`+remove @user\``
    );

    log(`📩 Ticket créé | ${channel.name} | par ${interaction.user.tag}`);

    interaction.reply({
      content: `✅ Ton ticket a été créé : ${channel}`,
      ephemeral: true
    });
  }
});

// ================= TRANSCRIPT HTML =================

async function envoyerTranscriptHTML(channel) {
  const messages = await channel.messages.fetch({ limit: 100 });
  let html = `<html><body><h2>${channel.name}</h2><hr>`;

  messages.reverse().forEach(m => {
    html += `<p><strong>${m.author.tag}</strong> : ${m.content}</p>`;
  });

  html += "</body></html>";

  const file = `${channel.name}.html`;
  fs.writeFileSync(file, html);

  const userId = channel.topic;
  if (userId) {
    const user = await client.users.fetch(userId);
    await user.send({
      content: "📄 Voici le transcript de ton ticket :",
      files: [file]
    });
  }

  fs.unlinkSync(file);
}

// ================= LOGS =================

async function log(content) {
  const channel = await client.channels.fetch(LOG_CHANNEL_ID);
  if (channel) channel.send(content);
}

// 🔐 LOGIN
client.login(process.env.TOKEN);
