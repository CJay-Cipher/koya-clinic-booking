import { useState } from "react";
import { shortRef } from "../format.js";
import { CopyIcon, CheckIcon } from "./Icons.jsx";

export default function RefChip({ id, tone = "light" }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked: the full id is still in the tooltip */
    }
  }

  const tones = {
    dark: "bg-paper/10 text-paper hover:bg-paper/20",
    light: "bg-primary-light text-primary-dark hover:bg-primary-light/70",
  };

  return (
    <button
      type="button"
      onClick={copy}
      title={`${id} (click to copy)`}
      aria-label={`Copy booking reference ${id}`}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-xs transition ${tones[tone]}`}
    >
      <span>{shortRef(id)}</span>
      {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
    </button>
  );
}
