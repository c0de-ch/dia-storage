"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  SendIcon,
  MicIcon,
  Volume2Icon,
  VolumeXIcon,
  BotIcon,
  UserIcon,
  Loader2Icon,
  Trash2Icon,
  GlobeIcon,
  CopyIcon,
  CheckIcon,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSpeechSynthesis } from "@/hooks/use-speech-synthesis";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { findBestMatch } from "@/lib/help-bot/matcher";
import { suggestedTopics } from "@/lib/help-bot/knowledge-base";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

const LANGUAGES = [
  { code: "it-IT", label: "Italiano", flag: "IT" },
  { code: "en-US", label: "English", flag: "EN" },
  { code: "de-DE", label: "Deutsch", flag: "DE" },
  { code: "fr-FR", label: "Français", flag: "FR" },
  { code: "zh-CN", label: "中文", flag: "ZH" },
] as const;

type LangCode = (typeof LANGUAGES)[number]["code"];

const WELCOME_MESSAGES: Record<LangCode, string> = {
  "it-IT": "Ciao! Sono l'assistente di Dia-Storage. Puoi chiedermi qualsiasi cosa sull'applicazione. Parla o scrivi la tua domanda.",
  "en-US": "Hi! I'm the Dia-Storage assistant. You can ask me anything about the application. Speak or type your question.",
  "de-DE": "Hallo! Ich bin der Dia-Storage-Assistent. Du kannst mich alles zur Anwendung fragen. Sprich oder schreibe deine Frage.",
  "fr-FR": "Bonjour! Je suis l'assistant Dia-Storage. Vous pouvez me poser n'importe quelle question sur l'application. Parlez ou écrivez votre question.",
  "zh-CN": "你好！我是 Dia-Storage 助手。你可以问我任何关于这个应用的问题。请说话或输入你的问题。",
};

function makeWelcomeMessage(lang: LangCode): ChatMessage {
  return { id: "welcome", role: "assistant", text: WELCOME_MESSAGES[lang] };
}

/** Strip markdown syntax so TTS reads clean text. */
function stripMarkdown(md: string): string {
  return md
    .replace(/\*\*(.+?)\*\*/g, "$1")   // bold
    .replace(/\*(.+?)\*/g, "$1")        // italic
    .replace(/^#{1,6}\s+/gm, "")        // headings
    .replace(/^\s*[-*]\s+/gm, "")       // list bullets
    .replace(/^\s*\d+\.\s+/gm, "")      // numbered lists
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links
    .replace(/`(.+?)`/g, "$1")          // inline code
    .replace(/\n{2,}/g, "\n")
    .trim();
}

interface HelpBotChatProps {
  autoStartMic?: boolean;
}

export function HelpBotChat({ autoStartMic = false }: HelpBotChatProps) {
  const [lang, setLang] = useState<LangCode>("it-IT");
  const [messages, setMessages] = useState<ChatMessage[]>([makeWelcomeMessage("it-IT")]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [voiceMode, setVoiceMode] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const voiceModeRef = useRef(voiceMode);

  // Keep ref in sync so callbacks always see latest value
  useEffect(() => {
    voiceModeRef.current = voiceMode;
  }, [voiceMode]);

  const { speak, cancel, isSpeaking, isSupported: ttsSupported } = useSpeechSynthesis({ lang });
  const {
    isListening,
    transcript,
    isSupported: micSupported,
    startListening,
    stopListening,
    error: micError,
  } = useSpeechRecognition({ lang });

  const wasListeningRef = useRef(false);
  const autoStartedRef = useRef(false);
  // Cancels the in-flight help-bot fetch on unmount or when a new question
  // starts -- previously the old request would keep running and race with
  // the new one, so the slow response could overwrite the fast one.
  const fetchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      fetchAbortRef.current?.abort();
    };
  }, []);

  // Auto-start mic on mount if requested and voice mode is on
  useEffect(() => {
    if (autoStartMic && micSupported && voiceMode && !autoStartedRef.current) {
      autoStartedRef.current = true;
      const timer = setTimeout(() => {
        startListening();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoStartMic, micSupported, voiceMode, startListening]);

  // Show live transcript in input while listening
  useEffect(() => {
    if (isListening && transcript) {
      setInputValue(transcript);
    }
  }, [isListening, transcript]);

  // Auto-submit when listening stops (silence timeout or manual)
  useEffect(() => {
    if (wasListeningRef.current && !isListening && inputValue.trim()) {
      handleSubmit(inputValue);
    }
    wasListeningRef.current = isListening;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isListening]);

  // Auto-start mic after bot finishes speaking (only in voice mode)
  useEffect(() => {
    if (voiceMode && micSupported && !isSpeaking && !isListening && !isLoading && messages.length > 1) {
      const timer = setTimeout(() => {
        setInputValue("");
        startListening();
      }, 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpeaking, isLoading, voiceMode]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Stop speech when voice mode is turned off
  useEffect(() => {
    if (!voiceMode && isSpeaking) {
      cancel();
    }
  }, [voiceMode, isSpeaking, cancel]);

  const speakIfVoice = useCallback(
    (text: string) => {
      if (voiceModeRef.current) {
        speak(stripMarkdown(text));
      }
    },
    [speak]
  );

  const handleSubmit = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed || isLoading) return;

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        text: trimmed,
      };

      // Instant local KB match
      const quickMatch = findBestMatch(trimmed);
      const quickBotId = `bot-quick-${Date.now()}`;

      if (quickMatch) {
        const quickMsg: ChatMessage = {
          id: quickBotId,
          role: "assistant",
          text: quickMatch.voiceAnswer,
        };
        setMessages((prev) => [...prev, userMsg, quickMsg]);
        speakIfVoice(quickMatch.voiceAnswer);
      } else {
        setMessages((prev) => [...prev, userMsg]);
      }

      setInputValue("");
      setIsLoading(true);

      // Cancel any previous in-flight question before starting the next one.
      fetchAbortRef.current?.abort();
      const controller = new AbortController();
      fetchAbortRef.current = controller;

      try {
        const res = await fetch("/api/v1/help-bot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          signal: controller.signal,
          body: JSON.stringify({
            message: trimmed,
            lang,
            history: [...messages, userMsg].slice(-10).map((m) => ({
              role: m.role,
              text: m.text,
            })),
          }),
        });

        const data = await res.json();
        const fullAnswer =
          data.answer ?? data.message ?? data.error ?? "Errore nella risposta.";

        if (quickMatch) {
          // Replace quick answer with full AI answer, then speak the new one
          setMessages((prev) =>
            prev.map((m) =>
              m.id === quickBotId ? { ...m, text: fullAnswer } : m
            )
          );
          // Cancel the quick answer speech and speak the full answer
          cancel();
          speakIfVoice(fullAnswer);
        } else {
          const botMsg: ChatMessage = {
            id: `bot-${Date.now()}`,
            role: "assistant",
            text: fullAnswer,
          };
          setMessages((prev) => [...prev, botMsg]);
          speakIfVoice(fullAnswer);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // Superseded by a newer question or unmount -- silently drop.
          return;
        }
        const errorText = "Errore di connessione. Riprova.";
        if (!quickMatch) {
          const errorMsg: ChatMessage = {
            id: `bot-${Date.now()}`,
            role: "assistant",
            text: errorText,
          };
          setMessages((prev) => [...prev, errorMsg]);
        }
        speakIfVoice(errorText);
      } finally {
        if (fetchAbortRef.current === controller) {
          fetchAbortRef.current = null;
        }
        setIsLoading(false);
      }
    },
    [messages, isLoading, speakIfVoice, cancel, lang]
  );

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleSubmit(inputValue);
  }

  function handleTopicClick(topic: string) {
    handleSubmit(topic);
  }

  function handleMicToggle() {
    if (isListening) {
      stopListening();
    } else {
      cancel();
      setInputValue("");
      startListening();
    }
  }

  function handleSpeakMessage(text: string) {
    if (isSpeaking) {
      cancel();
    } else {
      speak(stripMarkdown(text));
    }
  }

  function handleVoiceModeToggle(checked: boolean) {
    setVoiceMode(checked);
    if (!checked) {
      // Stop any ongoing speech and mic when switching to text mode
      cancel();
      if (isListening) stopListening();
    }
  }

  function handleLangChange(value: LangCode | null) {
    if (!value) return;
    const newLang = value;
    setLang(newLang);
    cancel();
    if (isListening) stopListening();
    setMessages([makeWelcomeMessage(newLang)]);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <BotIcon className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Assistente Dia-Storage</h2>
            <p className="text-xs text-muted-foreground">
              Chiedimi qualcosa — scrivi o usa il microfono
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Language selector */}
          <Select value={lang} onValueChange={handleLangChange}>
            <SelectTrigger className="h-8 w-auto gap-1.5 px-2 text-xs">
              <GlobeIcon className="size-3.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l.code} value={l.code}>
                  {l.flag} {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Voice mode toggle */}
          {ttsSupported && (
            <label className="flex cursor-pointer items-center gap-2">
              {voiceMode ? (
                <Volume2Icon className="size-4 text-primary" />
              ) : (
                <VolumeXIcon className="size-4 text-muted-foreground" />
              )}
              <Switch
                checked={voiceMode}
                onCheckedChange={handleVoiceModeToggle}
                aria-label="Modalita vocale"
              />
              <span className="text-xs text-muted-foreground">
                {voiceMode ? "Voce" : "Testo"}
              </span>
            </label>
          )}
          {messages.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => {
                cancel();
                setMessages([makeWelcomeMessage(lang)]);
              }}
              aria-label="Cancella cronologia"
            >
              <Trash2Icon className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="min-h-0 flex-1 px-4">
        <div className="flex flex-col gap-3 py-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              <div
                className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {msg.role === "user" ? (
                  <UserIcon className="size-4" />
                ) : (
                  <BotIcon className="size-4" />
                )}
              </div>
              <div
                className={`group/msg flex max-w-[80%] flex-col gap-1 rounded-xl px-4 py-3 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2 prose-headings:text-sm">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                )}
                {msg.role === "assistant" && msg.id !== "welcome" && (
                  <div className="mt-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSpeakMessage(msg.text)}
                      className="flex items-center gap-1 text-xs text-muted-foreground transition-opacity hover:text-foreground"
                      aria-label="Riascolta"
                    >
                      <Volume2Icon className="size-3" />
                      Riascolta
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(msg.text);
                        setCopiedId(msg.id);
                        setTimeout(() => setCopiedId(null), 2000);
                      }}
                      className="flex items-center gap-1 text-xs text-muted-foreground transition-opacity hover:text-foreground"
                      aria-label="Copia"
                    >
                      {copiedId === msg.id ? (
                        <CheckIcon className="size-3 text-green-600" />
                      ) : (
                        <CopyIcon className="size-3" />
                      )}
                      {copiedId === msg.id ? "Copiato" : "Copia"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <BotIcon className="size-4" />
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                <Loader2Icon className="size-4 animate-spin" />
                Sto pensando...
              </div>
            </div>
          )}

          {/* Suggestion chips */}
          {messages.length <= 1 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {suggestedTopics.map((topic) => (
                <Badge
                  key={topic}
                  variant="outline"
                  className="cursor-pointer px-3 py-1.5 text-sm transition-colors hover:bg-accent"
                  onClick={() => handleTopicClick(topic)}
                >
                  {topic}
                </Badge>
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Listening indicator */}
      {isListening && (
        <div className="flex items-center gap-2 px-4 py-1 text-sm text-emerald-600 dark:text-emerald-400">
          <span className="size-2.5 animate-pulse rounded-full bg-emerald-500" />
          Sto ascoltando...{transcript && ` "${transcript}"`}
        </div>
      )}

      {/* Mic error */}
      {micError && (
        <p className="px-4 py-1 text-xs text-destructive">{micError}</p>
      )}

      {/* Input area */}
      <form
        onSubmit={handleFormSubmit}
        className="flex items-center gap-2 border-t px-4 py-3"
      >
        {micSupported && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={`size-10 shrink-0 ${
              isListening
                ? "animate-pulse border-emerald-500 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 dark:hover:bg-emerald-900"
                : ""
            }`}
            onClick={handleMicToggle}
            aria-label={
              isListening ? "Disattiva microfono" : "Attiva microfono"
            }
          >
            <MicIcon className="size-5" />
          </Button>
        )}
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Scrivi una domanda..."
          disabled={isListening || isLoading}
          className="h-10 flex-1"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!inputValue.trim() || isListening || isLoading}
          className="size-10 shrink-0"
          aria-label="Invia"
        >
          <SendIcon className="size-5" />
        </Button>
      </form>
    </div>
  );
}
