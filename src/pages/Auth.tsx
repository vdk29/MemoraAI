import { useState } from "react";
import { Mark, MemorySculpture } from "../components/Identity";
import { ThemeToggle } from "../components/ThemeToggle";
import { db, result } from "../lib/supabase";
export function Auth({ recovery = false }: { recovery?: boolean }) {
  const [mode, setMode] = useState(recovery ? "password" : "login"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <main className="auth">
      <div className="auth-appearance">
        <ThemeToggle />
      </div>
      <div className="auth-story">
        <div className="brand">
          <Mark /> MEMORA
        </div>
        <span className="eyebrow">МЕНЬШЕ ШУМА. БОЛЬШЕ СМЫСЛА.</span>
        <h1>
          Важное
          <br />
          остаётся с вами.
        </h1>
        <p>
          Идеи, планы и близкие люди.
          <br />В одном рабочем пространстве.
        </p>
        <div className="auth-art">
          <MemorySculpture />
        </div>
        <small>
          MEMORA / PERSONAL SPACE
          <br />
          EVERY THOUGHT LEAVES A TRACE.
        </small>
      </div>
      <section className="auth-form">
        <span className="eyebrow">ВАШЕ ЛИЧНОЕ ПРОСТРАНСТВО</span>
        <h2>
          {mode === "login"
            ? "С возвращением"
            : mode === "register"
              ? "Создайте аккаунт"
              : mode === "password"
                ? "Новый пароль"
                : "Восстановить доступ"}
        </h2>
        <p>Рады видеть вас в MEMORA.</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const f = new FormData(e.currentTarget),
              email = String(f.get("email")),
              password = String(f.get("password"));
            try {
              const redirect = new URL(
                import.meta.env.BASE_URL,
                location.origin,
              ).href;
              if (mode === "login")
                await result(db.auth.signInWithPassword({ email, password }));
              else if (mode === "register") {
                const d = await result(
                  db.auth.signUp({
                    email,
                    password,
                    options: { emailRedirectTo: redirect },
                  }),
                );
                if (!d.session)
                  setError("Проверьте почту и подтвердите регистрацию.");
              } else if (mode === "reset") {
                await result(
                  db.auth.resetPasswordForEmail(email, {
                    redirectTo: redirect,
                  }),
                );
                setError("Если аккаунт существует, письмо отправлено.");
              } else {
                await result(db.auth.updateUser({ password }));
                location.hash = "home";
                location.reload();
              }
            } catch (e: any) {
              setError(
                e.message === "Invalid login credentials"
                  ? "Неверный email или пароль."
                  : e.message,
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {mode !== "password" && (
            <label>
              Email
              <input name="email" type="email" autoComplete="email" required />
            </label>
          )}
          {mode !== "reset" && (
            <label>
              Пароль
              <input
                name="password"
                type="password"
                minLength={8}
                required
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
              />
            </label>
          )}
          <button className="primary" disabled={busy}>
            {busy
              ? "Подождите…"
              : mode === "login"
                ? "Войти в MEMORA"
                : mode === "register"
                  ? "Создать аккаунт"
                  : mode === "reset"
                    ? "Отправить письмо"
                    : "Сохранить пароль"}
          </button>
        </form>
        <p role="status">{error}</p>
        <div className="row">
          <button
            onClick={() => setMode(mode === "register" ? "login" : "register")}
          >
            {mode === "register" ? "Уже есть аккаунт" : "Создать аккаунт"}
          </button>
          <button onClick={() => setMode("reset")}>Забыли пароль?</button>
        </div>
      </section>
    </main>
  );
}
