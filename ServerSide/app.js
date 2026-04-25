// app.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { io: connectToPi } = require("socket.io-client");
require("dotenv").config();

const { sendPushToAll, alertPayloadFromPiData } = require("./lib/push");

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer); // server to browser

app.set("view engine", "ejs");
app.set("views", "./views");
app.use(express.static("public"));

// defult data check
const patientController = require("./controller/patientController");
app.use(patientController.patientDefultData)

// express json
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// routers


// index
const index = require('./routes/Index');
app.use("/", index)
// reports
const report = require('./routes/report');
app.use("/report", report)
const pushRoutes = require("./routes/push");
app.use("/push", pushRoutes);


// Mongodb


const mongoose = require("mongoose");
const { CLOSING } = require("ws");
const uri =
  "mongodb+srv://yousef6448_db_user:UUlunDVXfyyxd2DH@cluster0.ivo3yv1.mongodb.net/Medhat?appName=Cluster0";

const clientOptions = {
  serverApi: { version: "1", strict: true, deprecationErrors: true },
};

async function run() {
  try {
    await mongoose.connect(uri, clientOptions);
    await mongoose.connection.db.admin().command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    httpServer.listen(8080, () => {
      console.log("Web server running on port 8080");
    });
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  }
  // No finally block — connection stays open for the lifetime of the server
}

run();

// Connect to Pi
const piSocket = connectToPi("http://192.168.100.178:3000");

piSocket.on("connect", async () => {
  console.log("Connected to Pi");
  io.emit("connected"); // broadcast to all browser clients

});


piSocket.on("disconnect", () => {
  console.log("Disconnected from Pi");
  io.emit("disconnected"); // broadcast to all browser clients
});

// Forward Pi data → browser
piSocket.on("arduino_data", (data) => {
  io.emit("arduino_data", data); // broadcast to all browser clients
});

// Forward Pi data → browser
piSocket.on("vice_command", (data) => {
  io.emit("vice_command", data); // broadcast to all browser clients
});

// Receive Pi alert → send push notification + notify connected browsers
piSocket.on("alert", async (data = {}) => {
  io.emit("alert", data);
  try {
    await sendPushToAll(alertPayloadFromPiData(data));
  } catch (err) {
    console.error("Push notification on Pi alert failed:", err.message);
  }
});
