"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Check, Clock } from "lucide-react";
import { oswald, jakarta, NAVY, GOLD, TAGLINE, classOf } from "@/components/event-registration/brand";
import { useLogo } from "@/components/event-registration/registration-screen";
import { MAX_PARENTS, formatWindow } from "@/lib/event-registration";

// What a student sees after scanning a group's QR code. Public, phone-first.

const blankPerson = () => ({ first_name: "", last_name: "", email: "", phone: "", instagram_handle: "", facebook_handle: "" });
const heading = { fontFamily: oswald.style.fontFamily };

function Field({ id, label, optional, value, onChange, ...input }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[15px] font-semibold" style={{ color: NAVY }}>
        {label} {optional ? <span className="font-medium text-[#52646c]">(optional)</span> : "*"}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-[52px] w-full rounded-[10px] border-[1.5px] border-[#9aa7ad] bg-white px-3.5 text-[17px] focus:border-[#001524] focus:outline focus:outline-[3px] focus:outline-offset-1 focus:outline-[rgba(198,154,45,0.55)]"
        style={{ color: NAVY }}
        {...input}
      />
    </div>
  );
}

function PersonFields({ prefix, person, onChange, handleHint }) {
  const set = (field) => (value) => onChange({ ...person, [field]: value });
  return (
    <>
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(140px,100%),1fr))]">
        <Field id={`${prefix}-first`} label="First name" value={person.first_name} onChange={set("first_name")} autoComplete={prefix === "s" ? "given-name" : "off"} required />
        <Field id={`${prefix}-last`} label="Last name" value={person.last_name} onChange={set("last_name")} autoComplete={prefix === "s" ? "family-name" : "off"} required />
      </div>
      <Field id={`${prefix}-email`} label="Email" type="email" inputMode="email" value={person.email} onChange={set("email")} autoComplete={prefix === "s" ? "email" : "off"} required />
      <Field id={`${prefix}-phone`} label="Phone" type="tel" inputMode="tel" value={person.phone} onChange={set("phone")} autoComplete={prefix === "s" ? "tel" : "off"} required />
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(140px,100%),1fr))]">
        <Field id={`${prefix}-ig`} label="Instagram" optional value={person.instagram_handle} onChange={set("instagram_handle")} placeholder={handleHint} autoCapitalize="none" />
        <Field id={`${prefix}-fb`} label="Facebook" optional value={person.facebook_handle} onChange={set("facebook_handle")} placeholder="Name or link" autoCapitalize="none" />
      </div>
    </>
  );
}

function Notice({ icon: Icon, title, children }) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-white px-6 pb-8 pt-9 text-center">
      <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full" style={{ background: NAVY }}>
        <Icon className="h-9 w-9" style={{ color: GOLD }} strokeWidth={2.6} />
      </div>
      <h2 className="mt-5 text-[30px] font-semibold uppercase tracking-[0.03em]" style={{ ...heading, color: NAVY }}>{title}</h2>
      <div className="mt-2.5 text-[17px] leading-relaxed text-[#33454e] [text-wrap:balance]">{children}</div>
    </div>
  );
}

export default function EventRegistrationForm() {
  const { code } = useParams();
  const logo = useLogo();
  const [info, setInfo] = useState(null);
  const [missing, setMissing] = useState(false);
  const [student, setStudent] = useState(blankPerson());
  const [parents, setParents] = useState([]);
  const [website, setWebsite] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch(`/api/event/${code}`)
      .then(async (res) => {
        if (res.status === 404) setMissing(true);
        else if (res.ok) setInfo(await res.json());
      })
      .catch(() => setError("Couldn't load the form. Check your connection and try again."));
  }, [code]);

  const reset = () => {
    setStudent(blankPerson());
    setParents([]);
    setError("");
    setDone(false);
    window.scrollTo(0, 0);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/event/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student, parents, website }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setDone(true);
        window.scrollTo(0, 0);
      } else if (res.status === 403) {
        setInfo((prev) => ({ ...prev, ...body }));
      } else {
        setError(body.error || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Couldn't send your registration. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const groupLine = info ? [info.school_name, classOf(info.year)].filter(Boolean).join(", ") : "";

  let body;
  if (missing) {
    body = <Notice icon={Clock} title="Link not found">This registration link isn&apos;t valid. Please see Fight Club leadership.</Notice>;
  } else if (!info) {
    body = error ? <p className="text-center text-[17px] text-[#8a2b2b]">{error}</p> : null;
  } else if (done) {
    body = (
      <Notice icon={Check} title="You're registered">
        Welcome to Fight Club. You&apos;ve been added to the {groupLine} group.
        <div className="mt-7">
          <button type="button" onClick={reset} className="min-h-[52px] rounded-[14px] border-2 bg-white px-5 text-[17px] font-semibold" style={{ borderColor: NAVY, color: NAVY }}>
            Register someone else
          </button>
        </div>
      </Notice>
    );
  } else if (info.state === "scheduled") {
    body = <Notice icon={Clock} title="Registration isn't open yet">It opens {formatWindow(info.starts_at, info.ends_at)}. Scan the code again then.</Notice>;
  } else if (info.state !== "open") {
    body = <Notice icon={Clock} title="Registration is closed">Registration for this event has ended. Please see Fight Club leadership.</Notice>;
  } else {
    body = (
      <form onSubmit={submit} className="flex flex-col gap-7">
        <section className="flex flex-col gap-4 rounded-2xl bg-white px-[18px] pb-6 pt-[22px]">
          <h2 className="text-[22px] font-semibold uppercase tracking-[0.04em]" style={{ ...heading, color: NAVY }}>About you</h2>
          <PersonFields prefix="s" person={student} onChange={setStudent} handleHint="@yourhandle" />
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1 px-0.5">
            <h2 className="text-[22px] font-semibold uppercase tracking-[0.04em]" style={{ ...heading, color: NAVY }}>
              Parents <span className={`${jakarta.className} text-[15px] font-medium normal-case tracking-normal text-[#52646c]`}>(optional)</span>
            </h2>
            <p className="text-[15px] leading-normal text-[#33454e]">Add a parent or guardian. You can add more than one.</p>
          </div>

          {parents.map((parent, i) => (
            <div key={i} className="flex flex-col gap-4 rounded-2xl bg-white px-[18px] pb-[22px] pt-[18px]">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[17px] font-bold" style={{ color: NAVY }}>Parent {i + 1}</h3>
                <button type="button" onClick={() => setParents(parents.filter((_, j) => j !== i))} className="min-h-[44px] rounded-[10px] px-3 text-[15px] font-semibold text-[#8a2b2b]">
                  Remove
                </button>
              </div>
              <PersonFields
                prefix={`p${i + 1}`}
                person={parent}
                onChange={(next) => setParents(parents.map((p, j) => (j === i ? next : p)))}
                handleHint="@theirhandle"
              />
            </div>
          ))}

          {parents.length < MAX_PARENTS && (
            <button type="button" onClick={() => setParents([...parents, blankPerson()])} className="flex min-h-[52px] items-center justify-center gap-2.5 rounded-[14px] border-2 border-dashed border-[#9aa7ad] bg-white text-[17px] font-semibold" style={{ color: NAVY }}>
              <Plus className="h-5 w-5" strokeWidth={2.5} />
              {parents.length === 0 ? "Add a parent" : "Add another parent"}
            </button>
          )}
        </section>

        {/* Only bots see and fill this in. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label htmlFor="website">Website</label>
          <input id="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </div>

        <div className="flex flex-col gap-2.5">
          {error && <p role="alert" className="rounded-[10px] bg-[#fdecec] px-4 py-3 text-[15px] font-medium text-[#8a2b2b]">{error}</p>}
          <button type="submit" disabled={saving} className="min-h-[58px] rounded-[14px] text-[22px] font-semibold uppercase tracking-[0.08em] disabled:opacity-70" style={{ ...heading, background: GOLD, color: NAVY }}>
            {saving ? "Sending…" : "Register"}
          </button>
          <p className="text-center text-sm text-[#52646c]">* Required</p>
        </div>
      </form>
    );
  }

  return (
    <div className={`${jakarta.className} flex min-h-screen flex-col bg-[#f4f2ec]`} style={{ color: NAVY }}>
      <header style={{ background: NAVY }}>
        <div className="mx-auto flex max-w-[560px] flex-col px-5 pb-7 pt-5 text-white">
          {logo && <img src={logo} alt="Fight Club" className="-ml-1.5 h-20 w-[100px] object-cover" />}
          <div className="mt-3.5 text-[15px] font-semibold uppercase tracking-[0.22em]" style={{ ...heading, color: GOLD }}>Event Registration</div>
          {info && (
            <>
              <h1 className="mt-1.5 text-[32px] font-semibold uppercase leading-[1.08] [text-wrap:balance]" style={heading}>{info.school_name}</h1>
              {info.year && <div className="mt-1.5 text-[17px] font-medium text-[#d5d5d5]">{classOf(info.year)}</div>}
            </>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-[560px] flex-1 px-5 pb-10 pt-6">{body}</main>

      <footer className="flex justify-center px-5 py-[22px]" style={{ background: NAVY }}>
        <div className="text-sm font-medium uppercase tracking-[0.3em]" style={{ ...heading, color: GOLD }}>{TAGLINE}</div>
      </footer>
    </div>
  );
}
