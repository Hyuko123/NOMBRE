const { SlashCommandBuilder } = require("discord.js");
const { handleWarn } = require("../systems/warns");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("avert")
    .setDescription("⚠️ Avertir un membre")
    .addUserOption(o =>
      o.setName("utilisateur").setDescription("Membre").setRequired(true)
    )
    .addStringOption(o =>
      o.setName("raison").setDescription("Raison").setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    await handleWarn(interaction);
  }
};
