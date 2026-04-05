# Dia-Uploader - App macOS per barra dei menu

App companion per **dia-storage** che rileva automaticamente le schede SD contenenti diapositive scansionate e le carica sul server.

## Prerequisiti

- **macOS 13.0** (Ventura) o successivo
- **Xcode 15.0** o successivo
- Un'istanza di dia-storage funzionante con una chiave API valida

## Apertura e compilazione

1. Apri il progetto Xcode:

   ```bash
   open macos/DiaUploader.xcodeproj
   ```

2. Seleziona il target **DiaUploader** e lo schema **My Mac**

3. Compila ed esegui con `Cmd + R`

> **Nota:** Al primo avvio, macOS potrebbe chiedere i permessi per le notifiche. Accettali per ricevere avvisi quando viene rilevata una scheda SD.

## Configurazione

Al primo avvio, l'app appare nella barra dei menu con l'icona di una pellicola.

1. Clicca sull'icona nella barra dei menu
2. Clicca sull'icona **ingranaggio** in basso a sinistra per aprire le impostazioni
3. Configura:
   - **URL del server**: l'indirizzo completo del server dia-storage (es. `https://dia.example.com`)
   - **Chiave API**: la chiave API generata dal pannello di amministrazione di dia-storage
4. Clicca **Prova connessione** per verificare che tutto funzioni
5. Clicca **Salva**

### Opzioni aggiuntive

- **Caricamento automatico**: avvia il caricamento immediatamente quando viene rilevata una scheda SD (senza conferma manuale)
- **Espelli scheda SD automaticamente**: espelle la scheda SD al termine del caricamento

## Utilizzo

### Caricamento manuale

1. Inserisci la scheda SD dal Reflecta DigitDia Evolution nel lettore
2. L'app rileva automaticamente i file `PICT*.JPG` sulla scheda
3. Una notifica macOS conferma il rilevamento: *"Scheda SD rilevata - Trovate N diapositive"*
4. Clicca sull'icona nella barra dei menu
5. Verifica il numero di file trovati e clicca **Carica diapositive**
6. Segui l'avanzamento nella finestra dell'app
7. Al termine, una notifica conferma: *"Caricamento completato - N diapositive caricate"*

### Caricamento automatico

Se l'opzione **Caricamento automatico** e abilitata nelle impostazioni, il caricamento parte automaticamente appena viene rilevata la scheda SD.

## Struttura del progetto

```
macos/
  DiaUploader.xcodeproj/     Progetto Xcode
  DiaUploader/
    DiaUploaderApp.swift      Punto di ingresso dell'app
    Info.plist                Configurazione dell'app
    Assets.xcassets/          Risorse grafiche
    Models/
      AppState.swift          Stato globale dell'app (ObservableObject)
    Views/
      MenuBarView.swift       Vista principale nel popover della barra dei menu
      SettingsView.swift      Finestra delle impostazioni
      UploadProgressView.swift Vista dettagliata dell'avanzamento
    Services/
      VolumeWatcher.swift     Monitoraggio montaggio/smontaggio volumi
      FileScanner.swift       Scansione file diapositive su volume
      UploadService.swift     Caricamento HTTP multipart al server
      KeychainService.swift   Archiviazione sicura chiave API nel Portachiavi
      NotificationService.swift Notifiche macOS
```

## API utilizzate

L'app comunica con il server dia-storage tramite:

- `GET /api/v1/health` - Verifica connessione al server
- `POST /api/v1/slides/upload/incoming` - Caricamento file (multipart/form-data con campo `files`)

L'autenticazione avviene tramite header `X-Api-Key`.

## Risoluzione problemi

### L'app non rileva la scheda SD

- Verifica che la scheda SD sia montata correttamente (visibile nel Finder)
- L'app cerca solo su volumi rimovibili/espellibili
- I file devono avere nome `PICT*.JPG`, `PICT*.jpg` o `IMG_*.JPG`

### Errore di connessione

- Verifica che l'URL del server sia corretto e raggiungibile
- Verifica che la chiave API sia valida
- Se usi un certificato self-signed, l'app lo accetta automaticamente

### Il caricamento fallisce

- Ogni file viene ritentato fino a 3 volte con backoff esponenziale
- Controlla i log del server dia-storage per dettagli sugli errori
- Verifica che ci sia spazio sufficiente sul server
