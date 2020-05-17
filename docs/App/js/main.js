"use strict";

window.onload = function init() {

  // Buttons handling
  var container  = document.getElementById("container");
  var intro      = document.getElementById("intro");
  var btns       = document.getElementById("btns");
  var historyBtn = document.getElementById("historyBtn");

  var historyBtnJQ    = $("#historyBtn");
  var historyChartJQ  = $("#historyChart");
  var historyChartXJQ = $("#historyXChart");
  var historyChartYJQ = $("#historyYChart");
  var historyChartZJQ = $("#historyZChart");

  var cloudBtnActivated   = false;
  var edgeBtnActivated    = false;
  var historyBtnActivated = false;

  document.getElementById("cloudBtn").onclick = function() {
    cloudBtnActivated = !cloudBtnActivated;

    // Check for animations
    if(!edgeBtnActivated)
      cloudBtnActivated == true ? up() : down();
    // Check if both buttons are activated and exclude the oldest
    else if(cloudBtnActivated) {
      edgeBtnActivated = false;

      // Remove history charts if present
      if(historyBtnActivated) {
        historyChartJQ.fadeOut();
        historyBtnActivated = false;
      }
    }
  };

  document.getElementById("edgeBtn").onclick = function() {
    edgeBtnActivated = !edgeBtnActivated;

    // Check for animations
    if(!cloudBtnActivated)
      edgeBtnActivated == true ? up() : down();
    // Check if both buttons are activated and exclude the oldest
    else if(edgeBtnActivated) {
      cloudBtnActivated = false;

      // Remove history charts if present
      if(historyBtnActivated) {
        historyChartJQ.fadeOut();
        fadeOutCoordCharts();
        historyBtnActivated = false;
      }
    }
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

    historyBtn.style.display = "none"; // To fix first fadeIn
    historyBtnJQ.fadeIn(800);

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

    historyBtnJQ.fadeOut(800);

    // Remove history charts if present
    if(historyBtnActivated) {
      historyChartJQ.fadeOut();
      fadeOutCoordCharts();
      historyBtnActivated = false;
    }

    stop();
  }

  historyBtn.onclick = function () {
    historyBtnActivated = !historyBtnActivated;

    if(historyBtnActivated) getLastHourDataFromDB()
    else {
      scrollTo("#btns");
      historyChartJQ.fadeOut();
      fadeOutCoordCharts();
    }

  }

  // Coord charts are drawn only with Cloud Computing
  function fadeInCoordCharts() {
    historyChartXJQ.fadeIn();
    historyChartYJQ.fadeIn();
    historyChartZJQ.fadeIn();
  }

  function fadeOutCoordCharts() {
    historyChartXJQ.fadeOut();
    historyChartYJQ.fadeOut();
    historyChartZJQ.fadeOut();
  }
  // End buttons handling

  // Global variables
  var measureText = document.getElementById('measure');
  var measureTextJQ = $("#measure");
  var loader = document.getElementById("loader");
  var values = [];
  var fired  = false;

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
      mqttClient.conn(callbackConnection, callbackReceive);
  });

  var docClient = new AWS.DynamoDB.DocumentClient();

  // Callback for the MQTT client connection
  function callbackConnection() {
    fired = true;
    // Check if the callback is invoked after that a button is pressed (slow connection)
    if(cloudBtnActivated || edgeBtnActivated)
      main();
  }

  // Callback for the MQTT client when a message is received after subscription
  function callbackReceive(msg) {
    if(!cloudBtnActivated)  return;

    msg = JSON.parse(msg);
    setMeasureText('x: ' + msg.x + '<br>y: ' + msg.y + '<br>z: ' + msg.z + "<br>" + (msg.isStanding ? "you're standing" : "you're moving"));
  }

  // Function to invoke when a button is activated and the translate up movement is performed.
  // I don't call directly main() because the MQTT client connection is async
  function loading() {
    loader.style.display = "initial";
    firstSetMeasureCall = true;

    // Check if the callback is invoked before that a button is pressed (fast connection)
    if(fired)
      main();
  }

  // Function to invoke when a button is activated and the MQTT client has tried connecting to the cloud
  function main() {
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
        setMeasureText("Integration with Permissions API is not enabled");
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
      accelerometer.start();
      return;
    }

    try {
      // DEBUG
      //mqttClient.sub("sensor/accelerometer/+");
      //mqttClient.pub("hi all", topic);

      // For cloud computing
      mqttClient.sub("sensor/accelerometer/cloud-computing-response/" + uuid);

      // Read once per second
      accelerometer = new Accelerometer({ frequency: 1 });
      accelerometer.addEventListener('error', errorListener);
      accelerometer.addEventListener('reading', readListener);
      accelerometer.start();
    } catch (error) {
      // Handle construction errors
      setMeasureText(error.message);
    }
  }

  function errorListener(event) {
    // Handle runtime errors
    setMeasureText(event.error.message);
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
    if(accelerometer != null)
      accelerometer.stop();

    loader.style.display = "none"; // It should not be necessary, just for safety
    setMeasureText("");
  }

  function setMeasureText(text) {
    if(measureText == null)   return;
    if(text == "")
      measureTextJQ.fadeOut(320);

    measureText.innerHTML = text;

    // Check if scrolling is necessary
    if(firstSetMeasureCall) {
      firstSetMeasureCall = false;
      //historyBtnJQ.fadeIn(800);
      measureTextJQ.fadeIn(800);
      loader.style.display = "none";

      scrollTo("#measure");
    }
  }

  function scrollTo(elem) {
    $('html, body').animate({
          scrollTop: $(elem).offset().top - 70
      }, 500);
  }

  // Check if the user is standing (do side effect on values array removing the old element)
  function isStanding(now) {
    var before = values.shift();
    //var threshold = 0.25;
    // TODO
    if((now.x - before.x > 0.3) /*|| (now.y - before.y > 0.23) || (now.z - before.z > 0.25)*/)
      return false;
    return true;
  }

  function createJsonString(obj) {
    // Edge-based Deployment
    if(typeof obj == "boolean")
      return "{ \"clientID\":\"" + uuid + "\", \"dateTime\": \"" + getDateTime()[0] + "\", \"isStanding\": \"" + obj + "\" }";

    // Cloud-based Deployment
    else if(obj instanceof Array) {
      var s = "{ \"clientID\":\"" + uuid + "\", \"dateTime\": \"" + getDateTime()[0] + "\"";

      // obj[0] older than obj[1]
      var elem = obj[0];
      s += ", \"x1\":" + elem.x + ", \"y1\":" + elem.y + ", \"z1\":" + elem.z;
      elem = obj[1];
      s += ", \"x2\":" + elem.x + ", \"y2\":" + elem.y + ", \"z2\":" + elem.z;

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

  // Return current dateTime and the dateTime of 1 hour ago
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
    var dateTimeOneHourAgo = "";

    if(hour == 0)
      dateTimeOneHourAgo = getTwoDigits(day-1)+'-'+month+'-'+year+' 23:'+minute+':'+second;
    else
      dateTimeOneHourAgo = day+'-'+month+'-'+year+' '+getTwoDigits(hour-1)+':'+minute+':'+second;

    return [dateTime, dateTimeOneHourAgo];
  }

  // Return a two digits string (assuming I pass only positive values of at most two digits)
  function getTwoDigits(number) {
    if(number < 10 && number.toString().length == 1)
      return '0' + number;
    else
      return number;
  }

  // Query the DB to get values received during the last hour of the activated button
  // Se non funziona between allora usare formato data 2015-12-21T17:42:34Z
  function getLastHourDataFromDB() {
    console.log("Querying for last hour values...\n");
    loader.style.display = "initial";

    var dateTime = getDateTime();
    var params = {
      TableName : "AccelerometerWebAppDB",
      ProjectionExpression: cloudBtnActivated ? "clientID, #dt, x, y, z, isStanding" : "clientID, #dt, isStanding",
      KeyConditionExpression: "clientID = :clientID and #dt between :start_h and :end_h",
      FilterExpression: "computation = :computation",
      ExpressionAttributeNames:{
          "#dt": "dateTime"
      },
      ExpressionAttributeValues: {
          ":clientID": uuid,
          ":start_h":  dateTime[1],
          ":end_h":    dateTime[0],
          ":computation": cloudBtnActivated ? "cloud" : "edge"
      }
    };

    docClient.query(params, onQuery);

    function onQuery(err, data) {
        if (err) {
            console.log("Unable to query the table: " + "\n" + JSON.stringify(err, undefined, 2));
            historyBtnActivated = false;
            loader.style.display = "none";
        } else {
            // Print all the values
            console.log("Querying succeeded.\n");

            var sensorValues = [];
            var dateTimes = [];

            // Additional arrays for cloud computing
            var xValues = [];
            var yValues = [];
            var zValues = [];

            // Check if cloud computing
            if(cloudBtnActivated)
              data.Items.forEach(function(data) {
                    sensorValues.push(data.isStanding == "true" ? 0 : 1);
                    // DynamoDB does not support float type so, in the table, the value is stored as string
                    xValues.push(parseFloat(data.x));
                    yValues.push(parseFloat(data.y));
                    zValues.push(parseFloat(data.z));
                    dateTimes.push(data.dateTime);
              });
            else
              data.Items.forEach(function(data) {
                    sensorValues.push(data.isStanding == "true" ? 0 : 1);
                    dateTimes.push(data.dateTime);
              });

            // Continue scanning if we have more data (per scan 1MB limitation)
            if (typeof data.LastEvaluatedKey != "undefined") {
                params.ExclusiveStartKey = data.LastEvaluatedKey;
                docClient.scan(params, onScan);
            }

            // Clean area where to put the new charts
            //historyChartJQ.html("");

            loader.style.display = "none";

            if (sensorValues.length == 0) {
              historyBtnActivated = false;
              // Trick to avoid to display the loader when the alert is shown
              setTimeout(function() {
                alert("No data sent in the past hour");
              }, 100);
            }
            else {
              historyChartJQ.fadeIn();

              if(cloudBtnActivated) {
                fadeInCoordCharts();

                drawLineChart(dateTimes, sensorValues, "historyChart", "Activity Cloud Computing");
                drawLineChart(dateTimes, xValues, "historyXChart", "x Cloud Computing");
                drawLineChart(dateTimes, yValues, "historyYChart", "y Cloud Computing");
                drawLineChart(dateTimes, zValues, "historyZChart", "z Cloud Computing");
              }
              else
                drawLineChart(dateTimes, sensorValues, "historyChart", "Activity Edge Computing");

              //Set a timeout waiting for the creation of the new elements
              setTimeout(function() {
                scrollTo(historyChartJQ);
              },
              500);
            }
        }
    }
  }

  function drawLineChart(labelValues, dataValues, canvasId, label) {
    var canvas = document.getElementById(canvasId);
    var ctx = canvas.getContext('2d');

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if(canvasId == "historyChart")
      var chart = new Chart(ctx, {
          // The type of chart we want to create
          type: 'line',

          // The data for our dataset
          data: {
              labels: labelValues,
              datasets: [{
                  label: label,
                  backgroundColor: '#4aca85',
                  borderColor: '#4aca85',
                  data: dataValues
              }]
          },

          // Configuration options go here
          options: {
            scales: {
              yAxes: [{
                  ticks: {
                      // Include a dollar sign in the ticks
                      callback: function(value, index, values) {
                          if(value == 1)        return "is moving";
                          else if(value == 0)   return "is standing";
                          else                  return "";
                      }
                  }
              }]
            }
            /*animation: {
                onProgress: function(animation) {
                    progress.value = animation.animationObject.currentStep / animation.animationObject.numSteps;
                }
            }*/
          }

      });
    else
      var chart = new Chart(ctx, {
        // The type of chart we want to create
        type: 'line',

        // The data for our dataset
        data: {
            labels: labelValues,
            datasets: [{
                label: label,
                backgroundColor: '#4aca85',
                borderColor: '#4aca85',
                data: dataValues
            }]
        },

        // Configuration options go here
        options: {
          /*animation: {
              onProgress: function(animation) {
                  progress.value = animation.animationObject.currentStep / animation.animationObject.numSteps;
              }
          }*/
        }

      });
  }

}
