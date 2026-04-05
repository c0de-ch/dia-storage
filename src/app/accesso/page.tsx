"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ImageIcon, Loader2Icon, ArrowLeftIcon } from "lucide-react";

type Step = "email" | "otp";

export default function AccessoPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? t("errors.generic"));
      }

      setStep("otp");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("errors.generic")
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otp }),
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? t("errors.invalidOtp"));
      }

      router.push("/");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("errors.generic")
      );
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    setStep("email");
    setOtp("");
    setError(null);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ImageIcon className="size-6" />
          </div>
          <CardTitle className="text-xl">{t("auth.loginTitle")}</CardTitle>
          <CardDescription>
            {step === "email"
              ? t("auth.loginSubtitle")
              : t("auth.otpSentTo", { email })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {step === "email" ? (
            <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">{t("labels.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("auth.emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  disabled={loading}
                />
              </div>
              <Button type="submit" disabled={loading || !email.trim()}>
                {loading && <Loader2Icon className="animate-spin" />}
                {t("auth.sendOtp")}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="otp">{t("auth.enterOtp")}</Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder={t("auth.otpPlaceholder")}
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  required
                  autoFocus
                  disabled={loading}
                  className="text-center text-lg tracking-[0.5em]"
                />
              </div>
              <Button type="submit" disabled={loading || otp.length !== 6}>
                {loading && <Loader2Icon className="animate-spin" />}
                {t("nav.login")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={handleBack}
                disabled={loading}
              >
                <ArrowLeftIcon />
                {t("auth.changeEmail")}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
