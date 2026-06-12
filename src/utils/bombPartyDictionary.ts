/**
 * Bomb Party Dictionary Utility
 * Carica il dizionario italiano da /dizionario/dizonario.txt
 * e fornisce funzioni per validare parole e generare sillabe random.
 */

// Set di parole caricate dal dizionario
let dictionary: Set<string> = new Set();
let dictionaryLoaded = false;
let loadingPromise: Promise<void> | null = null;

// Sillabe italiane comuni usate nel gioco
const SYLLABLES = [
  'AB', 'AC', 'AD', 'AL', 'AM', 'AN', 'AP', 'AR', 'AS', 'AT', 'AV',
  'BA', 'BE', 'BI', 'BO', 'BR', 'BU',
  'CA', 'CE', 'CH', 'CI', 'CO', 'CR', 'CU',
  'DA', 'DE', 'DI', 'DO', 'DR', 'DU',
  'EL', 'EM', 'EN', 'ER', 'ES', 'ET', 'EV',
  'FA', 'FE', 'FI', 'FO', 'FR', 'FU',
  'GA', 'GE', 'GI', 'GO', 'GR', 'GU',
  'IM', 'IN', 'IR', 'IS',
  'LA', 'LE', 'LI', 'LO', 'LU',
  'MA', 'ME', 'MI', 'MO', 'MU',
  'NA', 'NE', 'NI', 'NO', 'NU',
  'OL', 'ON', 'OR', 'OS',
  'PA', 'PE', 'PI', 'PO', 'PR', 'PU',
  'RA', 'RE', 'RI', 'RO', 'RU',
  'SA', 'SC', 'SE', 'SI', 'SO', 'SP', 'ST', 'SU',
  'TA', 'TE', 'TI', 'TO', 'TR', 'TU',
  'UL', 'UN', 'UR', 'US',
  'VA', 'VE', 'VI', 'VO', 'VU',
  'ZA', 'ZI', 'ZO',
  // Sillabe più difficili (3 lettere)
  'BRA', 'CAN', 'CAR', 'CON', 'COR',
  'FRA', 'GRA', 'MAN', 'MAR', 'PER',
  'PRE', 'PRO', 'SEN', 'TER', 'TRA', 'VER',
  'STR', 'SPE', 'STA', 'GIO', 'CHI', 'GHI',
];

/**
 * Carica il dizionario dal file .txt pubblico
 */
export async function loadDictionary(): Promise<void> {
  if (dictionaryLoaded) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = fetch('/dizionario/dizonario.txt')
    .then((res) => {
      if (!res.ok) throw new Error('Impossibile caricare il dizionario');
      return res.text();
    })
    .then((text) => {
      const words = text
        .split('\n')
        .map((w) => w.trim().toLowerCase())
        .filter((w) => w.length > 0);
      dictionary = new Set(words);
      dictionaryLoaded = true;
    })
    .catch((err) => {
      console.error('Errore caricamento dizionario:', err);
      loadingPromise = null;
    });

  return loadingPromise;
}

/**
 * Controlla se una parola esiste nel dizionario
 */
export function validateWord(word: string): boolean {
  return dictionary.has(word.toLowerCase().trim());
}

/**
 * Restituisce true se il dizionario è stato caricato
 */
export function isDictionaryLoaded(): boolean {
  return dictionaryLoaded;
}

/**
 * Restituisce il numero di parole nel dizionario
 */
export function getDictionarySize(): number {
  return dictionary.size;
}

/**
 * Genera una sillaba casuale per il gioco
 */
export function getRandomSyllable(): string {
  return SYLLABLES[Math.floor(Math.random() * SYLLABLES.length)];
}
