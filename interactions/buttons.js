module.exports = client => {
  client.on("interactionCreate", async interaction => {
    if (!interaction.isButton()) return;

    if (interaction.customId === "close") {
      await interaction.channel.delete().catch(() => {});
    }
  });
};
