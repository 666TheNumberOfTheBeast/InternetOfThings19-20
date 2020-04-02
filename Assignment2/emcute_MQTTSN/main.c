/*
 * Copyright (C) 2015 Freie Universität Berlin
 *
 * This file is subject to the terms and conditions of the GNU Lesser
 * General Public License v2.1. See the file LICENSE in the top level
 * directory for more details.
 */

/**
 * @ingroup     examples
 * @{
 *
 * @file
 * @brief       Example application for demonstrating RIOT's MQTT-SN library
 *              emCute
 *
 * @author      Hauke Petersen <hauke.petersen@fu-berlin.de>
 *
 * @}
 */

 // Main modificato

#include <stdio.h>
#include <string.h>
#include <stdlib.h>

#include "shell.h"
#include "msg.h"
#include "net/emcute.h"
#include "net/ipv6/addr.h"

#ifndef EMCUTE_ID
#define EMCUTE_ID           ("gertrud")
#endif
#define EMCUTE_PORT         (1883U)
#define EMCUTE_PRIO         (THREAD_PRIORITY_MAIN - 1)

#define NUMOFSUBS           (16U)
#define TOPIC_MAXLEN        (64U)

static char stack[THREAD_STACKSIZE_DEFAULT];
static msg_t queue[8];

static emcute_sub_t subscriptions[NUMOFSUBS];
static char topics[NUMOFSUBS][TOPIC_MAXLEN];


// My additions
#include <time.h>
#include "uuid.h"
#include <signal.h>

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
int connected = 0;

static int cmd_con(int argc, char **argv);
static int cmd_pub(int argc, char **argv);
static int cmd_discon(int argc, char **argv);

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

    char topic[51] = "sensor/station";
    // Avoid to add the id now to correctly subscribe to topic with Mosquitto RSMB MQTTSN client
    //strcat(topic, id);

    while(1) {
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

      // Publish in the topic the message
      char* pub_param[3] = {"pub", topic, json};

      cmd_pub(3, pub_param);

      // Sleeps 5 seconds
      xtimer_sleep(5);
    }

    return NULL;    // should never be reached
}

static int cmd_start(int argc, char **argv) {
    if (argc < 3) {
        printf("usage: %s <ipv6 addr> <port>\n", argv[0]);
        return 1;
    }

    // Start the connection with the MQTT broker
    char* con_param[3] = {"con", argv[1], argv[2]};
    //char* con_param[3] = {"con", "fec0:affe::1", "1885"};
    int res = cmd_con(3, con_param);
    if(res)
      return 1;

    connected = 1;

    // Start the station thread
    thread_create(station_thread_stack, sizeof(stack), THREAD_PRIORITY_MAIN - 1,
                  THREAD_CREATE_STACKTEST, station_thread, NULL, "station");

    puts("Successfully started station");
    return 0;
}

static void signal_handler(int signal) {
    printf("\nClosing the program...\n");
    signal = 0;

    if(connected) {
      char* disc_param[3] = {"discon"};
      cmd_discon(1, disc_param);
    }
    exit(signal);
}

// End of my additions


static void *emcute_thread(void *arg)
{
    (void)arg;
    emcute_run(EMCUTE_PORT, EMCUTE_ID);
    return NULL;    /* should never be reached */
}

static void on_pub(const emcute_topic_t *topic, void *data, size_t len)
{
    char *in = (char *)data;

    printf("### got publication for topic '%s' [%i] ###\n",
           topic->name, (int)topic->id);
    for (size_t i = 0; i < len; i++) {
        printf("%c", in[i]);
    }
    puts("");
}

static unsigned get_qos(const char *str)
{
    int qos = atoi(str);
    switch (qos) {
        case 1:     return EMCUTE_QOS_1;
        case 2:     return EMCUTE_QOS_2;
        default:    return EMCUTE_QOS_0;
    }
}

static int cmd_con(int argc, char **argv)
{
    sock_udp_ep_t gw = { .family = AF_INET6, .port = EMCUTE_PORT };
    char *topic = NULL;
    char *message = NULL;
    size_t len = 0;

    if (argc < 2) {
        printf("usage: %s <ipv6 addr> [port] [<will topic> <will message>]\n",
                argv[0]);
        return 1;
    }

    /* parse address */
    if (ipv6_addr_from_str((ipv6_addr_t *)&gw.addr.ipv6, argv[1]) == NULL) {
        printf("error parsing IPv6 address\n");
        return 1;
    }

    if (argc >= 3) {
        gw.port = atoi(argv[2]);
    }
    if (argc >= 5) {
        topic = argv[3];
        message = argv[4];
        len = strlen(message);
    }

    if (emcute_con(&gw, true, topic, message, len, 0) != EMCUTE_OK) {
        printf("error: unable to connect to [%s]:%i\n", argv[1], (int)gw.port);
        return 1;
    }
    printf("Successfully connected to gateway at [%s]:%i\n",
           argv[1], (int)gw.port);

    return 0;
}

static int cmd_discon(int argc, char **argv)
{
    (void)argc;
    (void)argv;

    int res = emcute_discon();
    if (res == EMCUTE_NOGW) {
        puts("error: not connected to any broker");
        return 1;
    }
    else if (res != EMCUTE_OK) {
        puts("error: unable to disconnect");
        return 1;
    }
    puts("Disconnect successful");
    connected = 0;
    return 0;
}

static int cmd_pub(int argc, char **argv)
{
    emcute_topic_t t;
    unsigned flags = EMCUTE_QOS_0;

    if (argc < 3) {
        printf("usage: %s <topic name> <data> [QoS level]\n", argv[0]);
        return 1;
    }

    /* parse QoS level */
    if (argc >= 4) {
        flags |= get_qos(argv[3]);
    }

    printf("pub with topic: %s and name %s and flags 0x%02x\n", argv[1], argv[2], (int)flags);

    /* step 1: get topic id */
    t.name = argv[1];
    if (emcute_reg(&t) != EMCUTE_OK) {
        puts("error: unable to obtain topic ID");
        return 1;
    }

    /* step 2: publish data */
    if (emcute_pub(&t, argv[2], strlen(argv[2]), flags) != EMCUTE_OK) {
        printf("error: unable to publish data to topic '%s [%i]'\n",
                t.name, (int)t.id);
        return 1;
    }

    printf("Published %i bytes to topic '%s [%i]'\n",
            (int)strlen(argv[2]), t.name, t.id);

    return 0;
}

static int cmd_sub(int argc, char **argv)
{
    unsigned flags = EMCUTE_QOS_0;

    if (argc < 2) {
        printf("usage: %s <topic name> [QoS level]\n", argv[0]);
        return 1;
    }

    if (strlen(argv[1]) > TOPIC_MAXLEN) {
        puts("error: topic name exceeds maximum possible size");
        return 1;
    }
    if (argc >= 3) {
        flags |= get_qos(argv[2]);
    }

    /* find empty subscription slot */
    unsigned i = 0;
    for (; (i < NUMOFSUBS) && (subscriptions[i].topic.id != 0); i++) {}
    if (i == NUMOFSUBS) {
        puts("error: no memory to store new subscriptions");
        return 1;
    }

    subscriptions[i].cb = on_pub;
    strcpy(topics[i], argv[1]);
    subscriptions[i].topic.name = topics[i];
    if (emcute_sub(&subscriptions[i], flags) != EMCUTE_OK) {
        printf("error: unable to subscribe to %s\n", argv[1]);
        return 1;
    }

    printf("Now subscribed to %s\n", argv[1]);
    return 0;
}

static int cmd_unsub(int argc, char **argv)
{
    if (argc < 2) {
        printf("usage %s <topic name>\n", argv[0]);
        return 1;
    }

    /* find subscriptions entry */
    for (unsigned i = 0; i < NUMOFSUBS; i++) {
        if (subscriptions[i].topic.name &&
            (strcmp(subscriptions[i].topic.name, argv[1]) == 0)) {
            if (emcute_unsub(&subscriptions[i]) == EMCUTE_OK) {
                memset(&subscriptions[i], 0, sizeof(emcute_sub_t));
                printf("Unsubscribed from '%s'\n", argv[1]);
            }
            else {
                printf("Unsubscription form '%s' failed\n", argv[1]);
            }
            return 0;
        }
    }

    printf("error: no subscription for topic '%s' found\n", argv[1]);
    return 1;
}

static int cmd_will(int argc, char **argv)
{
    if (argc < 3) {
        printf("usage %s <will topic name> <will message content>\n", argv[0]);
        return 1;
    }

    if (emcute_willupd_topic(argv[1], 0) != EMCUTE_OK) {
        puts("error: unable to update the last will topic");
        return 1;
    }
    if (emcute_willupd_msg(argv[2], strlen(argv[2])) != EMCUTE_OK) {
        puts("error: unable to update the last will message");
        return 1;
    }

    puts("Successfully updated last will topic and message");
    return 0;
}

static const shell_command_t shell_commands[] = {
    { "start", "start a station", cmd_start }, // My addition
    { "con", "connect to MQTT broker", cmd_con },
    { "discon", "disconnect from the current broker", cmd_discon },
    { "pub", "publish something", cmd_pub },
    { "sub", "subscribe topic", cmd_sub },
    { "unsub", "unsubscribe from topic", cmd_unsub },
    { "will", "register a last will", cmd_will },
    { NULL, NULL, NULL }
};


int main(void)
{
    puts("MQTT-SN example application\n");
    puts("Type 'help' to get started. Have a look at the README.md for more"
         "information.");

    /* the main thread needs a msg queue to be able to run `ping6`*/
    msg_init_queue(queue, ARRAY_SIZE(queue));

    /* initialize our subscription buffers */
    memset(subscriptions, 0, (NUMOFSUBS * sizeof(emcute_sub_t)));

    /* start the emcute thread */
    thread_create(stack, sizeof(stack), EMCUTE_PRIO, 0,
                  emcute_thread, NULL, "emcute");

    // Add a signal handler to close properly the program via Ctrl+c
    struct sigaction act;
    act.sa_handler = signal_handler;
    sigaction(SIGINT, &act, NULL);

    /* start shell */
    char line_buf[SHELL_DEFAULT_BUFSIZE];
    shell_run(shell_commands, line_buf, SHELL_DEFAULT_BUFSIZE);

    /* should be never reached */
    return 0;
}
