const http = require("http");
const { Server } = require("socket.io");

const server = http.createServer();
const io = new Server(server, {
    cors: { origin: "*" }
});

const rooms = {};

function generateCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

io.on("connection", (socket) => {
    console.log("Conectado:", socket.id);

    socket.on("create", (data) => {
        let code = generateCode();
        while (rooms[code]) code = generateCode();
        rooms[code] = { host: socket, client: null, hostChar: data.character };
        socket.roomCode = code;
        socket.role = "host";
        socket.emit("created", { code });
        console.log("Sala creada:", code);
    });

    socket.on("join", (data) => {
        const room = rooms[data.code];
        if (!room) { socket.emit("error_msg", { msg: "Sala no encontrada" }); return; }
        if (room.client) { socket.emit("error_msg", { msg: "Sala llena" }); return; }
        room.client = socket;
        room.clientChar = data.character;
        socket.roomCode = data.code;
        socket.role = "client";
        room.host.emit("start", { myChar: room.hostChar, enemyChar: room.clientChar, isHost: true });
        room.client.emit("start", { myChar: room.clientChar, enemyChar: room.hostChar, isHost: false });
        console.log("Sala", data.code, "iniciada");
    });

    socket.on("level", (data) => {
        const room = rooms[socket.roomCode];
        if (!room || socket.role != "host") return;
        room.client.emit("level", { level: data.level });
    });

    socket.on("input", (data) => {
        const room = rooms[socket.roomCode];
        if (!room) return;
        if (socket.role == "host" && room.client) room.client.emit("input", data);
        else if (socket.role == "client" && room.host) room.host.emit("input", data);
    });

    socket.on("disconnect", () => {
        const code = socket.roomCode;
        if (!code || !rooms[code]) return;
        const room = rooms[code];
        const other = socket.role == "host" ? room.client : room.host;
        if (other) other.emit("disconnected");
        delete rooms[code];
        console.log("Sala", code, "cerrada");
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Servidor corriendo en puerto", PORT));