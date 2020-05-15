"use strict";

window.onload = function init() {

  // Buttons handling
  var container  = document.getElementById("container");
  var intro      = document.getElementById("intro");
  var btns       = document.getElementById("btns");
  var historyBtn = document.getElementById("historyBtn");

  var historyBtnJQ = $("#historyBtn");
  var historyChartJQ = $("#historyChart");

  var cloudBtnActivated   = false;
  var edgeBtnActivated    = false;
  var historyBtnActivated = false;

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

    stop();
  }

  historyBtn.onclick = function () {
    historyBtnActivated = !historyBtnActivated;
    historyBtnActivated ? getLastHourDataFromDB() : historyChartJQ.fadeOut();
  }
  // End buttons handling

  // Global variables
  var measureText = document.getElementById('measure');
  var measureTextJQ = $("#measure");
  var loader = document.getElementById("loader");
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

  var docClient = new AWS.DynamoDB.DocumentClient();

  // Callback for the MQTT client
  function callback() {
    fired = true;
    // Check if the callback is invoked after that a button is pressed (slow connection)
    if(cloudBtnActivated || edgeBtnActivated)
      main();
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

      $('html, body').animate({
            scrollTop: $("#measure").offset().top - 70
        }, 500);
    }
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
      return "{ \"uuid\":\"" + uuid + "\", \"datetime\": \"" + getDateTime() + "\", \"isStanding\": \"" + obj + "\" }";

    // Cloud-based Deployment
    else if(obj instanceof Array) {
      var s = "{ \"uuid\":\"" + uuid + "\", \"datetime\": \"" + getDateTime() + "\"";

      var elem = obj[0];
      s += ", \"beforeX\":\"" + elem.x + "\", \"beforeY\":\"" + elem.y + "\", \"beforeZ\":\"" + elem.z + "\"";
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

  // TODO
  // Query the DB to get values received during the last hour of the activated button
  // Se non funziona between allora usare formato data 2015-12-21T17:42:34Z
  function getLastHourDataFromDB() {
    console.log("Querying for last hour values...\n");

    var dateTime = getDateTime();
    var params = {
      TableName : "VirtualEnvironmentStationsDB",
      ProjectionExpression: "Id, #dt, Payload",
      ExpressionAttributeNames:{
          "#dt": "dateTime"
      },
      FilterExpression: "#dt between :start_h and :end_h",
      ExpressionAttributeValues: {
          ":start_h": dateTime[1],
          ":end_h": dateTime[0],
      }
    };

    docClient.scan(params, onScan);

    function onScan(err, data) {
        if (err) {
            console.log("Unable to scan the table: " + "\n" + JSON.stringify(err, undefined, 2));
        } else {
            // Print all the values
            console.log("Scanning succeeded.\n");

            // Map where to store station objects
            var stations = new Map();

            data.Items.forEach(function(stationData) {
                var value = stations.get(stationData.Id);

                if (value == undefined) {
                  // Object to associate each stationId with two array of values
                  var station = {id:"", sensorValues:[], dateTimes:[]};

                  station.sensorValues.push(stationData.Payload[sensor]);
                  station.dateTimes.push(stationData.dateTime);
                  stations.set(stationData.Id, station);
                }
                else {
                  value.sensorValues.push(stationData.Payload[sensor]);
                  value.dateTimes.push(stationData.dateTime);
                }
            });

            // Continue scanning if we have more data (per scan 1MB limitation)
            if (typeof data.LastEvaluatedKey != "undefined") {
                params.ExclusiveStartKey = data.LastEvaluatedKey;
                docClient.scan(params, onScan);
            }

            // Clean area where to put the new charts
            var area = $("#history-charts");
            area.html("");

            var isEmpty = true;

            // Draw a chart for each station
            for (let [key, value] of stations.entries()) {
              //console.log('key is ' + key + ', value is ' + value);
              createCardForChart(area, key);
              drawLineChart(key, sensor, value.dateTimes, value.sensorValues);
              isEmpty = false;
            }

            if (isEmpty)
              alert("No station sent data in the past hour");
            else {
              //Set a timeout waiting for the creation of the new elements
              setTimeout(function() {
                window.location = "#history-chart-pos-for-scrolling";
              },
              500);
            }
        }
    }
  }

  // TODO
  function createCardForChart(area, stationId) {
    area.append("<div id='history-chart"+stationId+"' class='row'><div class='col-xl-8'><div class='card'><div class='card-body'><div class='stat-widget-five'><div class='stat-icon dib flat-color-3'><i class='pe-7s-graph2'></i></div><div class='stat-content'><div class='text-left dib'><div class='stat-text'><span>History Chart</span></div><div class='stat-heading'>"+stationId+"</div></div></div></div><canvas id='historyChart"+stationId+"'></canvas></div></div></div></div>");

    /*<!-- Line Chart -->
    <div id="history-chart" class="row" >
      <div class="col-xl-8">
        <div class="card">
          <div class="card-body">
            <!-- Card header -->
            <div class="stat-widget-five">
              <div class="stat-icon dib flat-color-3">
                <i class="pe-7s-graph2"></i>
              </div>
              <div class="stat-content">
                <div class="text-left dib">
                    <div class="stat-text"><span>History Chart</span></div>
                    <div id="stationId-history" class="stat-heading">stationId</div>
                </div>
              </div>
            </div>
            <!-- /Card header -->
            <canvas id="historyChart"></canvas>
          </div>
          <div id="real-time-pos-for-scrolling" class="card-body"></div> <!-- Just for scrolling properly -->
        </div>
      </div>
    </div>
    <!-- /Line Chart -->*/

  }


  // TODO
  function drawLineChart(stationId, sensor, labelValues, dataValues) {
    var color = "";

    switch(sensor) {
      case "temperature":
        color = "#00c292";
        break;
      case "humidity":
        color = "#5c6bc0";
        break;
      case "windDirection":
        color = "#ab8ce4";
        break;
      case "windIntensity":
        color = "#fb9678";
        break;
      case "rainHeight":
        color = "#03a9f3";
        break;
      default:
        color = 'rgb(255, 99, 132)';
    }

    //alert(labelValues);
    //alert(dataValues);

    //var canvas = $('historyChart'+stationId);
    var canvas = document.getElementById('historyChart'+stationId);
    var ctx = canvas.getContext('2d');
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var chart = new Chart(ctx, {
        // The type of chart we want to create
        type: 'line',

        // The data for our dataset
        data: {
            labels: labelValues, //['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September'],
            datasets: [{
                label: sensor,
                backgroundColor: color,
                borderColor: color,
                data: dataValues //[0, 10, 5, 2, 20, 30, 45, 35, 50]
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
