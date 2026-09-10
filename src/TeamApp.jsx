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

const API_URL = "https://acil-durum-ai.onrender.com";

const DEFAULT_CENTER = [41.0082, 28.9784];
const TEAM_NAME = "OPERASYON EKİBİ";

const TEAMS = [
  {
    id: "ambulance-01",
    name: "Ambulans Ekibi 01",
    type: "SAĞLIK",
    status: "Müsait",
  },
  {
    id: "ambulance-02",
    name: "Ambulans Ekibi 02",
    type: "SAĞLIK",
    status: "Müsait",
  },
  {
    id: "police-01",
    name: "Polis Ekibi 01",
    type: "GÜVENLİK",
    status: "Müsait",
  },
  {
    id: "police-02",
    name: "Polis Ekibi 02",
    type: "GÜVENLİK",
    status: "Müsait",
  },
  {
    id: "fire-01",
    name: "İtfaiye Ekibi 01",
    type: "YANGIN",
    status: "Müsait",
  },
  {
    id: "fire-02",
    name: "İtfaiye Ekibi 02",
    type: "YANGIN",
    status: "Müsait",
  },
  {
    id: "operation-01",
    name: "Operasyon Ekibi 01",
    type: "GENEL",
    status: "Müsait",
  },
];

function normalizeEvent(event) {
  return {
    ...event,

    id: event?.id ?? "",
    service: event?.service ?? "GENEL",
    category:
      event?.category ??
      event?.type ??
      "GENEL",

    priority:
      event?.priority ??
      "DÜŞÜK",

    confidence:
      Number(event?.confidence ?? 0),

    description:
      event?.description ??
      event?.message ??
      "Açıklama yok.",

    recommendation:
      event?.recommendation ??
      event?.suggestion ??
      "Öneri bulunmuyor.",

    detected_keywords:
      Array.isArray(event?.detected_keywords)
        ? event.detected_keywords
        : [],

    latitude:
      event?.latitude ??
      event?.location?.latitude ??
      null,

    longitude:
      event?.longitude ??
      event?.location?.longitude ??
      null,

    accuracy:
      event?.accuracy ??
      event?.location?.accuracy ??
      null,

    status:
      event?.status ??
      "Yeni",

    team:
      event?.team ??
      null,

    created_at:
      event?.created_at ??
      null,

    updated_at:
      event?.updated_at ??
      null,
  };
}

function getPriorityClass(priority) {
  if (priority === "KRİTİK") return "critical";
  if (priority === "YÜKSEK") return "high";
  return "normal";
}

function formatDate(date) {
  if (!date) return "-";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function createMarkerIcon(priority, selected = false) {
  const priorityClass =
    getPriorityClass(priority);

  return L.divIcon({
    className: "custom-event-marker-wrapper",
    html: `
      <div class="custom-event-marker ${priorityClass} ${
        selected ? "selected" : ""
      }">
        <span></span>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
}

function MapFocus({ event }) {
  const map = useMap();

  useEffect(() => {
    if (
      event &&
      event.latitude != null &&
      event.longitude != null
    ) {
      map.flyTo(
        [event.latitude, event.longitude],
        14,
        {
          duration: 0.8,
        }
      );
    }
  }, [event, map]);

  return null;
}

export default function TeamApp() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [backendOnline, setBackendOnline] =
    useState(false);

  const [activeFilter, setActiveFilter] =
    useState("TÜMÜ");

  const [search, setSearch] =
    useState("");

  const [teamModalOpen, setTeamModalOpen] =
    useState(false);

  const [selectedTeam, setSelectedTeam] =
    useState(null);

  async function fetchEvents() {
    try {
      const response = await fetch(
        `${API_URL}/events`
      );

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}`
        );
      }

      const data = await response.json();

      const incomingEvents =
        Array.isArray(data)
          ? data
          : data?.events ?? [];

      const normalized =
        incomingEvents.map(normalizeEvent);

      setEvents(normalized);
      setBackendOnline(true);

      setSelectedEvent((current) => {
        if (!current) return null;

        const updated = normalized.find(
          (event) =>
            event.id === current.id
        );

        return updated ?? current;
      });
    } catch (error) {
      console.error(
        "Olaylar alınamadı:",
        error
      );

      setBackendOnline(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEvents();

    const timer = setInterval(
      fetchEvents,
      3000
    );

    return () => {
      clearInterval(timer);
    };
  }, []);

  const stats = useMemo(() => {
    return {
      total: events.length,

      critical: events.filter(
        (event) =>
          event.priority === "KRİTİK"
      ).length,

      high: events.filter(
        (event) =>
          event.priority === "YÜKSEK"
      ).length,

      new: events.filter(
        (event) =>
          event.status === "Yeni"
      ).length,

      assigned: events.filter(
        (event) =>
          event.status ===
          "Ekip Atandı"
      ).length,

      intervention: events.filter(
        (event) =>
          event.status ===
          "Müdahale Ediliyor"
      ).length,

      resolved: events.filter(
        (event) =>
          event.status === "Çözüldü" ||
          event.status ===
            "Tamamlandı"
      ).length,
    };
  }, [events]);

  const filteredEvents = useMemo(() => {
    let result = [...events];

    if (activeFilter !== "TÜMÜ") {
      result = result.filter(
        (event) =>
          event.priority === activeFilter
      );
    }

    const query =
      search.trim().toLowerCase();

    if (query) {
      result = result.filter((event) => {
        const text = [
          event.id,
          event.description,
          event.category,
          event.service,
          event.team,
          event.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return text.includes(query);
      });
    }

    return result;
  }, [
    events,
    activeFilter,
    search,
  ]);

  function selectEvent(event) {
    setSelectedEvent(event);
  }

  function openTeamAssignment() {
    if (!selectedEvent) return;

    setSelectedTeam(null);
    setTeamModalOpen(true);
  }

  async function assignTeam() {
    if (
      !selectedEvent ||
      !selectedTeam
    ) {
      return;
    }

    setActionLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/events/${selectedEvent.id}/assign`,
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            team: selectedTeam.name,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            "Ekip atanamadı."
        );
      }

      const updatedEvent =
        normalizeEvent(
          data?.event
        );

      setEvents((current) =>
        current.map((event) =>
          event.id === updatedEvent.id
            ? updatedEvent
            : event
        )
      );

      setSelectedEvent(
        updatedEvent
      );

      setTeamModalOpen(false);
      setSelectedTeam(null);

      await fetchEvents();
    } catch (error) {
      console.error(
        "Ekip atama hatası:",
        error
      );

      alert(
        error?.message ||
          "Ekip atanırken hata oluştu."
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function updateStatus(
    newStatus
  ) {
    if (!selectedEvent) return;

    setActionLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/events/${selectedEvent.id}`,
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            status: newStatus,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            "Durum güncellenemedi."
        );
      }

      const updatedEvent =
        normalizeEvent(
          data?.event
        );

      setEvents((current) =>
        current.map((event) =>
          event.id === updatedEvent.id
            ? updatedEvent
            : event
        )
      );

      setSelectedEvent(
        updatedEvent
      );
    } catch (error) {
      console.error(
        "Durum güncelleme hatası:",
        error
      );

      alert(
        error?.message ||
          "Durum güncellenirken hata oluştu."
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function deleteEvent() {
    if (!selectedEvent) return;

    const confirmed =
      window.confirm(
        "Bu olayı silmek istediğine emin misin?"
      );

    if (!confirmed) return;

    setActionLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/events/${selectedEvent.id}`,
        {
          method: "DELETE",
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            "Olay silinemedi."
        );
      }

      setEvents((current) =>
        current.filter(
          (event) =>
            event.id !==
            selectedEvent.id
        )
      );

      setSelectedEvent(null);
    } catch (error) {
      console.error(
        "Olay silme hatası:",
        error
      );

      alert(
        error?.message ||
          "Olay silinirken hata oluştu."
      );
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="team-app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            AI
          </div>

          <div>
            <div className="brand-title">
              ACİL DURUM AI
            </div>

            <div className="brand-subtitle">
              OPERASYON MERKEZİ
            </div>
          </div>
        </div>

        <div className="topbar-center">
          <div className="system-name">
            {TEAM_NAME}
          </div>

          <div
            className={`connection-status ${
              backendOnline
                ? "online"
                : "offline"
            }`}
          >
            <span className="connection-dot" />
            {backendOnline
              ? "SİSTEM AKTİF"
              : "BAĞLANTI YOK"}
          </div>
        </div>

        <div className="topbar-right">
          <div className="clock">
            {new Date().toLocaleTimeString(
              "tr-TR",
              {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              }
            )}
          </div>
        </div>
      </header>

      <main className="workspace">
        <aside className="left-panel">
          <section className="panel-section">
            <div className="section-title">
              OPERASYON
            </div>

            <div className="stat-main">
              <span>AKTİF OLAY</span>
              <strong>
                {stats.total}
              </strong>
            </div>

            <div className="stat-grid">
              <button
                className={`mini-stat critical ${
                  activeFilter ===
                  "KRİTİK"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setActiveFilter(
                    activeFilter ===
                      "KRİTİK"
                      ? "TÜMÜ"
                      : "KRİTİK"
                  )
                }
              >
                <span>KRİTİK</span>
                <strong>
                  {stats.critical}
                </strong>
              </button>

              <button
                className={`mini-stat high ${
                  activeFilter ===
                  "YÜKSEK"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setActiveFilter(
                    activeFilter ===
                      "YÜKSEK"
                      ? "TÜMÜ"
                      : "YÜKSEK"
                  )
                }
              >
                <span>YÜKSEK</span>
                <strong>
                  {stats.high}
                </strong>
              </button>

              <button
                className="mini-stat"
                onClick={() =>
                  setActiveFilter(
                    activeFilter === "TÜMÜ"
                      ? "DÜŞÜK"
                      : "TÜMÜ"
                  )
                }
              >
                <span>YENİ</span>
                <strong>
                  {stats.new}
                </strong>
              </button>

              <div className="mini-stat">
                <span>ATANAN</span>
                <strong>
                  {stats.assigned}
                </strong>
              </div>
            </div>
          </section>

          <section className="panel-section">
            <div className="section-title">
              FİLTRE
            </div>

            <div className="filter-list">
              {[
                "TÜMÜ",
                "KRİTİK",
                "YÜKSEK",
                "DÜŞÜK",
              ].map((filter) => (
                <button
                  key={filter}
                  className={`filter-button ${
                    activeFilter === filter
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    setActiveFilter(
                      filter
                    )
                  }
                >
                  <span>
                    {filter}
                  </span>

                  <span>
                    {filter === "TÜMÜ"
                      ? stats.total
                      : filter ===
                        "KRİTİK"
                      ? stats.critical
                      : filter ===
                        "YÜKSEK"
                      ? stats.high
                      : events.filter(
                          (event) =>
                            event.priority ===
                            "DÜŞÜK"
                        ).length}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="panel-section">
            <div className="section-title">
              DURUM
            </div>

            <div className="status-line">
              <span>Yeni</span>
              <strong>
                {stats.new}
              </strong>
            </div>

            <div className="status-line">
              <span>Ekip Atandı</span>
              <strong>
                {stats.assigned}
              </strong>
            </div>

            <div className="status-line">
              <span>Müdahale</span>
              <strong>
                {stats.intervention}
              </strong>
            </div>

            <div className="status-line">
              <span>Çözüldü</span>
              <strong>
                {stats.resolved}
              </strong>
            </div>
          </section>

          <section className="panel-section search-section">
            <div className="section-title">
              OLAY ARA
            </div>

            <input
              className="search-input"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="ID, açıklama, ekip..."
            />
          </section>
        </aside>

        <section className="map-section">
          <div className="map-toolbar">
            <div>
              <strong>
                İSTANBUL CANLI HARİTA
              </strong>

              <span>
                {filteredEvents.length} olay
              </span>
            </div>

            <div className="map-live">
              <span className="live-dot" />
              CANLI
            </div>
          </div>

          <MapContainer
            center={DEFAULT_CENTER}
            zoom={11}
            className="main-map"
          >
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapFocus
              event={selectedEvent}
            />

            {filteredEvents.map(
              (event) => {
                if (
                  event.latitude ==
                    null ||
                  event.longitude ==
                    null
                ) {
                  return null;
                }

                const isSelected =
                  selectedEvent?.id ===
                  event.id;

                return (
                  <Marker
                    key={event.id}
                    position={[
                      event.latitude,
                      event.longitude,
                    ]}
                    icon={createMarkerIcon(
                      event.priority,
                      isSelected
                    )}
                    eventHandlers={{
                      click: () =>
                        selectEvent(
                          event
                        ),
                    }}
                  >
                    <Popup>
                      <div className="popup-content">
                        <strong>
                          {event.category}
                        </strong>

                        <div>
                          {event.description}
                        </div>

                        <small>
                          {event.id}
                        </small>
                      </div>
                    </Popup>
                  </Marker>
                );
              }
            )}
          </MapContainer>

          <div className="map-legend">
            <div>
              <span className="legend-dot critical" />
              KRİTİK
            </div>

            <div>
              <span className="legend-dot high" />
              YÜKSEK
            </div>

            <div>
              <span className="legend-dot normal" />
              NORMAL
            </div>
          </div>

          <div className="map-info">
            <div>
              LAT:{" "}
              {selectedEvent?.latitude
                ?.toFixed(5) ?? "-"}
            </div>

            <div>
              LNG:{" "}
              {selectedEvent?.longitude
                ?.toFixed(5) ?? "-"}
            </div>
          </div>
        </section>

        <aside className="right-panel">
          <div className="events-header">
            <div>
              <div className="section-title">
                AKTİF OLAYLAR
              </div>

              <div className="events-count">
                {filteredEvents.length} olay
              </div>
            </div>
          </div>

          <div className="events-list">
            {loading ? (
              <div className="empty-state">
                Olaylar yükleniyor...
              </div>
            ) : filteredEvents.length ===
              0 ? (
              <div className="empty-state">
                Aktif olay bulunmuyor.
              </div>
            ) : (
              filteredEvents.map(
                (event) => {
                  const priorityClass =
                    getPriorityClass(
                      event.priority
                    );

                  const selected =
                    selectedEvent?.id ===
                    event.id;

                  return (
                    <button
                      key={event.id}
                      className={`event-card ${priorityClass} ${
                        selected
                          ? "selected"
                          : ""
                      }`}
                      onClick={() =>
                        selectEvent(
                          event
                        )
                      }
                    >
                      <div className="event-card-top">
                        <div className="event-priority">
                          <span
                            className={`priority-dot ${priorityClass}`}
                          />

                          {event.priority}
                        </div>

                        <div className="event-time">
                          {formatDate(
                            event.created_at
                          )}
                        </div>
                      </div>

                      <div className="event-card-title">
                        {event.category}
                      </div>

                      <div className="event-card-description">
                        {event.description}
                      </div>

                      <div className="event-card-bottom">
                        <span>
                          {event.id}
                        </span>

                        <span>
                          {event.status}
                        </span>
                      </div>

                      {event.team && (
                        <div className="event-team">
                          EKİP:{" "}
                          {event.team}
                        </div>
                      )}
                    </button>
                  );
                }
              )
            )}
          </div>
        </aside>
      </main>

      {teamModalOpen &&
        selectedEvent && (
          <div
            className="team-modal-overlay"
            onClick={() =>
              !actionLoading &&
              setTeamModalOpen(false)
            }
          >
            <div
              className="team-modal"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <div className="team-modal-header">
                <div>
                  <div className="section-title">
                    EKİP ATA
                  </div>

                  <h2>
                    Müdahale ekibi seç
                  </h2>
                </div>

                <button
                  className="modal-close"
                  onClick={() =>
                    setTeamModalOpen(false)
                  }
                  disabled={actionLoading}
                >
                  ×
                </button>
              </div>

              <div className="team-modal-event">
                <div>
                  <span>OLAY</span>
                  <strong>
                    {selectedEvent.id}
                  </strong>
                </div>

                <div>
                  <span>KATEGORİ</span>
                  <strong>
                    {
                      selectedEvent.category
                    }
                  </strong>
                </div>

                <div>
                  <span>ÖNCELİK</span>
                  <strong>
                    {
                      selectedEvent.priority
                    }
                  </strong>
                </div>
              </div>

              <div className="team-list">
                {TEAMS.map((team) => {
                  const selected =
                    selectedTeam?.id ===
                    team.id;

                  return (
                    <button
                      key={team.id}
                      className={`team-option ${
                        selected
                          ? "selected"
                          : ""
                      }`}
                      onClick={() =>
                        setSelectedTeam(
                          team
                        )
                      }
                      disabled={
                        actionLoading
                      }
                    >
                      <div className="team-option-main">
                        <strong>
                          {team.name}
                        </strong>

                        <span>
                          {team.type}
                        </span>
                      </div>

                      <div className="team-option-status">
                        <span className="available-dot" />
                        {team.status}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="team-modal-footer">
                <button
                  className="modal-cancel"
                  onClick={() =>
                    setTeamModalOpen(false)
                  }
                  disabled={actionLoading}
                >
                  İPTAL
                </button>

                <button
                  className="team-confirm"
                  onClick={assignTeam}
                  disabled={
                    !selectedTeam ||
                    actionLoading
                  }
                >
                  {actionLoading
                    ? "ATANIYOR..."
                    : "EKİBİ ATA"}
                </button>
              </div>
            </div>
          </div>
        )}

      <section className="command-bar">
        {selectedEvent ? (
          <>
            <div className="command-main">
              <div className="command-id">
                <span>SEÇİLİ OLAY</span>

                <strong>
                  {selectedEvent.id}
                </strong>
              </div>

              <div className="command-priority">
                <span
                  className={`priority-indicator ${getPriorityClass(
                    selectedEvent.priority
                  )}`}
                />

                <strong>
                  {selectedEvent.priority}
                </strong>
              </div>

              <div className="command-category">
                {selectedEvent.category}
              </div>

              <div className="command-description">
                {selectedEvent.description}
              </div>
            </div>

            <div className="command-intelligence">
              <div>
                <span>
                  AI ÖNERİSİ
                </span>

                <strong>
                  {
                    selectedEvent.recommendation
                  }
                </strong>
              </div>

              <div>
                <span>
                  ANAHTAR KELİMELER
                </span>

                <strong>
                  {selectedEvent
                    .detected_keywords
                    .length > 0
                    ? selectedEvent.detected_keywords.join(
                        ", "
                      )
                    : "-"}
                </strong>
              </div>
            </div>

            <div className="command-meta">
              <div>
                <span>DURUM</span>
                <strong>
                  {selectedEvent.status}
                </strong>
              </div>

              <div>
                <span>EKİP</span>
                <strong>
                  {selectedEvent.team ||
                    "Atanmadı"}
                </strong>
              </div>

              <div>
                <span>GÜVEN</span>
                <strong>
                  %
                  {
                    selectedEvent.confidence
                  }
                </strong>
              </div>
            </div>

            <div className="command-actions">
              <button
                className="command-btn assign"
                disabled={
                  actionLoading ||
                  selectedEvent.status ===
                    "Çözüldü" ||
                  selectedEvent.status ===
                    "Tamamlandı"
                }
                onClick={
                  openTeamAssignment
                }
              >
                EKİP ATA
              </button>

              <button
                className="command-btn start"
                disabled={
                  actionLoading ||
                  selectedEvent.status ===
                    "Çözüldü" ||
                  selectedEvent.status ===
                    "Tamamlandı"
                }
                onClick={() =>
                  updateStatus(
                    "Müdahale Ediliyor"
                  )
                }
              >
                MÜDAHALE BAŞLAT
              </button>

              <button
                className="command-btn resolve"
                disabled={
                  actionLoading ||
                  selectedEvent.status ===
                    "Çözüldü" ||
                  selectedEvent.status ===
                    "Tamamlandı"
                }
                onClick={() =>
                  updateStatus(
                    "Çözüldü"
                  )
                }
              >
                ÇÖZÜLDÜ
              </button>

              <button
                className="command-btn delete"
                disabled={actionLoading}
                onClick={deleteEvent}
              >
                SİL
              </button>
            </div>
          </>
        ) : (
          <div className="no-selection">
            Haritadan veya olay listesinden
            bir olay seçin.
          </div>
        )}
      </section>
    </div>
  );
}