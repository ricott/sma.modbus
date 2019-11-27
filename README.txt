This Homey app allows you to monitor your SMA solar devices using the modbus and speedwire protocol.

Supported devices
- Inverters
- Sunny Boy Storage
- Energy Meter (incl. Home Manager 2)
- Energy Summary

Inverters
Version 2 of the app tries to figure out which capabilities each inverter has using a mapping logic and will only show capabilities in Homey that the inverter supports. For instance, some inverters don't support daily yield, then this capability won't be displayed in Homey for that inverter.

You can view a somewhat complete list of supported inverters in the second tab of this Google sheets document, https://drive.google.com/file/d/1TF1kpXG1iz1xidIHFoD4WOr5wCsETIy7/view?usp=sharing. If you connect your inverter and you do not see all values appear in the Homey device, please use the support topic to ask for support for your type of inverter. The device type (e.g. STP 25000TL-30) of the inverter should always be possible to access, by default this is also used as the device name when you add a new inverter to Homey. Please include this information in any support request.

The most basic capability set that all inverters should support are; grid power, grid voltage and total yield. If you only get these values on a "modern" inverter please comment in the support thread, most likely the mapping is incorrect.

Sunny Boy Storage
Shows operational status, battery, charge, discharge, power drawn, grid feed-in and battery capacity of Sunny Boy Storage products using the modbus protocol.

Energy Meter
The Energy Meter device type supports both the Energy Meter and the Home Manager 2.0 products. Both products generate the same multicast datagrams required to access the built-in meter information.
This device type will be recognized in Homey as a smart meter and visualized properly on the energy tab.

It can be used to load balance against main fuse. There are three settings for the device, main fuze (A), threshold (%) and available current offset(A). Each phase (L1, L2, and L3) can trigger a phase utilization alert if a phase is loaded more than the threshold. There are two conditions to check for an individual phase's utilization or all phases. A global tag is published with the current 'Available current' in Amp.

Energy Summary
The Energy Summary is a virtual device that gathers information from inverter and energy meter devices registered in your Homey. It will only display information from inverters and energy meter devices from this app. It shows four values; PV Power, Grid Power, Battery Power, and Consumption.

Enable modbus in your inverter/storage product
For Homey to be able to communicate with your inverter over the modbus protocol this needs to be enabled on the inverter. You can enable modbus communication using the SMA Sunny Explorer, https://www.sma.de/en/products/monitoring-control/sunny-explorer.html software or the web interface on specific models (like the Sunny Boy 1.5 to Sunny Boy 5.0). For all other models download and install the SMA Sunny Explorer software, the installable is located under PC Software in the previous link. During installation, it may ask you to install the .NET framework 3.5 as well. Now follow these steps.
* Start Sunny Explorer installer and choose to create a new install (or load a previous one if you used Sunny Explorer before) or start the web interface for the Sunny Boy 1.5 to Sunny Boy 5.0 models;
* Select Speedwire as communication protocol, hit next and wait for Sunny Explorer to discover your inverter. Once found select your inverter (and remember it's IP address);
* In the login screen you need to select the "Installer" user. Enter the password, by default password this is 1111 but this might have been changed by your installer. In this case, you will have to retrieve it from your installer;
* Once logged in to your inverter wait for a moment for the data to load. Then click on your inverter in the left pane and after that on the settings tab. Click on the external communications menu item and click on edit. Now enable the option 'Modbus TCP Server' and if available and not already enabled the option 'Webconnect'. It is recommended to leave the port for the Modbus TCP Server to the default 502. If you change it here make sure you enter the correct port in the app settings before you try to add your inverter. If you have saved your changes you can close Sunny Explorer.
* Now go into Homey and add a new device. Select the inverter device from the SMA Solar app. Your inverter should be found automatically assuming modbus port in-app settings match the modbus port of the inverter (default 502).