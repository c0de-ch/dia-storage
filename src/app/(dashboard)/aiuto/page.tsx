"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  BookOpenIcon,
  CircleHelp,
  Headset,
  Mail,
  Phone,
  Wifi,
  WifiOff,
} from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AiutoPage() {
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/health");
      if (res.ok) {
        const data = await res.json();
        setRemoteConnected(data.remoteAssistance === true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  async function requestAssistance() {
    setRequesting(true);
    try {
      const res = await fetch("/api/v1/remote-assistance", {
        method: "POST",
      });
      if (res.ok) {
        toast.success(
          "Richiesta inviata. Un tecnico si collegherà a breve."
        );
        setRemoteConnected(true);
      } else {
        toast.error(
          "Impossibile inviare la richiesta. Riprova più tardi."
        );
      }
    } catch {
      toast.error("Errore di rete. Verifica la connessione.");
    } finally {
      setRequesting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Aiuto e assistenza
        </h1>
        <p className="text-muted-foreground">
          Trova risposte alle domande frequenti o richiedi assistenza remota.
        </p>
      </div>

      {/* Remote assistance card */}
      <Card className="border-2">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-16 items-center justify-center rounded-full bg-primary/10">
            <Headset className="size-8 text-primary" />
          </div>
          <CardTitle className="text-xl">
            Assistenza remota
          </CardTitle>
          <CardDescription>
            Un tecnico si collegherà al tuo computer per aiutarti direttamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            {remoteConnected ? (
              <>
                <Wifi className="size-4 text-green-600" />
                <Badge className="bg-green-600 text-white hover:bg-green-700">
                  Connesso
                </Badge>
              </>
            ) : (
              <>
                <WifiOff className="size-4 text-muted-foreground" />
                <Badge variant="secondary">Non connesso</Badge>
              </>
            )}
          </div>

          <Button
            size="lg"
            className="h-12 px-8 text-base"
            onClick={requestAssistance}
            disabled={requesting}
          >
            <Headset className="size-5 mr-2" />
            {requesting
              ? "Invio richiesta..."
              : "Richiedi assistenza remota"}
          </Button>
        </CardContent>
      </Card>

      {/* FAQ Accordion */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CircleHelp className="size-5" />
            Domande frequenti
          </CardTitle>
          <CardDescription>
            Le risposte alle domande più comuni sull&apos;utilizzo del sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion>
            <AccordionItem value="caricare-diapositive">
              <AccordionTrigger>
                Come caricare le diapositive dallo scanner
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 text-muted-foreground">
                  <p>
                    Per caricare le diapositive digitalizzate dallo scanner
                    Reflecta DigitDia, segui questi passaggi:
                  </p>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>
                      Assicurati che lo scanner sia acceso e collegato al
                      computer.
                    </li>
                    <li>
                      Avvia la scansione dal software dello scanner. Le immagini
                      verranno salvate nella cartella di ingresso configurata.
                    </li>
                    <li>
                      Vai alla sezione <strong>Caricamento</strong> nel menu
                      laterale.
                    </li>
                    <li>
                      Le diapositive scannerizzate appariranno automaticamente
                      nella coda di elaborazione.
                    </li>
                    <li>
                      Attendi che l&apos;elaborazione delle miniature sia
                      completata. Vedrai una barra di avanzamento.
                    </li>
                    <li>
                      Una volta completata l&apos;elaborazione, le diapositive
                      saranno visibili nella galleria.
                    </li>
                  </ol>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="aggiungere-informazioni">
              <AccordionTrigger>
                Come aggiungere informazioni alle diapositive
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 text-muted-foreground">
                  <p>
                    Puoi aggiungere titolo, data, luogo e note a ciascuna
                    diapositiva:
                  </p>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>
                      Nella galleria, clicca sulla diapositiva che vuoi
                      modificare.
                    </li>
                    <li>
                      Si aprirà la scheda dettagli con i campi modificabili.
                    </li>
                    <li>
                      Compila i campi desiderati: <strong>Titolo</strong>,{" "}
                      <strong>Data</strong>, <strong>Luogo</strong> e{" "}
                      <strong>Note</strong>.
                    </li>
                    <li>
                      Clicca su <strong>Salva</strong> per confermare le
                      modifiche.
                    </li>
                    <li>
                      Le informazioni verranno scritte anche nei metadati EXIF
                      del file originale.
                    </li>
                  </ol>
                  <p>
                    <strong>Suggerimento:</strong> puoi anche modificare più
                    diapositive contemporaneamente selezionandole nella galleria
                    e usando la funzione di modifica in blocco.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="cercare-diapositive">
              <AccordionTrigger>
                Come cercare le diapositive
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 text-muted-foreground">
                  <p>
                    Il sistema offre una ricerca avanzata per trovare rapidamente
                    le diapositive:
                  </p>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>
                      Usa la barra di ricerca in alto per cercare per titolo,
                      luogo o note.
                    </li>
                    <li>
                      La ricerca funziona anche con parole parziali e supporta
                      la lingua italiana.
                    </li>
                    <li>
                      Puoi filtrare per caricatore (magazine), per data di
                      scatto o per collezione.
                    </li>
                    <li>
                      I risultati vengono mostrati in tempo reale mentre
                      digiti.
                    </li>
                  </ol>
                  <p>
                    <strong>Suggerimento:</strong> usa le virgolette per cercare
                    una frase esatta, ad esempio &quot;vacanze al mare 1985&quot;.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="scaricare-originali">
              <AccordionTrigger>
                Come scaricare le diapositive originali
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 text-muted-foreground">
                  <p>
                    Per scaricare il file originale ad alta risoluzione di una
                    diapositiva:
                  </p>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Apri la diapositiva dalla galleria.</li>
                    <li>
                      Clicca sul pulsante <strong>Scarica originale</strong>{" "}
                      nella barra degli strumenti.
                    </li>
                    <li>
                      Il file verr&agrave; scaricato nel formato originale
                      (solitamente TIFF o JPEG).
                    </li>
                  </ol>
                  <p>
                    Per scaricare più diapositive contemporaneamente, selezionale
                    nella galleria e usa il pulsante{" "}
                    <strong>Scarica selezionate</strong>. Verranno compresse in
                    un archivio ZIP.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="backup">
              <AccordionTrigger>Come funziona il backup</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 text-muted-foreground">
                  <p>
                    Il sistema effettua backup automatici delle diapositive e del
                    database:
                  </p>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>
                      I backup possono essere salvati su <strong>Amazon S3</strong>{" "}
                      o su un <strong>NAS locale</strong>.
                    </li>
                    <li>
                      Per impostazione predefinita, il backup automatico viene
                      eseguito ogni notte alle 02:00.
                    </li>
                    <li>
                      Puoi avviare un backup manuale dalla sezione{" "}
                      <strong>Backup</strong> nel pannello di amministrazione.
                    </li>
                    <li>
                      Lo stato di ogni backup viene registrato nella cronologia
                      con data, dimensione e durata.
                    </li>
                    <li>
                      In caso di errore, riceverai una notifica via email.
                    </li>
                  </ol>
                  <p>
                    <strong>Importante:</strong> verifica regolarmente che i
                    backup vengano completati con successo controllando la
                    cronologia.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="assistenza">
              <AccordionTrigger>Come richiedere assistenza</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 text-muted-foreground">
                  <p>
                    Se hai bisogno di aiuto, puoi richiedere assistenza in due
                    modi:
                  </p>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>
                      <strong>Assistenza remota:</strong> clicca il pulsante
                      &quot;Richiedi assistenza remota&quot; in cima a questa
                      pagina. Un tecnico si collegherà direttamente al tuo
                      computer per risolvere il problema.
                    </li>
                    <li>
                      <strong>Contatto diretto:</strong> usa i recapiti nella
                      sezione contatti qui sotto per chiamare o inviare
                      un&apos;email al supporto tecnico.
                    </li>
                  </ol>
                  <p>
                    Per l&apos;assistenza remota, assicurati che il computer sia
                    connesso a Internet e che l&apos;applicazione sia aperta.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Scanner Manual Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpenIcon className="size-5" />
            Manuale Scanner Reflecta DigitDia Evolution
          </CardTitle>
          <CardDescription>
            Immagini di riferimento dal manuale originale dello scanner.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Scanner overview */}
          <div>
            <h3 className="mb-3 text-lg font-semibold">
              Panoramica dello scanner
            </h3>
            <div className="overflow-hidden rounded-lg border">
              <img
                src="/images/manual/scanner-overview.jpg"
                alt="Reflecta DigitDia Evolution - panoramica"
                className="w-full max-w-lg"
              />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Lo scanner Reflecta DigitDia Evolution con display LCD da 7 pollici,
              caricatore inserito e scheda SD per il salvataggio delle scansioni.
            </p>
          </div>

          <Separator />

          {/* Product parts */}
          <div>
            <h3 className="mb-3 text-lg font-semibold">
              Componenti del dispositivo
            </h3>
            <div className="overflow-hidden rounded-lg border">
              <img
                src="/images/manual/product-parts.jpg"
                alt="Reflecta DigitDia Evolution - componenti numerati"
                className="w-full max-w-2xl"
              />
            </div>
            <div className="mt-3 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
              <div><strong>1.</strong> Display LCD</div>
              <div><strong>2.</strong> LED di controllo</div>
              <div><strong>3.</strong> Interruttore accensione (tenere 3s per spegnere)</div>
              <div><strong>4.</strong> Tasto HOME (menu principale)</div>
              <div><strong>5.</strong> Freccia sinistra</div>
              <div><strong>6.</strong> Freccia destra / Trasporto</div>
              <div><strong>7.</strong> Tasto OK / Enter</div>
              <div><strong>8.</strong> Tasto Scansione (avvio/stop)</div>
              <div><strong>9.</strong> Presa alimentazione 12V</div>
              <div><strong>10.</strong> Slot scheda SD</div>
              <div><strong>11.</strong> Uscita HDMI</div>
              <div><strong>12.</strong> Dia-Lift con apertura pulizia</div>
              <div><strong>13.</strong> Spingitore diapositive (Diaschieber)</div>
            </div>
          </div>

          <Separator />

          {/* Magazine usage */}
          <div>
            <h3 className="mb-3 text-lg font-semibold">
              Utilizzo dei caricatori (magazine)
            </h3>
            <div className="overflow-hidden rounded-lg border">
              <img
                src="/images/manual/magazine-usage.jpg"
                alt="Reflecta DigitDia Evolution - utilizzo caricatori"
                className="w-full max-w-2xl"
              />
            </div>
            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
              <p>
                <strong>Tipi di caricatori compatibili:</strong> Universal (DIN 108),
                CS e LKM (Leica-Kindermann).
              </p>
              <p>
                <strong>Universal (DIN 108):</strong> posizionare la leva dello
                spingitore verso il basso.
              </p>
              <p>
                <strong>CS e LKM:</strong> posizionare la leva dello spingitore
                verso l&apos;alto.
              </p>
              <p>
                <strong>Inserimento:</strong> inserire il caricatore da sinistra nella
                fessura fino a quando non tocca lo spingitore.
              </p>
              <p>
                Le diapositive devono essere inserite nel formato orizzontale,
                con la superficie dell&apos;emulsione rivolta a destra, a partire dalla
                posizione 1.
              </p>
            </div>
          </div>

          <Separator />

          {/* Specs summary */}
          <div>
            <h3 className="mb-3 text-lg font-semibold">
              Specifiche tecniche
            </h3>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="font-medium">Sensore</p>
                <p className="text-muted-foreground">CMOS 1/2,33&quot; - 15,3 MP</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="font-medium">Risoluzione</p>
                <p className="text-muted-foreground">4608 x 3072 px (14MP) o 5760 x 3840 px (22MP interp.)</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="font-medium">Velocita scansione</p>
                <p className="text-muted-foreground">&lt; 5 sec per diapositiva (automatico)</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="font-medium">Formato output</p>
                <p className="text-muted-foreground">JPEG (compressione bassa)</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="font-medium">Caricatori</p>
                <p className="text-muted-foreground">Universal (DIN 108), CS, LKM</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="font-medium">Memoria</p>
                <p className="text-muted-foreground">Scheda SD/SDHC fino a 128 GB</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="font-medium">Display</p>
                <p className="text-muted-foreground">LCD IPS 7 pollici (17,8 cm)</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="font-medium">Dimensioni</p>
                <p className="text-muted-foreground">245 x 243 x 141 mm, 1650 g</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact info */}
      <Card>
        <CardHeader>
          <CardTitle>Contatti</CardTitle>
          <CardDescription>
            Per assistenza diretta, utilizza i seguenti recapiti.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                <Phone className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Telefono</p>
                <p className="text-sm text-muted-foreground">
                  +39 02 1234567
                </p>
                <p className="text-xs text-muted-foreground">
                  Lun-Ven, 9:00-18:00
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                <Mail className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Email</p>
                <p className="text-sm text-muted-foreground">
                  supporto@dia-storage.it
                </p>
                <p className="text-xs text-muted-foreground">
                  Risposta entro 24 ore lavorative
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
