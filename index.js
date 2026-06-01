const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: 3000 });

const rooms = {};

function generateCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

wss.on("connection", (ws) => {
    ws.on("message", (data) => {
        try {
            const msg = JSON.parse(data);

            // Crear sala
            if (msg.type == "create") {
                let code = generateCode();
                while (rooms[code]) code = generateCode();
                rooms[code] = {
                    host: ws,
                    client: null,
                    hostChar: msg.character,
                    clientChar: null
                };
                ws.roomCode = code;
                ws.role = "host";
                ws.send(JSON.stringify({ type: "created", code: code }));
            }

            // Unirse a sala
            if (msg.type == "join") {
                const room = rooms[msg.code];
                if (!room) {
                    ws.send(JSON.stringify({ type: "error", msg: "Sala no encontrada" }));
                    return;
                }
                if (room.client) {
                    ws.send(JSON.stringify({ type: "error", msg: "Sala llena" }));
                    return;
                }
                room.client = ws;
                room.clientChar = msg.character;
                ws.roomCode = msg.code;
                ws.role = "client";

                // Avisar a los dos que ya están conectados
                room.host.send(JSON.stringify({ type: "start", myChar: room.hostChar, enemyChar: room.clientChar, isHost: true }));
                room.client.send(JSON.stringify({ type: "start", myChar: room.clientChar, enemyChar: room.hostChar, isHost: false }));
            }

            // Elegir nivel (solo el host)
            if (msg.type == "level") {
                const room = rooms[ws.roomCode];
                if (!room) return;
                if (ws.role != "host") return;
                room.client.send(JSON.stringify({ type: "level", level: msg.level }));
            }

            // Inputs
            if (msg.type == "input") {
                const room = rooms[ws.roomCode];
                if (!room) return;
                if (ws.role == "host" && room.client) {
                    room.client.send(JSON.stringify({ type: "input", ...msg }));
                } else if (ws.role == "client" && room.host) {
                    room.host.send(JSON.stringify({ type: "input", ...msg }));
                }
            }

        } catch (e) {
            console.log("Error:", e);
        }
    });

    ws.on("close", () => {
        const code = ws.roomCode;
        if (!code || !rooms[code]) return;
        const room = rooms[code];
        const other = ws.role == "host" ? room.client : room.host;
        if (other) other.send(JSON.stringify({ type: "disconnect" }));
        delete rooms[code];
    });
});

console.log("Servidor corriendo en puerto 3000");