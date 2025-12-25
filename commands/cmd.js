const { EmbedBuilder } = require("discord.js");

module.exports = client => {
  client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== "cmd") return;

    const embed = new EmbedBuilder()
      .setTitle("📜 Commandes disponibles")
      .setColor("#3498db")
      .setDescription(`
🎟️ /ticketpanel  
🧑 /gang add | remove | list  
📢 /annonce
      `);

    interaction.reply({ embeds: [embed], ephemeral: true });
  });
};
