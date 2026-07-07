"use client";

import React, { useEffect, useState } from "react";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
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

const RESEND_COOLDOWN_SECONDS = 60;

function loginErrorMessage(status: number): string {
  if (status === 429) return t("errors.otpTooMany");
  if (status === 400) return t("errors.invalidEmail");
  return t("errors.generic");
}

function verifyErrorMessage(status: number): string {
  if (status === 429) return t("errors.otpTooMany");
  if (status === 400 || status === 401) return t("errors.invalidOtp");
  return t("errors.generic");
}

export default function AccessoPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (step !== "otp" || cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [step, cooldown]);

  async function requestOtp(): Promise<void> {
    const res = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
      credentials: "include",
    });

    if (!res.ok) {
      throw new Error(loginErrorMessage(res.status));
    }
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      await requestOtp();
      setStep("otp");
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("errors.generic")
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    if (loading || cooldown > 0) return;

    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      await requestOtp();
      setOtp("");
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setNotice(t("auth.otpSent"));
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
    setNotice(null);

    try {
      const res = await fetch("/api/v1/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otp }),
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(verifyErrorMessage(res.status));
      }

      window.location.href = "/";
    } catch (err) {
      setOtp("");
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
    setNotice(null);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background bg-[radial-gradient(ellipse_50%_45%_at_50%_42%,color-mix(in_oklab,var(--primary)_10%,transparent),transparent)] p-4">
      <Card className="slide-reveal w-full max-w-md">
        <CardHeader className="text-center">
          <div
            aria-hidden
            className="mx-auto mb-3 w-24 -rotate-3 rounded-sm border bg-card p-1.5 shadow-md"
          >
            <div className="flex aspect-[3/2] items-center justify-center rounded-[2px] bg-primary/85 shadow-inner">
              <ImageIcon className="size-5 text-primary-foreground/90" />
            </div>
            <span className="mt-1 block text-center font-mono text-[10px] tracking-[0.2em] text-muted-foreground/70">
              DIA-0001
            </span>
          </div>
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-muted-foreground">
            Archivio di famiglia · 35 mm
          </p>
          <CardTitle className="text-3xl font-black uppercase tracking-tight">
            Accesso
          </CardTitle>
          <div className="film-sprockets mt-3" aria-hidden />
          <CardDescription>
            {step === "email"
              ? t("auth.loginSubtitle")
              : t("auth.otpSentTo", { email })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          {notice && (
            <div
              role="status"
              className="mb-4 rounded-lg bg-success/10 px-4 py-3 text-sm text-success"
            >
              {notice}
            </div>
          )}

          <div key={step} className="slide-reveal">
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
                <div className="flex flex-col items-center gap-2">
                  <Label htmlFor="otp">{t("auth.enterOtp")}</Label>
                  <InputOTP
                    id="otp"
                    maxLength={6}
                    value={otp}
                    onChange={(value) => setOtp(value.replace(/\D/g, ""))}
                    disabled={loading}
                    autoFocus
                    pattern="[0-9]*"
                    inputMode="numeric"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot
                        index={0}
                        className="size-10 text-lg sm:size-14 sm:text-2xl"
                      />
                      <InputOTPSlot
                        index={1}
                        className="size-10 text-lg sm:size-14 sm:text-2xl"
                      />
                      <InputOTPSlot
                        index={2}
                        className="size-10 text-lg sm:size-14 sm:text-2xl"
                      />
                    </InputOTPGroup>
                    <InputOTPSeparator className="flex items-center max-sm:hidden [&_svg:not([class*='size-'])]:size-4" />
                    <InputOTPGroup>
                      <InputOTPSlot
                        index={3}
                        className="size-10 text-lg sm:size-14 sm:text-2xl"
                      />
                      <InputOTPSlot
                        index={4}
                        className="size-10 text-lg sm:size-14 sm:text-2xl"
                      />
                      <InputOTPSlot
                        index={5}
                        className="size-10 text-lg sm:size-14 sm:text-2xl"
                      />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Button type="submit" disabled={loading || otp.length !== 6}>
                  {loading && <Loader2Icon className="animate-spin" />}
                  {t("auth.verifyOtp")}
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
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResendOtp}
                  disabled={loading || cooldown > 0}
                  className="tabular-nums text-muted-foreground"
                >
                  {cooldown > 0
                    ? t("auth.resendIn", { seconds: cooldown })
                    : t("auth.resendOtp")}
                </Button>
              </form>
            )}
          </div>
        </CardContent>
      </Card>
      <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60">
        Reflecta DigitDia · 35mm
      </p>
    </div>
  );
}
