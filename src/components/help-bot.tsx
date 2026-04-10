"use client";

import React, { useState } from "react";
import { MessageCircleQuestionIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { HelpBotChat } from "@/components/help-bot-chat";

export function HelpBot() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating Action Button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
        aria-label="Assistente vocale"
      >
        <MessageCircleQuestionIcon className="size-6" />
      </button>

      {/* Chat Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton
          className="flex h-[90vh] w-[90vw] max-w-none! flex-col overflow-hidden p-0 sm:max-w-none!"
        >
          <DialogTitle className="sr-only">Assistente Dia-Storage</DialogTitle>
          {open && <HelpBotChat autoStartMic />}
        </DialogContent>
      </Dialog>
    </>
  );
}
