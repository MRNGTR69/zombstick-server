const net = require("net");

const rooms = {};

function generateCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

function send(socket, obj) {
    try {
        socket.write(JSON.stringify(obj) + "\n");
    } catch(e) {}
}

const server = net.createServer((socket) => {
    socket.setEncoding("utf8");
    let buffer = "";

    socket.on("data", (data) => {
        buffer += data;
        let lines = buffer.split("\n");
        buffer = lines.pop();

        for (let line of lines) {
            if (!line.trim()) continue;
            try {
                const msg = JSON.parse(line);

                if (msg.type == "create") {
                    let code = generateCode();
                    while (rooms[code]) code = generateCode();
                    rooms[code] = { host: socket, client: null, hostChar: msg.character };
                    socket.roomCode = code;
                    socket.role = "host";
                    send(socket, { type: "created", code: code });
                    console.log("Sala creada:", code);
                }

                if (msg.type == "join") {
                    const room = rooms[msg.code];
                    if (!room) { send(socket, { type: "error", msg: "Sala no encontrada" }); return; }
                    if (room.client) { send(socket, { type: "error", msg: "Sala llena" }); return; }
                    room.client = socket;
                    room.clientChar = msg.character;
                    socket.roomCode = msg.code;
                    socket.role = "client";
                    send(room.host, { type: "start", myChar: room.hostChar, enemyChar: room.clientChar, isHost: true });
                    send(room.client, { type: "start", myChar: room.clientChar, enemyChar: room.hostChar, isHost: false });
                    console.log("Sala", msg.code, "iniciada");
                }

                if (msg.type == "level") {
                    const room = rooms[socket.roomCode];
                    if (!room || socket.role != "host") return;
                    send(room.client, { type: "level", level: msg.level });
                }

                if (msg.type == "input") {
                    const room = rooms[socket.roomCode];
                    if (!room) return;
                    if (socket.role == "host" && room.client) send(room.client, { type: "input", ...msg });
                    else if (socket.role == "client" && room.host) send(room.host, { type: "input", ...msg });
                }

            } catch(e) {
                console.log("Error parsing:", e.message);
            }
        }
    });

    socket.on("close", () => {
        const code = socket.roomCode;
        if (!code || !rooms[code]) return;
        const room = rooms[code];
        const other = socket.role == "host" ? room.client : room.host;
        if (other) send(other, { type: "disconnect" });
        delete rooms[code];
        console.log("Sala", code, "cerrada");
    });

    socket.on("error", () => {});
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log("Servidor corriendo en puerto", PORT);
});