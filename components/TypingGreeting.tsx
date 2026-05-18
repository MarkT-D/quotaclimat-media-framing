"use client";
import { useEffect, useState } from "react";

const ROLES = ["researcher.", "journalist.", "editor.", "analyst.", "activist."];
const TYPE_MS = 80;
const DELETE_MS = 50;
const PAUSE_MS = 2200;

export default function TypingGreeting({ style }: { style?: React.CSSProperties }) {
  const [text, setText] = useState("reader");
  const [roleIdx, setRoleIdx] = useState(0);
  const [phase, setPhase] = useState<"typing" | "pausing" | "deleting">("pausing");

  useEffect(() => {
    const role = ROLES[roleIdx];
    let t: ReturnType<typeof setTimeout>;

    if (phase === "pausing") {
      t = setTimeout(() => setPhase("deleting"), PAUSE_MS);
    } else if (phase === "deleting") {
      if (text.length === 0) {
        setPhase("typing");
      } else {
        t = setTimeout(() => setText((s) => s.slice(0, -1)), DELETE_MS);
      }
    } else {
      // typing
      if (text.length < role.length) {
        t = setTimeout(() => setText(role.slice(0, text.length + 1)), TYPE_MS);
      } else {
        setRoleIdx((i) => (i + 1) % ROLES.length);
        setPhase("pausing");
      }
    }
    return () => clearTimeout(t);
  }, [text, phase, roleIdx]);

  return (
    <div style={style}>
      Welcome<span style={{ color: "var(--t1)" }}>,</span><br />
      <span>{text || " "}</span>
      <span className="typing-cursor" />
    </div>
  );
}
