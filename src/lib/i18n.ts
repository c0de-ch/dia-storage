/**
 * Italian translations dictionary for Dia-Storage.
 *
 * Usage:
 *   import { t } from '@/lib/i18n';
 *   t('nav.gallery')        // "Galleria"
 *   t('errors.notFound')    // "Risorsa non trovata"
 */

const translations = {
  // ---------------------------------------------------------------------------
  // App
  // ---------------------------------------------------------------------------
  app: {
    name: "Dia-Storage",
    tagline: "Gestione diapositive digitalizzate",
    version: "Versione",
  },

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------
  nav: {
    home: "Home",
    gallery: "Galleria",
    upload: "Caricamento",
    queue: "Coda",
    search: "Ricerca",
    collections: "Collezioni",
    magazines: "Caricatori",
    admin: "Amministrazione",
    settings: "Impostazioni",
    backup: "Backup",
    users: "Utenti",
    apiKeys: "Chiavi API",
    auditLog: "Registro attività",
    profile: "Profilo",
    logout: "Esci",
    login: "Accedi",
  },

  // ---------------------------------------------------------------------------
  // Common actions / buttons
  // ---------------------------------------------------------------------------
  actions: {
    save: "Salva",
    cancel: "Annulla",
    delete: "Elimina",
    edit: "Modifica",
    create: "Crea",
    add: "Aggiungi",
    remove: "Rimuovi",
    close: "Chiudi",
    confirm: "Conferma",
    back: "Indietro",
    next: "Avanti",
    previous: "Precedente",
    refresh: "Aggiorna",
    download: "Scarica",
    upload: "Carica",
    search: "Cerca",
    filter: "Filtra",
    reset: "Reimposta",
    apply: "Applica",
    select: "Seleziona",
    selectAll: "Seleziona tutto",
    deselectAll: "Deseleziona tutto",
    copy: "Copia",
    move: "Sposta",
    rename: "Rinomina",
    duplicate: "Duplica",
    archive: "Archivia",
    publish: "Pubblica",
    publishAll: "Pubblica tutto",
    restore: "Ripristina",
    export: "Esporta",
    import: "Importa",
    print: "Stampa",
    share: "Condividi",
    view: "Visualizza",
    viewAll: "Visualizza tutto",
    loadMore: "Carica altri",
    showMore: "Mostra di più",
    showLess: "Mostra di meno",
    retry: "Riprova",
    send: "Invia",
    resend: "Reinvia",
    continue: "Continua",
    skip: "Salta",
    done: "Fatto",
    ok: "OK",
    yes: "Sì",
    no: "No",
  },

  // ---------------------------------------------------------------------------
  // Common labels
  // ---------------------------------------------------------------------------
  labels: {
    id: "ID",
    name: "Nome",
    email: "Email",
    phone: "Telefono",
    role: "Ruolo",
    status: "Stato",
    active: "Attivo",
    inactive: "Disattivato",
    enabled: "Abilitato",
    disabled: "Disabilitato",
    date: "Data",
    dateCreated: "Data creazione",
    dateUpdated: "Ultima modifica",
    description: "Descrizione",
    title: "Titolo",
    notes: "Note",
    location: "Luogo",
    size: "Dimensione",
    type: "Tipo",
    count: "Conteggio",
    total: "Totale",
    page: "Pagina",
    of: "di",
    results: "risultati",
    noResults: "Nessun risultato",
    loading: "Caricamento...",
    processing: "Elaborazione...",
    saving: "Salvataggio...",
    deleting: "Eliminazione...",
    uploading: "Caricamento in corso...",
    searching: "Ricerca in corso...",
    optional: "Facoltativo",
    required: "Obbligatorio",
    all: "Tutti",
    none: "Nessuno",
    unknown: "Sconosciuto",
    other: "Altro",
    yes: "Sì",
    no: "No",
    createdAt: "Creato il",
    updatedAt: "Aggiornato il",
  },

  // ---------------------------------------------------------------------------
  // Roles
  // ---------------------------------------------------------------------------
  roles: {
    admin: "Amministratore",
    editor: "Editor",
    user: "Utente",
    viewer: "Visualizzatore",
  },

  // ---------------------------------------------------------------------------
  // Auth / Login
  // ---------------------------------------------------------------------------
  auth: {
    loginTitle: "Accedi a Dia-Storage",
    loginSubtitle: "Inserisci la tua email per ricevere un codice di accesso",
    emailPlaceholder: "mario.rossi@esempio.it",
    enterOtp: "Inserisci il codice",
    otpSent: "Ti abbiamo inviato un codice di accesso",
    otpSentTo: "Codice inviato a {email}",
    otpSentViaWhatsApp: "Codice inviato via WhatsApp a {phone}",
    otpSentViaBoth: "Codice inviato via email e WhatsApp",
    otpPlaceholder: "000000",
    verifyOtp: "Verifica codice",
    sendOtp: "Invia codice",
    resendOtp: "Reinvia codice",
    resendIn: "Reinvia tra {seconds}s",
    changeEmail: "Cambia email",
    logoutConfirm: "Sei sicuro di voler uscire?",
    loggedOut: "Sei uscito correttamente",
    sessionExpired: "La sessione è scaduta. Accedi di nuovo.",
    channelEmail: "Email",
    channelWhatsApp: "WhatsApp",
    channelBoth: "Email e WhatsApp",
    chooseChannel: "Come vuoi ricevere il codice?",
  },

  // ---------------------------------------------------------------------------
  // Upload
  // ---------------------------------------------------------------------------
  upload: {
    title: "Caricamento diapositive",
    subtitle: "Carica le immagini scansionate dal tuo Reflecta DigitDia",
    dropzone: "Trascina le immagini qui oppure clicca per selezionarle",
    dropzoneActive: "Rilascia i file qui...",
    selectFiles: "Seleziona file",
    selectFolder: "Seleziona cartella",
    maxFileSize: "Dimensione massima per file: {size} MB",
    allowedFormats: "Formati supportati: {formats}",
    filesSelected: "{count} file selezionati",
    totalSize: "Dimensione totale: {size}",
    startUpload: "Avvia caricamento",
    uploading: "Caricamento in corso... {progress}%",
    uploadComplete: "Caricamento completato",
    uploadFailed: "Caricamento fallito",
    fileUploaded: "{name} caricato",
    fileFailed: "Errore nel caricamento di {name}",
    duplicateFile: "File duplicato: {name}",
    invalidFormat: "Formato non supportato: {name}",
    fileTooLarge: "File troppo grande: {name} ({size} MB)",
    batchId: "ID lotto",
    assignMagazine: "Assegna a caricatore",
    createNewMagazine: "Crea nuovo caricatore",
    noMagazineAssigned: "Nessun caricatore assegnato",
    processingQueue: "Elaborazione coda...",
    queuePosition: "Posizione in coda: {position}",
  },

  // ---------------------------------------------------------------------------
  // Gallery / Slides
  // ---------------------------------------------------------------------------
  gallery: {
    title: "Galleria",
    subtitle: "Tutte le diapositive digitalizzate",
    allPhotos: "Tutte le foto",
    albums: "Album",
    filterByDate: "Filtra per data",
    filterByLocation: "Filtra per luogo",
    filterByCollection: "Filtra per album",
    archiveSelected: "Archivia selezionate",
    archiveConfirm: "Le diapositive selezionate verranno archiviate e spostate nel backup. Continuare?",
    archiveSuccess: "Diapositive archiviate con successo",
    noAlbums: "Nessun album. Crea il primo dalla galleria.",
    createAlbum: "Nuovo album",
    noSlides: "Nessuna diapositiva trovata",
    noSlidesHint: "Carica le prime diapositive per iniziare",
    slideCount: "{count} diapositive",
    slideCountSingular: "1 diapositiva",
    viewGrid: "Visualizzazione griglia",
    viewList: "Visualizzazione elenco",
    viewDetail: "Visualizzazione dettaglio",
    sortBy: "Ordina per",
    sortDate: "Data",
    sortName: "Nome",
    sortSize: "Dimensione",
    sortNewest: "Più recenti",
    sortOldest: "Più vecchi",
    filterStatus: "Filtra per stato",
    filterMagazine: "Filtra per caricatore",
    filterCollection: "Filtra per collezione",
    filterDateRange: "Intervallo date",
    selectedCount: "{count} selezionate",
    downloadOriginal: "Scarica originale",
    downloadMedium: "Scarica media risoluzione",
    openFullscreen: "Apri a schermo intero",
    slideInfo: "Informazioni diapositiva",
    editMetadata: "Modifica metadati",
    moveToCollection: "Sposta in collezione",
    removeFromCollection: "Rimuovi dalla collezione",
    deleteSlide: "Elimina diapositiva",
    deleteSlideConfirm: "Sei sicuro di voler eliminare questa diapositiva?",
    deleteSelectedConfirm:
      "Sei sicuro di voler eliminare {count} diapositive selezionate?",
    batchEdit: "Modifica in blocco",
    batchEditSelected: "Modifica {count} diapositive selezionate",
    slidesSelectedSingular: "1 diapositiva selezionata",
    slidesSelectedPlural: "{count} diapositive selezionate",
    noDetails: "Nessun dettaglio",
  },

  // ---------------------------------------------------------------------------
  // Slide metadata
  // ---------------------------------------------------------------------------
  metadata: {
    title: "Titolo",
    originalFilename: "Nome file originale",
    storagePath: "Percorso archiviazione",
    fileSize: "Dimensione file",
    dimensions: "Dimensioni",
    widthXHeight: "{width} × {height} px",
    checksum: "Checksum",
    dateTaken: "Data scatto",
    dateTakenPrecise: "Data scatto precisa",
    location: "Luogo",
    notes: "Note",
    scanDate: "Data scansione",
    exifData: "Dati EXIF",
    magazine: "Caricatore",
    slotNumber: "Numero slot",
    batch: "Lotto",
    status: "Stato",
    backedUp: "Backup effettuato",
    backedUpAt: "Data backup",
    exifWritten: "EXIF scritto",
    uploadedBy: "Caricato da",
    createdAt: "Creato il",
    updatedAt: "Aggiornato il",
    noTitle: "Senza titolo",
    noLocation: "Luogo non specificato",
    noDate: "Data non specificata",
    noNotes: "Nessuna nota",
  },

  // ---------------------------------------------------------------------------
  // Slide statuses
  // ---------------------------------------------------------------------------
  status: {
    incoming: "In arrivo",
    active: "Attiva",
    archived: "Archiviata",
    deleted: "Eliminata",
    processing: "In elaborazione",
    error: "Errore",
    pending: "In attesa",
    complete: "Completato",
    inProgress: "In corso",
    failed: "Fallito",
  },

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------
  search: {
    title: "Ricerca",
    subtitle: "Cerca tra le tue diapositive",
    placeholder: "Cerca per titolo, luogo, note...",
    advancedSearch: "Ricerca avanzata",
    searchResults: "Risultati della ricerca",
    noResults: "Nessun risultato trovato",
    noResultsHint: "Prova con termini di ricerca diversi",
    resultsCount: "{count} risultati trovati",
    resultsSingular: "1 risultato trovato",
    searchIn: "Cerca in",
    searchInAll: "Tutti i campi",
    searchInTitle: "Titolo",
    searchInLocation: "Luogo",
    searchInNotes: "Note",
    dateFrom: "Data da",
    dateTo: "Data a",
    clearFilters: "Cancella filtri",
    recentSearches: "Ricerche recenti",
    savedSearches: "Ricerche salvate",
    saveSearch: "Salva ricerca",
  },

  // ---------------------------------------------------------------------------
  // Magazines
  // ---------------------------------------------------------------------------
  magazines: {
    title: "Caricatori",
    subtitle: "Gestisci i caricatori di diapositive",
    noMagazines: "Nessun caricatore trovato",
    noMagazinesHint: "Crea il primo caricatore per organizzare le diapositive",
    createMagazine: "Nuovo caricatore",
    editMagazine: "Modifica caricatore",
    deleteMagazine: "Elimina caricatore",
    deleteMagazineConfirm: "Sei sicuro di voler eliminare questo caricatore?",
    magazineName: "Nome caricatore",
    magazineNamePlaceholder: "es. Vacanze 1985",
    slotCount: "Numero slot",
    slotCountHint: "Numero di posizioni nel caricatore (default: 50)",
    slidesInMagazine: "{count} diapositive in questo caricatore",
    emptySlots: "{count} slot vuoti",
    owner: "Proprietario",
  },

  // ---------------------------------------------------------------------------
  // Collections
  // ---------------------------------------------------------------------------
  collections: {
    title: "Collezioni",
    subtitle: "Organizza le diapositive in collezioni tematiche",
    noCollections: "Nessuna collezione trovata",
    noCollectionsHint: "Crea la prima collezione per raggruppare le diapositive",
    createCollection: "Nuova collezione",
    editCollection: "Modifica collezione",
    deleteCollection: "Elimina collezione",
    deleteCollectionConfirm:
      "Sei sicuro di voler eliminare questa collezione?",
    collectionName: "Nome collezione",
    collectionNamePlaceholder: "es. Famiglia anni '80",
    coverImage: "Immagine di copertina",
    changeCover: "Cambia copertina",
    slidesInCollection: "{count} diapositive in questa collezione",
    addSlides: "Aggiungi diapositive",
    removeSlides: "Rimuovi diapositive",
    reorderSlides: "Riordina diapositive",
    owner: "Proprietario",
  },

  // ---------------------------------------------------------------------------
  // Queue / Processing
  // ---------------------------------------------------------------------------
  queue: {
    title: "Coda di elaborazione",
    subtitle: "Diapositive caricate in attesa di essere pubblicate nella galleria",
    noItems: "Nessun elemento in coda",
    noItemsHint: "Le nuove diapositive caricate appariranno qui",
    processing: "In elaborazione...",
    itemsInQueue: "{count} elementi in coda",
    processAll: "Elabora tutto",
    processSelected: "Elabora selezionati",
    retryFailed: "Riprova falliti",
    clearCompleted: "Rimuovi completati",
    generateThumbnails: "Genera miniature",
    extractExif: "Estrai dati EXIF",
    moveToArchive: "Sposta in archivio",
  },

  // ---------------------------------------------------------------------------
  // Admin
  // ---------------------------------------------------------------------------
  admin: {
    title: "Amministrazione",
    subtitle: "Gestisci utenti, impostazioni e sistema",
    dashboard: "Pannello di controllo",
    systemInfo: "Informazioni sistema",
    diskUsage: "Utilizzo disco",
    diskFree: "Spazio libero: {size}",
    diskTotal: "Spazio totale: {size}",
    totalSlides: "Diapositive totali",
    totalCollections: "Collezioni totali",
    totalMagazines: "Caricatori totali",
    totalUsers: "Utenti totali",
    recentActivity: "Attività recente",
    systemHealth: "Stato del sistema",
    databaseStatus: "Stato database",
    storageStatus: "Stato archiviazione",
    emailStatus: "Stato email",
    whatsappStatus: "Stato WhatsApp",
    healthy: "Funzionante",
    unhealthy: "Non funzionante",
    unknown: "Sconosciuto",
  },

  // ---------------------------------------------------------------------------
  // Users (admin)
  // ---------------------------------------------------------------------------
  users: {
    title: "Gestione utenti",
    subtitle: "Aggiungi e gestisci gli utenti del sistema",
    noUsers: "Nessun utente trovato",
    createUser: "Nuovo utente",
    editUser: "Modifica utente",
    deleteUser: "Elimina utente",
    deleteUserConfirm: "Sei sicuro di voler eliminare questo utente?",
    deactivateUser: "Disattiva utente",
    activateUser: "Attiva utente",
    userEmail: "Email utente",
    userPhone: "Telefono utente",
    userName: "Nome utente",
    userRole: "Ruolo utente",
    userStatus: "Stato utente",
    otpChannel: "Canale OTP",
    lastLogin: "Ultimo accesso",
    neverLoggedIn: "Mai effettuato l'accesso",
  },

  // ---------------------------------------------------------------------------
  // API Keys
  // ---------------------------------------------------------------------------
  apiKeys: {
    title: "Chiavi API",
    subtitle: "Gestisci le chiavi di accesso API",
    noKeys: "Nessuna chiave API trovata",
    createKey: "Nuova chiave API",
    deleteKey: "Elimina chiave API",
    deleteKeyConfirm: "Sei sicuro di voler eliminare questa chiave API?",
    keyName: "Nome chiave",
    keyNamePlaceholder: "es. Script di backup",
    keyValue: "Valore chiave",
    copyKey: "Copia chiave",
    keyCopied: "Chiave copiata negli appunti",
    keyCreated:
      "Chiave creata. Copiala ora, non sarà più visibile in seguito.",
    lastUsed: "Ultimo utilizzo",
    neverUsed: "Mai utilizzata",
    owner: "Proprietario",
  },

  // ---------------------------------------------------------------------------
  // Audit Log
  // ---------------------------------------------------------------------------
  auditLog: {
    title: "Registro attività",
    subtitle: "Cronologia delle azioni nel sistema",
    noEntries: "Nessuna voce nel registro",
    action: "Azione",
    user: "Utente",
    entity: "Entità",
    details: "Dettagli",
    timestamp: "Data e ora",
    filterByUser: "Filtra per utente",
    filterByAction: "Filtra per azione",
    filterByDate: "Filtra per data",
  },

  // ---------------------------------------------------------------------------
  // Audit actions
  // ---------------------------------------------------------------------------
  auditActions: {
    login: "Accesso",
    logout: "Uscita",
    upload: "Caricamento",
    delete: "Eliminazione",
    edit: "Modifica",
    create: "Creazione",
    backup: "Backup",
    restore: "Ripristino",
    userCreate: "Creazione utente",
    userEdit: "Modifica utente",
    userDelete: "Eliminazione utente",
    settingsUpdate: "Aggiornamento impostazioni",
    apiKeyCreate: "Creazione chiave API",
    apiKeyDelete: "Eliminazione chiave API",
  },

  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------
  settings: {
    title: "Impostazioni",
    subtitle: "Configura il sistema",
    general: "Generali",
    storage: "Archiviazione",
    email: "Email",
    whatsapp: "WhatsApp",
    backup: "Backup",
    security: "Sicurezza",
    appearance: "Aspetto",
    saved: "Impostazioni salvate",
    saveError: "Errore nel salvataggio delle impostazioni",
    testEmail: "Invia email di prova",
    testEmailSent: "Email di prova inviata",
    testEmailFailed: "Invio email di prova fallito",
    testWhatsApp: "Invia messaggio WhatsApp di prova",
    theme: "Tema",
    themeLight: "Chiaro",
    themeDark: "Scuro",
    themeSystem: "Sistema",
    language: "Lingua",
  },

  // ---------------------------------------------------------------------------
  // Backup
  // ---------------------------------------------------------------------------
  backup: {
    title: "Backup",
    subtitle: "Gestisci i backup delle diapositive",
    noBackups: "Nessun backup trovato",
    startBackup: "Avvia backup",
    startBackupConfirm: "Sei sicuro di voler avviare un backup ora?",
    backupInProgress: "Backup in corso...",
    backupComplete: "Backup completato",
    backupFailed: "Backup fallito",
    lastBackup: "Ultimo backup",
    nextScheduled: "Prossimo backup programmato",
    destination: "Destinazione",
    slidesBackedUp: "{count} diapositive copiate",
    totalSize: "Dimensione totale: {size}",
    duration: "Durata: {duration}",
    history: "Cronologia backup",
    schedule: "Pianificazione",
    scheduleHint: "Espressione cron per la pianificazione automatica",
    notBackedUp: "Non ancora copiata",
    backedUpOn: "Copiata il {date}",
    backupDestinations: "Destinazioni backup",
    addDestination: "Aggiungi destinazione",
    removeDestination: "Rimuovi destinazione",
    s3: "Amazon S3 / MinIO",
    local: "Directory locale / NAS",
    smb: "Condivisione SMB/CIFS",
    rsync: "Rsync via SSH",
  },

  // ---------------------------------------------------------------------------
  // Profile
  // ---------------------------------------------------------------------------
  profile: {
    title: "Profilo",
    subtitle: "Gestisci il tuo account",
    personalInfo: "Informazioni personali",
    changeEmail: "Cambia email",
    changePhone: "Cambia telefono",
    changeName: "Cambia nome",
    changeOtpChannel: "Canale preferito per OTP",
    activeSessions: "Sessioni attive",
    revokeSession: "Revoca sessione",
    revokeAllSessions: "Revoca tutte le sessioni",
    revokeSessionConfirm: "Sei sicuro di voler revocare questa sessione?",
    revokeAllSessionsConfirm: "Sei sicuro di voler revocare tutte le sessioni?",
    currentSession: "Sessione corrente",
    myApiKeys: "Le mie chiavi API",
  },

  // ---------------------------------------------------------------------------
  // Error messages
  // ---------------------------------------------------------------------------
  errors: {
    generic: "Si è verificato un errore. Riprova più tardi.",
    notFound: "Risorsa non trovata",
    unauthorized: "Accesso non autorizzato. Effettua l'accesso.",
    forbidden: "Non hai i permessi per questa azione",
    adminRequired: "Questa azione richiede i privilegi di amministratore",
    accountDisabled: "Il tuo account è stato disattivato",
    apiKeyRequired: "Chiave API richiesta",
    invalidApiKey: "Chiave API non valida",
    invalidEmail: "Indirizzo email non valido",
    invalidPhone: "Numero di telefono non valido",
    invalidOtp: "Codice OTP non valido o scaduto",
    otpExpired: "Il codice è scaduto. Richiedine uno nuovo.",
    otpTooMany: "Troppi tentativi. Riprova tra qualche minuto.",
    emailNotFound: "Nessun account trovato con questa email",
    emailAlreadyExists: "Esiste già un account con questa email",
    fileTooLarge: "Il file supera la dimensione massima consentita",
    invalidFileType: "Tipo di file non supportato",
    uploadFailed: "Errore durante il caricamento del file",
    downloadFailed: "Errore durante il download del file",
    deleteFailed: "Errore durante l'eliminazione",
    saveFailed: "Errore durante il salvataggio",
    connectionError: "Errore di connessione. Verifica la rete.",
    serverError: "Errore del server. Riprova più tardi.",
    validationError: "Verifica i dati inseriti",
    requiredField: "Campo obbligatorio",
    tooShort: "Valore troppo corto",
    tooLong: "Valore troppo lungo",
    invalidFormat: "Formato non valido",
    duplicateEntry: "Voce duplicata",
    permissionDenied: "Permesso negato",
    backupFailed: "Errore durante il backup",
    slideNotFound: "Diapositiva non trovata",
    magazineNotFound: "Caricatore non trovato",
    collectionNotFound: "Collezione non trovata",
    userNotFound: "Utente non trovato",
    sessionNotFound: "Sessione non trovata",
  },

  // ---------------------------------------------------------------------------
  // Success messages
  // ---------------------------------------------------------------------------
  success: {
    saved: "Salvato con successo",
    deleted: "Eliminato con successo",
    created: "Creato con successo",
    updated: "Aggiornato con successo",
    uploaded: "Caricato con successo",
    copied: "Copiato negli appunti",
    otpSent: "Codice di accesso inviato",
    loggedIn: "Accesso effettuato",
    loggedOut: "Uscita effettuata",
    backupStarted: "Backup avviato",
    backupCompleted: "Backup completato",
    profileUpdated: "Profilo aggiornato",
    settingsSaved: "Impostazioni salvate",
    userCreated: "Utente creato",
    userUpdated: "Utente aggiornato",
    userDeleted: "Utente eliminato",
    collectionCreated: "Collezione creata",
    collectionUpdated: "Collezione aggiornata",
    collectionDeleted: "Collezione eliminata",
    magazineCreated: "Caricatore creato",
    magazineUpdated: "Caricatore aggiornato",
    magazineDeleted: "Caricatore eliminato",
    apiKeyCreated: "Chiave API creata",
    apiKeyDeleted: "Chiave API eliminata",
    sessionRevoked: "Sessione revocata",
    allSessionsRevoked: "Tutte le sessioni revocate",
    slidesProcessed: "Diapositive elaborate",
    slidesPublished: "Diapositive pubblicate nella galleria",
    slidesArchived: "Diapositive archiviate nel backup",
    metadataUpdated: "Metadati aggiornati",
    exifExtracted: "Dati EXIF estratti",
    thumbnailGenerated: "Miniatura generata",
  },

  // ---------------------------------------------------------------------------
  // Confirmation dialogs
  // ---------------------------------------------------------------------------
  confirm: {
    deleteTitle: "Conferma eliminazione",
    deleteMessage: "Questa azione non può essere annullata. Continuare?",
    archiveTitle: "Conferma archiviazione",
    archiveMessage: "Vuoi archiviare gli elementi selezionati?",
    publishTitle: "Conferma pubblicazione",
    publishMessage: "Vuoi pubblicare queste diapositive nella galleria?",
    logoutTitle: "Conferma uscita",
    logoutMessage: "Sei sicuro di voler uscire?",
    unsavedChanges: "Hai modifiche non salvate. Vuoi davvero uscire?",
    bulkDeleteTitle: "Eliminazione multipla",
    bulkDeleteMessage:
      "Stai per eliminare {count} elementi. Questa azione non può essere annullata.",
    deleteSlidesSingular:
      "Sei sicuro di voler eliminare 1 diapositiva? Questa azione non può essere annullata.",
    deleteSlidesPlural:
      "Sei sicuro di voler eliminare {count} diapositive? Questa azione non può essere annullata.",
    processTitle: "Conferma elaborazione",
    processMessage: "Vuoi avviare l'elaborazione degli elementi selezionati?",
    backupTitle: "Conferma backup",
    backupMessage: "Vuoi avviare il backup adesso?",
  },

  // ---------------------------------------------------------------------------
  // Empty states
  // ---------------------------------------------------------------------------
  empty: {
    slides: "Nessuna diapositiva",
    slidesDescription: "Carica le prime diapositive per iniziare a costruire il tuo archivio digitale.",
    collections: "Nessuna collezione",
    collectionsDescription: "Crea collezioni per organizzare le tue diapositive per tema o evento.",
    magazines: "Nessun caricatore",
    magazinesDescription: "Aggiungi i caricatori del tuo Reflecta DigitDia per tenere traccia delle scansioni.",
    search: "Nessun risultato",
    searchDescription: "Prova a modificare i termini di ricerca o i filtri applicati.",
    queue: "Coda vuota",
    queueDescription: "Non ci sono diapositive in attesa di elaborazione.",
    backups: "Nessun backup",
    backupsDescription: "Configura le destinazioni di backup per proteggere le tue diapositive.",
    auditLog: "Nessuna attività",
    auditLogDescription: "Le azioni degli utenti verranno registrate qui.",
    users: "Nessun utente",
    usersDescription: "Aggiungi utenti per consentire l'accesso al sistema.",
    apiKeys: "Nessuna chiave API",
    apiKeysDescription: "Crea chiavi API per integrazioni esterne e script di automazione.",
  },

  // ---------------------------------------------------------------------------
  // Tooltips / Help text
  // ---------------------------------------------------------------------------
  tooltips: {
    uploadHelp:
      "Trascina le immagini scansionate dal tuo Reflecta DigitDia oppure selezionale dal computer.",
    searchHelp:
      "Cerca per titolo, luogo, note o qualsiasi testo nei metadati delle diapositive.",
    magazineHelp:
      "I caricatori rappresentano i contenitori fisici di diapositive del Reflecta DigitDia, ciascuno con 36 o 50 slot.",
    collectionHelp:
      "Le collezioni sono raggruppamenti virtuali di diapositive per tema, evento o periodo.",
    backupHelp:
      "Il backup crea copie di sicurezza delle diapositive originali su destinazioni esterne.",
    apiKeyHelp:
      "Le chiavi API consentono l'accesso programmatico al sistema per script e integrazioni.",
    otpHelp:
      "L'accesso avviene tramite un codice temporaneo inviato via email o WhatsApp. Non è necessaria una password.",
    exifHelp:
      "I dati EXIF contengono informazioni tecniche dell'immagine come data, esposizione e risoluzione.",
    slotNumberHelp:
      "Il numero dello slot nel caricatore da cui è stata scansionata la diapositiva.",
    batchHelp:
      "Il lotto raggruppa le diapositive caricate insieme nello stesso caricamento.",
    statusHelp:
      "Lo stato indica la fase del ciclo di vita della diapositiva: in arrivo, attiva, archiviata o eliminata.",
    checksumHelp:
      "L'hash di verifica garantisce l'integrità del file e identifica eventuali duplicati.",
  },

  // ---------------------------------------------------------------------------
  // Navigation help (spoken + tooltip on info icon)
  // ---------------------------------------------------------------------------
  navHelp: {
    panoramica:
      "La panoramica mostra un riepilogo generale del sistema: statistiche sulle diapositive, lo stato della coda e le attività recenti.",
    coda:
      "La coda in arrivo contiene le diapositive appena caricate. Puoi impostare titolo e dettagli per tutto il lotto, modificare le singole foto, e poi pubblicarle nella galleria.",
    caricamento:
      "Da qui puoi caricare nuove immagini scansionate dal tuo Reflecta DigitDia, trascinandole o selezionandole dal computer.",
    galleria:
      "La galleria mostra tutte le diapositive pubblicate. Puoi visualizzarle tutte o per album, filtrarle per data, luogo o tag, e archiviarle nel backup.",
    ricerca:
      "La ricerca ti permette di trovare diapositive per titolo, luogo, note o qualsiasi testo nei metadati, usando la ricerca full-text.",
    utenti:
      "Gestione utenti: qui puoi aggiungere, modificare o disattivare gli utenti che hanno accesso al sistema.",
    backup:
      "Da qui puoi avviare e monitorare i backup delle diapositive originali verso destinazioni esterne come S3 o NAS.",
    impostazioni:
      "Le impostazioni ti permettono di configurare email, WhatsApp, archiviazione, backup automatico e aspetto del sistema.",
    registro:
      "Il registro attività mostra la cronologia di tutte le azioni compiute dagli utenti nel sistema.",
    aiuto:
      "La sezione aiuto contiene la documentazione e le guide per utilizzare Dia-Storage.",
  },

  // ---------------------------------------------------------------------------
  // File sizes
  // ---------------------------------------------------------------------------
  fileSize: {
    bytes: "B",
    kilobytes: "KB",
    megabytes: "MB",
    gigabytes: "GB",
    terabytes: "TB",
  },

  // ---------------------------------------------------------------------------
  // Time
  // ---------------------------------------------------------------------------
  time: {
    justNow: "Adesso",
    minutesAgo: "{count} minuti fa",
    hoursAgo: "{count} ore fa",
    daysAgo: "{count} giorni fa",
    weeksAgo: "{count} settimane fa",
    monthsAgo: "{count} mesi fa",
    yearsAgo: "{count} anni fa",
    minuteAgo: "1 minuto fa",
    hourAgo: "1 ora fa",
    dayAgo: "1 giorno fa",
    weekAgo: "1 settimana fa",
    monthAgo: "1 mese fa",
    yearAgo: "1 anno fa",
    never: "Mai",
  },
} as const;

// ---------------------------------------------------------------------------
// Type-safe translation accessor
// ---------------------------------------------------------------------------

type TranslationDictionary = typeof translations;

/**
 * Flatten nested keys into dot-notation paths.
 * e.g. { nav: { home: "Home" } } => "nav.home"
 */
type FlattenKeys<T, Prefix extends string = ""> = T extends string
  ? Prefix
  : {
      [K in keyof T & string]: FlattenKeys<
        T[K],
        Prefix extends "" ? K : `${Prefix}.${K}`
      >;
    }[keyof T & string];

type TranslationKey = FlattenKeys<TranslationDictionary>;

/**
 * Get a translation by dot-notation key.
 *
 * @example
 *   t('nav.gallery')         // "Galleria"
 *   t('errors.notFound')     // "Risorsa non trovata"
 */
export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  const parts = key.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let value: any = translations;

  for (const part of parts) {
    if (value === undefined || value === null) return key;
    value = value[part];
  }

  if (typeof value !== "string") return key;

  // Replace {param} placeholders
  if (params) {
    return value.replace(
      /\{(\w+)\}/g,
      (_, paramKey: string) => String(params[paramKey] ?? `{${paramKey}}`)
    );
  }

  return value;
}

/**
 * Get all translations (useful for client components).
 */
export function getTranslations(): TranslationDictionary {
  return translations;
}

export default translations;
