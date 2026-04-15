export interface HelpEntry {
  id: string;
  question: string;
  answer: string;
  voiceAnswer: string;
  keywords: string[];
  category: string;
}

export const knowledgeBase: HelpEntry[] = [
  // ---- General ----
  {
    id: "what-is",
    question: "Cos'e Dia-Storage?",
    answer:
      "Dia-Storage e una piattaforma per gestire e archiviare diapositive digitalizzate con lo scanner Reflecta DigitDia Evolution. Supporta caricamento, catalogazione, ricerca full-text, backup e accesso multi-utente.",
    voiceAnswer:
      "Dia-Storage e una piattaforma per gestire e archiviare le tue diapositive digitalizzate.",
    keywords: ["dia-storage", "cos'e", "cosa", "applicazione", "app", "piattaforma", "serve"],
    category: "generale",
  },
  {
    id: "how-login",
    question: "Come faccio ad accedere?",
    answer:
      "L'accesso avviene tramite un codice OTP temporaneo. Inserisci la tua email nella pagina di accesso, riceverai un codice a 6 cifre via email. Inserisci il codice per accedere. Non serve una password.",
    voiceAnswer:
      "Inserisci la tua email nella pagina di accesso e riceverai un codice temporaneo via email. Non serve una password.",
    keywords: ["accesso", "login", "accedere", "otp", "codice", "password", "email", "entrare"],
    category: "accesso",
  },
  {
    id: "formats",
    question: "Quali formati di immagine sono supportati?",
    answer:
      "Dia-Storage supporta immagini JPEG, TIFF e PNG. Lo scanner Reflecta DigitDia produce file JPEG chiamati PICTnnnn.JPG con risoluzione 14 o 22 megapixel.",
    voiceAnswer:
      "Sono supportati i formati JPEG, TIFF e PNG. Lo scanner produce file JPEG da 14 o 22 megapixel.",
    keywords: ["formato", "formati", "jpeg", "jpg", "tiff", "png", "immagine", "tipo", "file", "supporto", "supportati"],
    category: "generale",
  },

  // ---- Navigation / Pages ----
  {
    id: "panoramica",
    question: "Cosa mostra la Panoramica?",
    answer:
      "La Panoramica e la pagina principale. Mostra un riepilogo generale del sistema: statistiche sulle diapositive totali, lo stato della coda di elaborazione e le diapositive caricate di recente.",
    voiceAnswer:
      "La panoramica mostra le statistiche generali, lo stato della coda e le diapositive recenti.",
    keywords: ["panoramica", "dashboard", "home", "principale", "riepilogo", "statistiche"],
    category: "navigazione",
  },
  {
    id: "coda",
    question: "Cos'e la Coda in arrivo?",
    answer:
      "La Coda in arrivo contiene le diapositive appena caricate. Puoi impostare titolo, data, luogo e note per tutto il lotto, oppure modificare i dettagli delle singole foto. Quando sei pronto, premi Pubblica per renderle visibili nella galleria. Se elimini dalla coda, le foto vengono cancellate definitivamente.",
    voiceAnswer:
      "La coda contiene le diapositive caricate. Puoi impostare i dettagli per il lotto e poi pubblicarle nella galleria.",
    keywords: ["coda", "arrivo", "incoming", "attesa", "pubblicare", "pubblica", "lotto", "batch"],
    category: "navigazione",
  },

  // ---- Upload ----
  {
    id: "upload",
    question: "Come carico le diapositive?",
    answer:
      "Vai nella sezione Caricamento. Puoi trascinare le immagini nella zona di caricamento oppure cliccare per selezionarle dal computer. Puoi anche usare l'app Dia-Uploader per macOS che importa automaticamente le immagini dalla scheda SD dello scanner.",
    voiceAnswer:
      "Vai su Caricamento, trascina le immagini o selezionale dal computer. Puoi anche usare l'app Dia-Uploader per importare automaticamente dalla scheda SD.",
    keywords: ["caricare", "caricamento", "upload", "importare", "trascinare", "file", "immagini", "diapositive"],
    category: "caricamento",
  },
  {
    id: "upload-sd",
    question: "Come importo le diapositive dalla scheda SD?",
    answer:
      "Puoi usare l'app Dia-Uploader per macOS. Inserisci la scheda SD dello scanner nel computer, l'app rileva automaticamente le nuove immagini e le carica su Dia-Storage. Scarica l'app dalla pagina delle release su GitHub.",
    voiceAnswer:
      "Usa l'app Dia-Uploader per macOS. Inserisci la scheda SD e l'app carica automaticamente le immagini.",
    keywords: ["sd", "scheda", "card", "scanner", "uploader", "dia-uploader", "automatico", "macos", "mac", "app"],
    category: "caricamento",
  },
  {
    id: "duplicates",
    question: "Come vengono gestiti i duplicati?",
    answer:
      "Dia-Storage calcola un checksum per ogni immagine caricata. Se un'immagine identica e gia presente nell'archivio, viene mostrato un avviso e il file non viene importato. In questo modo si evitano duplicati.",
    voiceAnswer:
      "Ogni immagine ha un checksum. Se un duplicato viene rilevato, ricevi un avviso e il file non viene importato.",
    keywords: ["duplicato", "duplicati", "doppio", "gia", "esistente", "checksum", "uguale", "identico", "copia"],
    category: "caricamento",
  },

  // ---- Gallery ----
  {
    id: "galleria",
    question: "Come funziona la Galleria?",
    answer:
      "La Galleria mostra tutte le diapositive pubblicate. Ha due viste: Tutte le foto e Album. Puoi filtrare per data, luogo e album, cercare per titolo o note, e ordinare per data o nome. Selezionando piu foto puoi archiviarle nel backup. Dalla vista dettaglio puoi modificare i metadati e archiviare singole foto.",
    voiceAnswer:
      "La galleria ha due viste: tutte le foto e album. Puoi filtrare per data, luogo, cercare e archiviare nel backup.",
    keywords: ["galleria", "sfogliare", "visualizzare", "album", "filtro", "filtrare", "data", "luogo", "foto", "tutte"],
    category: "galleria",
  },
  {
    id: "publish",
    question: "Come pubblico le diapositive nella galleria?",
    answer:
      "Dalla Coda in arrivo, imposta titolo e dettagli per il lotto, poi premi il pulsante Pubblica nella galleria. Le diapositive diventeranno visibili nella galleria. Puoi anche modificare i dettagli delle singole foto prima di pubblicare.",
    voiceAnswer:
      "Dalla coda, imposta i dettagli e premi Pubblica. Le foto appariranno nella galleria.",
    keywords: ["pubblicare", "pubblica", "galleria", "visibile", "attiva", "lotto", "batch"],
    category: "caricamento",
  },
  {
    id: "archive",
    question: "Come archivio le diapositive?",
    answer:
      "Dalla galleria, seleziona una o piu diapositive e premi il pulsante Archivia. Le foto archiviate vengono spostate nel backup (S3 o NAS) e non sono piu visibili nella galleria. Puoi anche archiviare dalla vista dettaglio di una singola diapositiva.",
    voiceAnswer:
      "Seleziona le foto nella galleria e premi Archivia. Vengono spostate nel backup.",
    keywords: ["archiviare", "archivio", "backup", "spostare", "rimuovere", "galleria"],
    category: "galleria",
  },
  {
    id: "metadata",
    question: "Come modifico i metadati di una diapositiva?",
    answer:
      "Nella Galleria, clicca su una diapositiva per aprire i dettagli. Puoi modificare il titolo, la data di scatto, il luogo e le note. Per modificare piu diapositive insieme, selezionale e usa la funzione di modifica in blocco.",
    voiceAnswer:
      "Clicca su una diapositiva nella galleria per modificare titolo, data, luogo e note. Puoi anche fare modifiche in blocco.",
    keywords: ["metadati", "modificare", "titolo", "data", "luogo", "note", "informazioni", "dettagli", "editare"],
    category: "diapositive",
  },
  {
    id: "download",
    question: "Come scarico le diapositive originali?",
    answer:
      "Apri una diapositiva nella Galleria e usa il pulsante Scarica. Puoi scaricare l'immagine originale a piena risoluzione oppure la versione a media risoluzione (1600px).",
    voiceAnswer:
      "Apri una diapositiva e clicca su Scarica per ottenere l'originale o la versione media.",
    keywords: ["scaricare", "download", "originale", "risoluzione", "esportare", "salvare", "piena"],
    category: "diapositive",
  },

  // ---- Search ----
  {
    id: "ricerca",
    question: "Come funziona la Ricerca?",
    answer:
      "La Ricerca usa il motore full-text di PostgreSQL con dizionario italiano. Puoi cercare per titolo, luogo, note o qualsiasi testo nei metadati. Supporta anche la ricerca avanzata con filtri per data, collezione e stato.",
    voiceAnswer:
      "La ricerca full-text ti permette di trovare diapositive per titolo, luogo, note o qualsiasi testo nei metadati.",
    keywords: ["ricerca", "cercare", "trovare", "ricercare", "testo", "filtro", "cerca", "full-text"],
    category: "ricerca",
  },

  // ---- Collections & Magazines ----
  {
    id: "collezioni",
    question: "Cosa sono le Collezioni?",
    answer:
      "Le collezioni sono raggruppamenti virtuali di diapositive per tema, evento o periodo. Ad esempio puoi creare una collezione 'Vacanze 1985' o 'Famiglia'. Una diapositiva puo appartenere a piu collezioni.",
    voiceAnswer:
      "Le collezioni sono gruppi tematici di diapositive, per esempio per evento o periodo. Una diapositiva puo stare in piu collezioni.",
    keywords: ["collezione", "collezioni", "gruppo", "raggruppare", "tema", "album", "organizzare"],
    category: "collezioni",
  },
  {
    id: "caricatori",
    question: "Cosa sono i Caricatori?",
    answer:
      "I caricatori rappresentano i contenitori fisici di diapositive del Reflecta DigitDia. Ogni caricatore ha 36 o 50 slot. Servono per tenere traccia di quale diapositiva proviene da quale caricatore e slot.",
    voiceAnswer:
      "I caricatori sono i contenitori fisici dello scanner, con 36 o 50 slot. Servono per tracciare la provenienza delle diapositive.",
    keywords: ["caricatore", "caricatori", "magazine", "slot", "contenitore", "fisico", "scanner"],
    category: "caricatori",
  },

  // ---- Admin ----
  {
    id: "utenti",
    question: "Come gestisco gli utenti?",
    answer:
      "Nella sezione Amministrazione > Utenti puoi aggiungere nuovi utenti, modificare i ruoli (amministratore, editor, utente, visualizzatore), attivare o disattivare account e scegliere il canale OTP preferito.",
    voiceAnswer:
      "Vai su Amministrazione, Utenti. Puoi aggiungere utenti, cambiare ruoli e attivare o disattivare account.",
    keywords: ["utenti", "utente", "gestire", "aggiungere", "ruolo", "amministratore", "admin", "permessi", "account"],
    category: "utenti",
  },
  {
    id: "backup",
    question: "Come funziona il Backup?",
    answer:
      "Il backup crea copie di sicurezza delle diapositive originali su destinazioni esterne. Supporta Amazon S3, MinIO, directory locale, NAS e rsync via SSH. Puoi avviare un backup manuale o programmarlo con un'espressione cron.",
    voiceAnswer:
      "Il backup copia le diapositive originali su S3, NAS o altre destinazioni. Puoi avviarlo manualmente o programmarlo.",
    keywords: ["backup", "copia", "sicurezza", "s3", "nas", "rsync", "proteggere", "salvare", "archiviare"],
    category: "backup",
  },
  {
    id: "impostazioni",
    question: "Cosa posso configurare nelle Impostazioni?",
    answer:
      "Nelle Impostazioni puoi configurare: server email SMTP, WhatsApp per OTP, percorsi di archiviazione, dimensioni miniature, backup automatico, tema chiaro/scuro e altre opzioni del sistema.",
    voiceAnswer:
      "Nelle impostazioni configuri email, WhatsApp, archiviazione, backup automatico e il tema dell'interfaccia.",
    keywords: ["impostazioni", "configurare", "configurazione", "settings", "smtp", "email", "tema", "opzioni"],
    category: "impostazioni",
  },
  {
    id: "registro",
    question: "Cos'e il Registro attivita?",
    answer:
      "Il Registro attivita mostra la cronologia di tutte le azioni compiute dagli utenti nel sistema: accessi, caricamenti, modifiche, eliminazioni, backup e cambiamenti alle impostazioni.",
    voiceAnswer:
      "Il registro mostra la cronologia di tutte le azioni degli utenti, come accessi, modifiche e backup.",
    keywords: ["registro", "attivita", "log", "cronologia", "azioni", "storia", "audit"],
    category: "navigazione",
  },

  // ---- EXIF / Technical ----
  {
    id: "exif",
    question: "Cosa sono i dati EXIF?",
    answer:
      "I dati EXIF sono informazioni tecniche contenute nelle immagini: data di scatto, risoluzione, esposizione, modello dello scanner. Dia-Storage li estrae automaticamente durante l'elaborazione.",
    voiceAnswer:
      "I dati EXIF sono le informazioni tecniche dell'immagine come data, risoluzione ed esposizione. Vengono estratti automaticamente.",
    keywords: ["exif", "dati", "tecnici", "esposizione", "risoluzione", "informazioni", "tecnica"],
    category: "diapositive",
  },
  {
    id: "status",
    question: "Quali sono gli stati di una diapositiva?",
    answer:
      "Una diapositiva puo avere questi stati: In arrivo (appena caricata, in coda), Attiva (elaborata e archiviata), Archiviata (messa da parte), Eliminata (cancellata logicamente, non fisicamente).",
    voiceAnswer:
      "Gli stati sono: in arrivo per le nuove, attiva per le elaborate, archiviata e eliminata.",
    keywords: ["stato", "stati", "incoming", "attiva", "archiviata", "eliminata", "ciclo", "vita"],
    category: "diapositive",
  },
  {
    id: "api-keys",
    question: "A cosa servono le Chiavi API?",
    answer:
      "Le chiavi API consentono l'accesso programmatico al sistema per script e integrazioni esterne. Ad esempio, l'app Dia-Uploader usa una chiave API per caricare automaticamente le immagini.",
    voiceAnswer:
      "Le chiavi API permettono a script e app esterne di accedere al sistema, come fa l'app Dia-Uploader.",
    keywords: ["api", "chiave", "chiavi", "key", "programmazione", "script", "integrazione", "automatico"],
    category: "impostazioni",
  },
];

export const suggestedTopics = [
  "Come carico le diapositive?",
  "Come funziona la Ricerca?",
  "Cos'e la Coda in arrivo?",
  "Come funziona il Backup?",
  "Come importo dalla scheda SD?",
];
