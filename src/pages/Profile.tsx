import { useState } from "react";
import { db, result } from "../lib/supabase";
import { Avatar, Empty } from "../components/ui";
export function Profile({
  profile,
  user,
  run,
  refresh,
  settings = false,
  preferences,
  friends = [],
}: any) {
  const [name, setName] = useState(profile?.display_name || ""),
    [bio, setBio] = useState(profile?.bio || "");
  if (!profile) return <Empty title="Профиль не найден" />;
  const own = user.id === profile.id;
  return (
    <div className="profile-layout">
      <section className="panel profile-card">
        <Avatar profile={profile} />
        <h1>{profile.display_name}</h1>
        <p>{profile.bio || "Здесь пока нет описания."}</p>
        <small>
          В MEMORA с {new Date(profile.created_at).toLocaleDateString("ru-RU")}
        </small>
        {!own && (
          <div>
            <button
              className="primary"
              disabled={
                friends.some((f: any) =>
                  [f.requester_id, f.recipient_id].includes(profile.id),
                ) || !profile.discoverable
              }
              onClick={() =>
                run(async () => {
                  await result(
                    db
                      .from("friendships")
                      .insert({
                        requester_id: user.id,
                        recipient_id: profile.id,
                      }),
                  );
                  await refresh();
                })
              }
            >
              {friends.some((f: any) =>
                [f.requester_id, f.recipient_id].includes(profile.id),
              )
                ? "Вы друзья или заявка отправлена"
                : "Добавить в друзья"}
            </button>
            <a className="button" href="#chats">
              Открыть переписки
            </a>
          </div>
        )}
      </section>
      {own && (
        <section className="panel">
          <h2>{settings ? "Настройки профиля" : "Ваш профиль"}</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                await result(
                  db
                    .from("profiles")
                    .update({ display_name: name.trim(), bio })
                    .eq("id", user.id),
                );
                await refresh();
              });
            }}
          >
            <label>
              Отображаемое имя
              <input
                required
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              О себе
              <textarea
                maxLength={1000}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </label>
            <label>
              Аватар · JPG, PNG, WebP, до 2 МБ
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  run(async () => {
                    if (
                      file.size > 2097152 ||
                      !["image/jpeg", "image/png", "image/webp"].includes(
                        file.type,
                      )
                    )
                      throw Error("Допустимы JPG, PNG, WebP до 2 МБ");
                    const path = `${user.id}/avatar.${file.type.split("/")[1]}`;
                    await result(
                      db.storage
                        .from("avatars")
                        .upload(path, file, { upsert: true }),
                    );
                    await result(
                      db
                        .from("profiles")
                        .update({ avatar_path: path })
                        .eq("id", user.id),
                    );
                    await refresh();
                  });
                }}
              />
            </label>
            <button className="primary">Сохранить профиль</button>
          </form>
          {settings && (
            <>
              <h2>Уведомления</h2>
              {[
                ["notify_messages", "Новые сообщения"],
                ["notify_friends", "Заявки и принятие в друзья"],
              ].map(([key, label]) => (
                <label className="toggle" key={key}>
                  <input
                    type="checkbox"
                    checked={!!preferences?.[key]}
                    onChange={(e) =>
                      run(async () => {
                        await result(
                          db
                            .from("settings")
                            .update({ [key]: e.target.checked })
                            .eq("user_id", user.id),
                        );
                        await refresh();
                      })
                    }
                  />
                  {label}
                </label>
              ))}
              <h2>Конфиденциальность</h2>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={profile.discoverable}
                  onChange={(e) =>
                    run(async () => {
                      await result(
                        db
                          .from("profiles")
                          .update({ discoverable: e.target.checked })
                          .eq("id", user.id),
                      );
                      await refresh();
                    })
                  }
                />
                Показывать в поиске и принимать заявки
              </label>
              <p className="muted">
                Профиль доступен участникам MEMORA. Заметки и события видны
                только вам.
              </p>
              <h2>Аккаунт</h2>
              <p>{user.email}</p>
              <button
                onClick={() =>
                  run(async () => {
                    await result(
                      db.auth.resetPasswordForEmail(user.email, {
                        redirectTo: new URL(
                          import.meta.env.BASE_URL,
                          location.origin,
                        ).href,
                      }),
                    );
                    alert("Письмо для смены пароля отправлено");
                  })
                }
              >
                Изменить пароль
              </button>
              <button
                className="danger"
                onClick={() =>
                  run(async () => {
                    await result(db.auth.signOut());
                  })
                }
              >
                Выйти из аккаунта
              </button>
            </>
          )}
        </section>
      )}
    </div>
  );
}
