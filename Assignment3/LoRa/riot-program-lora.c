/*
 * Copyright (C) 2017 Inria
 *               2017 Inria Chile
 *
 * This file is subject to the terms and conditions of the GNU Lesser
 * General Public License v2.1. See the file LICENSE in the top level
 * directory for more details.
 */

/**
 * @ingroup     tests
 *
 * @file
 * @brief       Semtech LoRaMAC test application
 *
 * @author      Alexandre Abadie <alexandre.abadie@inria.fr>
 * @author      Jose Alamos <jose.alamos@inria.cl>
 */

#include <stdio.h>

#ifdef MODULE_SEMTECH_LORAMAC_RX
#include "thread.h"
#include "msg.h"
#endif

#include "shell.h"
#include "semtech_loramac.h"

extern semtech_loramac_t loramac;

#ifdef MODULE_SEMTECH_LORAMAC_RX
#define LORAMAC_RECV_MSG_QUEUE                   (4U)
static msg_t _loramac_recv_queue[LORAMAC_RECV_MSG_QUEUE];
static char _recv_stack[THREAD_STACKSIZE_DEFAULT];

static void *_wait_recv(void *arg)
{
    msg_init_queue(_loramac_recv_queue, LORAMAC_RECV_MSG_QUEUE);

    (void)arg;
    while (1) {
        /* blocks until something is received */
        switch (semtech_loramac_recv(&loramac)) {
            case SEMTECH_LORAMAC_RX_DATA:
                loramac.rx_data.payload[loramac.rx_data.payload_len] = 0;
                printf("Data received: %s, port: %d\n",
                (char *)loramac.rx_data.payload, loramac.rx_data.port);
                break;

            case SEMTECH_LORAMAC_RX_LINK_CHECK:
                printf("Link check information:\n"
                   "  - Demodulation margin: %d\n"
                   "  - Number of gateways: %d\n",
                   loramac.link_chk.demod_margin,
                   loramac.link_chk.nb_gateways);
                break;

            case SEMTECH_LORAMAC_RX_CONFIRMED:
                puts("Received ACK from network");
                break;

            default:
                break;
        }
    }
    return NULL;
}
#endif

/* loramac shell command handler is implemented in
   sys/shell/commands/sc_loramac.c */


// My additions
//#include <string.h>
//#include <stdlib.h>
#include <time.h>
#include "uuid.h"

// Constants
const double MIN_VALUE_TEMPERATURE = -50;
const double MAX_VALUE_TEMPERATURE = 50;
const double MIN_VALUE_HUMIDITY = 0;
const double MAX_VALUE_HUMIDITY = 100;
const double MIN_VALUE_WIND_DIRECTION = 0;
const double MAX_VALUE_WIND_DIRECTION = 360;
const double MIN_VALUE_WIND_INTENSITY = 0;
const double MAX_VALUE_WIND_INTENSITY = 100;
const double MIN_VALUE_RAIN_HEIGHT = 0;
const double MAX_VALUE_RAIN_HEIGHT = 50;

// Global variables
// THREAD_STACKSIZE_DEFAULT of the main stack doesn't suffice station thread task
char station_thread_stack[THREAD_STACKSIZE_LARGE];
int running = 0;

static int loramac_tx_handler(int argc, char **argv) {
    if (argc < 3) {
        puts("Usage: loramac tx <payload> [<cnf|uncnf>] [port]");
        return 1;
    }

    uint8_t cnf = LORAMAC_DEFAULT_TX_MODE;  /* Default: confirmable */
    uint8_t port = LORAMAC_DEFAULT_TX_PORT; /* Default: 2 */
    /* handle optional parameters */
    if (argc > 3) {
        if (strcmp(argv[3], "cnf") == 0) {
            cnf = LORAMAC_TX_CNF;
        }
        else if (strcmp(argv[3], "uncnf") == 0) {
            cnf = LORAMAC_TX_UNCNF;
        }
        else {
            puts("Usage: loramac tx <payload> [<cnf|uncnf>] [port]");
            return 1;
        }

        if (argc > 4) {
            port = atoi(argv[4]);
            if (port == 0 || port >= 224) {
                printf("error: invalid port given '%d', "
                       "port can only be between 1 and 223\n", port);
                return 1;
            }
        }
    }

    semtech_loramac_set_tx_mode(&loramac, cnf);
    semtech_loramac_set_tx_port(&loramac, port);

    switch (semtech_loramac_send(&loramac,(uint8_t *)argv[2], strlen(argv[2]))) {
      case SEMTECH_LORAMAC_NOT_JOINED:
        puts("Cannot send: not joined");
        return 1;

      case SEMTECH_LORAMAC_DUTYCYCLE_RESTRICTED:
        puts("Cannot send: dutycycle restriction");
        return -1;   // Duty cycle limitations are set by authorities, don't stop to send, retry

      case SEMTECH_LORAMAC_BUSY:
        puts("Cannot send: MAC is busy");
        return 1;

      case SEMTECH_LORAMAC_TX_ERROR:
        puts("Cannot send: error");
        return 1;

      case SEMTECH_LORAMAC_TX_CNF_FAILED:
        puts("Fail to send: no ACK received");
        return -1;
    }

    puts("Message sent with success");
    return 0;
}

// Returns a random value N such that a <= N <= b
static double genValue(double min, double max) {
    // Initializes the random number generator
    time_t t;
    srand((unsigned) time(&t));

    // rand() Returns an integer value between 0 and RAND_MAX
    // So I limit them in integer values between 0 and ((max-min+1) * 100)
    // * 100 to obtain two decimal digits whit the division
    return (rand() % (int) ((max-min+1) * 100)) / 100.0 + min;
}

static void *station_thread(void *arg) {
    (void)arg;

    uuid_t uid;
    uuid_v4(&uid);

    char id[37];
    uuid_to_string(&uid, id);

    running = 1;

    while(running) {
      double temperature = genValue(MIN_VALUE_TEMPERATURE, MAX_VALUE_TEMPERATURE);
      double humidity = genValue(MIN_VALUE_HUMIDITY, MAX_VALUE_HUMIDITY);
      double windDirection = genValue(MIN_VALUE_WIND_DIRECTION, MAX_VALUE_WIND_DIRECTION);
      double windIntensity = genValue(MIN_VALUE_WIND_INTENSITY, MAX_VALUE_WIND_INTENSITY);
      double rainHeight = genValue(MIN_VALUE_RAIN_HEIGHT, MAX_VALUE_RAIN_HEIGHT);

      char dateTime[20];
      time_t now;
      time(&now); // Gets the current date and time
      struct tm* t = localtime(&now);

      //"dd-MM-yyyy HH:mm:ss"
      // %F equivalent to "%Y-%m-%d" and %T to %H:%M:%S"
      int res = strftime(dateTime, sizeof(dateTime), "%d-%m-%Y %T", t);
      if(res == 0) {
        printf("Error: parsing of dateTime failed!\n");
        return NULL;
      }

      // 95+14 caratteri senza contare le sostituzioni dei valori
      // 25 caratteri per i 5 sensori
      char json[196];
      snprintf(json, sizeof(json),
       "{ \"Id\": \"%s\", \"dateTime\": \"%s\", \"temperature\": %.2f, \"humidity\": %.2f, \"windDirection\": %.2f, \"windIntensity\": %.2f, \"rainHeight\": %.2f }",
       id, dateTime, temperature, humidity, windDirection, windIntensity, rainHeight);

      puts(json);

      // Send message with loramac tx
      char* loramac_tx_param[3] = {"loramac", "tx", json};

      do {
        res = loramac_tx_handler(3, loramac_tx_param);
        //res = _loramac_handler(3, loramac_tx_param);
        if (res > 0) {
          printf("Error: sending message with loramac failed!\n");
          return NULL;
        }
        // Wait and retry if restriction met or no ack received
        else if (res < 0)
          xtimer_usleep(1500);
      } while (res < 0);

      // Sleeps 5 seconds
      xtimer_sleep(5);
    }

    return NULL;    // Should be reached only when user insert stop
}

static int cmd_start(int argc, char **argv) {
    // Trick to invoke the cmd, it never will be called with argc < 1
    if (argc < 1) {
        printf("Usage: %s\n", argv[0]);
        return 1;
    }

    // Start the station thread
    thread_create(station_thread_stack, sizeof(station_thread_stack), THREAD_PRIORITY_MAIN - 1,
                  THREAD_CREATE_STACKTEST, station_thread, NULL, "station");

    puts("Successfully started station");
    return 0;
}

static int cmd_stop(int argc, char **argv) {
    // Trick to invoke the cmd, it never will be called with argc < 1
    if (argc < 1) {
        printf("Usage: %s\n", argv[0]);
        return 1;
    }

    if (!running)
      puts("No station to stop");

    else {
      running = 0;
      puts("Station stopped. Press Ctrl+c to close netcat");
    }
    return 0;
}

static const shell_command_t shell_commands[] = {
    { "start", "start a station", cmd_start },
    { "stop", "stop a station", cmd_stop },
    { NULL, NULL, NULL }
};

// end

int main(void)
{
#ifdef MODULE_SEMTECH_LORAMAC_RX
    thread_create(_recv_stack, sizeof(_recv_stack),
                  THREAD_PRIORITY_MAIN - 1, 0, _wait_recv, NULL, "recv thread");
#endif

    puts("All up, running the shell now");
    char line_buf[SHELL_DEFAULT_BUFSIZE];
    shell_run(shell_commands, line_buf, SHELL_DEFAULT_BUFSIZE);
}
