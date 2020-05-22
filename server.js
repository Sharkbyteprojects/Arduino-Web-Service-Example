const cylon = require("cylon");
const app = require("express")();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const port = "COM4";
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
  .on("ready", (robot) => {
    app.use((req, res, next) => {
      if (!block) {
        block = true;
        robot.led.toggle();
        setTimeout(() => {
          robot.led.toggle();
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
    http.listen(8080, () => {
      console.log("Listen on localhost 8080");
    });
  });
cylon.start();
