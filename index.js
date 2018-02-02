#!/usr/bin/env node

"use strict";

const fetch = require("node-fetch");
const readline = require("readline");
const moment = require("moment");
const HttpsProxyAgent = require("https-proxy-agent");
const fs = require("fs");
const touch = require("touch");

//-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-
//- GLOBAL PARAMS
//-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-
const IP_FAKE_DISPLAY = "X.X.X.X";
const START_TIME = new Date();

let LOGS = [ // timeout log info
  // {
  //   current_ip: "",
  //   country_name: "",
  //   region_name: "",
  //   target_ip: "",
  //   loop_count: "",
  //   timeout_count: "",
  //   time: "",
  // }
];
let LOG_FILE_PATH = ""; // log file path
let LOCATION = { // current network info
  ip: "",
  country_name: "",
  region_name: "",
};
let IP = IP_FAKE_DISPLAY; // ping target ip address
let LOOP_COUNT = 0; // total ping count
let TIMEOUT_COUNT = 0; // timeout ping count

//-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-
//- STDIN LISTENER
//-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-
const pingDataHandler = (data) => {
  if (data.indexOf("PING") === 0) {
    return; // do not handle the first line: "PING X.X.X.X (X.X.X.X): 56 data bytes"
  }

  LOOP_COUNT++;

  let delay = 0;
  if (data.indexOf("Request timeout") === 0) {
    // data => "Request timeout for icmp_seq 45022"
    // timeout
    TIMEOUT_COUNT++;

    logTimeout();
  } else {
    // data => "64 bytes from X.X.X.X: icmp_seq=45021 ttl=47 time=70.087 ms"
    // normal ping response
    let origin = data.split(" ");

    IP = origin[3].slice(0, -1); // X.X.X.X: => X.X.X.X
    delay = parseInt(origin[6].split("=")[1]); //  time=70.087 => [ "time", "70.087" ]
  }

  let failureRate = parseInt(TIMEOUT_COUNT / LOOP_COUNT * 100);
  let duration = ((new Date() - START_TIME) / 1000 / 3600).toFixed(2); // / 1000 => to second, / 3600 => to hour

  console.log(`${IP}\t${delay}ms\tFail: ${failureRate}%\tTimeout: ${TIMEOUT_COUNT}\tTotal: ${LOOP_COUNT}\tDuration: ${duration} Hr`);
};

const rl = readline.createInterface({
  input: process.stdin
});
rl.on("line", pingDataHandler);

//-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-
//- IP GEO LISTENER
//-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-
setInterval(() => {
  let options = {
    method: "GET"
  };
  if (process.env.HTTP_PROXY) {
    options.agent = new HttpsProxyAgent(process.env.HTTP_PROXY);
  }

  fetch("http://freegeoip.net/json/", options).then((response) => { // get the info of current using network
    return response.json();
  }).then((json) => {
    LOCATION.ip = json.ip;
    LOCATION.country_name = json.country_name;
    LOCATION.region_name = json.region_name;
    console.log("Current Network info refreshed: ", json);
  }).catch((err) => {
    console.log("IP fetch failed: ", err);
  });
}, 60 * 1000); // 60s

//-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-
//- TIMEOUT LOG LISTENER
//-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-
const logTimeout = () => {
  if (LOCATION.ip === "" || IP === IP_FAKE_DISPLAY) {
    return; // some data not prepared
  }

  LOGS.push({
    current_ip: LOCATION.ip,
    country_name: LOCATION.country_name,
    region_name: LOCATION.region_name,
    target_ip: IP,
    loop_count: LOOP_COUNT,
    timeout_count: TIMEOUT_COUNT,
    duration: (new Date() - START_TIME) / 1000, // second
    time: moment().format("YYYY-MM-DD HH:mm:ss") // 2018-02-02 18:38:29
  });
};

const ensureLogFile = () => {
  if (LOG_FILE_PATH !== "") {
    return; // already prepared
  }

  if (IP === IP_FAKE_DISPLAY) {
    return; // IP not prepared
  }

  let filePath = `/tmp/ping_quality_${IP}`;

  touch.sync(filePath);

  LOG_FILE_PATH = filePath;
};

setInterval(() => { // Reporter
  if (LOGS.length <= 0 || IP === IP_FAKE_DISPLAY) {
    return; // no log to handle || IP not prepared
  }

  ensureLogFile();

  // tmp variable
  let logsTobeSaved = LOGS;
  // clear logs
  LOGS = [];

  // handle json objects & save to file
  let jsonStrArr = logsTobeSaved.map(log => JSON.stringify(log));
  logsTobeSaved = null;

  fs.appendFile(LOG_FILE_PATH, jsonStrArr.join("\n") + "\n", (err) => {
    if (err) {
      console.log("Saving timeout logs failed: ", err);
    }
    console.log("Timeout logs saved");
  });
}, 70 * 1000); // 70s