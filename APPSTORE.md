# Use Homey to monitor SMA inverters
This Homey app allows you to monitor your SMA inverter through the modbus protocol interface. Modbus is a serial communications protocol often used in connecting industrial electronic devices.

## Supported devices
Below is a shortend list of supported inverters including the available connection types for each inverter. View the complete list of supported inverters in the second tab of this [Google sheets document](https://docs.google.com/spreadsheets/d/1VDGGXSl3RE10oLtm8JgIrXKaZEp1--tMOS92ZPGuF4g/edit?usp=sharing). Unfortunately the configuration for reading out the data of each of these converters seems to differ. I have only tested it with an older Sunny Boy 2500TL. Support for other inverters may need to be added seperately and might require some research. If you connect your inverter and you do not see correct values appear in the Homey device, please use the support topic to ask for support for your type of inverter.

| TYPE | CONNECTION | STATUS |
| ------ | ------ | ------ |
| Sunny Boy 2500TL | Retrofit Webconnect | Tested |
| Sunny Boy 1.5 / 2.5 | Webconnect or WLAN | Untested |
| Sunny Boy 3.0 / 3.6 / 4.0 / 5.0 | Webconnect or WLAN | Untested |
| Sunny Tripower 5/6/7/8/9/10/12000TL-20 | Webconnect | Untested |
| Sunny Tripower 15/20/25000TL-30 | Webconnect | Untested |
| Sunny Tripower Core1 (50KW) | Webconnect or Datamanager M | Untested |
| Sunny Tripower 60 + Inverter Manager | Ethernet | Untested |
| Sunny Tripower Peak1 + Inverter Manager | Ethernet | Untested |

## Instructions
