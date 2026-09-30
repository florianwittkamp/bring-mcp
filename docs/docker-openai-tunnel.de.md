# Bring! mit Docker und OpenAI Secure MCP Tunnel

Dieser Fork startet den lokal gebauten Bring!-MCP-Server und den offiziellen
OpenAI-Tunnel-Client gemeinsam in einem Docker-Container. Der Tunnel-Client
startet Bring! als STDIO-Unterprozess. Es sind keine öffentliche Domain und
keine eingehenden Firewall-Freigaben erforderlich.

## 1. Konfiguration eintragen

Docker mit Compose wird benötigt. Node.js und `tunnel-client` sind im Image
enthalten und müssen auf dem Host nicht installiert werden.

In dieser vorbereiteten Arbeitskopie liegt bereits eine leere `.env`. Bei
einem frischen Clone des Forks legst du sie einmalig an:

```bash
cp .env.example .env
chmod 600 .env
```

Trage diese vier Werte in `.env` ein:

| Variable                  | Wert                                              |
| ------------------------- | ------------------------------------------------- |
| `BRING_EMAIL`             | E-Mail-Adresse deines Bring!-Kontos               |
| `BRING_PASSWORD`          | Passwort deines Bring!-Kontos                     |
| `CONTROL_PLANE_TUNNEL_ID` | ID des OpenAI-Tunnels (`tunnel_…`)                |
| `CONTROL_PLANE_API_KEY`   | OpenAI-Runtime-API-Key mit Tunnels **Read + Use** |

Lasse die einfachen Anführungszeichen um die Werte stehen. Dadurch bleiben
Sonderzeichen wie `$` und `#` unverändert. Wenn ein Wert selbst ein einfaches
Anführungszeichen enthält, schreibe es als `\'` innerhalb des Werts. Beispiel
mit einem erfundenen Passwort: `BRING_PASSWORD='Beispiel$#mit\'Zeichen'`.

Du erstellst den Tunnel in den
[OpenAI Platform Tunnel-Einstellungen](https://platform.openai.com/settings/organization/tunnels).
Dafür brauchst du Tunnels **Read + Manage**. Zum Betrieb benötigt der
Runtime-Key **Read + Use**. Ordne den Tunnel auch dem ChatGPT-Workspace zu,
in dem du Bring! verwenden möchtest.

`.env` bleibt lokal, ist von Git ausgeschlossen und wird nicht in das
Docker-Image kopiert. Änderungen an `.env` werden beim erneuten Erstellen
des Containers übernommen.

## 2. Starten

Führe die Befehle im Projektordner aus:

```bash
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 -f bring-mcp
```

Die lokale Statusseite findest du unter
[http://localhost:8090/ui](http://localhost:8090/ui). Die Portfreigabe ist auf
`127.0.0.1` beschränkt. `TUNNEL_UI_PORT` in `.env` ändert den lokalen Port,
falls 8090 schon belegt ist. Bei einem entfernten Docker-Host kannst du die
Statusseite über eine SSH-Portweiterleitung erreichen.

Der Healthcheck verwendet `/readyz`: `healthy` bedeutet, dass der Tunnel
bereit ist. Ein erfolgreicher Bring!-Login wird erst beim ersten Aufruf
eines Bring!-Tools geprüft.

Der Container startet nach einem Host-Neustart automatisch, sofern Docker
läuft. Betreibe pro Tunnel-ID nur eine aktive Instanz; vor einem Wechsel auf
einen anderen Host musst du die alte stoppen.

## 3. In ChatGPT verbinden

1. Aktiviere den Entwicklermodus in ChatGPT unter **Einstellungen → Sicherheit
   und Anmeldung**; der Workspace muss diese Funktion erlauben.
2. Öffne [ChatGPT Plugins](https://chatgpt.com/plugins) und erstelle eine
   Entwickler-App, zum Beispiel „Bring! Einkaufslisten“.
3. Wähle bei **Connection** die Option **Tunnel** und deinen Tunnel aus oder
   trage die `CONTROL_PLANE_TUNNEL_ID` ein.
4. Erstelle die Verbindung. Es sollten die 16 Bring!-Tools erkannt werden.
5. Aktiviere die Verbindung in einem neuen Chat und probiere:
   „Zeige meine Bring!-Einkaufslisten.“

Der Container muss während der Einrichtung und der Nutzung laufen. Falls
der Tunnel nicht angezeigt wird, prüfe die Workspace-Zuordnung und die
Tunnels-Berechtigungen in OpenAI Platform.

## Betrieb und Diagnose

Nach Änderungen an `.env`:

```bash
docker compose up -d --force-recreate
```

Verbindung prüfen, während der Container läuft:

```bash
docker compose exec bring-mcp tunnel-client doctor --explain
```

Stoppen:

```bash
docker compose down
```

Falls der Start sofort mit „… fehlt“ abbricht, ist eines der vier Pflichtfelder
leer. Falls der Container läuft, aber `unhealthy` meldet, prüfe die Statusseite
und die Logs auf ungültige Tunnel-ID, fehlende Berechtigung oder eine nicht
erreichbare OpenAI-Verbindung. Der Docker-Host braucht ausgehenden HTTPS-Zugriff
auf OpenAI und die Bring!-API.

## Image und lokale Prüfung

Das Image baut den Quellcode dieses Forks mit `npm ci` und startet
`node /app/build/src/index.js`. Der Tunnel-Client stammt aus dem offiziellen
OpenAI-Image, Version `v0.0.15`, mit festgelegtem Image-Digest. Die offiziellen
Images unterstützen Linux `amd64` und `arm64`. Der Container läuft als
unprivilegierter Benutzer mit schreibgeschütztem Dateisystem.

Für ein Update des Tunnel-Clients prüfst du die
[offiziellen Releases](https://github.com/openai/tunnel-client/releases/latest)
und aktualisierst `TUNNEL_CLIENT_IMAGE` im Dockerfile auf eine veröffentlichte
Version samt passendem Digest. Danach baust du das Image erneut.

Der folgende Test verwendet ausschließlich erfundene Zugangsdaten und einen
lokalen Kontrollserver innerhalb eines Containers ohne Netzwerkzugriff:

```bash
docker compose build
docker run --rm -i --network none --read-only --tmpfs /tmp:mode=1777 \
  --cap-drop ALL --security-opt no-new-privileges:true \
  --entrypoint node bring-mcp:tunnel < docker/smoke-test.cjs
```

Er prüft die echte Tunnel-Weiterleitung zum gebauten STDIO-Server, die
Erkennung aller 16 Tools, die Statusendpunkte und das saubere Beenden.
Echte Bring!-Zugangsdaten und OpenAI-Berechtigungen lassen sich damit nicht
prüfen.

Weitere Details stehen in der
[offiziellen Secure-MCP-Tunnel-Dokumentation](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels)
und der
[Docker-Anleitung des Tunnel-Clients](https://github.com/openai/tunnel-client/blob/v0.0.15/docs/deployment/docker.md).
