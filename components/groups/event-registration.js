"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  QrCode,
  Monitor,
  Tablet,
  Download,
  Printer,
  Copy,
  Check,
  Calendar,
  Clock,
  Info,
  ArrowLeft,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useToast } from "@/components/ui/use-toast";
import { MAX_WINDOW_HOURS, formatWindow, validateWindow } from "@/lib/event-registration";
import { RegistrationScreen, useQrCode, useLogo } from "@/components/event-registration/registration-screen";
import { downloadScreenImage } from "@/components/event-registration/screen-image";

// Event registration on the Group page: the header button, the status card,
// the setup / options / other-device dialog, and full screen on this device.

export function useEventRegistration(groupId) {
  const [status, setStatus] = useState(null);
  const refresh = useCallback(async () => {
    const res = await fetch(`/api/groups/${groupId}/registration`);
    if (res.ok) setStatus(await res.json());
  }, [groupId]);
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 30000);
    return () => clearInterval(timer);
  }, [refresh]);
  return [status, setStatus, refresh];
}

const isActive = (status) => status?.state === "scheduled" || status?.state === "open";
const origin = () => (typeof window === "undefined" ? "" : window.location.origin);
const timeOf = (iso) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

export function EventRegistrationButton({ status, onClick }) {
  return (
    <Button variant="outline" onClick={onClick} className="border-primary bg-primary/10 font-semibold hover:bg-primary/20">
      <QrCode className="mr-2 h-4 w-4 text-amber-700" />
      Event Registration
      {status?.state === "open" && (
        <span className="ml-2 flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
          Open
        </span>
      )}
    </Button>
  );
}

// ---------- The dialog: set the time, then choose how to show the code ----------

const pad = (n) => String(n).padStart(2, "0");
const toDateInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toTimeInput = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

function defaultWindow(status) {
  if (isActive(status)) {
    const start = new Date(status.starts_at);
    const end = new Date(status.ends_at);
    return { date: toDateInput(start), start: toTimeInput(start), end: toTimeInput(end) };
  }
  const start = new Date();
  start.setHours(start.getHours() + 1, 0, 0, 0);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  return { date: toDateInput(start), start: toTimeInput(start), end: toTimeInput(end) };
}

function windowFromInputs({ date, start, end }) {
  return {
    starts_at: date && start ? new Date(`${date}T${start}`).toISOString() : null,
    ends_at: date && end ? new Date(`${date}T${end}`).toISOString() : null,
  };
}

function SetupStep({ groupId, groupName, status, onSaved, onCancel }) {
  const [form, setForm] = useState(() => defaultWindow(status));
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState("");

  let requested = null;
  let check = { error: "Enter a date, a start time and an end time" };
  try {
    requested = windowFromInputs(form);
    check = validateWindow(requested);
  } catch {
    // An incomplete date or time; the message above stands.
  }
  const hours = check.error ? null : (check.end - check.start) / 3600000;

  const save = async () => {
    setSaving(true);
    setServerError("");
    try {
      const res = await fetch(`/api/groups/${groupId}/registration`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requested),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Couldn't save the time");
      onSaved(body);
    } catch (e) {
      setServerError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl">Set up event registration</DialogTitle>
        <DialogDescription className="text-[15px]">
          {groupName}. Students can register only during this time. It opens and closes on its own.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-2">
        <Label htmlFor="reg-date">Date</Label>
        <Input id="reg-date" type="date" value={form.date} onChange={set("date")} className="h-12 text-base" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="reg-start">Start time</Label>
          <Input id="reg-start" type="time" value={form.start} onChange={set("start")} className="h-12 text-base" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reg-end">End time</Label>
          <Input id="reg-end" type="time" value={form.end} onChange={set("end")} className="h-12 text-base" />
        </div>
      </div>
      <div
        role="status"
        className={`flex items-center gap-2.5 rounded-lg px-3.5 py-3 text-sm ${
          check.error ? "bg-red-50 text-red-800" : "bg-amber-50 text-muted-foreground"
        }`}
      >
        <Clock className="h-4 w-4 shrink-0 text-amber-700" />
        {serverError ||
          (check.error
            ? check.error
            : `Registration can stay open for up to ${MAX_WINDOW_HOURS} hours. This one is ${
                hours === 1 ? "1 hour" : `${Number(hours.toFixed(2))} hours`
              }.`)}
      </div>
      <div className="flex justify-end gap-2.5 pt-1">
        <Button variant="outline" size="lg" onClick={onCancel}>Cancel</Button>
        <Button size="lg" onClick={save} disabled={Boolean(check.error) || saving} className="font-semibold">
          {saving ? "Saving…" : "Save and continue"}
        </Button>
      </div>
    </>
  );
}

function Tile({ icon: Icon, title, text, onClick, busy }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="flex min-h-[132px] items-start gap-4 rounded-xl border-[1.5px] bg-white p-5 text-left transition-colors hover:border-primary hover:bg-amber-50/60 disabled:opacity-60"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100">
        <Icon className="h-6 w-6 text-amber-800" />
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-[17px] font-semibold leading-snug">{title}</span>
        <span className="text-sm leading-relaxed text-muted-foreground">{busy || text}</span>
      </span>
    </button>
  );
}

function OptionsStep({ status, groupName, onShowHere, onOtherDevice, onDownload, onPrint, onChangeTime, onDone, downloading }) {
  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100">
            <Check className="h-4 w-4 text-emerald-700" strokeWidth={3} />
          </span>
          <DialogTitle className="text-xl">Event registration is set</DialogTitle>
        </div>
        <DialogDescription asChild>
          <div className="flex flex-wrap gap-x-5 gap-y-1 pt-1 text-[15px] text-foreground">
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              {formatWindow(status.starts_at, status.ends_at)}
            </span>
            <span className="text-muted-foreground">{groupName}</span>
          </div>
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <h3 className="text-base font-semibold">How do you want to show the QR code?</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Tile icon={Monitor} title="Show the registration screen on this device" text="Fills this screen. Press Exit when you're done." onClick={onShowHere} />
          <Tile icon={Tablet} title="Show the registration screen on another device" text="Get a link to open on an iPad or another computer." onClick={onOtherDevice} />
          <Tile icon={Download} title="Download the registration screen as an image" text="Saves a picture to show on another screen or post anywhere." onClick={onDownload} busy={downloading ? "Preparing the image…" : null} />
          <Tile icon={Printer} title="Print the registration screen" text="One landscape page to set out on a table." onClick={onPrint} />
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 pt-1">
        <button type="button" onClick={onChangeTime} className="text-sm font-medium text-muted-foreground underline-offset-4 hover:underline">
          Change the date or time
        </button>
        <Button variant="outline" size="lg" onClick={onDone} className="font-semibold">Done</Button>
      </div>
    </>
  );
}

function OtherDeviceStep({ status, onBack, onDone }) {
  const [copied, setCopied] = useState(false);
  const link = `${origin()}${status.screen_path}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 4000);
    } catch {
      // Clipboard blocked: the link is on screen to copy by hand.
    }
  };
  const step = (n) => (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-bold text-background">{n}</span>
  );
  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl">Show the registration screen on another device</DialogTitle>
        <DialogDescription className="text-[15px]">Use this on an iPad, a TV computer, or any other screen at the event.</DialogDescription>
      </DialogHeader>
      <ol className="space-y-3.5">
        <li className="flex items-start gap-3">{step(1)}<span className="pt-0.5 text-base">Copy this link.</span></li>
        <li className="flex flex-col gap-2.5 pl-10">
          <div className="break-all rounded-[10px] border-[1.5px] bg-muted/40 px-4 py-3.5 font-mono text-lg leading-snug">{link}</div>
          <Button size="lg" onClick={copy} className={`h-[52px] text-[17px] font-semibold ${copied ? "bg-emerald-100 text-emerald-900 hover:bg-emerald-100" : ""}`}>
            {copied ? <Check className="mr-2 h-5 w-5" /> : <Copy className="mr-2 h-5 w-5" />}
            {copied ? "Copied" : "Copy link"}
          </Button>
        </li>
        <li className="flex items-start gap-3">{step(2)}<span className="pt-0.5 text-base leading-relaxed">Send it to the other device (text or email it to yourself), or type it into that device&apos;s web browser.</span></li>
        <li className="flex items-start gap-3">{step(3)}<span className="pt-0.5 text-base leading-relaxed">Open the link, then tap <strong className="font-semibold">Full screen</strong>.</span></li>
      </ol>
      <div className="flex items-start gap-2.5 rounded-lg bg-amber-50 px-3.5 py-3 text-sm leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
        No sign-in needed on the other device. It shows only the registration screen, and updates itself when registration opens and closes.
      </div>
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-[15px] font-medium">
          <ArrowLeft className="h-4 w-4" /> Back to options
        </button>
        <Button variant="outline" size="lg" onClick={onDone} className="font-semibold">Done</Button>
      </div>
    </>
  );
}

// Full screen on this device: the whole page goes full screen with the
// registration screen on top. Esc or Exit returns.
function ShowHere({ info, formUrl, logo, onClose }) {
  const qr = useQrCode(formUrl);
  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) onClose();
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, [onClose]);

  const exit = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (document.webkitFullscreenElement) document.webkitExitFullscreen();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100]">
      <RegistrationScreen info={info} qr={qr} logo={logo} />
      <button
        type="button"
        onClick={exit}
        className="absolute right-4 top-4 flex min-h-[44px] items-center gap-2 rounded-lg bg-white/90 px-4 text-[15px] font-semibold text-[#001524] opacity-40 transition-opacity hover:opacity-100 focus:opacity-100"
      >
        <X className="h-4 w-4" /> Exit
      </button>
    </div>
  );
}

export function EventRegistrationFlow({ group, status, setStatus, step, setStep }) {
  const { toast } = useToast();
  const logo = useLogo();
  const [showHere, setShowHere] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const info = status && {
    school_name: group.school_name,
    year: group.year,
    state: status.state,
    starts_at: status.starts_at,
    ends_at: status.ends_at,
  };
  const formUrl = status?.form_path ? `${origin()}${status.form_path}` : null;
  const close = () => setStep(null);

  const goFullScreen = () => {
    const root = document.documentElement;
    const request = root.requestFullscreen || root.webkitRequestFullscreen;
    // Older Safari's webkit version returns nothing rather than a promise.
    if (request) request.call(root)?.catch?.(() => {});
    setStep(null);
    setShowHere(true);
  };

  const download = async () => {
    setDownloading(true);
    try {
      await downloadScreenImage({
        info,
        formUrl,
        logo,
        filename: `${group.name.replace(/[\\/:*?"<>|]+/g, "-")} registration screen.png`,
      });
    } catch {
      toast({ title: "Couldn't make the image", description: "Please try again.", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  const print = () => window.open(`${status.form_path}/print`, "_blank", "noopener");

  return (
    <>
      <Dialog open={Boolean(step)} onOpenChange={(open) => !open && close()}>
        <DialogContent className={step === "options" ? "sm:max-w-[720px]" : "sm:max-w-[600px]"}>
          {step === "setup" && (
            <SetupStep
              groupId={group.id}
              groupName={group.name}
              status={status}
              onSaved={(next) => {
                setStatus(next);
                setStep("options");
              }}
              onCancel={close}
            />
          )}
          {step === "options" && status && (
            <OptionsStep
              status={status}
              groupName={group.name}
              onShowHere={goFullScreen}
              onOtherDevice={() => setStep("other")}
              onDownload={download}
              onPrint={print}
              onChangeTime={() => setStep("setup")}
              onDone={close}
              downloading={downloading}
            />
          )}
          {step === "other" && status && (
            <OtherDeviceStep status={status} onBack={() => setStep("options")} onDone={close} />
          )}
        </DialogContent>
      </Dialog>
      {showHere && info && <ShowHere info={info} formUrl={formUrl} logo={logo} onClose={() => setShowHere(false)} />}
    </>
  );
}

// ---------- The card on the Group page ----------

export function EventRegistrationCard({ groupId, status, setStatus, onShowOptions, onChangeTime }) {
  const { toast } = useToast();
  const [confirm, setConfirm] = useState(null);

  if (!status || (!isActive(status) && !(status.flagged?.length > 0))) return null;

  const act = async (method, path, failure) => {
    const res = await fetch(`/api/groups/${groupId}/registration${path}`, { method });
    if (res.ok) setStatus(await res.json());
    else toast({ title: failure, variant: "destructive" });
  };

  const open = status.state === "open";
  const pill = open
    ? { text: "Open now", className: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-600" }
    : status.state === "scheduled"
      ? { text: "Scheduled", className: "bg-amber-100 text-amber-900", dot: "bg-amber-500" }
      : { text: "Closed", className: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" };

  return (
    <Card className={isActive(status) ? "border-2 border-primary bg-white" : ""}>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2.5">
          <QrCode className="h-5 w-5 text-amber-700" />
          Event Registration
          <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${pill.className}`}>
            <span className={`h-2 w-2 rounded-full ${pill.dot}`} />
            {pill.text}
          </span>
        </CardTitle>
        {status.state !== "scheduled" && (
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{status.registered}</span>
            <span className="text-sm text-muted-foreground">registered {open ? "so far" : "last time"}</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isActive(status) && (
          <>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-[15px]">
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {formatWindow(status.starts_at, status.ends_at)}
              </span>
              <span className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                {open ? `Closes on its own at ${timeOf(status.ends_at)}` : `Opens on its own at ${timeOf(status.starts_at)}`}
              </span>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Button size="lg" onClick={onShowOptions} className="font-semibold">Show options</Button>
              <Button size="lg" variant="outline" onClick={onChangeTime}>Change time</Button>
              <Button size="lg" variant="outline" onClick={() => setConfirm("close")} className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800">
                {open ? "Close early" : "Cancel"}
              </Button>
            </div>
          </>
        )}

        {status.flagged?.length > 0 && (
          <div className="space-y-2 rounded-lg bg-amber-50 p-3.5">
            <div className="text-sm font-semibold">Needs a look</div>
            {status.flagged.map((f) => (
              <div key={f.id} className="flex flex-wrap items-start justify-between gap-2 text-sm">
                <span>
                  {f.person_id ? (
                    <Link href={`/people/${f.person_id}`} className="font-medium underline-offset-4 hover:underline">
                      {f.first_name} {f.last_name}
                    </Link>
                  ) : (
                    "A registrant"
                  )}
                  : {f.needs_review}
                </span>
                <Button size="sm" variant="ghost" onClick={() => act("PATCH", `/entries/${f.id}`, "Couldn't update the note")}>
                  Done
                </Button>
              </div>
            ))}
          </div>
        )}

        {isActive(status) && (
          <div className="border-t pt-3 text-[13px] text-muted-foreground">
            <button type="button" onClick={() => setConfirm("reset")} className="font-semibold text-foreground/70 underline underline-offset-2">
              Reset QR code
            </button>{" "}
            · Only if the code was shared outside the event. Old printouts and links stop working.
          </div>
        )}
      </CardContent>

      <ConfirmDialog
        open={confirm === "close"}
        onOpenChange={() => setConfirm(null)}
        title={open ? "Close registration now?" : "Cancel this registration time?"}
        description={open ? "Students won't be able to register after this." : "The registration time will be cleared. You can set a new one any time."}
        confirmText={open ? "Close registration" : "Cancel it"}
        onConfirm={() => {
          setConfirm(null);
          act("DELETE", "", "Couldn't close registration");
        }}
      />
      <ConfirmDialog
        open={confirm === "reset"}
        onOpenChange={() => setConfirm(null)}
        title="Reset the QR code?"
        description="The group gets a new QR code. Printouts, downloaded images and screen links you already made will stop working, so make new ones."
        confirmText="Reset QR code"
        onConfirm={() => {
          setConfirm(null);
          act("POST", "/reset", "Couldn't reset the QR code");
        }}
      />
    </Card>
  );
}
