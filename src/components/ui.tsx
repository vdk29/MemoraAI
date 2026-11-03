import { useEffect, useState, useRef, type ReactNode } from "react";
import { X, FileText } from "lucide-react";
import { db, result } from "../lib/supabase";
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <FileText size={28} />
      <h3>{title}</h3>
      <p>{children || "Здесь появятся ваши записи."}</p>
    </div>
  );
}
export function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const old = document.activeElement as HTMLElement;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        const els = Array.from(
          document.querySelectorAll<HTMLElement>(
            '[role="dialog"] button,[role="dialog"] input,[role="dialog"] textarea,[role="dialog"] select',
          ),
        );
        const first = els[0],
          last = els.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    document.querySelector<HTMLElement>('[role="dialog"] input')?.focus();
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = overflow;
      old?.focus();
    };
  }, []);
  return (
    <div className="overlay">
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="modal"
      >
        <header>
          <h2>{title}</h2>
          <button aria-label="Закрыть" onClick={close}>
            <X size={20} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
export function Avatar({ profile }: { profile: any }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let alive = true;
    setUrl("");
    if (profile?.avatar_path)
      result(
        db.storage.from("avatars").createSignedUrl(profile.avatar_path, 3600),
      )
        .then((d) => {
          if (alive) setUrl(d?.signedUrl || "");
        })
        .catch(() => {});
    return () => {
      alive = false;
    };
  }, [profile?.avatar_path]);
  return url ? (
    <img className="avatar" src={url} alt="Аватар" loading="lazy" />
  ) : (
    <span className="avatar">{profile?.display_name?.[0] || "М"}</span>
  );
}
