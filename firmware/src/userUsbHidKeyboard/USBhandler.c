
#include "USBhandler.h"

#include "USBconstant.h"
#include "../ChipInfo.h"

//CDC functions:
void resetCDCParameters();
void setLineCodingHandler();
uint16_t getLineCodingHandler();
void setControlLineStateHandler();
void USB_EP2_IN();
void USB_EP2_OUT();

__xdata __at (EP0_ADDR) uint8_t  Ep0Buffer[8];     
__xdata __at (EP1_ADDR) uint8_t  Ep1Buffer[8];       //on page 47 of data sheet, the receive buffer need to be min(possible packet size+2,64)
__xdata __at (EP2_ADDR) uint8_t  Ep2Buffer[128];     //IN and OUT buffer, must be even address
__xdata __at (EP3_ADDR) uint8_t  Ep3Buffer[80];



volatile __xdata uint8_t UpPoint1_Busy = 0;  // Flag of whether upload pointer is busy


uint16_t SetupLen;
uint8_t SetupReq;
volatile uint8_t UsbConfig, HidProtocol = 1, UsbSuspended, HidEpoch;
static uint8_t hidIdle;
extern volatile __xdata uint8_t UpPoint3_Busy;

const uint8_t *pDescr;
static __xdata uint8_t customName[42];

void USBPrepareName(__xdata uint8_t *name, uint8_t length) {
    static const __code char hex[] = "0123456789ABCDEF";
    customName[0] = 2 + (length ? length : 20) * 2;
    customName[1] = 3;
    if (length) {
        for (uint8_t i = 0; i < length * 2; ++i) customName[2 + i] = name[i];
    } else {
        for (uint8_t i = 0; i < 10; ++i) {
            customName[2 + i * 2] = Prod_Des[i + 1];
            customName[3 + i * 2] = 0;
        }
        for (uint8_t i = 0; i < 5; ++i) {
            uint8_t value = chipInfo[2 + i];
            customName[22 + i * 4] = hex[value >> 4];
            customName[24 + i * 4] = hex[value & 15];
            customName[23 + i * 4] = customName[25 + i * 4] = 0;
        }
    }
}

inline void NOP_Process(void) {}

void USB_EP0_SETUP(){
    uint8_t len = USB_RX_LEN;
    uint16_t descrLen = 0;
    if(len == (sizeof(USB_SETUP_REQ)))
    {
        SetupLen = ((uint16_t)UsbSetupBuf->wLengthH<<8) | (UsbSetupBuf->wLengthL);
        len = 0;                                                      // Default is success and upload 0 length
        SetupReq = UsbSetupBuf->bRequest;
        if ( ( UsbSetupBuf->bRequestType & USB_REQ_TYP_MASK ) != USB_REQ_TYP_STANDARD )//Not standard request
        {
            
            //here is the commnunication starts, refer to usbFunctionSetup of USBtiny
            //or usb_setup in usbtiny
            
            switch( ( UsbSetupBuf->bRequestType & USB_REQ_TYP_MASK ))
            {
                case USB_REQ_TYP_VENDOR:    
                {
                    switch( SetupReq )
                    {
                        default:
                            len = 0xFF;                                                                        //command not supported
                            break;
                    }
                    break;
                }
                case USB_REQ_TYP_CLASS:
                {
                    if (UsbSetupBuf->wIndexL == 2) {
                        switch (SetupReq) {
                            case 1: // GET_REPORT: Contact Count Maximum feature.
                                if (UsbSetupBuf->wValueH != 3 || UsbSetupBuf->wValueL != 5) { len = 0xff; break; }
                                Ep0Buffer[0] = 5; Ep0Buffer[1] = 1; len = SetupLen < 2 ? SetupLen : 2; break;
                            case 2: Ep0Buffer[0] = hidIdle; len = SetupLen ? 1 : 0; break;
                            case 3: Ep0Buffer[0] = HidProtocol; len = SetupLen ? 1 : 0; break;
                            case 9: // SET_REPORT: only the keyboard LED output report.
                                if (UsbSetupBuf->wValueH != 2 || UsbSetupBuf->wValueL != (HidProtocol ? 1 : 0)) len = 0xff;
                                break;
                            case 10: hidIdle = UsbSetupBuf->wValueH; break;
                            case 11:
                                if (UsbSetupBuf->wValueL > 1) { len = 0xff; break; }
                                HidProtocol = UsbSetupBuf->wValueL; HidEpoch++; break;
                            default: len = 0xff; break;
                        }
                    } else if (UsbSetupBuf->wIndexL == 0) {
                        switch (SetupReq) {
                            case GET_LINE_CODING: len = getLineCodingHandler(); break;
                            case SET_CONTROL_LINE_STATE: setControlLineStateHandler(); break;
                            case SET_LINE_CODING: break;
                            default: len = 0xff; break;
                        }
                    } else len = 0xff;
                    break;
                }
                default:
                    len = 0xFF;                                                                        //command not supported
                    break;
            }

        }
        else                                                             //Standard request
        {
            switch(SetupReq)                                             //Request ccfType
            {
                case USB_GET_DESCRIPTOR:
                    switch(UsbSetupBuf->wValueH)
                {
                    case 1:                                                       //Device Descriptor
                        pDescr = DevDesc;                                         //Put Device Descriptor into outgoing buffer
                        descrLen = DevDescLen;
                        break;
                    case 2:                                                        //Configure Descriptor
                        pDescr = CfgDesc;                                       
                        descrLen = CfgDescLen;
                        break;
                    case 3:
                        if(UsbSetupBuf->wValueL == 0)
                        {
                            pDescr = LangDes;
                            descrLen = LangDesLen;
                        }
                        else if(UsbSetupBuf->wValueL == 1)
                        {
                            pDescr = (__code uint8_t *)Prod_Des;
                            descrLen = Prod_DesLen;
                        }
                        else if(UsbSetupBuf->wValueL == 2)
                        {
                            pDescr = customName; descrLen = customName[0];
                        }
                        else if(UsbSetupBuf->wValueL == 3)
                        {
                            pDescr = (__code uint8_t *)SerDes;
                            descrLen = SerDesLen;
                        }
                        else if(UsbSetupBuf->wValueL == 4)
                        {
                            pDescr = customName; descrLen = customName[0];
                        }
                        else
                        {
                            pDescr = (__code uint8_t *)SerDes;
                            descrLen = SerDesLen;
                        }
                        break;
                    case 0x21:
                        pDescr = CfgDesc + 84; descrLen = 9; break;
                    case 0x22:
                        if(UsbSetupBuf->wValueL == 0){
                            pDescr = ReportDesc;
                            descrLen = ReportDescLen;
                        }
                        else
                        {
                            len = 0xff;  
                        }
                        break;
                    default:
                        len = 0xff;                                                // Unsupported descriptors or error
                        break;
                }
                    if (len != 0xff){
                        if ( SetupLen > descrLen )
                        {
                            SetupLen = descrLen;    // Limit length
                        }
                        len = SetupLen >= DEFAULT_ENDP0_SIZE ? DEFAULT_ENDP0_SIZE : SetupLen;                            //transmit length for this packet
                        for (uint8_t i=0;i<len;i++){
                            Ep0Buffer[i] = pDescr[i];
                        }
                        SetupLen -= len;
                        pDescr += len;
                    }
                    break;
                case USB_SET_ADDRESS:
                    SetupLen = UsbSetupBuf->wValueL;                              // Save the assigned address
                    break;
                case USB_GET_CONFIGURATION:
                    Ep0Buffer[0] = UsbConfig;
                    if ( SetupLen >= 1 )
                    {
                        len = 1;
                    }
                    break;
                case USB_SET_CONFIGURATION:
                    UsbConfig = UsbSetupBuf->wValueL; HidEpoch++;
                    break;
                case USB_GET_INTERFACE:
                    break;
                case USB_SET_INTERFACE:
                    break;
                case USB_CLEAR_FEATURE:
                case USB_SET_FEATURE:
                    if ((UsbSetupBuf->bRequestType & USB_REQ_RECIP_MASK) != USB_REQ_RECIP_ENDP ||
                        UsbSetupBuf->wValueH || UsbSetupBuf->wValueL || UsbSetupBuf->wIndexH) { len = 0xff; break; }
                    // No remote wakeup and no undeclared endpoints. Clear HALT resets DATA toggle.
                    switch (UsbSetupBuf->wIndexL) {
                        case 0x81:
                            UEP1_CTRL = (UEP1_CTRL & ~(bUEP_T_TOG | MASK_UEP_T_RES)) |
                                (SetupReq == USB_SET_FEATURE ? UEP_T_RES_STALL : UEP_T_RES_NAK); break;
                        case 0x82:
                            UEP2_CTRL = (UEP2_CTRL & ~(bUEP_T_TOG | MASK_UEP_T_RES)) |
                                (SetupReq == USB_SET_FEATURE ? UEP_T_RES_STALL : UEP_T_RES_NAK); break;
                        case 0x83:
                            UEP3_CTRL = (UEP3_CTRL & ~(bUEP_T_TOG | MASK_UEP_T_RES)) |
                                (SetupReq == USB_SET_FEATURE ? UEP_T_RES_STALL : UEP_T_RES_NAK); break;
                        case 0x02:
                            UEP2_CTRL = (UEP2_CTRL & ~(bUEP_R_TOG | MASK_UEP_R_RES)) |
                                (SetupReq == USB_SET_FEATURE ? UEP_R_RES_STALL : UEP_R_RES_ACK); break;
                        default: len = 0xff; break;
                    }
                    break;
                case USB_GET_STATUS:
                    Ep0Buffer[0] = 0x00;
                    Ep0Buffer[1] = 0x00;
                    if ( SetupLen >= 2 )
                    {
                        len = 2;
                    }
                    else
                    {
                        len = SetupLen;
                    }
                    break;
                default:
                    len = 0xff;                                                    // Failed
                    break;
            }
        }
    }
    else
    {
        len = 0xff;                                                         //Wrong packet length
    }
    if(len == 0xff)
    {
        SetupReq = 0xFF;
        UEP0_CTRL = bUEP_R_TOG | bUEP_T_TOG | UEP_R_RES_STALL | UEP_T_RES_STALL;//STALL
    }
    else if(len <= DEFAULT_ENDP0_SIZE)                                                       // Tx data to host or send 0-length packet
    {
        UEP0_T_LEN = len;
        UEP0_CTRL = bUEP_R_TOG | bUEP_T_TOG | UEP_R_RES_ACK | UEP_T_RES_ACK;//Expect DATA1, Answer ACK
    }
    else
    {
        UEP0_T_LEN = 0;  // Tx data to host or send 0-length packet
        UEP0_CTRL = bUEP_R_TOG | bUEP_T_TOG | UEP_R_RES_ACK | UEP_T_RES_ACK;//Expect DATA1, Answer ACK
    }
}

void USB_EP0_IN(){
    switch(SetupReq)
    {
        case USB_GET_DESCRIPTOR:
        {
            uint8_t len = SetupLen >= DEFAULT_ENDP0_SIZE ? DEFAULT_ENDP0_SIZE : SetupLen;                                 //send length
            for (uint8_t i=0;i<len;i++){
                Ep0Buffer[i] = pDescr[i];
            }
            //memcpy( Ep0Buffer, pDescr, len );                                  
            SetupLen -= len;
            pDescr += len;
            UEP0_T_LEN = len;
            UEP0_CTRL ^= bUEP_T_TOG;                    //Switch between DATA0 and DATA1
        }
            break;
        case USB_SET_ADDRESS:
            USB_DEV_AD = USB_DEV_AD & bUDA_GP_BIT | SetupLen;
            UEP0_CTRL = UEP_R_RES_ACK | UEP_T_RES_NAK;
            break;
        default:
            UEP0_T_LEN = 0;                                                      // End of transaction
            UEP0_CTRL = UEP_R_RES_ACK | UEP_T_RES_NAK;
            break;
    }
}

void USB_EP0_OUT(){
    if (SetupReq == 9) {
        if (U_TOG_OK && USB_RX_LEN >= (HidProtocol ? 2 : 1)) Ep3Buffer[0] = Ep0Buffer[HidProtocol ? 1 : 0];
        UEP0_T_LEN = 0; UEP0_CTRL |= UEP_R_RES_ACK | UEP_T_RES_ACK;
    }
    else if(SetupReq ==SET_LINE_CODING)  //Set line coding
    {
        if( U_TOG_OK )
        {
            setLineCodingHandler();
            UEP0_T_LEN = 0;
            UEP0_CTRL |= UEP_R_RES_ACK | UEP_T_RES_ACK;  // send 0-length packet
        }
    }
    else
    {
        UEP0_T_LEN = 0;
        UEP0_CTRL |= UEP_R_RES_ACK | UEP_T_RES_NAK;  //Respond Nak
    }
}


void USB_EP1_IN(){
    UEP1_T_LEN = 0;
    UEP1_CTRL = UEP1_CTRL & ~ MASK_UEP_T_RES | UEP_T_RES_NAK;           // Default NAK
}




#pragma save
#pragma nooverlay
void USBInterrupt(void) {   //inline not really working in multiple files in SDCC
    if(UIF_TRANSFER) {
        // Dispatch to service functions
        uint8_t callIndex=USB_INT_ST & MASK_UIS_ENDP;
        switch (USB_INT_ST & MASK_UIS_TOKEN) {
            case UIS_TOKEN_OUT:
            {//SDCC will take IRAM if array of function pointer is used.
                switch (callIndex) {
                    case 0: EP0_OUT_Callback(); break;
                    case 1: EP1_OUT_Callback(); break;
                    case 2: EP2_OUT_Callback(); break;
                    case 3: EP3_OUT_Callback(); break;
                    case 4: EP4_OUT_Callback(); break;
                    default: break;
                }
            }
                break;
            case UIS_TOKEN_SOF:
            {//SDCC will take IRAM if array of function pointer is used.
                switch (callIndex) {
                    case 0: EP0_SOF_Callback(); break;
                    case 1: EP1_SOF_Callback(); break;
                    case 2: EP2_SOF_Callback(); break;
                    case 3: EP3_SOF_Callback(); break;
                    case 4: EP4_SOF_Callback(); break;
                    default: break;
                }
            }
                break;
            case UIS_TOKEN_IN:
            {//SDCC will take IRAM if array of function pointer is used.
                switch (callIndex) {
                    case 0: EP0_IN_Callback(); break;
                    case 1: EP1_IN_Callback(); break;
                    case 2: EP2_IN_Callback(); break;
                    case 3: EP3_IN_Callback(); break;
                    case 4: EP4_IN_Callback(); break;
                    default: break;
                }
            }
                break;
            case UIS_TOKEN_SETUP:
            {//SDCC will take IRAM if array of function pointer is used.
                switch (callIndex) {
                    case 0: EP0_SETUP_Callback(); break;
                    case 1: EP1_SETUP_Callback(); break;
                    case 2: EP2_SETUP_Callback(); break;
                    case 3: EP3_SETUP_Callback(); break;
                    case 4: EP4_SETUP_Callback(); break;
                    default: break;
                }
            }
                break;
        }
        
        UIF_TRANSFER = 0;                                                     // Clear interrupt flag
    }
    
    // Device mode USB bus reset
    if(UIF_BUS_RST) {
        UEP0_CTRL = UEP_R_RES_ACK | UEP_T_RES_NAK;
        UEP1_CTRL = bUEP_AUTO_TOG | UEP_T_RES_NAK;                //Endpoint 1 automatically flips the sync flag, and IN transaction returns NAK
        UEP2_CTRL = bUEP_AUTO_TOG | UEP_T_RES_NAK | UEP_R_RES_ACK;        //Endpoint 2 automatically flips the sync flag, IN transaction returns NAK, OUT returns ACK
        //UEP4_CTRL = UEP_T_RES_NAK | UEP_R_RES_ACK;  //bUEP_AUTO_TOG only work for endpoint 1,2,3
        
        USB_DEV_AD = 0x00;
        UIF_SUSPEND = 0;
        UIF_TRANSFER = 0;
        UIF_BUS_RST = 0;                                                        // Clear interrupt flag
        
        UsbConfig = 0; HidProtocol = 1; UsbSuspended = 0; HidEpoch++;
        UpPoint3_Busy = 0; UEP3_T_LEN = 0;
        UEP3_CTRL = bUEP_AUTO_TOG | UEP_T_RES_NAK | UEP_R_RES_ACK;
        resetCDCParameters();
    }
    
    // USB bus suspend / wake up
    if (UIF_SUSPEND) {
        UIF_SUSPEND = 0;
        UsbSuspended = !!(USB_MIS_ST & bUMS_SUSPEND); HidEpoch++;
        if ( USB_MIS_ST & bUMS_SUSPEND ) {                    // Suspend
            
            //while ( XBUS_AUX & bUART0_TX );                    // Wait for Tx
            //SAFE_MOD = 0x55;
            //SAFE_MOD = 0xAA;
            //WAKE_CTRL = bWAK_BY_USB | bWAK_RXD0_LO;    // Wake up by USB or RxD0
            //PCON |= PD;                                                            // Chip sleep
            //SAFE_MOD = 0x55;
            //SAFE_MOD = 0xAA;
            //WAKE_CTRL = 0x00;
            
        } else {    // Unexpected interrupt, not supposed to happen !
            USB_INT_FG = 0xFF;        // Clear interrupt flag
        }
    }
}
#pragma restore

void USBDeviceCfg()
{
    USB_CTRL = 0x00;                                                           //Clear USB control register
    USB_CTRL &= ~bUC_HOST_MODE;                                                //This bit is the device selection mode
    USB_CTRL |=  bUC_DEV_PU_EN | bUC_INT_BUSY | bUC_DMA_EN;                    //USB device and internal pull-up enable, automatically return to NAK before interrupt flag is cleared during interrupt
    USB_DEV_AD = 0x00;                                                         //Device address initialization
    //     USB_CTRL |= bUC_LOW_SPEED;
    //     UDEV_CTRL |= bUD_LOW_SPEED;                                                //Run for 1.5M
    USB_CTRL &= ~bUC_LOW_SPEED;
    UDEV_CTRL &= ~bUD_LOW_SPEED;                                             //Select full speed 12M mode, default mode

#if defined(CH551) || defined(CH552) || defined(CH549)
    UDEV_CTRL = bUD_PD_DIS;                                                     // Disable DP/DM pull-down resistor
#endif
#if defined(CH559)
    UDEV_CTRL = bUD_DP_PD_DIS;                                                     // Disable DP/DM pull-down resistor
#endif
    UDEV_CTRL |= bUD_PORT_EN;                                                  //Enable physical port
}

void USBDeviceIntCfg()
{
    USB_INT_EN |= bUIE_SUSPEND;                                               //Enable device hang interrupt
    USB_INT_EN |= bUIE_TRANSFER;                                              //Enable USB transfer completion interrupt
    USB_INT_EN |= bUIE_BUS_RST;                                               //Enable device mode USB bus reset interrupt
    USB_INT_FG |= 0x1F;                                                       //Clear interrupt flag
    IE_USB = 1;                                                               //Enable USB interrupt
    EA = 1;                                                                   //Enable global interrupts
}

void USBDeviceEndPointCfg()
{
#if defined(CH559)
    //CH559 use differend endianness for these registers
    UEP0_DMA_H = ((uint16_t)Ep0Buffer >> 8);                                                      //Endpoint 0 data transfer address
    UEP0_DMA_L = ((uint16_t)Ep0Buffer >> 0);                                                      //Endpoint 0 data transfer address
    UEP1_DMA_H = ((uint16_t)Ep1Buffer >> 8);                                                      //Endpoint 1 data transfer address
    UEP1_DMA_L = ((uint16_t)Ep1Buffer >> 0);                                                      //Endpoint 1 data transfer address
    UEP2_DMA_H = ((uint16_t)Ep2Buffer >> 8);                                                      //Endpoint 2 data transfer address
    UEP2_DMA_L = ((uint16_t)Ep2Buffer >> 0);                                                      //Endpoint 2 data transfer address
#else
    UEP0_DMA = (uint16_t) Ep0Buffer;                                                      //Endpoint 0 data transfer address
    UEP1_DMA = (uint16_t) Ep1Buffer;                                                      //Endpoint 1 data transfer address
    UEP2_DMA = (uint16_t) Ep2Buffer;                                                      //Endpoint 2 data transfer address
    UEP3_DMA = (uint16_t) Ep3Buffer;                                                      //Endpoint 3 data transfer address
#endif
    UEP2_3_MOD = 0x0C;  
    UEP2_3_MOD |= bUEP3_TX_EN;		// Enable Endpoint2 Tx
	UEP2_3_MOD |= bUEP3_RX_EN;		// Enable Endpoint2 Rx                                                       //Endpoint2 double buffer
    UEP1_CTRL = bUEP_AUTO_TOG | UEP_T_RES_NAK;                //Endpoint 1 automatically flips the sync flag, and IN transaction returns NAK
    UEP2_CTRL = bUEP_AUTO_TOG | UEP_T_RES_NAK | UEP_R_RES_ACK;        //Endpoint 2 automatically flips the sync flag, IN transaction returns NAK, OUT returns ACK
    UEP3_CTRL = bUEP_AUTO_TOG | UEP_T_RES_NAK | UEP_R_RES_ACK;        //Endpoint 2 automatically flips the sync flag, IN transaction returns NAK, OUT returns ACK
    
    UEP4_1_MOD = 0X40;                                                         //endpoint1 TX enable
    UEP0_CTRL = UEP_R_RES_ACK | UEP_T_RES_NAK;                //Manual flip, OUT transaction returns ACK, IN transaction returns NAK
}

