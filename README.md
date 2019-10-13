# SMA Modbus
Homey app for monitoring SMA inverters through modbus protocol interface.

## Updates
- New device type, Tripower
- New information settings, showing properties from inverter such as device type, serial number, software version and max capacity.
- New decoder functions that honour the SMA data type specs
- Additional device properties; DC voltage for Tripower dual MPP trackers, A and B. Condition and operational status.
- Moved SMA modbus logic to separate file(s) enabling easy testing outside Homey
- If settings are updated the new values are used immediately, no app restart required
- Grid power is stored in insights
