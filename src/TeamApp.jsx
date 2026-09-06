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
import "./TeamApp.css";

const API_URL = "http://192.168.31.8:8000";
const DEFAULT_CENTER = [41.0082, 28.9784];
const TEAM_NAME = "Operasyon Ekibi";

function createIcon(priority = "ORTA") {
  const level =
    priority === "KRİTİK"
      ? "critical"
      : priority === "YÜKSEK"
      ? "high"
      : "normal";

  return L.divIcon({
    className: "incident-marker-wrapper",
    html: `<div class="incident-marker ${level}"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function MapFocus({ emergency }) {
  const map = useMap();

  useEffect(() => {
    if (!emergency?.latitude || !emergency?.longitude) return;

    map.flyTo(
      [emergency.latitude, emergency.longitude],
      15,
      { duration: 0.8 }
    );
  }, [emergency, map]);

  return null;
}

function TeamApp() {
  const [emergencies, setEmergencies] = useState([]);
  const [selectedEmergency, setSelectedEmergency] = useState(null);
  const [smsMessages, setSmsMessages] = useState([]);
  const [selectedSMS, setSelectedSMS] = useState(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const time = currentTime.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const date = currentTime.toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const normalizeEvent = (event) => {
    const analysis = event?.analysis || {};

    const location =
      event?.location ||
      analysis?.location ||
      {};

    return {
      ...event,
      id: event?.id ?? event?._id ?? crypto.randomUUID(),
      category:
        event?.category ||
        analysis?.category ||
        event?.service ||
        "Acil Durum",
      priority:
        event?.priority ||
        analysis?.priority ||
        "ORTA",
      confidence:
        event?.confidence ??
        analysis?.confidence ??
        0,
      description:
        event?.description ||
        event?.message ||
        "Açıklama bulunmuyor.",
      recommendation:
        event?.recommendation ||
        analysis?.recommendation ||
        "Ekip değerlendirmesi bekleniyor.",
      detected_keywords:
        event?.detected_keywords ||
        analysis?.detected_keywords ||
        [],
      latitude:
        Number(
          event?.latitude ??
          location?.latitude
        ) || null,
      longitude:
        Number(
          event?.longitude ??
          location?.longitude
        ) || null,
      accuracy:
        Number(
          event?.accuracy ??
          location?.accuracy
        ) || null,
      status: event?.status || "Yeni",
      created_at:
        event?.created_at ||
        event?.createdAt ||
        new Date().toISOString(),
    };
  };

  const fetchEmergencies = async () => {
    try {
      const response = await fetch(`${API_URL}/events`);

      if (!response.ok) {
        throw new Error("Events endpoint hatası");
      }

      const data = await response.json();

      const list = Array.isArray(data)
        ? data
        : data?.events || [];

      const normalized = list
        .map(normalizeEvent)
        .sort(
          (a, b) =>
            new Date(b.created_at) -
            new Date(a.created_at)
        );

      setEmergencies(normalized);

      if (selectedEmergency) {
        const updated = normalized.find(
          (item) => item.id === selectedEmergency.id
        );

        if (updated) {
          setSelectedEmergency(updated);
        }
      }
    } catch (error) {
      console.error("Olaylar alınamadı:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadSMSMessages = async () => {
    try {
      const response = await fetch(
        `${API_URL}/sms/test/history`
      );

      if (!response.ok) return;

      const data = await response.json();

      const list = Array.isArray(data)
        ? data
        : data?.messages || data?.sms || [];

      const normalized = list
        .map((sms, index) => ({
          ...sms,
          id:
            sms?.id ||
            `sms-${index}-${Date.now()}`,
          sender:
            sms?.sender ||
            sms?.name ||
            "Bilinmeyen Gönderici",
          phone:
            sms?.phone ||
            sms?.sender_phone ||
            "-",
          message:
            sms?.message ||
            sms?.text ||
            "",
          service:
            sms?.service ||
            "112",
          priority:
            sms?.priority ||
            "ORTA",
          emergency:
            sms?.emergency ?? false,
          read:
            sms?.read ?? false,
          created_at:
            sms?.created_at ||
            new Date().toISOString(),
        }))
        .reverse();

      setSmsMessages(normalized);

      if (
        selectedSMS &&
        normalized.some(
          (sms) => sms.id === selectedSMS.id
        )
      ) {
        setSelectedSMS(
          normalized.find(
            (sms) => sms.id === selectedSMS.id
          )
        );
      }
    } catch (error) {
      console.error("SMS alınamadı:", error);
    }
  };

  useEffect(() => {
    fetchEmergencies();
    loadSMSMessages();

    const eventTimer = setInterval(
      fetchEmergencies,
      3000
    );

    const smsTimer = setInterval(
      loadSMSMessages,
      3000
    );

    return () => {
      clearInterval(eventTimer);
      clearInterval(smsTimer);
    };
  }, []);

  const stats = useMemo(() => {
    const critical = emergencies.filter(
      (e) => e.priority === "KRİTİK"
    ).length;

    const high = emergencies.filter(
      (e) => e.priority === "YÜKSEK"
    ).length;

    const active = emergencies.filter(
      (e) =>
        e.status !== "Çözüldü" &&
        e.status !== "Tamamlandı"
    ).length;

    const solved = emergencies.filter(
      (e) =>
        e.status === "Çözüldü" ||
        e.status === "Tamamlandı"
    ).length;

    return {
      total: emergencies.length,
      critical,
      high,
      active,
      solved,
    };
  }, [emergencies]);

  const smsStats = useMemo(() => {
    return {
      total: smsMessages.length,
      unread: smsMessages.filter(
        (sms) => !sms.read
      ).length,
      emergency: smsMessages.filter(
        (sms) => sms.emergency
      ).length,
    };
  }, [smsMessages]);

  const filteredEmergencies = useMemo(() => {
    const query = search.trim().toLowerCase();

    return emergencies.filter((event) => {
      const priorityMatch =
        filter === "all" ||
        (filter === "critical" &&
          event.priority === "KRİTİK") ||
        (filter === "high" &&
          event.priority === "YÜKSEK") ||
        (filter === "active" &&
          event.status !== "Çözüldü" &&
          event.status !== "Tamamlandı");

      if (!priorityMatch) return false;

      if (!query) return true;

      return [
        event.description,
        event.category,
        event.status,
        event.priority,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [emergencies, filter, search]);

  const openSMS = (sms) => {
    setSelectedSMS({
      ...sms,
      read: true,
    });

    setSmsMessages((prev) =>
      prev.map((item) =>
        item.id === sms.id
          ? { ...item, read: true }
          : item
      )
    );
  };

  const selectEmergency = (emergency) => {
    setSelectedEmergency(emergency);
  };

  const assignTeam = async (eventId) => {
    setActionLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/events/${eventId}/assign`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            team: TEAM_NAME,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Ekip atanamadı");
      }

      await fetchEmergencies();
    } catch (error) {
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  const updateStatus = async (
    eventId,
    status
  ) => {
    setActionLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/events/${eventId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Durum güncellenemedi"
        );
      }

      await fetchEmergencies();
    } catch (error) {
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  const formatTime = (value) => {
    if (!value) return "--:--";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "--:--";
    }

    return date.toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPriorityClass = (priority) => {
    if (priority === "KRİTİK") return "critical";
    if (priority === "YÜKSEK") return "high";
    return "medium";
  };

  const getStatusClass = (status) => {
    if (
      status === "Çözüldü" ||
      status === "Tamamlandı"
    ) {
      return "solved";
    }

    if (status === "Müdahale Ediliyor") {
      return "working";
    }

    if (status === "Ekip Atandı") {
      return "assigned";
    }

    return "new";
  };

  return (
    <div className="operations-app">

      <header className="operations-header">
        <div className="brand-block">
          <div className="brand-mark">AI</div>

          <div>
            <div className="brand-title">
              ACİL DURUM AI
            </div>

            <div className="brand-subtitle">
              ULUSAL OPERASYON KONSOLU
            </div>
          </div>
        </div>

        <div className="header-center">
          <div className="live-indicator">
            <span />
            CANLI SİSTEM
          </div>

          <div className="header-clock">
            {time}
          </div>

          <div className="header-date">
            {date}
          </div>
        </div>

        <div className="header-actions">
          <div className="system-status">
            <span className="status-dot" />
            <div>
              <strong>SİSTEM AKTİF</strong>
              <small>Backend bağlantısı</small>
            </div>
          </div>

          <button
            className="refresh-button"
            onClick={() => {
              fetchEmergencies();
              loadSMSMessages();
            }}
          >
            YENİLE
          </button>
        </div>
      </header>

      <main className="operations-main">

        <aside className="left-sidebar">

          <div className="panel-title">
            <span>OPERASYON DURUMU</span>
            <span className="panel-code">
              OPS-01
            </span>
          </div>

          <div className="stat-list">

            <div className="stat-item">
              <span>TOPLAM OLAY</span>
              <strong>{stats.total}</strong>
            </div>

            <div className="stat-item critical-stat">
              <span>KRİTİK</span>
              <strong>{stats.critical}</strong>
            </div>

            <div className="stat-item high-stat">
              <span>YÜKSEK ÖNCELİK</span>
              <strong>{stats.high}</strong>
            </div>

            <div className="stat-item">
              <span>AKTİF MÜDAHALE</span>
              <strong>{stats.active}</strong>
            </div>

            <div className="stat-item">
              <span>TAMAMLANAN</span>
              <strong>{stats.solved}</strong>
            </div>

          </div>

          <div className="sidebar-section">

            <div className="section-label">
              OLAY FİLTRESİ
            </div>

            <button
              className={
                filter === "all"
                  ? "filter-button active"
                  : "filter-button"
              }
              onClick={() => setFilter("all")}
            >
              TÜM OLAYLAR
              <span>{stats.total}</span>
            </button>

            <button
              className={
                filter === "critical"
                  ? "filter-button active critical-filter"
                  : "filter-button"
              }
              onClick={() =>
                setFilter("critical")
              }
            >
              KRİTİK
              <span>{stats.critical}</span>
            </button>

            <button
              className={
                filter === "high"
                  ? "filter-button active high-filter"
                  : "filter-button"
              }
              onClick={() =>
                setFilter("high")
              }
            >
              YÜKSEK
              <span>{stats.high}</span>
            </button>

            <button
              className={
                filter === "active"
                  ? "filter-button active"
                  : "filter-button"
              }
              onClick={() =>
                setFilter("active")
              }
            >
              AKTİF
              <span>{stats.active}</span>
            </button>

          </div>

          <div className="sidebar-section">

            <div className="section-label">
              ARAMA
            </div>

            <input
              className="search-input"
              placeholder="Olay ara..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />

          </div>

          <div className="team-status-box">
            <div className="team-status-header">
              <span className="status-dot" />
              EKİP DURUMU
            </div>

            <strong>{TEAM_NAME}</strong>

            <small>
              Operasyon merkezi aktif
            </small>
          </div>

        </aside>

        <section className="map-panel">

          <div className="map-header">
            <div>
              <span className="map-kicker">
                GERÇEK ZAMANLI HARİTA
              </span>

              <h2>
                İSTANBUL OPERASYON HARİTASI
              </h2>
            </div>

            <div className="map-legend">
              <span>
                <i className="legend critical" />
                Kritik
              </span>

              <span>
                <i className="legend high" />
                Yüksek
              </span>

              <span>
                <i className="legend normal" />
                Normal
              </span>
            </div>
          </div>

          <div className="map-container">

            <MapContainer
              center={DEFAULT_CENTER}
              zoom={11}
              scrollWheelZoom
              className="operations-map"
            >

              <TileLayer
                attribution="&copy; OpenStreetMap"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapFocus
                emergency={selectedEmergency}
              />

              {emergencies
                .filter(
                  (event) =>
                    event.latitude &&
                    event.longitude
                )
                .map((event) => (
                  <Marker
                    key={event.id}
                    position={[
                      event.latitude,
                      event.longitude,
                    ]}
                    icon={createIcon(
                      event.priority
                    )}
                    eventHandlers={{
                      click: () =>
                        selectEmergency(event),
                    }}
                  >
                    <Popup>
                      <strong>
                        {event.category}
                      </strong>

                      <br />

                      {event.description}

                      <br />

                      Öncelik:{" "}
                      {event.priority}
                    </Popup>
                  </Marker>
                ))}
            </MapContainer>

            <div className="map-overlay">
              <span>GPS</span>
              <strong>
                {emergencies.filter(
                  (e) =>
                    e.latitude &&
                    e.longitude
                ).length}{" "}
                KONUM
              </strong>
            </div>

          </div>

        </section>

        <aside className="right-sidebar">

          <div className="right-panel">

            <div className="right-panel-header">
              <div>
                <span>AKTİF OLAYLAR</span>
                <small>
                  Son güncellemeler
                </small>
              </div>

              <strong>
                {filteredEmergencies.length}
              </strong>
            </div>

            <div className="incident-feed">

              {loading ? (
                <div className="empty-state">
                  Olaylar yükleniyor...
                </div>
              ) : filteredEmergencies.length ===
                0 ? (
                <div className="empty-state">
                  Gösterilecek olay yok.
                </div>
              ) : (
                filteredEmergencies
                  .slice(0, 12)
                  .map((event) => (
                    <button
                      key={event.id}
                      className={
                        selectedEmergency?.id ===
                        event.id
                          ? "incident-card selected"
                          : "incident-card"
                      }
                      onClick={() =>
                        selectEmergency(event)
                      }
                    >
                      <div className="incident-card-top">
                        <span
                          className={`priority-badge ${getPriorityClass(
                            event.priority
                          )}`}
                        >
                          {event.priority}
                        </span>

                        <span className="incident-time">
                          {formatTime(
                            event.created_at
                          )}
                        </span>
                      </div>

                      <strong>
                        {event.category}
                      </strong>

                      <p>
                        {event.description}
                      </p>

                      <div className="incident-bottom">
                        <span>
                          {event.status}
                        </span>

                        <span>
                          %{Math.round(
                            Number(
                              event.confidence
                            ) > 1
                              ? event.confidence
                              : event.confidence *
                                  100
                          )}
                        </span>
                      </div>
                    </button>
                  ))
              )}

            </div>

          </div>

          <div className="right-panel sms-panel">

            <div className="right-panel-header">

              <div>
                <span>SMS MERKEZİ</span>
                <small>
                  Gelen bildirimler
                </small>
              </div>

              <strong>
                {smsStats.unread}
              </strong>

            </div>

            <div className="sms-summary">
              <div>
                <span>TOPLAM</span>
                <strong>
                  {smsStats.total}
                </strong>
              </div>

              <div>
                <span>ACİL</span>
                <strong>
                  {smsStats.emergency}
                </strong>
              </div>
            </div>

            <div className="sms-list">

              {smsMessages.length === 0 ? (
                <div className="empty-state">
                  Yeni SMS bulunmuyor.
                </div>
              ) : (
                smsMessages
                  .slice(0, 6)
                  .map((sms) => (
                    <button
                      key={sms.id}
                      className={
                        selectedSMS?.id ===
                        sms.id
                          ? "sms-item selected"
                          : "sms-item"
                      }
                      onClick={() =>
                        openSMS(sms)
                      }
                    >
                      <div>
                        <strong>
                          {sms.sender}
                        </strong>

                        {!sms.read && (
                          <span className="unread-dot" />
                        )}
                      </div>

                      <p>
                        {sms.message}
                      </p>

                      <small>
                        {formatTime(
                          sms.created_at
                        )}
                      </small>
                    </button>
                  ))
              )}

            </div>

          </div>

        </aside>

      </main>

      {selectedEmergency && (
        <section className="incident-detail">

          <div className="detail-main">

            <div
              className={`detail-priority ${getPriorityClass(
                selectedEmergency.priority
              )}`}
            >
              {selectedEmergency.priority}
            </div>

            <div className="detail-title">

              <span>
                {selectedEmergency.category}
              </span>

              <h2>
                {selectedEmergency.description}
              </h2>

              <small>
                Olay ID:{" "}
                {selectedEmergency.id}
              </small>

            </div>

          </div>

          <div className="detail-meta">

            <div>
              <span>DURUM</span>
              <strong>
                {selectedEmergency.status}
              </strong>
            </div>

            <div>
              <span>GÜVEN</span>
              <strong>
                %
                {Math.round(
                  Number(
                    selectedEmergency.confidence
                  ) > 1
                    ? selectedEmergency.confidence
                    : selectedEmergency.confidence *
                        100
                )}
              </strong>
            </div>

            <div>
              <span>KONUM</span>
              <strong>
                {selectedEmergency.latitude
                  ? `${selectedEmergency.latitude.toFixed(
                      4
                    )}, ${selectedEmergency.longitude.toFixed(
                      4
                    )}`
                  : "Yok"}
              </strong>
            </div>

          </div>

          <div className="detail-actions">

            <button
              className="action-button assign"
              disabled={actionLoading}
              onClick={() =>
                assignTeam(
                  selectedEmergency.id
                )
              }
            >
              EKİP ATA
            </button>

            <button
              className="action-button working"
              disabled={actionLoading}
              onClick={() =>
                updateStatus(
                  selectedEmergency.id,
                  "Müdahale Ediliyor"
                )
              }
            >
              MÜDAHALE BAŞLAT
            </button>

            <button
              className="action-button solve"
              disabled={actionLoading}
              onClick={() =>
                updateStatus(
                  selectedEmergency.id,
                  "Çözüldü"
                )
              }
            >
              OLAYI ÇÖZ
            </button>

          </div>

        </section>
      )}

      <footer className="operations-footer">
        <span>
          ACİL DURUM AI OPERASYON MERKEZİ
        </span>

        <span>
          Sistem zamanı: {time}
        </span>

        <span>
          {TEAM_NAME}
        </span>
      </footer>

    </div>
  );
}

export default TeamApp;