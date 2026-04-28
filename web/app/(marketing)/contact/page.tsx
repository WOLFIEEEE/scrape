"use client";
import { useState } from "react";
import { Github, Mail, MessageSquare, type LucideIcon } from "lucide-react";
import { Section } from "@/components/marketing/section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function ContactPage() {
  const [sending, setSending] = useState(false);
  return (
    <>
      <section className="border-b border-line">
        <div className="container mx-auto max-w-6xl px-6 pt-20 pb-12">
          <div className="eyebrow mb-6">/ CORRESPONDENCE</div>
          <h1 className="display text-7xl md:text-9xl leading-[0.85]">
            Reach <span className="text-rust">the bureau.</span>
          </h1>
          <p className="mt-8 text-lg text-muted max-w-xl leading-relaxed">
            Sales, support, partnerships, security disclosure — pick a channel.
          </p>
        </div>
      </section>

      <Section className="py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-px">
            <ContactRow code="ch.01" icon={Mail} title="Email" value="hello@scrape.dev" href="mailto:hello@scrape.dev" />
            <ContactRow code="ch.02" icon={MessageSquare} title="Live chat" value="In-app while you're signed in" />
            <ContactRow code="ch.03" icon={Github} title="GitHub" value="github.com/scrape/scrape" href="https://github.com" />
          </div>
          <form
            className="border border-line p-8 space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              setSending(true);
              setTimeout(() => {
                setSending(false);
                toast.success("Filed. Reply within 1 business day.");
                (e.target as HTMLFormElement).reset();
              }, 600);
            }}
          >
            <div className="eyebrow text-rust">FORM 047 · GENERAL CORRESPONDENCE</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="name" className="eyebrow">Name</Label>
                <Input id="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="eyebrow">Email</Label>
                <Input id="email" type="email" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="topic" className="eyebrow">Topic</Label>
              <select id="topic" className="h-11 w-full bg-transparent border border-line px-3 font-mono text-sm text-fg focus:outline-none focus:border-fg">
                <option>Sales / pricing</option>
                <option>Technical support</option>
                <option>Security disclosure</option>
                <option>Partnership</option>
                <option>Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="message" className="eyebrow">Message</Label>
              <Textarea id="message" rows={5} required />
            </div>
            <Button type="submit" variant="rust" disabled={sending} className="w-full">
              {sending ? "Filing…" : "File correspondence"}
            </Button>
          </form>
        </div>
      </Section>
    </>
  );
}

function ContactRow({ code, icon: Icon, title, value, href }: { code: string; icon: LucideIcon; title: string; value: string; href?: string }) {
  const inner = (
    <div className="border border-line p-6 flex items-start gap-5 hover:bg-bg-2/40 transition-colors">
      <div className="eyebrow text-rust">{code}</div>
      <Icon className="h-5 w-5 text-muted shrink-0 mt-0.5" />
      <div className="flex-1">
        <div className="display-up text-xl">{title}</div>
        <div className="text-sm text-muted mt-1">{value}</div>
      </div>
    </div>
  );
  return href ? <a href={href} target="_blank" rel="noreferrer">{inner}</a> : inner;
}
