'use strict';

const BaseDevice = require('../baseDevice.js');

class SummaryDevice extends BaseDevice {

    async onInit() {
        this.log(`[${this.getName()}] SMA summary initiated`);

        this.invertersMPPConfig = this.getInverterMPPConfig();
        await this.upgradeDevice();
        await this.setupCapabilities(this.getSetting('show_mpp'));
        this._initilializeTimers();
    }

    async setupCapabilities(show_mpp) {
        this.log(`[${this.getName()}] Setting up capabilities`);
        if (show_mpp == 'yes') {
            if (this.invertersMPPConfig.MPP_A) {
                await this.addCapabilityHelper('power_pv.dcA');
                await this.updateCapabilityOptions('power_pv.dcA',
                    { title: { en: this.invertersMPPConfig.MPP_A_LBL } });
            }

            if (this.invertersMPPConfig.MPP_B) {
                await this.addCapabilityHelper('power_pv.dcB');
                await this.updateCapabilityOptions('power_pv.dcB',
                    { title: { en: this.invertersMPPConfig.MPP_B_LBL } });
            }

        } else {
            await this.removeCapabilityHelper('power_pv.dcA');
            await this.removeCapabilityHelper('power_pv.dcB');
        }
    }

    async upgradeDevice() {
        this.log('Upgrading existing device');
        await this.addCapabilityHelper('meter_power');
    }

    getInverterMPPConfig() {
        let mpp = { MPP_A: true, MPP_A_LBL: '', MPP_B: true, MPP_B_LBL: '' };
        for (const inverter of this.homey.drivers.getDriver('inverter').getDevices()) {

            if (!inverter.hasCapability('measure_power.dcA')) {
                mpp.MPP_A = false;
            } else {
                mpp.MPP_A_LBL = inverter.getCapabilityOptions('measure_power.dcA').title.en;
            }

            if (!inverter.hasCapability('measure_power.dcB')) {
                mpp.MPP_B = false;
            } else {
                mpp.MPP_B_LBL = inverter.getCapabilityOptions('measure_power.dcB').title.en;
            }
        }
        return mpp;
    }

    async updateValues() {
        let batteryPower = 0;
        for (const battery of this.homey.drivers.getDriver('battery').getDevices()) {
            batteryPower = batteryPower + battery.getCapabilityValue('measure_power');
        }

        let power_pv = 0, power_MPPA = 0, power_MPPB = 0, lifetime_yield = 0;
        for (const inverter of this.homey.drivers.getDriver('inverter').getDevices()) {
            power_pv = power_pv + inverter.getCapabilityValue('measure_power');
            power_MPPA = power_MPPA + inverter.getCapabilityValue('measure_power.dcA') || 0;
            power_MPPB = power_MPPB + inverter.getCapabilityValue('measure_power.dcB') || 0;
            lifetime_yield = lifetime_yield + inverter.getCapabilityValue('measure_yield');
        }

        let power_grid = 0, lifetime_import = 0, lifetime_export = 0;
        for (const em of this.homey.drivers.getDriver('energy').getDevices()) {
            power_grid = power_grid + em.getCapabilityValue('measure_power');
            lifetime_import = lifetime_import + em.getCapabilityValue('meter_power');
            lifetime_export = lifetime_export + em.getCapabilityValue('meter_power.export');
        }

        let consumption = power_pv - batteryPower + power_grid;

        await this._updateProperty('measure_power.battery', batteryPower);
        await this._updateProperty('measure_power.pv', power_pv);
        await this._updateProperty('power_pv.dcA', power_MPPA);
        await this._updateProperty('power_pv.dcB', power_MPPB);
        //Will be negative if there is a surplus
        await this._updateProperty('measure_power', power_grid);
        await this._updateProperty('measure_power.consumption', consumption);

        const lifetime_consumption = (lifetime_import + lifetime_yield) - lifetime_export;
        await this._updateProperty('meter_power', lifetime_consumption);

        this.homey.api.realtime('summary.update', {
            power: {
                grid: power_grid,
                pv: power_pv,
                load: consumption,
                battery: batteryPower
            }
        });
    }

    _initilializeTimers() {
        this.log('Adding timers');
        this.homey.setInterval(async () => {
            await this.updateValues();
        }, 1000 * this.getSetting('polling'));
    }

    async onSettings({ oldSettings, newSettings, changedKeys }) {

        if (changedKeys.indexOf("show_mpp") > -1) {
            this.log(`[${this.getName()}] Show MPP value was change to '${newSettings.show_mpp}'`);
            this.invertersMPPConfig = this.getInverterMPPConfig();
            await this.setupCapabilities(newSettings.show_mpp);
        }
    }
}

module.exports = SummaryDevice;
