"use strict";

window.onload = function init() {

  // Buttons handling
  var container = document.getElementById("container");
  var intro     = document.getElementById("intro");
  var btns      = document.getElementById("btns");
  var historyBtn = document.getElementById("historyBtn");
  var cloudBtnActivated = false;
  var edgeBtnActivated  = false;

  document.getElementById("cloudBtn").onclick = function() {
    cloudBtnActivated = !cloudBtnActivated;

    // Check for animations
    if(!edgeBtnActivated)
      cloudBtnActivated == true ? up() : down();
    // Check if both buttons are activated and exclude the oldest
    else if(cloudBtnActivated)
      edgeBtnActivated = false;
  };

  document.getElementById("edgeBtn").onclick = function() {
    edgeBtnActivated = !edgeBtnActivated;

    // Check for animations
    //if(edgeBtnActivated && !cloudBtnActivated)        up();
    //else if(!cloudBtnActivated && !edgeBtnActivated)  down();

    // Check for animations
    if(!cloudBtnActivated)
      edgeBtnActivated == true ? up() : down();
    // Check if both buttons are activated and exclude the oldest
    else if(edgeBtnActivated)
      cloudBtnActivated = false;
  };

  function up() {
    intro.classList.remove("scaleDown");
    container.classList.remove("translateDown");
    btns.classList.remove("translateBtnDown");
    historyBtn.classList.remove("translateBtnDown");

    intro.setAttribute("class", "scaleUp");
    container.setAttribute("class", "translateUp");
    btns.setAttribute("class", "translateBtnUp");
    historyBtn.setAttribute("class", "translateBtnUp");

    $("#historyBtn").fadeIn(800);

    setTimeout(loading, 1000);
  }

  function down() {
    intro.classList.remove("scaleUp");
    container.classList.remove("translateUp");
    btns.classList.remove("translateBtnUp");
    historyBtn.classList.remove("translateBtnUp");

    intro.setAttribute("class", "scaleDown");
    container.setAttribute("class", "translateDown");
    btns.setAttribute("class", "translateBtnDown");
    historyBtn.setAttribute("class", "translateBtnDown")

    $("#historyBtn").fadeOut(800);

    stop();
  }
  // End buttons handling


  // Global variables
  var measureText = document.getElementById('measure');
  var values = [];
  var fired = false;

  // Direct usage of IAM credentials
  /*var host = "<endpoint>", region = "<region>";
  var credentials = new AWS.Credentials("<sessionID>", "<sessionKey>", "<sessionToken>");
  var requestUrl = SigV4Utils.getSignedUrl(host, region, credentials);

  var uuid = createUUID();
  var mqttClient = new PahoMQTTClient(requestUrl, uuid);
  mqttClient.conn(main);*/

  // Usage of Amazon Cognito
  var uuid       = createUUID();
  var mqttClient = null;

  // Initialize Amazon Cognito credentials provider
  AWS.config.region      = 'us-east-1';
  AWS.config.credentials = new AWS.CognitoIdentityCredentials({
      IdentityPoolId: 'us-east-1:a16d10a8-a317-409c-a43c-36f17f29c83e',
  });

  // Obtain credentials
  AWS.config.credentials.get(function(){
      // Credentials will be available when this function is called
      var host       = "a194ad8wufud1k-ats.iot.us-east-1.amazonaws.com";
      var requestUrl = SigV4Utils.getSignedUrl(host, AWS.config.region, AWS.config.credentials);
      mqttClient     = new PahoMQTTClient(requestUrl, uuid);
      mqttClient.conn(callback);
  });

  // Callback for the MQTT client
  function callback() {
    fired = true;
    // Check if the callback is invoked after that a button is pressed (slow connection)
    if(cloudBtnActivated || edgeBtnActivated)
      main();
  }

  // Function to invoke when a button is activated. I don't call directly main() because
  // the MQTT client connection is async
  function loading() {
    // Check if the callback is invoked before that a button is pressed (fast connection)
    if(fired)
      main();
    else
      document.getElementById("loader").style.display = "initial";
  }

  // Function to invoke when a button is activated and the MQTT client has tried connecting to the cloud
  function main() {
    document.getElementById("loader").style.display = "none";

    if(!mqttClient.isConn()) {
      setMeasureText("Cannot connect to the cloud");
      return;
    }

    //if ('Accelerometer' in window) {
      navigator.permissions.query({ name: "accelerometer" }).then(result => {
        if (result.state != 'granted') {
          setMeasureText("Sorry, we're not allowed to access sensors on your device");
          return;
        }
        start();
      }).catch(err => {
        console.log("Integration with Permissions API is not enabled, still try to start");
        start();
      });
    /*}

    else
      setMeasureText("Your browser doesn't support sensors.");*/
  }

  var accelerometer = null;
  var topic = "sensor/accelerometer/" + uuid;
  var firstSetMeasureCall = true;

  function start() {
    if(accelerometer != null) {
      //accelerometer.addEventListener('reading', readListener);
      firstSetMeasureCall = true;
      accelerometer.start();
      return;
    }

    try {
      // DEBUG
      //mqttClient.sub("sensor/accelerometer/+");
      //mqttClient.pub("hi all", topic);

      // Read once per second
      accelerometer = new Accelerometer({ frequency: 1 });
      accelerometer.addEventListener('error', errorListener);
      accelerometer.addEventListener('reading', readListener);
      accelerometer.start();
    } catch (error) {
      // Handle construction errors
      setMeasureText(error.message);
      //console.log(error.name, error.message);

      /*if (error.name === 'SecurityError') {
          console.log('Sensor construction was blocked by the Feature Policy.');
      } else if (error.name === 'ReferenceError') {
          console.log('Sensor is not supported by the User Agent.');
      } else {
          throw error;
      }*/
    }
  }

  function errorListener(event) {
    // Handle runtime errors
    setMeasureText(event.error.message);

    /*if (event.error.name === 'NotAllowedError') {
        console.log('Permission to access sensor was denied.');
    } else if (event.error.name === 'NotReadableError' ) {
        console.log('Cannot connect to the sensor.');
    }*/
  }

  function readListener(event) {
    var now = {x:event.target.x, y:event.target.y, z:event.target.z};
    values.push(now);

    // Cloud-based Deployment
    if(cloudBtnActivated && values.length > 1) {
      mqttClient.pub(createJsonString(values), topic);
      values.shift();
    }

    // Edge-based Deployment
    if(edgeBtnActivated && values.length > 1) {
      var check = isStanding(now);
      if(check)
        setMeasureText('x: ' + event.target.x + '<br>y: ' + event.target.y + '<br>z: ' + event.target.z + "<br>you're standing");
      else
        setMeasureText('x: ' + event.target.x + '<br>y: ' + event.target.y + '<br>z: ' + event.target.z + "<br>you're moving");

      mqttClient.pub(createJsonString(check), topic);
    }
  }

  function stop() {
    if(accelerometer != null) {
      //accelerometer.removeEventListener("reading", readListener);
      accelerometer.stop();
      setMeasureText("");
    }
  }

  function setMeasureText(text) {
    if(measureText == null)   return;
    measureText.innerHTML = text;

    // Check if scrolling is necessary
    if(firstSetMeasureCall) {
      firstSetMeasureCall = false;
      $('html, body').animate({
            scrollTop: $("#measure").offset().top
        }, 500);
    }
  }

  // Check if the user is standing (do side effect on values array removing the old element)
  function isStanding(now) {
    var before = values.shift();
    var threshold = 0.3;
    if((now.x - before.x > threshold) || (now.y - before.y > threshold) || (now.z - before.z > threshold))
      return false;
    return true;
  }

  function createJsonString(obj) {
    // Edge-based Deployment
    if(typeof obj == "boolean")
      return "{ \"uuid\":\"" + uuid + "\", \"datetime\": \"" + getDateTime() + "\", \"isStanding\": \"" + obj + "\" }";

    // Cloud-based Deployment
    else if(obj instanceof Array) {
      var s = "{ \"uuid\":\"" + uuid + "\", \"datetime\": \"" + getDateTime() + "\"";

      var elem = obj[0];
      s += ", \"beforex\":\"" + elem.x + "\", \"beforeY\":\"" + elem.y + "\", \"beforeZ\":\"" + elem.z + "\"";
      elem = obj[1];
      s += ", \"nowX\":\"" + elem.x + "\", \"nowY\":\"" + elem.y + "\", \"nowZ\":\"" + elem.z + "\"";

      return s + " }";
    }
  }

  function createUUID(){
    var dt = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (dt + Math.random()*16)%16 | 0;
        dt = Math.floor(dt/16);
        return (c=='x' ? r :(r&0x3|0x8)).toString(16);
    });
    return uuid;
  }

  // Return current dateTime
  function getDateTime() {
    var now     = new Date();
    var year    = now.getFullYear();
    var month   = now.getMonth()+1;
    var day     = now.getDate();
    var hour    = now.getHours();
    var minute  = now.getMinutes();
    var second  = now.getSeconds();

    month  = getTwoDigits(month);
    day    = getTwoDigits(day);
    hour   = getTwoDigits(hour);
    minute = getTwoDigits(minute);
    second = getTwoDigits(second);

    var dateTime = day+'-'+month+'-'+year+' '+hour+':'+minute+':'+second;
    return dateTime;
  }

  // Return a two digits string (assuming I pass only positive values of at most two digits)
  function getTwoDigits(number) {
    if(number < 10 && number.toString().length == 1)
      return '0' + number;
    else
      return number;
  }

}
