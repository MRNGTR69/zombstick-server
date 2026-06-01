const http = require("http");
const rooms = {};

function generateCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

const server = http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "application/json");

    let body = "";
    req.on("data", d => body += d);
    req.on("end", () => {
        try {
            const msg = JSON.parse(body || "{}");

            if (req.url == "/create") {
                let code = generateCode();
                while (rooms[code]) code = generateCode();
                rooms[code] = { hostChar: msg.character, clientChar: null, level: -1, hostInputs: {}, clientInputs: {}, clientJoined: false };
                res.end(JSON.stringify({ code }));
            }
            else if (req.url == "/join") {
                const room = rooms[msg.code];
                if (!room) { res.end(JSON.stringify({ error: "Sala no encontrada" })); return; }
                if (room.clientJoined) { res.end(JSON.stringify({ error: "Sala llena" })); return; }
                room.clientChar = msg.character;
                room.clientJoined = true;
                res.end(JSON.stringify({ ok: true, hostChar: room.hostChar }));
            }
            else if (req.url == "/level") {
                const room = rooms[msg.code];
                if (!room) { res.end(JSON.stringify({ error: "no room" })); return; }
                room.level = msg.level;
                res.end(JSON.stringify({ ok: true }));
            }
            else if (req.url == "/poll_join") {
                const room = rooms[msg.code];
                if (!room) { res.end(JSON.stringify({ waiting: true })); return; }
                if (!room.clientJoined) { res.end(JSON.stringify({ waiting: true })); return; }
                res.end(JSON.stringify({ waiting: false, clientChar: room.clientChar }));
            }
            else if (req.url == "/poll_level") {
                const room = rooms[msg.code];
                if (!room) { res.end(JSON.stringify({ level: -1 })); return; }
                res.end(JSON.stringify({ level: room.level }));
            }
            else if (req.url == "/send_input") {
                const room = rooms[msg.code];
                if (!room) { res.end(JSON.stringify({ ok: false })); return; }
                if (msg.role == "host") room.hostInputs = msg.inputs;
                else room.clientInputs = msg.inputs;
                res.end(JSON.stringify({ ok: true }));
            }
            else if (req.url == "/get_input") {
                const room = rooms[msg.code];
                if (!room) { res.end(JSON.stringify({ inputs: {} })); return; }
                if (msg.role == "host") res.end(JSON.stringify({ inputs: room.clientInputs }));
                else res.end(JSON.stringify({ inputs: room.hostInputs }));
            }
            else {
                res.end(JSON.stringify({ ok: true }));
            }
        } catch(e) {
            res.end(JSON.stringify({ error: e.message }));
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Servidor corriendo en puerto", PORT));