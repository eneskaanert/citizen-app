import { useState } from "react";
import "./AuthScreen.css";

function AuthScreen({ onLogin }) {
  const [role, setRole] = useState(null);
  const [mode, setMode] = useState("login");

  const [name, setName] = useState("");
  const [tc, setTc] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    if (!role) {
      alert("Lütfen Vatandaş veya Ekip seçin.");
      return;
    }

    const storageKey =
      role === "team" ? "teamUsers" : "citizenUsers";

    const users = JSON.parse(
      localStorage.getItem(storageKey) || "[]"
    );

    // KAYIT
    if (mode === "register") {
      if (role === "citizen") {
        if (!name || !tc || !email || !phone || !password) {
          alert("Lütfen tüm alanları doldurun.");
          return;
        }

        if (tc.length !== 11 || !/^\d+$/.test(tc)) {
          alert("TC Kimlik No 11 haneli olmalıdır.");
          return;
        }
      } else {
        if (!name || !email || !password) {
          alert("Lütfen ad, e-posta ve şifre alanlarını doldurun.");
          return;
        }
      }

      const existingUser = users.find(
        (user) => user.email === email
      );

      if (existingUser) {
        alert("Bu e-posta ile zaten kayıt olunmuş.");
        return;
      }

      const user = {
        id: Date.now(),
        name,
        email,
        password,
        role,
        ...(role === "citizen" && {
          tc,
          phone,
        }),
      };

      localStorage.setItem(
        storageKey,
        JSON.stringify([...users, user])
      );

      localStorage.setItem(
        "citizenSession",
        JSON.stringify(user)
      );

      onLogin(user);
      return;
    }

    // GİRİŞ
    const user = users.find(
      (item) =>
        item.email === email &&
        item.password === password
    );

    if (!user) {
      alert(
        role === "team"
          ? "Ekip e-posta veya şifresi hatalı."
          : "E-posta veya şifre hatalı."
      );
      return;
    }

    const loggedInUser = {
      ...user,
      role,
    };

    localStorage.setItem(
      "citizenSession",
      JSON.stringify(loggedInUser)
    );

    onLogin(loggedInUser);
  }

  function changeRole(selectedRole) {
    setRole(selectedRole);
    setMode("login");

    setName("");
    setTc("");
    setEmail("");
    setPhone("");
    setPassword("");
  }

  // ROL SEÇİMİ
  if (!role) {
    return (
      <div className="auth-page">
        <div className="auth-card">

          <div className="auth-logo">
            ACİL DURUM AI
          </div>

          <span className="auth-label">
            ACİL DURUM AI
          </span>

          <h1>
            Devam etmek için seç
          </h1>

          <p className="auth-description">
            Sisteme hangi kullanıcı olarak giriş yapacağını seç.
          </p>

          <div
            style={{
              display: "grid",
              gap: "12px",
              marginTop: "25px",
            }}
          >
            <button
              type="button"
              className="auth-submit"
              onClick={() => changeRole("citizen")}
            >
              Vatandaş
            </button>

            <button
              type="button"
              className="auth-submit"
              onClick={() => changeRole("team")}
            >
              Ekip
            </button>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">

        <div className="auth-logo">
          ACİL DURUM AI
        </div>

        <span className="auth-label">
          {role === "citizen"
            ? "VATANDAŞ"
            : "ACİL DURUM EKİBİ"}
        </span>

        <h1>
          {mode === "login"
            ? "Hoş geldin"
            : "Hesap oluştur"}
        </h1>

        <p className="auth-description">
          {role === "citizen"
            ? "Vatandaş hesabına giriş yaparak devam et."
            : "Ekip hesabına giriş yaparak operasyon paneline devam et."}
        </p>

        <form onSubmit={handleSubmit}>

          {mode === "register" && (
            <>
              <label>Ad Soyad</label>

              <input
                type="text"
                placeholder="Ad Soyad"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
              />

              {role === "citizen" && (
                <>
                  <label>TC Kimlik No</label>

                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={11}
                    placeholder="11 haneli TC Kimlik No"
                    value={tc}
                    onChange={(e) =>
                      setTc(
                        e.target.value.replace(
                          /\D/g,
                          ""
                        )
                      )
                    }
                  />

                  <label>Telefon</label>

                  <input
                    type="tel"
                    placeholder="05XX XXX XX XX"
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value)
                    }
                  />
                </>
              )}
            </>
          )}

          <label>E-posta</label>

          <input
            type="email"
            placeholder="ornek@mail.com"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
          />

          <label>Şifre</label>

          <input
            type="password"
            placeholder="Şifren"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
          />

          <button
            type="submit"
            className="auth-submit"
          >
            {mode === "login"
              ? "Giriş Yap"
              : "Kayıt Ol"}
          </button>

        </form>

        <div className="auth-switch">

          {mode === "login"
            ? "Hesabın yok mu?"
            : "Zaten hesabın var mı?"}

          <button
            type="button"
            onClick={() =>
              setMode(
                mode === "login"
                  ? "register"
                  : "login"
              )
            }
          >
            {mode === "login"
              ? "Kayıt Ol"
              : "Giriş Yap"}
          </button>

        </div>

        <button
          type="button"
          onClick={() => changeRole(null)}
          style={{
            marginTop: "15px",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            opacity: 0.7,
          }}
        >
          Kullanıcı tipini değiştir
        </button>

      </div>
    </div>
  );
}

export default AuthScreen;