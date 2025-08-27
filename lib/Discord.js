const axios = require('axios');

class Discord {
  constructor() {
    this.clientId = process.env.DISCORD_CLIENT_ID;
    this.clientSecret = process.env.DISCORD_CLIENT_SECRET;
    this.redirectUri = process.env.DISCORD_REDIRECT_URI;
  }

  /**
   * Échange le code d'autorisation contre un token d'accès
   * @param {string} code - Le code d'autorisation reçu de Discord
   * @returns {Promise<Object>} La réponse de Discord avec access_token, etc.
   */
  async exchangeCodeForToken(code) {
    const response = await axios.post("https://discord.com/api/oauth2/token", 
      new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: this.redirectUri
      }), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    
    return response.data;
  }

  /**
   * Récupère les informations de l'utilisateur Discord
   * @param {string} accessToken - Le token d'accès Discord
   * @returns {Promise<Object>} Les informations de l'utilisateur
   */
  async getUserInfo(accessToken) {
    const response = await axios.get("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    return response.data;
  }
}

module.exports = Discord;
