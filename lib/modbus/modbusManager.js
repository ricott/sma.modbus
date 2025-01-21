'use strict';

const modbus = require('jsmodbus');
const net = require('net');
const EventEmitter = require('events');

class ModbusManager extends EventEmitter {
    static activeSockets = new Map(); // Maps host:port to {socket, refCount}
    static activeClients = new Map(); // Maps host:port:unitId to {modbusClient, refCount, config}
    #connectionMonitorTimer = null;

    constructor() {
        super();
        this.#startConnectionMonitor();
    }

    #startConnectionMonitor() {
        // Clear existing timer if any
        if (this.#connectionMonitorTimer) {
            clearInterval(this.#connectionMonitorTimer);
        }

        // Check connections every minute
        this.#connectionMonitorTimer = setInterval(() => {
            this.#checkAndRestoreConnections();
        }, 60000); // 60 seconds
    }

    async #checkAndRestoreConnections() {
        console.log('DEBUG', 'Checking all socket connections...');
        
        // Get all unique client configurations
        const clientConfigs = Array.from(ModbusManager.activeClients.entries());
        
        for (const [clientKey, client] of clientConfigs) {
            const [host, port, unitId] = clientKey.split(':');
            
            if (!this.#isConnected(host, port)) {
                console.log('WARN', `Connection lost for ${clientKey}, attempting to restore...`);
                
                try {
                    // Store existing configs before recreating connection
                    const deviceConfigs = Array.from(client.configs.entries());
                    
                    // Recreate connection for each device type configuration
                    for (const [deviceTypeName, config] of deviceConfigs) {
                        await this.createConnection(host, parseInt(port), parseInt(unitId), {
                            deviceType: config.deviceType,
                            infoRegistries: config.infoRegistries,
                            readingRegistries: config.readingRegistries,
                            systemRegistries: config.systemRegistries,
                            refreshInterval: config.refreshInterval,
                            eventName: config.eventName,
                            device: config.device
                        });
                    }
                    
                    console.log('INFO', `Successfully restored connection for ${clientKey}`);
                } catch (error) {
                    console.error(`Failed to restore connection for ${clientKey}:`, error);
                }
            }
        }
    }

    async createConnection(host, port, unitId, config) {
        const baseClientKey = `${host}:${port}:${unitId}`;
        const existingClient = ModbusManager.activeClients.get(baseClientKey);
        const deviceTypeName = config.deviceType.name || config.deviceType.constructor.name;

        console.log('DEBUG', 'Creating connection:', {
            baseClientKey,
            deviceType: deviceTypeName,
            hasExistingClient: !!existingClient,
            existingConfigs: existingClient ? Array.from(existingClient.configs?.keys() || []) : []
        });

        // If system registries are configured, ensure we have a connection for unit ID 100
        if (config.systemRegistries && config.systemRegistries.length > 0) {
            const systemClientKey = `${host}:${port}:100`;
            if (!ModbusManager.activeClients.has(systemClientKey)) {
                console.log('INFO', `Creating system client connection for ${systemClientKey}`);
                const { socket, modbusClient } = await this.#createOrGetSocket(host, port, 100);
                
                ModbusManager.activeClients.set(systemClientKey, {
                    modbusClient,
                    refCount: 1,
                    configs: new Map()
                });
            }
        }

        if (existingClient) {
            console.log('INFO', `Adding configuration for device type ${deviceTypeName} to existing client ${baseClientKey}`);
            
            // Initialize configs if it doesn't exist
            if (!existingClient.configs) {
                existingClient.configs = new Map();
            }

            // Add new device configuration to existing client using device type name as key
            existingClient.configs.set(deviceTypeName, {
                deviceType: config.deviceType,
                infoRegistries: config.infoRegistries,
                readingRegistries: config.readingRegistries,
                systemRegistries: config.systemRegistries,
                refreshInterval: config.refreshInterval,
                eventName: config.eventName,
                device: config.device,
                timer: null
            });
            existingClient.refCount++;
            
            // Update the client in the Map
            ModbusManager.activeClients.set(baseClientKey, existingClient);
            
            console.log('DEBUG', 'Updated existing client:', {
                clientKey: baseClientKey,
                refCount: existingClient.refCount,
                hasConfigs: !!existingClient.configs,
                configsSize: existingClient.configs.size,
                configTypes: Array.from(existingClient.configs.keys())
            });
            
            // Start polling for this device type
            if (config.refreshInterval) {
                this.#startPolling(baseClientKey, deviceTypeName);
            }
            return;
        }

        console.log('INFO', `Creating new modbus client for '${baseClientKey}'`);
        const { socket, modbusClient } = await this.#createOrGetSocket(host, port, unitId);
        
        const newClient = {
            modbusClient,
            refCount: 1,
            configs: new Map([[deviceTypeName, {
                deviceType: config.deviceType,
                infoRegistries: config.infoRegistries,
                readingRegistries: config.readingRegistries,
                systemRegistries: config.systemRegistries,
                refreshInterval: config.refreshInterval,
                eventName: config.eventName,
                device: config.device,
                timer: null
            }]])
        };

        // Store client with initial configuration
        ModbusManager.activeClients.set(baseClientKey, newClient);

        console.log('DEBUG', 'Created new client:', {
            clientKey: baseClientKey,
            refCount: newClient.refCount,
            hasConfigs: !!newClient.configs,
            configsSize: newClient.configs.size,
            configTypes: Array.from(newClient.configs.keys())
        });

        // Read info registries for this device type
        await this.#readInfoRegistries(baseClientKey, deviceTypeName);

        // Start polling if refresh interval is set
        if (config.refreshInterval) {
            this.#startPolling(baseClientKey, deviceTypeName);
        }
    }

    async #readInfoRegistries(clientKey, deviceTypeName) {
        const client = ModbusManager.activeClients.get(clientKey);
        if (!client) return;

        const config = client.configs.get(deviceTypeName);
        if (!config) return;

        const { modbusClient } = client;
        const { infoRegistries, eventName } = config;
        const [host, port, unitId] = clientKey.split(':');

        if (!this.#isConnected(host, port)) {
            console.log('WARN', `Client ${clientKey} not connected, skipping info registry read`);
            return;
        }

        try {
            const readings = [];
            for (const registry of infoRegistries) {
                const result = await modbusClient.readHoldingRegisters(registry.registryId, registry.count);
                readings.push(result.response._body._valuesAsBuffer);
            }
            this.emit(`${eventName}_info`, readings);
        } catch (error) {
            console.error('Error reading info registries:', error);
        }
    }

    async #startPolling(clientKey, deviceTypeName) {
        const client = ModbusManager.activeClients.get(clientKey);
        if (!client) return;

        const config = client.configs.get(deviceTypeName);
        if (!config) return;

        // Clear existing timer if any
        if (config.timer) {
            config.device.homey.clearInterval(config.timer);
        }

        // Only do initial read if refresh interval is greater than 10 seconds
        if (config.refreshInterval > 10) {
            await this.#pollReadings(clientKey, deviceTypeName);
        }

        // Set up polling interval
        config.timer = config.device.homey.setInterval(
            async () => {
                await this.#pollReadings(clientKey, deviceTypeName);
            },
            config.refreshInterval * 1000
        );
    }

    async #pollReadings(clientKey, deviceTypeName) {
        const client = ModbusManager.activeClients.get(clientKey);
        if (!client) {
            console.log('ERROR', `Client ${clientKey} not found for polling`);
            return;
        }

        // Initialize configs if it doesn't exist
        if (!client.configs) {
            console.log('WARN', `Initializing missing configs Map for ${clientKey}`);
            client.configs = new Map();
            ModbusManager.activeClients.set(clientKey, client);
        }

        const config = client.configs.get(deviceTypeName);
        if (!config) {
            console.log('ERROR', `Config for device type ${deviceTypeName} not found in client ${clientKey}`);
            return;
        }

        const { modbusClient } = client;
        const { deviceType, readingRegistries, eventName, systemRegistries } = config;
        const [host, port, unitId] = clientKey.split(':');
        
        if (!this.#isConnected(host, port)) {
            console.log('WARN', `Client ${clientKey} not connected, skipping poll`);
            return;
        }

        try {
            console.log('DEBUG', `Polling ${readingRegistries.length} registries for ${clientKey} device type ${deviceTypeName}`);
            const readings = [];
            for (const registry of readingRegistries) {
                const result = await modbusClient.readHoldingRegisters(registry.registryId, registry.count);
                readings.push(result.response._body._valuesAsBuffer);
            }

            // Handle system registries if configured
            let systemReadings = [];
            if (systemRegistries && systemRegistries.length > 0) {
                const systemClientKey = `${host}:${port}:100`;
                const systemClient = ModbusManager.activeClients.get(systemClientKey);
                
                if (systemClient) {
                    for (const registry of systemRegistries) {
                        const result = await systemClient.modbusClient.readHoldingRegisters(registry.registryId, registry.count);
                        systemReadings.push(result.response._body._valuesAsBuffer);
                    }
                } else {
                    console.log('WARN', `System client not found for ${systemClientKey}`);
                }
            }

            this.emit(eventName, { deviceReadings: readings, systemReadings });
        } catch (error) {
            console.error(`Error polling readings for ${clientKey}:`, error);
        }
    }

    #createOrGetSocket(host, port, unitId) {
        const socketKey = `${host}:${port}`;
        const existingSocket = ModbusManager.activeSockets.get(socketKey);

        if (existingSocket) {
            console.log('INFO', `Rebuilding socket for '${socketKey}' to add new client`);
            // Store existing clients' configs before closing socket
            const existingClients = Array.from(ModbusManager.activeClients.entries())
                .filter(([key]) => key.startsWith(socketKey));
            
            // Close existing socket
            existingSocket.socket.end();
            ModbusManager.activeSockets.delete(socketKey);
            
            return new Promise((resolve, reject) => {
                let socket = new net.Socket();
                const modbusClients = existingClients.map(([key]) => {
                    const [,, existingUnitId] = key.split(':');
                    return new modbus.client.TCP(socket, parseInt(existingUnitId));
                });
                const newModbusClient = new modbus.client.TCP(socket, unitId);

                socket.on('connect', () => {
                    console.log('INFO', `Connected rebuilt socket for '${socketKey}' with ${existingClients.length} clients`);
                    ModbusManager.activeSockets.set(socketKey, { 
                        socket, 
                        refCount: existingClients.length + 1
                    });
                    
                    // Restore all existing client configurations with new modbus clients
                    existingClients.forEach(([clientKey, existingClient], index) => {
                        ModbusManager.activeClients.set(clientKey, {
                            modbusClient: modbusClients[index],
                            refCount: existingClient.refCount,
                            configs: existingClient.configs
                        });
                    });

                    resolve({ socket, modbusClient: newModbusClient });
                });

                socket.on('error', (error) => {
                    console.error('Socket error:', error);
                    reject(error);
                });

                socket.on('close', function () {
                    console.log('INFO', `Closed Modbus client on IP '${host}' using port '${port}'`);
                });

                socket.connect({ host, port });
            });
        }

        // Handle new socket creation (no existing socket)
        return new Promise((resolve, reject) => {
            console.log('INFO', `Creating new socket for '${socketKey}'`);
            let socket = new net.Socket();
            const modbusClient = new modbus.client.TCP(socket, unitId);

            socket.on('connect', () => {
                console.log('INFO', `Connected socket for '${socketKey}'`);
                ModbusManager.activeSockets.set(socketKey, { socket, refCount: 1 });
                resolve({ socket, modbusClient });
            });

            socket.on('error', (error) => {
                console.error('Socket error:', error);
                reject(error);
            });

            socket.on('close', function () {
                console.log('INFO', `Closed Modbus client on IP '${host}' using port '${port}'`);
            });

            socket.connect({ host, port });
        });
    }

    getConnection(host, port, unitId) {
        const clientKey = `${host}:${port}:${unitId}`;
        const client = ModbusManager.activeClients.get(clientKey);
        
        if (!client) {
            throw new Error(`No active connection found for ${clientKey}`);
        }
        
        if (!this.#isConnected(host, port)) {
            throw new Error(`Connection is not active for ${clientKey}`);
        }
        
        return client.modbusClient;
    }

    closeConnection(host, port, unitId, deviceType) {
        const clientKey = `${host}:${port}:${unitId}`;
        const socketKey = `${host}:${port}`;
        const deviceTypeName = deviceType.name || deviceType.constructor.name;
        
        console.log('DEBUG', `Starting cleanup for ${deviceTypeName} on ${clientKey}`);
        
        const client = ModbusManager.activeClients.get(clientKey);
        const socketInfo = ModbusManager.activeSockets.get(socketKey);

        if (client) {
            client.refCount--;
            console.log('DEBUG', `Decreased client refCount to ${client.refCount}`);

            // Get the config for this device type
            const config = client.configs.get(deviceTypeName);
            if (config) {
                console.log('DEBUG', `Found config for ${deviceTypeName}, cleaning up resources`);
                
                // Remove event listeners
                console.log('DEBUG', `Removing event listeners for ${config.eventName}`);
                this.removeAllListeners(config.eventName);
                this.removeAllListeners(`${config.eventName}_info`);

                // Clear timer if exists
                if (config.timer) {
                    console.log('DEBUG', `Clearing polling timer for ${deviceTypeName}`);
                    config.device.homey.clearInterval(config.timer);
                }

                // Remove this device type's configuration
                client.configs.delete(deviceTypeName);
                console.log('DEBUG', `Removed config for ${deviceTypeName}`);
            } else {
                console.log('WARN', `No config found for ${deviceTypeName} in client ${clientKey}`);
            }

            if (client.refCount === 0) {
                console.log('DEBUG', `Last reference to client ${clientKey}, removing client`);
                ModbusManager.activeClients.delete(clientKey);
                
                if (socketInfo) {
                    socketInfo.refCount--;
                    console.log('DEBUG', `Decreased socket refCount to ${socketInfo.refCount}`);
                    
                    if (socketInfo.refCount === 0) {
                        console.log('DEBUG', `Closing last connection for ${socketKey}`);
                        socketInfo.socket.end();
                        ModbusManager.activeSockets.delete(socketKey);
                    } else {
                        console.log('DEBUG', `Socket ${socketKey} still has ${socketInfo.refCount} active references`);
                    }
                }
            } else {
                console.log('DEBUG', `Client ${clientKey} still has ${client.refCount} active references`);
            }
        } else {
            console.log('WARN', `No client found for ${clientKey}`);
        }

        // If this was the last client, clear the connection monitor
        if (ModbusManager.activeClients.size === 0) {
            if (this.#connectionMonitorTimer) {
                clearInterval(this.#connectionMonitorTimer);
                this.#connectionMonitorTimer = null;
            }
        }
    }

    #isConnected(host, port) {
        const socketKey = `${host}:${port}`;
        const socketInfo = ModbusManager.activeSockets.get(socketKey);
        
        if (!socketInfo || !socketInfo.socket) {
            return false;
        }
        
        const socket = socketInfo.socket;
        return socket && 
               socket.readable && 
               socket.writable && 
               !socket.destroyed;
    }
}

//Singleton
module.exports = new ModbusManager();
