import Image from "next/image";
import { BrowserFrame, PhoneFrame } from "@/components/work/frames";

export function LindenhofDesktop({ compact = false }: { compact?: boolean }) {
  return (
    <BrowserFrame url="lindenhof.nl">
      <div className={compact ? "p-3" : "p-4 md:p-5"}>
        <div className="flex items-center justify-between text-[10px] tracking-[0.16em] text-olive uppercase">
          <span>Lindenhof</span>
          <span className="hidden sm:inline">Locatie · Arrangementen · Contact</span>
        </div>
        <div className={`relative mt-3 overflow-hidden ${compact ? "h-36" : "h-44 md:h-56"}`}>
          <Image src="/images/venue.jpg" alt="" fill className="object-cover" />
          <div className="absolute inset-0 bg-ink/25" />
          <div className="absolute inset-x-4 bottom-4 text-ivory">
            <p className="font-heading text-xl leading-tight md:text-2xl">Een plek met karakter.</p>
            <p className="mt-1 text-[11px] text-ivory/80">Vraag een datum of arrangement aan.</p>
          </div>
        </div>
        {!compact ? (
          <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] text-olive">
            <div className="bg-[#ece7db] px-2 py-2">Tuin & water</div>
            <div className="bg-[#ece7db] px-2 py-2">Diner tot 80</div>
            <div className="bg-[#ece7db] px-2 py-2">Aanvraag</div>
          </div>
        ) : null}
      </div>
    </BrowserFrame>
  );
}

export function LindenhofMobile() {
  return (
    <PhoneFrame>
      <div className="p-3">
        <p className="text-[10px] tracking-[0.18em] text-olive uppercase">Lindenhof</p>
        <div className="relative mt-2 h-28 overflow-hidden">
          <Image src="/images/venue.jpg" alt="" fill className="object-cover" />
        </div>
        <p className="font-heading mt-3 text-lg leading-tight text-ink">Reserveer de locatie.</p>
        <p className="mt-1 text-[11px] leading-4 text-olive">Zes pagina’s. Eén aanvraagroute.</p>
        <div className="mt-3 bg-[#5a604c] px-3 py-2 text-center text-[11px] text-ivory">Stuur een aanvraag</div>
      </div>
    </PhoneFrame>
  );
}

export function QuoteCard() {
  return (
    <article className="border border-stone/50 bg-ivory p-4 shadow-[0_16px_32px_-24px_rgba(18,18,18,0.5)]">
      <p className="text-[10px] tracking-[0.16em] text-olive uppercase">Offerte</p>
      <p className="mt-2 text-sm font-medium text-ink">Arrangement Lindenhof</p>
      <div className="mt-3 space-y-1.5 text-[11px] text-olive">
        <div className="flex justify-between border-b border-stone/40 pb-1">
          <span>Locatie hele dag</span>
          <span>inbegrepen</span>
        </div>
        <div className="flex justify-between border-b border-stone/40 pb-1">
          <span>Diner 60 personen</span>
          <span>op aanvraag</span>
        </div>
        <div className="flex justify-between">
          <span>Styling & ontvangst</span>
          <span>optioneel</span>
        </div>
      </div>
    </article>
  );
}

export function SocialCard({
  brand,
  title,
  image,
}: {
  brand: string;
  title: string;
  image: string;
}) {
  return (
    <article className="overflow-hidden border border-stone/50 bg-ivory">
      <div className="relative h-28">
        <Image src={image} alt="" fill className="object-cover" />
      </div>
      <div className="p-3">
        <p className="text-[10px] tracking-[0.16em] text-olive uppercase">{brand}</p>
        <p className="mt-1 text-sm leading-5 text-ink">{title}</p>
      </div>
    </article>
  );
}

export function ArdeaDesktop({ compact = false }: { compact?: boolean }) {
  return (
    <BrowserFrame url="ardea.studio">
      <div className={compact ? "p-3" : "p-4 md:p-5"}>
        <div className="flex items-center justify-between text-[10px] tracking-[0.16em] text-olive uppercase">
          <span>Ardea</span>
          <span>Advies · Werk · Contact</span>
        </div>
        <div className="mt-4 grid grid-cols-[1.1fr_0.9fr] gap-3">
          <div>
            <p className="font-heading text-xl leading-tight text-ink md:text-2xl">Scherpe keuzes. Rustige uitvoering.</p>
            <p className="mt-2 text-[11px] leading-4 text-olive">Voor teams die hun koers helder naar buiten willen brengen.</p>
          </div>
          <div className={`relative overflow-hidden ${compact ? "h-20" : "h-28"}`}>
            <Image src="/images/evening.jpg" alt="" fill className="object-cover" />
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

export function PresentationCard() {
  return (
    <article className="aspect-[16/10] border border-stone/50 bg-ink p-4 text-ivory">
      <p className="text-[10px] tracking-[0.16em] text-stone uppercase">Presentatie</p>
      <p className="font-heading mt-6 text-2xl leading-tight">Wat we de komende 90 dagen doen.</p>
      <p className="mt-3 text-[11px] text-ivory/65">Ardea · Q3 voorstel</p>
    </article>
  );
}

export function SignatureCard() {
  return (
    <article className="border border-stone/50 bg-ivory p-4">
      <p className="text-[10px] tracking-[0.16em] text-olive uppercase">E-mailhandtekening</p>
      <p className="mt-3 text-sm font-medium text-ink">Eva de Vries</p>
      <p className="text-[12px] text-olive">Adviseur · Ardea</p>
      <p className="mt-2 text-[11px] text-olive">contact@ardea.studio</p>
    </article>
  );
}

export function NoraDesktop({ compact = false }: { compact?: boolean }) {
  return (
    <BrowserFrame url="nora.studio">
      <div className={compact ? "p-3" : "p-4 md:p-5"}>
        <div className="flex items-center justify-between text-[10px] tracking-[0.18em] text-olive uppercase">
          <span>NORA</span>
          <span>Collectie · Verhaal · Atelier</span>
        </div>
        <div className={`relative mt-3 overflow-hidden ${compact ? "h-36" : "h-44 md:h-52"}`}>
          <Image src="/images/house.jpg" alt="" fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/40 to-transparent" />
          <p className="font-heading absolute bottom-4 left-4 text-xl text-ivory">Lichter. Strakker. Herkenbaar.</p>
        </div>
      </div>
    </BrowserFrame>
  );
}

export function BrandRefreshCard() {
  return (
    <article className="border border-stone/50 bg-ivory p-4">
      <p className="text-[10px] tracking-[0.16em] text-olive uppercase">Merkrefresh</p>
      <p className="mt-2 text-sm font-medium text-ink">NORA</p>
      <div className="mt-4 flex gap-2">
        {["#121212", "#f3f0e8", "#5a604c", "#c7663a"].map((color) => (
          <span key={color} className="h-10 flex-1" style={{ background: color }} />
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-4 text-olive">Kleur, typografie en beeldrichting in één compacte set.</p>
    </article>
  );
}

export function FlyerCard() {
  return (
    <article className="border border-stone/50 bg-[#5a604c] p-4 text-ivory">
      <p className="text-[10px] tracking-[0.16em] text-stone uppercase">Flyer</p>
      <p className="font-heading mt-8 text-2xl leading-tight">Nieuwe lijn. Zelfde herkenning.</p>
      <p className="mt-3 text-[11px] text-ivory/75">NORA · seizoensopening</p>
    </article>
  );
}

export function HeroWork() {
  return (
    <div className="relative">
      <LindenhofDesktop />
      <div className="absolute -right-2 -bottom-8 w-[38%] sm:-right-4 sm:w-[34%] lg:-right-6">
        <LindenhofMobile />
      </div>
      <div className="absolute -bottom-10 left-4 hidden w-[42%] md:block">
        <QuoteCard />
      </div>
    </div>
  );
}
