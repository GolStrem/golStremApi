const fs = require('fs');
const path = require('path');

class Log {
    constructor(nameFile, verbeux = false) {
        // Utiliser la variable d'environnement LOGS comme répertoire de base
        const logsBaseDir = process.env.LOGS || './logs';
        this.nameFile = path.join(logsBaseDir, nameFile);
        this.verbeux = verbeux;
        
        // Lier le contexte de la méthode log pour éviter les problèmes de 'this'
        this.log = this.log.bind(this);
        
        // Créer le répertoire logs s'il n'existe pas
        const logsDir = path.dirname(this.nameFile);
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
    }

    log(message, verbeux = false) {
        // Vérifier que l'instance est correctement initialisée
        if (!this || !this.nameFile) {
            console.error('Erreur: Instance Log non initialisée correctement');
            return;
        }

        // Si le message est en mode verbeux mais que l'instance n'est pas configurée pour être verbeuse, on ignore
        if (verbeux && !this.verbeux) {
            return;
        }

        // Préparer le message
        let messageFormate;
        try {
            if (typeof message === 'object' && message !== null) {
                // Si c'est un objet JSON, on le stringify
                messageFormate = JSON.stringify(message, null, 2);
            } else {
                messageFormate = message?.toString() || 'undefined';
            }
        } catch (error) {
            messageFormate = '[Erreur lors du formatage du message]';
        }

        // Ajouter un timestamp
        const timestamp = new Date().toISOString();
        const ligneLog = `[${timestamp}] ${messageFormate}\n`;

        // Écrire dans le fichier
        try {
            if(process.env.consoleLog) {
                console.log(ligneLog.trim());
            }
            fs.appendFileSync(this.nameFile, ligneLog, 'utf8');
        } catch (error) {
            console.error('Erreur lors de l\'écriture du log:', error);
            console.error('Fichier cible:', this.nameFile);
        }
    }
}

module.exports = Log;
