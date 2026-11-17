#include "USBCDC.h"
#include <stdint.h>
#include <stdbool.h>
#include "include/ch5xx.h"
#include "include/ch5xx_usb.h"


#define LINE_CODEING_SIZE 7
__xdata uint8_t LineCoding[LINE_CODEING_SIZE]={0x00,0xe1,0x00,0x00,0x00,0x00,0x08};   //Initialize for baudrate 57600, 1 stopbit, No parity, eight data bits

volatile __xdata uint8_t USBByteCountEP2 = 0;      //Bytes of received data on USB endpoint
volatile __xdata uint8_t USBBufOutPointEP2 = 0;    //Data pointer for fetching

volatile __bit UpPoint2BusyFlag  = 0;   //Flag of whether upload pointer is busy
volatile __xdata uint8_t controlLineState = 0;

__xdata uint8_t usbWritePointer = 0;

void delayMicroseconds(uint16_t us);

// ISP handoff candidate: reset USB and discard the Arduino timer mode.
// Physical ISP enumeration still needs validation on the user's board.
void USBEnterBootloader(void) {
#if BOOT_LOAD_ADDR != 0x3800
#error "OneKeyHall ISP reproduction requires the CH552 bootloader at 0x3800"
#endif
    EA = 0;
    USB_INT_EN = 0;
    USB_CTRL = bUC_RESET_SIE | bUC_CLR_ALL;
    USB_DEV_AD = 0;
    delayMicroseconds(50000);
    delayMicroseconds(50000);
    // The core uses Timer0 mode 2. Bootloaders that OR in mode 1 would
    // otherwise select split mode 3. Clear only at the final handoff,
    // after all application timing (including the ACK grace period).
    TMOD = 0;
    __asm__ ("lcall #0x3800");
    while (1);
}

void resetCDCParameters(){

    USBByteCountEP2 = 0; controlLineState = 0; usbWritePointer = 0;
    USBBufOutPointEP2 = 0; // Reset all CDC state across USB enumeration.
    UpPoint2BusyFlag = 0;
}

void setLineCodingHandler(){
    for (uint8_t i=0;i<((LINE_CODEING_SIZE<=USB_RX_LEN)?LINE_CODEING_SIZE:USB_RX_LEN);i++){
        LineCoding[i] = Ep0Buffer[i];
    }
    
    //!!!!!Config_Uart0(LineCoding);
}

uint16_t getLineCodingHandler(){
    uint16_t returnLen;

    returnLen = LINE_CODEING_SIZE;
    for (uint8_t i=0;i<returnLen;i++){
        Ep0Buffer[i] = LineCoding[i];
    }

    return returnLen;
}

void setControlLineStateHandler(){
    controlLineState = Ep0Buffer[2];
    // Automatic CDC line-state / 1200-baud entry is disabled.
    // Manual ISP entry is handled by command 99.
}

bool USBSerial(){
    bool result = false;
    if (controlLineState > 0)
        result = true;
    //delay(10); not doing it for now
    return result;
}


void USBSerial_flush(void){
    if (!UpPoint2BusyFlag && usbWritePointer>0){
        UEP2_T_LEN = usbWritePointer;                                                   
        UEP2_CTRL = UEP2_CTRL & ~ MASK_UEP_T_RES | UEP_T_RES_ACK;            //Respond ACK
        UpPoint2BusyFlag = 1;
        usbWritePointer = 0;
    }
}

uint8_t USBSerial_write(char c){  //3 bytes generic pointer
    uint16_t waitWriteCount;
    if (controlLineState > 0) {
        while (true){
            waitWriteCount = 0;
            while (UpPoint2BusyFlag){//wait for 250ms or give up, on my mac it takes about 256us
                waitWriteCount++;
                delayMicroseconds(5);
                if (waitWriteCount>=50000) return 0;
            }
            if (usbWritePointer<MAX_PACKET_SIZE){
                Ep2Buffer[MAX_PACKET_SIZE+usbWritePointer] = c;
                usbWritePointer++;
                return 1;
            }else{
                USBSerial_flush();  //go back to first while
            }
        }
    }
    return 0;
}

uint8_t USBSerial_available(){
    return USBByteCountEP2;
}

char USBSerial_read(){
    if(USBByteCountEP2==0) return 0;
    char data = Ep2Buffer[USBBufOutPointEP2];
    USBBufOutPointEP2++;
    USBByteCountEP2--;
    if(USBByteCountEP2==0) {
        UEP2_CTRL = UEP2_CTRL & ~ MASK_UEP_R_RES | UEP_R_RES_ACK;
    }
    return data;
}

void USB_EP2_IN(){
    UEP2_T_LEN = 0;                                                    // No data to send anymore
    UEP2_CTRL = UEP2_CTRL & ~ MASK_UEP_T_RES | UEP_T_RES_NAK;           //Respond NAK by default
    UpPoint2BusyFlag = 0;                                                  //Clear busy flag
}

void USB_EP2_OUT(){
    if ( U_TOG_OK )                                                     // Discard unsynchronized packets
    {
        USBByteCountEP2 = USB_RX_LEN;
        USBBufOutPointEP2 = 0;                                             //Reset Data pointer for fetching
        if (USBByteCountEP2)    UEP2_CTRL = UEP2_CTRL & ~ MASK_UEP_R_RES | UEP_R_RES_NAK;       //Respond NAK after a packet. Let main code change response after handling.
    }
}

void USBInit(){
    USBDeviceCfg();                                                       //Device mode configuration
    USBDeviceEndPointCfg();                                               //Endpoint configuration   
    USBDeviceIntCfg();                                                    //Interrupt configuration    
    UEP0_T_LEN = 0;
    UEP1_T_LEN = 0;                                                       //Pre-use send length must be cleared	  
    UEP2_T_LEN = 0;                                                          
    UEP3_T_LEN = 0;                                                          
}
