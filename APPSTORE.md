# Use Homey to monitor SMA inverters
This Homey app allows you to monitor your SMA inverter through the modbus protocol interface. Modbus is a serial communications protocol often used in connecting industrial electronic devices. The app currently supports reading Condition, Operational status, MPP A voltage and MPP B voltage, Grid Power, Grid Voltage(L1), Daily Yield and Total Yield.

## Supported devices
In the [support topic](https://community.athom.com/t/696) is a shortened list of supported inverters including the available connection types for each inverter. You can view the complete list of supported inverters in the second tab of this [Google sheets document](https://drive.google.com/file/d/1TF1kpXG1iz1xidIHFoD4WOr5wCsETIy7/view?usp=sharing). Unfortunately the configuration for reading out the data of each of these converters seems to differ. If you connect your inverter and you do not see all values appear in the Homey device, please use the support topic to ask for support for your type of inverter.

For Energy Meter both SMA Energy Meter and SMA Home Manager 2 is supported.

## Instructions for inverters
For Homey to be able to communicate with your SMA inverter over the modbus protocol this needs to be enabled on the inverter. You can enable modbus communication using the [SMA Sunny Explorer](https://www.sma.de/en/products/monitoring-control/sunny-explorer.html) software or the webinterface on specific models (like the Sunny Boy 1.5 to Sunny Boy 5.0). For all other models download and install the SMA Sunny Explorer software, the installable is located under PC Software in the previous link. During installation it may ask you to install the .NET framework 3.5 as well. Now follow these steps.
* Start Sunny Explorer installer and choose to create a new install (or load a previous one if you used Sunny Explorer before) or start the webinterface for the Sunny Boy 1.5 to Sunny Boy 5.0 models;
* Select Speedwire as communication protocol, hit next and wait for Sunny Explorer to discover your inverter. Once found select your inverter (and remember it's IP address);
* In the login screen select the "Installer" user. Enter the password, by default password this is 1111 but this might have been changed by your installer. In this case you will have to retrieve it from your installer;
* Once logged in to your inverter wait for a moment for the data to load. Then click on your inverter in the left pane and after that on the settings tab. Click on the external communications menu item and click on edit. Now enable the option 'Modbus TCP Server' and if available and not already enabled the option 'Webconnect'. You can leave the port for the Modbus TCP Server to the default 502. If you change it here make sure you enter the correct port in the app settings before you try to add your inverter. If you have saved your changes you can close Sunny Explorer.
* Now go into Homey and add a new device. Select the inverter device from the SMA Inverters app and enter the IP address, Port and Polling Frequency. The polling frequency determines how often Homey reads out the inverter. The default 5 seconds should be good. Now add the device and if all went well your inverter is now being monitored by Homey.

## Support topic
For support please use the official support topic on the forum [here](https://community.athom.com/t/696).

## Changelog
### v2.0.0 - 2019-10-20
* New device discovery method for inverters. Using Speedwire Device Discovery, the local network is queried for SMA products.
* Inverters only show supported capabilities (new Homey v3 support)
* Four new capabilities added on inverters that support it; condition, operational status, MPP A voltage and MPP B voltage
* Device information added for inverters in device advanced settings section; Device type, Serial number, software version, max power, power limit and grid country standard.
* SMA Energy Meter/Home Manager 2 device type added.
* SMA Summary device type added. Requires at least one inverter and one Energy Meter device type already added to your Homey.

### v1.1.1 - 2019-10-14
* Change device class to solar panel for SMA inverters
* Updated dependencies
