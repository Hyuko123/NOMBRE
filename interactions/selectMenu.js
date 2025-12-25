const {
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const { STAFF_ROLE_ID } = require("../config/roles");
const TICKET_CATEGORY_ID = "1453524406499414192";

module.exports = client => {
  client.on("interactionCreate", async interaction => {
    if (!interaction.isStringSelectMenu()) return;
    if (interaction.customId !== "ticket_select") return;

    const guild = interaction.guild;
    const user = interaction.user;

    const channel = await guild.channels.create({
      name: `ticket-${user.username}`,
      parent: TICKET_CATEGORY_ID,
      permissionOverwrites: [
        { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel] },
        { id: STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel] }
      ]
    });

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("close").setLabel("Fermer").setStyle(ButtonStyle.Danger)
    );

    channel.send({ content: `🎟️ Ticket de ${user}`, components: [buttons] });
    interaction.reply({ content: `✅ Ticket créé ${channel}`, ephemeral: true });
  });
};
