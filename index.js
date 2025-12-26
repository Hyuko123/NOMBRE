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

const fs = require("fs");
const path = require("path");

// ================= CONFIG =================
const TOKEN = process.env.TOKEN;
const PREFIX = "+";
const SERVER_NAME = "70’s";

// ================= ROLES =================
const STAFF_ROLE_ID = "1449815862168129708";

// ================= GANG ROLES =================
const GANG_HIERARCHY = {
  og: "1449814259935739996",
  bigg: "1449814244001448157",
  lilgangsta: "1449814507244490772",
  lilhomies: "1449814880428232744",
  littleboys: "1449814948141338634"
};
const ALL_GANG_ROLES = Object.values(GANG_HIERARCHY);

// ================= CHANNELS =================
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

// ================= COMMANDES PREFIX =================
client.on("messageCreate", async message => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift()?.toLowerCase();

  // ================= 📢 ANNONCE =================
if (command === "annonce") {
  if (!message.member.roles.cache.has(STAFF_ROLE_ID))
    return message.reply("❌ Staff uniquement.");

  const content = args.join(" ");
  if (!content) return message.reply("❌ Message manquant.");

  const embed = new EmbedBuilder()
    .setAuthor({
      name: "Annonce officielle • 70’s Crew",
      iconURL: message.guild.iconURL({ dynamic: true })
    })
    .setDescription(`> ${content}`)
    .setColor("#f39c12")
    .setThumbnail(message.guild.iconURL({ dynamic: true }))
    .setFooter({
      text: `Annonce par ${message.author.tag}`,
      iconURL: message.author.displayAvatarURL({ dynamic: true })
    })
    .setTimestamp();

  await message.delete().catch(() => {});

  return message.channel.send({
    content: `<@&1449815862168129708>`,
    embeds: [embed]
  });
}


  // ================= 🎟️ TICKET PANEL =================
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
      .setTitle("🎟️ Ticket 70’s")
      .setDescription(
        "**Support officiel 70’s Crew**\n\n" +
        "🆘 Aide\n🧑‍💼 Recrutement\n⚠️ Problèmes\n\n" +
        "Merci de rester respectueux."
      )
      .setColor("#f1c40f")
      .setTimestamp();

    return message.channel.send({ embeds: [embed], components: [menu] });
  }

  // ================= 🧢 GANG =================
  if (command === "gang") {
    const sub = args.shift()?.toLowerCase();
    const member = message.mentions.members.first();

    if (sub === "add") {
      const rank = args[0]?.toLowerCase();
      if (!member || !GANG_HIERARCHY[rank])
        return message.reply("❌ `+gang add @user og|bigg|lilgangsta|lilhomies|littleboys`");

      await member.roles.remove(ALL_GANG_ROLES);
      await member.roles.add(GANG_HIERARCHY[rank]);

      return message.reply(`✅ ${member} ajouté **${rank.toUpperCase()}**`);
    }

    if (sub === "remove") {
      if (!member) return message.reply("❌ Mention manquante.");
      await member.roles.remove(ALL_GANG_ROLES);
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
        embeds: [new EmbedBuilder().setTitle("🧢 Gang — Liste").setDescription(desc).setColor("#3498db")]
      });
    }
  }
});

// ================= INTERACTIONS =================
client.on("interactionCreate", async interaction => {

  // ---------- CREATION TICKET ----------
  if (interaction.isStringSelectMenu() && interaction.customId === "ticket_select") {
    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    const user = interaction.user;

    if (guild.channels.cache.find(c => c.topic === user.id))
      return interaction.editReply("❌ Tu as déjà un ticket ouvert.");

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
      new ButtonBuilder().setCustomId("ticket_close").setLabel("Fermer").setStyle(ButtonStyle.Danger)
    );

    await channel.send({ content: `🎟️ Ticket ouvert par ${user}`, components: [buttons] });
    return interaction.editReply(`✅ Ticket créé : ${channel}`);
  }

  // ---------- FERMETURE TICKET ----------
  if (interaction.isButton() && interaction.customId === "ticket_close") {
    if (!interaction.member.roles.cache.has(STAFF_ROLE_ID))
      return interaction.reply({ content: "❌ Staff uniquement.", ephemeral: true });

    await interaction.reply({ content: "🔒 Fermeture du ticket...", ephemeral: true });
    await closeTicket(interaction.channel, interaction.user);
  }
});

// ================= TRANSCRIPT =================
async function closeTicket(channel, staffUser) {
  const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
  const messages = await channel.messages.fetch({ limit: 100 });
  const sorted = [...messages.values()].reverse();

  let html = `<html><body style="background:#2b2d31;color:white;font-family:Arial">`;
  html += `<h2>${channel.name}</h2><p>Fermé par ${staffUser.tag}</p><hr>`;

  for (const msg of sorted) {
    html += `<p><b>${msg.author.tag}</b> (${msg.createdAt.toLocaleString()})<br>${msg.content || "[Pièce jointe]"}</p>`;
  }

  html += "</body></html>";

  const filePath = path.join(__dirname, `transcript-${channel.id}.html`);
  fs.writeFileSync(filePath, html);

  await logChannel.send({
    embeds: [new EmbedBuilder().setTitle("🎟️ Ticket fermé").setColor("#e74c3c")],
    files: [filePath]
  });

  setTimeout(() => {
    fs.unlinkSync(filePath);
    channel.delete().catch(() => {});
  }, 4000);
}

// ================= LOGIN =================
client.login(TOKEN);
