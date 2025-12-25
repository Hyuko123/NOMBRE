const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder
} = require("discord.js");

const { STAFF_ROLE_ID } = require("../config/roles");

const PANEL_CHANNEL_ID = "1449818419083087902";

module.exports = client => {
  client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== "ticketpanel") return;

    if (!interaction.member.roles.cache.has(STAFF_ROLE_ID))
      return interaction.reply({ content: "❌ Staff uniquement", ephemeral: true });

    const menu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("ticket_select")
        .setPlaceholder("🎟️ Ouvrir un ticket")
        .addOptions(
          { label: "Aide", value: "aide" },
          { label: "Recrutement", value: "recrutement" },
          { label: "Problème", value: "probleme" }
        )
    );

    const embed = new EmbedBuilder()
      .setTitle("🎟️ Support")
      .setDescription("Choisis une catégorie");

    interaction.guild.channels.cache
      .get(PANEL_CHANNEL_ID)
      .send({ embeds: [embed], components: [menu] });

    interaction.reply({ content: "✅ Panel envoyé", ephemeral: true });
  });
};
