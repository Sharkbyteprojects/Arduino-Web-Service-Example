const cylon = require("cylon");
const app = require("express")();
const fs=require("fs");
let io;
let https;
const configfile = JSON.parse(
  fs.readFileSync(__dirname + "/arduino.port.json")
);
const port = configfile.port;
const websettings = configfile.webserver;
const http = require("http").createServer(app);
if (websettings.https.enabled) {
  const helmet = require("helmet");
  app.use(helmet());
  app.use((req,res,next)=>{if(req.protocol=="http"||req.protocol=="http://"||req.protocol=="http:"){
  	res.redirect('https://' + req.headers.host + req.url);
  }else{next();}});
  const options = {
    key: fs.readFileSync(__dirname + "/key.pem"),
    cert: fs.readFileSync(__dirname + "/cert.pem"),
  };
  https = require("https").createServer(options,app);
  io = require("socket.io")(https);
} else {
  io = require("socket.io")(http);
}
console.log("Loaded Port " + port);
cylon
  .robot()
  .connection("arduino", { adaptor: "firmata", port: port })
  .device("servo", {
    driver: "servo",
    pin: 8,
    limits: { bottom: -90, top: 160 },
  })
  .device("button", { driver: "button", pin: 7 })
  .device("led", { driver: "led", pin: 13 })
  .device("switch", { driver: "led", pin: 4 })
  .on("ready", (robot) => {
    app.use((req, res, next) => {
      if (!block) {
        block = true;
        robot.led.turnOn();
        setTimeout(() => {
          robot.led.turnOff();
          block = false;
        }, 100);
      }
      next();
    });
    var laststate = false;
    robot.button.on("push", () => {
      laststate = true;
      io.emit("buttonpress", { pressed: true });
    });
    app.get("/api/opto/toggle", (req, res) => {
      robot.switch.toggle();
      io.emit("opto", { state: robot.switch.isOn() });
      res.jsonp({ newstate: robot.switch.isOn(), state: robot.switch.isOn() });
    });
    app.get("/api/opto/ison", (req, res) => {
      res.jsonp({ state: robot.switch.isOn() });
    });
    robot.button.on("release", () => {
      laststate = false;
      io.emit("buttonpress", { pressed: false });
    });
    app.get("/api/isPressed", (req, res) => {
      res.jsonp({ pressed: laststate });
    });
    var block = false;

    app.get("/", (req, res) => {
      res.sendFile(__dirname + "/index.html");
    });
    app.get("/api/rotate", (req, res) => {
      let angle;
      angle = JSON.parse('{"number":' + req.query.rotate + "}").number;
      robot.servo.angle(angle);
      res.jsonp({ newAngle: angle });
    });
    if (websettings.https.enabled) {
      https.listen(websettings.https.port, () => {
        console.log("Listen on https://localhost:" + websettings.https.port);
      });
    }
    http.listen(websettings.http.port, () => {
      console.log("Listen on http://localhost:" + websettings.http.port);
    });
  });
cylon.start();
