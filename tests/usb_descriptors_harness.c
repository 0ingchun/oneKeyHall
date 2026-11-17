#include <stdint.h>
#include <assert.h>
#include <stdio.h>
#include <string.h>
#define __code
#define __xdata
#define USB_GET_DESCRIPTOR 6
#define USB_SET_ADDRESS 5
#define DEFAULT_ENDP0_SIZE 8
#define bUEP_T_TOG 0x40
#define bUDA_GP_BIT 0x80
#define UEP_R_RES_ACK 0
#define UEP_T_RES_NAK 2
struct { uint8_t wValueH, wValueL, wIndexL, wIndexH, bRequestType; } setup;
#define UsbSetupBuf (&setup)
static uint8_t Ep0Buffer[8], UEP0_T_LEN, UEP0_CTRL, USB_DEV_AD, SetupReq;
static uint16_t SetupLen;

#define USB_REQ_TYP_MASK 0x60
#define USB_REQ_TYP_CLASS 0x20
#define USB_REQ_TYP_VENDOR 0x40
#define GET_LINE_CODING 0x21
#define SET_LINE_CODING 0x20
#define SET_CONTROL_LINE_STATE 0x22
static uint8_t hidIdle, HidProtocol = 1, HidEpoch;
static uint16_t getLineCodingHandler(void) { return 0; }
static void setControlLineStateHandler(void) {}

#define USB_CLEAR_FEATURE 1
#define USB_SET_FEATURE 3
#define USB_REQ_RECIP_MASK 0x1f
#define USB_REQ_RECIP_ENDP 2
#define bUEP_R_TOG 0x80
#define MASK_UEP_T_RES 3
#define MASK_UEP_R_RES 12
#define UEP_T_RES_STALL 3
#define UEP_R_RES_STALL 12
static uint8_t UEP1_CTRL, UEP2_CTRL, UEP3_CTRL;
