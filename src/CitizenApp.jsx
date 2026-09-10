import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";

const API_URL = "https://acil-durum-ai.onrender.com";
const DEFAULT_CENTER = [41.0082, 28.9784];

const emergencyTypes = [
  {
    id: "ambulance",
    label: "Ambulans",
    short: "Sağlık",
    description: "Yaralanma, hastalık, sağlık",
    symbol: "+",
  },
  {
    id: "police",
    label: "Polis",
    short: "Güvenlik",
    description: "Tehdit, kavga, güvenlik",
    symbol: "P",
  },
  {
    id: "fire",
    label: "İtfaiye",
    short: "Yangın",
    description: "Yangın, duman, kurtarma",
    symbol: "İ",
  },
];

function createLocationIcon() {
  return L.divIcon({
    className: "citizen-location-marker",
    html: `<div class="location-marker-core"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function MapCenter({ position }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.setView(position, 15);
    }
  }, [map, position]);

  return null;
}

function CitizenApp() {
  const [activePage, setActivePage] = useState("home");

  const [selectedEmergency, setSelectedEmergency] =
    useState(null);

  const [description, setDescription] = useState("");

  const [position, setPosition] = useState(null);

  const [locationAccuracy, setLocationAccuracy] =
    useState(null);

  const [locationLoading, setLocationLoading] =
    useState(false);

  const [locationError, setLocationError] =
    useState("");

  const [reports, setReports] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("citizenReports") || "[]"
      );
    } catch {
      return [];
    }
  });

  const [offlineEvents, setOfflineEvents] =
    useState(() => {
      try {
        return JSON.parse(
          localStorage.getItem(
            "offlineEmergencyEvents"
          ) || "[]"
        );
      } catch {
        return [];
      }
    });

  const [backendOnline, setBackendOnline] =
    useState(false);

  const [sending, setSending] = useState(false);

  const [message, setMessage] = useState("");

  const user = useMemo(() => {
    try {
      return JSON.parse(
        localStorage.getItem("citizenSession")
      );
    } catch {
      return null;
    }
  }, []);

  const selectedType = emergencyTypes.find(
    (item) => item.id === selectedEmergency
  );

  // =========================================================
  // LOCAL STORAGE
  // =========================================================

  useEffect(() => {
    localStorage.setItem(
      "citizenReports",
      JSON.stringify(reports)
    );
  }, [reports]);

  useEffect(() => {
    localStorage.setItem(
      "offlineEmergencyEvents",
      JSON.stringify(offlineEvents)
    );
  }, [offlineEvents]);

  // =========================================================
  // INITIALIZATION
  // =========================================================

  useEffect(() => {
    getLocation();
    checkBackend();

    const interval = setInterval(
      checkBackend,
      10000
    );

    return () => clearInterval(interval);
  }, []);

  // =========================================================
  // ONLINE / OFFLINE
  // =========================================================

  useEffect(() => {
    const handleOnline = () => {
      checkBackend();
    };

    const handleOffline = () => {
      setBackendOnline(false);
    };

    window.addEventListener(
      "online",
      handleOnline
    );

    window.addEventListener(
      "offline",
      handleOffline
    );

    return () => {
      window.removeEventListener(
        "online",
        handleOnline
      );

      window.removeEventListener(
        "offline",
        handleOffline
      );
    };
  }, []);

  // =========================================================
  // BACKEND CHECK
  // =========================================================

  async function checkBackend() {
    try {
      const response = await fetch(
        `${API_URL}/health`
      );

      setBackendOnline(response.ok);
    } catch {
      setBackendOnline(false);
    }
  }
  
  // =========================================================
  // LOCATION
  // =========================================================

  function getLocation() {
    if (!navigator.geolocation) {
      setLocationError(
        "Bu cihaz konum özelliğini desteklemiyor."
      );
      return;
    }

    setLocationLoading(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      (location) => {
        const {
          latitude,
          longitude,
          accuracy,
        } = location.coords;

        console.log("GPS KONUMU:", {
          latitude,
          longitude,
          accuracy,
        });

        setPosition([
          latitude,
          longitude,
        ]);

        setLocationAccuracy(accuracy);

        setLocationLoading(false);

        if (accuracy > 100) {
          setLocationError(
            `Konum yaklaşık ${Math.round(
              accuracy
            )} metre doğrulukta.`
          );
        } else if (accuracy > 50) {
          setLocationError(
            `Konum yaklaşık ${Math.round(
              accuracy
            )} metre doğrulukta.`
          );
        } else {
          setLocationError("");
        }
      },

      (error) => {
        setLocationLoading(false);

        console.error(
          "KONUM HATASI:",
          error
        );

        if (error.code === 1) {
          setLocationError(
            "Konum izni verilmedi."
          );
        } else if (error.code === 2) {
          setLocationError(
            "Konum belirlenemedi. GPS veya konum servislerini aç."
          );
        } else if (error.code === 3) {
          setLocationError(
            "Konum alınırken zaman aşımı oldu."
          );
        } else {
          setLocationError(
            "Konum alınamadı."
          );
        }
      },

      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0,
      }
    );
  }

  // =========================================================
  // LOCAL ANALYSIS FALLBACK
  // =========================================================

  function analyzeLocally(text) {
    const value = text.toLocaleLowerCase(
      "tr-TR"
    );

    if (
      value.includes("yangın") ||
      value.includes("duman") ||
      value.includes("alev") ||
      value.includes("yanıyor")
    ) {
      return "fire";
    }

    if (
      value.includes("polis") ||
      value.includes("kavga") ||
      value.includes("hırsız") ||
      value.includes("tehdit") ||
      value.includes("saldırı")
    ) {
      return "police";
    }

    if (
      value.includes("bayıldı") ||
      value.includes("baygin") ||
      value.includes("nefes") ||
      value.includes("kanama") ||
      value.includes("yaralı") ||
      value.includes("kalp") ||
      value.includes("ambulans")
    ) {
      return "ambulance";
    }

    return selectedEmergency || "ambulance";
  }

  // =========================================================
  // AI ANALYSIS
  // =========================================================

  async function analyzeEmergency(text) {
    try {
      const response = await fetch(
        `${API_URL}/analyze`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: text,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Analiz başarısız."
        );
      }

      const data = await response.json();

      return {
        type:
          data.type ||
          "GENEL",

        priority:
          data.priority ||
          "DÜŞÜK",

        confidence:
          data.confidence || 0,

        detected_keywords:
          data.detected_keywords || [],

        suggestion:
          data.suggestion || "",
      };
    } catch {
      const localType =
        analyzeLocally(text);

      return {
        type:
          localType === "fire"
            ? "YANGIN"
            : localType === "police"
            ? "GÜVENLİK"
            : localType === "ambulance"
            ? "SAĞLIK"
            : "GENEL",

        priority: "DÜŞÜK",

        confidence: 60,

        detected_keywords: [],

        suggestion:
          "Acil durum açıklaması yerel olarak analiz edildi.",
      };
    }
  }

  // =========================================================
  // OFFLINE EVENT
  // =========================================================

  function saveOfflineEvent(record) {
    setOfflineEvents((previous) => [
      ...previous,
      record,
    ]);
  }

  // =========================================================
  // RESET
  // =========================================================

  function resetEmergency() {
    setDescription("");
    setSelectedEmergency(null);
    setActivePage("home");
  }

  // =========================================================
  // SEND EMERGENCY
  // =========================================================

  async function sendEmergency() {
    if (!description.trim()) {
      setMessage(
        "Lütfen acil durumu kısaca açıklayın."
      );
      return;
    }

    setSending(true);
    setMessage("");

    try {
      // -----------------------------------------------------
      // 1. AI ANALİZ
      // -----------------------------------------------------

      const analysis =
        await analyzeEmergency(
          description.trim()
        );

      // -----------------------------------------------------
      // 2. SERVİS BELİRLE
      // -----------------------------------------------------

      const service =
        selectedEmergency === "ambulance"
          ? "Ambulans"
          : selectedEmergency === "police"
          ? "Polis"
          : selectedEmergency === "fire"
          ? "İtfaiye"
          : "Genel";

      // -----------------------------------------------------
      // 3. LOCAL RECORD
      // -----------------------------------------------------

      const record = {
        id: `report-${Date.now()}`,

        type:
          selectedEmergency ||
          "ambulance",

        selectedType:
          selectedEmergency,

        description:
          description.trim(),

        location: position
          ? {
              latitude:
                position[0],

              longitude:
                position[1],

              accuracy:
                locationAccuracy,
            }
          : null,

        createdAt:
          new Date().toISOString(),

        status: "Yeni",
      };

      // -----------------------------------------------------
      // 4. OFFLINE KONTROLÜ
      // -----------------------------------------------------

      const isOffline =
        !navigator.onLine ||
        !backendOnline;

      if (isOffline) {
        const offlineRecord = {
          ...record,

          id: `offline-${Date.now()}`,

          offline: true,
        };

        saveOfflineEvent(
          offlineRecord
        );

        setReports((previous) => [
          offlineRecord,
          ...previous,
        ]);

        setMessage(
          "Bağlantı yok. Bildirim cihazına kaydedildi."
        );

        resetEmergency();

        return;
      }

      // -----------------------------------------------------
      // 5. GERÇEK EVENT OLUŞTUR
      // -----------------------------------------------------

      const response = await fetch(
        `${API_URL}/events`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            service,

            description:
              description.trim(),

            location: position
              ? {
                  latitude:
                    position[0],

                  longitude:
                    position[1],

                  accuracy:
                    locationAccuracy,
                }
              : null,

            analysis: {
              type:
                analysis.type ||
                "GENEL",

              priority:
                analysis.priority ||
                "DÜŞÜK",

              confidence:
                analysis.confidence ||
                0,

              detected_keywords:
                analysis.detected_keywords ||
                [],

              suggestion:
                analysis.suggestion ||
                "",
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Acil durum backend'e kaydedilemedi."
        );
      }

      // -----------------------------------------------------
      // 6. BACKEND CEVABI
      // -----------------------------------------------------

      const result =
        await response.json();

      console.log(
        "BACKEND'E GÖNDERİLEN OLAY:",
        result.event
      );

      // -----------------------------------------------------
      // 7. GERÇEK EVENT ID İLE LOCAL HISTORY
      // -----------------------------------------------------

      const savedRecord = {
        ...record,

        id:
          result.event?.id ||
          record.id,

        status:
          result.event?.status ||
          "Yeni",

        backendEventId:
          result.event?.id ||
          null,

        analysis: {
          type:
            analysis.type,

          priority:
            analysis.priority,

          confidence:
            analysis.confidence,
        },
      };

      setReports((previous) => [
        savedRecord,
        ...previous,
      ]);

      setMessage(
        "Acil durum bildirimin ekip merkezine gönderildi."
      );

      resetEmergency();

    } catch (error) {
      // -----------------------------------------------------
      // BACKEND HATASI
      // -----------------------------------------------------

      console.error(
        "ACİL DURUM GÖNDERME HATASI:",
        error
      );

      const offlineRecord = {
        id: `offline-${Date.now()}`,

        type:
          selectedEmergency ||
          "ambulance",

        selectedType:
          selectedEmergency,

        description:
          description.trim(),

        location: position
          ? {
              latitude:
                position[0],

              longitude:
                position[1],

              accuracy:
                locationAccuracy,
            }
          : null,

        createdAt:
          new Date().toISOString(),

        status: "Yeni",

        offline: true,
      };

      saveOfflineEvent(
        offlineRecord
      );

      setReports((previous) => [
        offlineRecord,
        ...previous,
      ]);

      setMessage(
        "Sunucuya ulaşılamadı. Bildirim cihazına kaydedildi."
      );

      resetEmergency();

    } finally {
      setSending(false);
    }
  }

  // =========================================================
  // SYNC OFFLINE EVENTS
  // =========================================================

  async function syncOfflineEvents() {
    if (
      !navigator.onLine ||
      !backendOnline ||
      offlineEvents.length === 0
    ) {
      return;
    }

    const remaining = [];

    for (const event of offlineEvents) {
      try {
        // ---------------------------------------------------
        // ANALİZ
        // ---------------------------------------------------

        const analysis =
          await analyzeEmergency(
            event.description
          );

        // ---------------------------------------------------
        // SERVİS
        // ---------------------------------------------------

        const service =
          event.selectedType ===
          "ambulance"
            ? "Ambulans"
            : event.selectedType ===
              "police"
            ? "Polis"
            : event.selectedType ===
              "fire"
            ? "İtfaiye"
            : "Genel";

        // ---------------------------------------------------
        // BACKEND'E GÖNDER
        // ---------------------------------------------------

        const response =
          await fetch(
            `${API_URL}/events`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                service,

                description:
                  event.description,

                location:
                  event.location
                    ? {
                        latitude:
                          event
                            .location
                            .latitude,

                        longitude:
                          event
                            .location
                            .longitude,

                        accuracy:
                          event
                            .location
                            .accuracy ||
                          null,
                      }
                    : null,

                analysis: {
                  type:
                    analysis.type ||
                    "GENEL",

                  priority:
                    analysis.priority ||
                    "DÜŞÜK",

                  confidence:
                    analysis.confidence ||
                    0,

                  detected_keywords:
                    analysis.detected_keywords ||
                    [],

                  suggestion:
                    analysis.suggestion ||
                    "",
                },
              }),
            }
          );

        if (!response.ok) {
          remaining.push(event);
        }

      } catch (error) {
        console.error(
          "Offline olay senkronizasyon hatası:",
          error
        );

        remaining.push(event);
      }
    }

    setOfflineEvents(
      remaining
    );
  }

  // =========================================================
  // AUTO SYNC
  // =========================================================

  useEffect(() => {
    if (
      backendOnline &&
      navigator.onLine
    ) {
      syncOfflineEvents();
    }
  }, [backendOnline]);

  // =========================================================
  // START EMERGENCY
  // =========================================================

  function startEmergency(type) {
    setSelectedEmergency(type);
    setDescription("");
    setMessage("");
    setActivePage("emergency");
  }

  // =========================================================
  // LOGOUT
  // =========================================================

  function logout() {
    localStorage.removeItem(
      "citizenSession"
    );

    window.location.reload();
  }

  // =========================================================
  // HOME
  // =========================================================

  function goHome() {
    setActivePage("home");
    setMessage("");
  }

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="citizen-app">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="citizen-header">

        <div className="header-brand">

          <div className="brand-mark">
            AD
          </div>

          <div>

            <div className="brand-name">
              Acil Durum AI
            </div>

            <div className="brand-user">
              {user?.name?.split(" ")[0] ||
                "Vatandaş"}
            </div>

          </div>

        </div>

        <div
          className={`system-status ${
            backendOnline
              ? "connected"
              : ""
          }`}
        >

          <span />

          {backendOnline
            ? "Sistem aktif"
            : "Çevrimdışı"}

        </div>

      </header>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="citizen-content">

        {/* ===================================================
            HOME
        =================================================== */}

        {activePage === "home" && (
          <section className="home-page">

            <div className="hero-card">

              <div className="hero-content">

                <div className="hero-eyebrow">
                  ACİL DURUM
                </div>

                <h1>
                  Yardıma mı ihtiyacın var?
                </h1>

                <p>
                  En uygun ekibi seç ve
                  durumunu hızlıca bildir.
                </p>

              </div>

              <div className="hero-shape">
                !
              </div>

            </div>

            <div className="section-heading">

              <div>

                <span>
                  HIZLI ERİŞİM
                </span>

                <h2>
                  Yardım ekibi
                </h2>

              </div>

            </div>

            <div className="emergency-grid">

              {emergencyTypes.map(
                (item) => (
                  <button
                    key={item.id}
                    className={`emergency-card ${item.id}`}
                    onClick={() =>
                      startEmergency(
                        item.id
                      )
                    }
                  >

                    <div className="emergency-card-top">

                      <div className="emergency-icon">
                        {item.symbol}
                      </div>

                      <div className="emergency-arrow">
                        →
                      </div>

                    </div>

                    <div className="emergency-info">

                      <strong>
                        {item.label}
                      </strong>

                      <span>
                        {item.description}
                      </span>

                    </div>

                  </button>
                )
              )}

            </div>

            <div className="safety-note">

              <div className="safety-icon">
                i
              </div>

              <div>

                <strong>
                  Acil olmayan durumlarda
                </strong>

                <span>
                  Gereksiz bildirim göndermemeye
                  dikkat et.
                </span>

              </div>

            </div>

            <div className="section-heading location-heading">

              <div>

                <span>
                  KONUM
                </span>

                <h2>
                  Konumun
                </h2>

              </div>

              <button
                className="refresh-location"
                onClick={getLocation}
                disabled={
                  locationLoading
                }
              >
                {locationLoading
                  ? "Alınıyor"
                  : "Yenile"}
              </button>

            </div>

            <div className="map-card">

              <MapContainer
                center={
                  position ||
                  DEFAULT_CENTER
                }
                zoom={
                  position
                    ? 15
                    : 11
                }
                zoomControl={false}
                attributionControl={true}
                style={{
                  width: "100%",
                  height: "215px",
                }}
              >

                <TileLayer
                  attribution="&copy; OpenStreetMap"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {position && (
                  <>
                    <Marker
                      position={position}
                      icon={createLocationIcon()}
                    >

                      <Popup>
                        Mevcut konumun
                        {locationAccuracy
                          ? ` — yaklaşık ${Math.round(
                              locationAccuracy
                            )} m doğruluk`
                          : ""}
                      </Popup>

                    </Marker>

                    <MapCenter
                      position={position}
                    />

                  </>
                )}

              </MapContainer>

              <div className="map-bottom">

                <div className="map-status-icon">
                  ●
                </div>

                <div className="map-status-text">

                  <strong>
                    {position
                      ? "Konum hazır"
                      : "Konum bekleniyor"}
                  </strong>

                  <span>
                    {position
                      ? locationAccuracy
                        ? `Yaklaşık ${Math.round(
                            locationAccuracy
                          )} metre doğruluk.`
                        : "Acil durum bildirimine eklenecek."
                      : locationError ||
                        "Konum izni gerekli."}
                  </span>

                </div>

              </div>

            </div>

            {offlineEvents.length > 0 && (
              <div className="offline-card">

                <div className="offline-count">
                  {offlineEvents.length}
                </div>

                <div>

                  <strong>
                    Bekleyen bildirim
                  </strong>

                  <span>
                    Bağlantı geldiğinde
                    otomatik gönderilecek.
                  </span>

                </div>

              </div>
            )}

            {message && (
              <div className="message-box">
                {message}
              </div>
            )}

          </section>
        )}

        {/* ===================================================
            EMERGENCY
        =================================================== */}

        {activePage === "emergency" && (
          <section className="emergency-page">

            <button
              className="back-button"
              onClick={goHome}
            >
              <span>
                ←
              </span>

              Ana sayfa
            </button>

            <div className="emergency-title">

              <span>
                ACİL DURUM BİLDİRİMİ
              </span>

              <h1>
                Ne oldu?
              </h1>

              <p>
                Durumu kısa ve anlaşılır
                şekilde anlat.
              </p>

            </div>

            {selectedType && (
              <div
                className={`selected-emergency ${selectedType.id}`}
              >

                <div className="selected-emergency-icon">
                  {selectedType.symbol}
                </div>

                <div>

                  <span>
                    Yardım ekibi
                  </span>

                  <strong>
                    {selectedType.label}
                  </strong>

                </div>

                <button
                  onClick={() =>
                    setActivePage(
                      "home"
                    )
                  }
                >
                  Değiştir
                </button>

              </div>
            )}

            <div className="description-block">

              <label>
                Olayı anlat
              </label>

              <textarea
                value={description}
                onChange={(event) =>
                  setDescription(
                    event.target.value
                  )
                }
                placeholder="Örneğin: Evimizin mutfağında yangın çıktı..."
                rows={7}
                maxLength={500}
              />

              <div className="character-count">
                {description.length}/500
              </div>

            </div>

            <div className="emergency-location-card">

              <div className="emergency-location-icon">
                ●
              </div>

              <div>

                <strong>
                  Konum bilgisi
                </strong>

                <span>
                  {position
                    ? locationAccuracy
                      ? `Konum bildirime eklenecek. Yaklaşık ${Math.round(
                          locationAccuracy
                        )} metre doğruluk.`
                      : "Mevcut konumun bildirime eklenecek."
                    : "Konum bilgisi alınamadı."}
                </span>

              </div>

            </div>

            {message && (
              <div className="message-box">
                {message}
              </div>
            )}

            <button
              className="send-emergency-button"
              disabled={sending}
              onClick={
                sendEmergency
              }
            >

              <span>
                {sending
                  ? "Gönderiliyor..."
                  : "ACİL DURUMU GÖNDER"}
              </span>

              {!sending && (
                <span className="send-arrow">
                  →
                </span>
              )}

            </button>

            <p className="emergency-disclaimer">
              Bildirim göndermeden önce
              bilgilerin doğru olduğundan emin ol.
            </p>

          </section>
        )}

        {/* ===================================================
            HISTORY
        =================================================== */}

        {activePage === "history" && (
          <section className="history-page">

            <div className="page-title">

              <span>
                BİLDİRİMLER
              </span>

              <h1>
                Geçmiş
              </h1>

              <p>
                Daha önce gönderdiğin
                bildirimler.
              </p>

            </div>

            {reports.length === 0 ? (
              <div className="empty-state">

                <div className="empty-icon">
                  —
                </div>

                <h3>
                  Henüz bildirim yok
                </h3>

                <p>
                  Gönderdiğin acil durumlar
                  burada görünecek.
                </p>

              </div>
            ) : (
              <div className="reports-list">

                {reports.map(
                  (report) => (
                    <div
                      className="report-card"
                      key={report.id}
                    >

                      <div className="report-card-header">

                        <div
                          className={`report-type-icon ${report.type}`}
                        >
                          {report.type ===
                          "fire"
                            ? "İ"
                            : report.type ===
                              "police"
                            ? "P"
                            : "+"}
                        </div>

                        <div className="report-card-title">

                          <strong>
                            {report.type ===
                            "fire"
                              ? "İtfaiye"
                              : report.type ===
                                "police"
                              ? "Polis"
                              : "Ambulans"}
                          </strong>

                          <span>
                            {new Date(
                              report.createdAt
                            ).toLocaleString(
                              "tr-TR"
                            )}
                          </span>

                        </div>

                        <div
                          className={`report-status ${
                            report.offline
                              ? "waiting"
                              : "new"
                          }`}
                        >
                          {report.offline
                            ? "Bekliyor"
                            : report.status}
                        </div>

                      </div>

                      <p>
                        {report.description}
                      </p>

                    </div>
                  )
                )}

              </div>
            )}

          </section>
        )}

        {/* ===================================================
            PROFILE
        =================================================== */}

        {activePage === "profile" && (
          <section className="profile-page">

            <div className="page-title">

              <span>
                HESAP
              </span>

              <h1>
                Profil
              </h1>

              <p>
                Hesap bilgilerin.
              </p>

            </div>

            <div className="profile-card">

              <div className="profile-avatar">
                {(user?.name ||
                  "V")
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <h2>
                {user?.name ||
                  "Vatandaş"}
              </h2>

              <span className="profile-role">
                Vatandaş hesabı
              </span>

              <div className="profile-details">

                <div>

                  <span>
                    E-posta
                  </span>

                  <strong>
                    {user?.email ||
                      "-"}
                  </strong>

                </div>

                <div>

                  <span>
                    Telefon
                  </span>

                  <strong>
                    {user?.phone ||
                      "-"}
                  </strong>

                </div>

              </div>

            </div>

            <button
              className="logout-button"
              onClick={logout}
            >
              Çıkış Yap
            </button>

          </section>
        )}

      </main>

      {/* =====================================================
          BOTTOM NAVIGATION
      ===================================================== */}

      <nav className="bottom-navigation">

        <button
          className={
            activePage === "home"
              ? "active"
              : ""
          }
          onClick={() =>
            setActivePage(
              "home"
            )
          }
        >

          <span className="nav-icon">
            ⌂
          </span>

          <small>
            Ana Sayfa
          </small>

        </button>

        <button
          className={
            activePage === "history"
              ? "active"
              : ""
          }
          onClick={() =>
            setActivePage(
              "history"
            )
          }
        >

          <span className="nav-icon">
            ≡
          </span>

          <small>
            Geçmiş
          </small>

        </button>

        <button
          className={
            activePage === "profile"
              ? "active"
              : ""
          }
          onClick={() =>
            setActivePage(
              "profile"
            )
          }
        >

          <span className="nav-icon">
            ○
          </span>

          <small>
            Profil
          </small>

        </button>

      </nav>

    </div>
  );
}

export default CitizenApp;