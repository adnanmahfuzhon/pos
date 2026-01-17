/**
 * Thermal Printer Utility for Bluetooth ESC/POS Printers
 * Uses Web Bluetooth API to connect and print receipts
 */

// Web Bluetooth API type declarations
declare global {
    interface Navigator {
        bluetooth: Bluetooth;
    }
    interface Bluetooth {
        requestDevice(options: RequestDeviceOptions): Promise<BluetoothDevice>;
    }
    interface RequestDeviceOptions {
        acceptAllDevices?: boolean;
        filters?: BluetoothLEScanFilter[];
        optionalServices?: BluetoothServiceUUID[];
    }
    interface BluetoothLEScanFilter {
        services?: BluetoothServiceUUID[];
        name?: string;
        namePrefix?: string;
    }
    type BluetoothServiceUUID = string;
    interface BluetoothDevice {
        id: string;
        name?: string;
        gatt?: BluetoothRemoteGATTServer;
        addEventListener(type: string, listener: EventListener): void;
    }
    interface BluetoothRemoteGATTServer {
        connected: boolean;
        connect(): Promise<BluetoothRemoteGATTServer>;
        disconnect(): void;
        getPrimaryService(service: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService>;
    }
    interface BluetoothRemoteGATTService {
        getCharacteristic(characteristic: string): Promise<BluetoothRemoteGATTCharacteristic>;
    }
    interface BluetoothRemoteGATTCharacteristic {
        properties: BluetoothCharacteristicProperties;
        writeValue(value: BufferSource): Promise<void>;
        writeValueWithoutResponse(value: BufferSource): Promise<void>;
    }
    interface BluetoothCharacteristicProperties {
        write: boolean;
        writeWithoutResponse: boolean;
    }
}

// ESC/POS Commands
const ESC = 0x1B;
const GS = 0x1D;
const LF = 0x0A;

// Command builders
const COMMANDS = {
    INIT: new Uint8Array([ESC, 0x40]), // Initialize printer
    TEXT_NORMAL: new Uint8Array([ESC, 0x21, 0x00]),
    TEXT_BOLD: new Uint8Array([ESC, 0x21, 0x08]),
    TEXT_DOUBLE_HEIGHT: new Uint8Array([ESC, 0x21, 0x10]),
    TEXT_DOUBLE_WIDTH: new Uint8Array([ESC, 0x21, 0x20]),
    TEXT_DOUBLE: new Uint8Array([ESC, 0x21, 0x30]),
    ALIGN_LEFT: new Uint8Array([ESC, 0x61, 0x00]),
    ALIGN_CENTER: new Uint8Array([ESC, 0x61, 0x01]),
    ALIGN_RIGHT: new Uint8Array([ESC, 0x61, 0x02]),
    FEED_LINE: new Uint8Array([LF]),
    FEED_LINES: (n: number) => new Uint8Array([ESC, 0x64, n]),
    CUT_PAPER: new Uint8Array([GS, 0x56, 0x00]), // Full cut
    CUT_PAPER_PARTIAL: new Uint8Array([GS, 0x56, 0x01]), // Partial cut
};

// Text encoder
const encoder = new TextEncoder();

// Store connected device
let connectedDevice: BluetoothDevice | null = null;
let characteristic: BluetoothRemoteGATTCharacteristic | null = null;

// Common Bluetooth Serial UUIDs for thermal printers
const SERIAL_SERVICE_UUID = '0000ff00-0000-1000-8000-00805f9b34fb';
const SERIAL_CHARACTERISTIC_UUID = '0000ff02-0000-1000-8000-00805f9b34fb';

// Alternative UUIDs some printers use
const ALT_SERVICE_UUIDS = [
    '49535343-fe7d-4ae5-8fa9-9fafd205e455', // Microchip
    '0000ffe0-0000-1000-8000-00805f9b34fb', // Common Chinese printers
    '0000ff00-0000-1000-8000-00805f9b34fb', // Generic Serial
];

const ALT_CHARACTERISTIC_UUIDS = [
    '49535343-8841-43f4-a8d4-ecbe34729bb3',
    '0000ffe1-0000-1000-8000-00805f9b34fb',
    '0000ff02-0000-1000-8000-00805f9b34fb',
];

/**
 * Check if Web Bluetooth is supported
 */
export function isBluetoothSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

/**
 * Request and connect to a Bluetooth thermal printer
 */
export async function connectPrinter(): Promise<boolean> {
    if (!isBluetoothSupported()) {
        throw new Error('Web Bluetooth tidak didukung di browser ini. Gunakan Chrome/Edge.');
    }

    try {
        // Request device with flexible filters
        const device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: [...ALT_SERVICE_UUIDS],
        });

        if (!device.gatt) {
            throw new Error('GATT tidak tersedia pada perangkat ini');
        }

        // Connect to GATT server
        const server = await device.gatt.connect();

        // Try to find a writable characteristic
        let foundCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;

        for (const serviceUUID of ALT_SERVICE_UUIDS) {
            try {
                const service = await server.getPrimaryService(serviceUUID);
                for (const charUUID of ALT_CHARACTERISTIC_UUIDS) {
                    try {
                        const char = await service.getCharacteristic(charUUID);
                        if (char.properties.write || char.properties.writeWithoutResponse) {
                            foundCharacteristic = char;
                            break;
                        }
                    } catch (e) {
                        // Try next characteristic
                    }
                }
                if (foundCharacteristic) break;
            } catch (e) {
                // Try next service
            }
        }

        if (!foundCharacteristic) {
            throw new Error('Tidak dapat menemukan karakteristik yang bisa ditulis pada printer');
        }

        connectedDevice = device;
        characteristic = foundCharacteristic;

        // Listen for disconnect
        device.addEventListener('gattserverdisconnected', () => {
            connectedDevice = null;
            characteristic = null;
        });

        return true;
    } catch (error: any) {
        if (error.name === 'NotFoundError') {
            throw new Error('Tidak ada printer yang dipilih');
        }
        throw error;
    }
}

/**
 * Check if printer is connected
 */
export function isPrinterConnected(): boolean {
    return connectedDevice !== null && connectedDevice.gatt?.connected === true;
}

/**
 * Disconnect from printer
 */
export function disconnectPrinter(): void {
    if (connectedDevice?.gatt?.connected) {
        connectedDevice.gatt.disconnect();
    }
    connectedDevice = null;
    characteristic = null;
}

/**
 * Send raw bytes to printer
 */
async function sendBytes(data: Uint8Array): Promise<void> {
    if (!characteristic) {
        throw new Error('Printer tidak terhubung');
    }

    // Some printers have write limits, chunk the data
    const CHUNK_SIZE = 100;
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        const chunk = data.slice(i, i + CHUNK_SIZE);
        if (characteristic.properties.writeWithoutResponse) {
            await characteristic.writeValueWithoutResponse(chunk);
        } else {
            await characteristic.writeValue(chunk);
        }
        // Small delay between chunks
        await new Promise(resolve => setTimeout(resolve, 20));
    }
}

/**
 * Combine multiple byte arrays
 */
function concatBytes(...arrays: Uint8Array[]): Uint8Array {
    const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const arr of arrays) {
        result.set(arr, offset);
        offset += arr.length;
    }
    return result;
}

/**
 * Format currency for receipt
 */
function formatRp(amount: number): string {
    return `Rp ${amount.toLocaleString('id-ID')}`;
}

/**
 * Pad string to fixed width
 */
function padLine(left: string, right: string, width: number = 32): string {
    const spaces = width - left.length - right.length;
    if (spaces < 1) {
        return left.substring(0, width - right.length - 1) + ' ' + right;
    }
    return left + ' '.repeat(spaces) + right;
}

/**
 * Create separator line
 */
function separator(char: string = '-', width: number = 32): string {
    return char.repeat(width);
}

export interface ReceiptItem {
    name: string;
    quantity: number;
    price: number;
}

export interface ReceiptData {
    transactionId: string;
    timestamp: number;
    channel: string;
    paymentMethod: string;
    items: ReceiptItem[];
    total: number;
    storeName?: string;
}

/**
 * Print a sale receipt
 */
export async function printReceipt(data: ReceiptData): Promise<void> {
    if (!isPrinterConnected()) {
        // Try to reconnect
        await connectPrinter();
    }

    const storeName = data.storeName || 'FLAVORPOS';
    const date = new Date(data.timestamp);
    const dateStr = date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    // Build receipt content
    const lines: Uint8Array[] = [
        COMMANDS.INIT,
        COMMANDS.ALIGN_CENTER,
        COMMANDS.TEXT_DOUBLE,
        encoder.encode(storeName),
        COMMANDS.FEED_LINE,
        COMMANDS.TEXT_NORMAL,
        encoder.encode(separator('=')),
        COMMANDS.FEED_LINE,
        COMMANDS.ALIGN_LEFT,
        encoder.encode(`Trx: ${data.transactionId.slice(-8).toUpperCase()}`),
        COMMANDS.FEED_LINE,
        encoder.encode(`Tgl: ${dateStr}`),
        COMMANDS.FEED_LINE,
        encoder.encode(`Ch: ${data.channel} | ${data.paymentMethod}`),
        COMMANDS.FEED_LINE,
        encoder.encode(separator('-')),
        COMMANDS.FEED_LINE,
    ];

    // Add items
    for (const item of data.items) {
        const itemLine = `${item.quantity}x ${item.name}`;
        const priceStr = formatRp(item.quantity * item.price);
        lines.push(encoder.encode(padLine(itemLine, priceStr)));
        lines.push(COMMANDS.FEED_LINE);
    }

    // Total
    lines.push(encoder.encode(separator('-')));
    lines.push(COMMANDS.FEED_LINE);
    lines.push(COMMANDS.TEXT_BOLD);
    lines.push(encoder.encode(padLine('TOTAL', formatRp(data.total))));
    lines.push(COMMANDS.FEED_LINE);
    lines.push(COMMANDS.TEXT_NORMAL);
    lines.push(encoder.encode(separator('=')));
    lines.push(COMMANDS.FEED_LINE);

    // Footer
    lines.push(COMMANDS.ALIGN_CENTER);
    lines.push(encoder.encode('Terima Kasih!'));
    lines.push(COMMANDS.FEED_LINES(4));

    // Cut paper if supported
    lines.push(COMMANDS.CUT_PAPER_PARTIAL);

    // Send all bytes
    const allBytes = concatBytes(...lines);
    await sendBytes(allBytes);
}

/**
 * Print a test page
 */
export async function printTestPage(): Promise<void> {
    if (!isPrinterConnected()) {
        await connectPrinter();
    }

    const lines: Uint8Array[] = [
        COMMANDS.INIT,
        COMMANDS.ALIGN_CENTER,
        COMMANDS.TEXT_DOUBLE,
        encoder.encode('TEST PRINT'),
        COMMANDS.FEED_LINE,
        COMMANDS.TEXT_NORMAL,
        encoder.encode(separator('=')),
        COMMANDS.FEED_LINE,
        encoder.encode('Printer Terhubung!'),
        COMMANDS.FEED_LINE,
        encoder.encode(new Date().toLocaleString('id-ID')),
        COMMANDS.FEED_LINE,
        encoder.encode(separator('=')),
        COMMANDS.FEED_LINES(4),
        COMMANDS.CUT_PAPER_PARTIAL,
    ];

    const allBytes = concatBytes(...lines);
    await sendBytes(allBytes);
}
