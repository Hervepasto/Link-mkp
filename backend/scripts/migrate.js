import pool from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fonction pour diviser le SQL en commandes individuelles
function splitSQL(sql) {
  // Diviser par point-virgule, mais garder les blocs de fonctions et triggers
  const commands = [];
  let currentCommand = '';
  let inFunction = false;
  let inTrigger = false;
  let dollarQuote = null;
  
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const nextChars = sql.substring(i, i + 2);
    
    // Détecter les dollar quotes ($$, $tag$, etc.)
    if (char === '$' && !dollarQuote) {
      const match = sql.substring(i).match(/^\$([^$]*)\$/);
      if (match) {
        dollarQuote = match[0];
        currentCommand += dollarQuote;
        i += dollarQuote.length - 1;
        continue;
      }
    }
    
    // Fermer le dollar quote
    if (dollarQuote && sql.substring(i).startsWith(dollarQuote)) {
      currentCommand += dollarQuote;
      i += dollarQuote.length - 1;
      dollarQuote = null;
      continue;
    }
    
    currentCommand += char;
    
    // Si on n'est pas dans un dollar quote, on peut diviser par point-virgule
    if (!dollarQuote && char === ';') {
      const trimmed = currentCommand.trim();
      if (trimmed && !trimmed.startsWith('--')) {
        commands.push(trimmed);
      }
      currentCommand = '';
    }
  }
  
  // Ajouter la dernière commande si elle existe
  if (currentCommand.trim()) {
    commands.push(currentCommand.trim());
  }
  
  return commands.filter(cmd => cmd.length > 0);
}

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting database migration...');
    
    // Vérifier la connexion
    await client.query('SELECT NOW()');
    console.log('✅ Database connection established');
    
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Nettoyer le SQL (enlever les commentaires sur une ligne)
    const cleanedSchema = schema
      .split('\n')
      .filter(line => !line.trim().startsWith('--') || line.trim() === '--')
      .join('\n');
    
    // Diviser en commandes
    const commands = splitSQL(cleanedSchema);
    
    console.log(`📝 Found ${commands.length} SQL commands to execute`);
    
    // Exécuter chaque commande
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i].trim();
      
      // Ignorer les lignes vides et les commentaires
      if (!command || command.startsWith('--')) {
        continue;
      }
      
      try {
        await client.query(command);
        console.log(`✅ Command ${i + 1}/${commands.length} executed`);
      } catch (error) {
        // Ignorer les erreurs "already exists" pour les extensions, tables, etc.
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate') ||
            error.code === '42P07' || // relation already exists
            error.code === '42710') {  // duplicate object
          console.log(`⚠️  Command ${i + 1} skipped (already exists)`);
        } else {
          console.error(`❌ Error in command ${i + 1}:`, command.substring(0, 100));
          console.error('Error details:', error.message);
          throw error;
        }
      }
    }
    
    console.log('\n✅ Database schema created successfully!');
    console.log('\n📊 Database structure:');
    console.log('   - 7 tables created');
    console.log('   - Indexes configured');
    console.log('   - Triggers and functions set up');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

migrate();
