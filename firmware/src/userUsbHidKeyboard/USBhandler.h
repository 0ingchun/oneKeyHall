#ifndef __USB_HANDLER_H__
#define __USB_HANDLER_H__

#include <stdint.h>
#include "include/ch5xx.h"
#include "include/ch5xx_usb.h"

#define  EP0_ADDR 0
#define  EP1_ADDR 10
#define  EP2_ADDR 20
#define  EP3_ADDR 160


extern __xdata __at (EP0_ADDR) uint8_t  Ep0Buffer[];
extern __xdata __at (EP1_ADDR) uint8_t  Ep1Buffer[];
extern __xdata __at (EP2_ADDR) uint8_t  Ep2Buffer[];
extern __xdata __at (EP3_ADDR) uint8_t  Ep3Buffer[];


extern uint16_t SetupLen;
extern uint8_t SetupReq;
extern volatile uint8_t UsbConfig, HidProtocol, UsbSuspended, HidEpoch;
uint8_t HIDReady(void);
uint8_t HIDSend(uint8_t id, const __xdata uint8_t *data, uint8_t length);
extern const uint8_t *pDescr;
void USBPrepareName(__xdata uint8_t *name, uint8_t length);

#define UsbSetupBuf     ((PUSB_SETUP_REQ)Ep0Buffer)

// Out
#define EP0_OUT_Callback USB_EP0_OUT
#define EP1_OUT_Callback NOP_Process
#define EP2_OUT_Callback USB_EP2_OUT
#define EP3_OUT_Callback NOP_Process
#define EP4_OUT_Callback NOP_Process

// SOF
#define EP0_SOF_Callback NOP_Process
#define EP1_SOF_Callback NOP_Process
#define EP2_SOF_Callback NOP_Process
#define EP3_SOF_Callback NOP_Process
#define EP4_SOF_Callback NOP_Process

// IN
#define EP0_IN_Callback USB_EP0_IN
#define EP1_IN_Callback USB_EP1_IN
#define EP2_IN_Callback USB_EP2_IN
#define EP3_IN_Callback USB_EP3_IN
#define EP4_IN_Callback NOP_Process

// SETUP
#define EP0_SETUP_Callback USB_EP0_SETUP
#define EP1_SETUP_Callback NOP_Process
#define EP2_SETUP_Callback NOP_Process
#define EP3_SETUP_Callback NOP_Process
#define EP4_SETUP_Callback NOP_Process

void USB_EP3_IN(void);
void USBInterrupt(void);
void USBDeviceCfg();
void USBDeviceIntCfg();
void USBDeviceEndPointCfg();


#endif
