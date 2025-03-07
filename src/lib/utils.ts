import GLib from 'gi://GLib';
import Shell from 'gi://Shell';
import { NotificationType } from './constants.js';

/**
 * Metadata extracted from a script file
 */
export interface ScriptMetadata {
    name?: string;
    description?: string;
    icon?: string;
    notify?: NotificationType;
}

/**
 * Expand ~ to home directory in a path
 *
 * @param path - Path that may contain ~
 * @returns Expanded path
 */
export function expandPath(path: string): string {
    if (path.startsWith('~')) {
        return GLib.get_home_dir() + path.substring(1);
    }
    return path;
}

/**
 * Parse metadata from script file
 *
 * @param scriptPath - Path to the script file
 * @param defaultNotificationStyle - Default notification style to use if not specified
 * @returns Metadata object or null if parsing failed
 */
export function parseScriptMetadata(scriptPath: string, defaultNotificationStyle: NotificationType): ScriptMetadata | null {
    console.log(`Parsing metadata for script: ${scriptPath}`);
    try {
        let fileContents = Shell.get_file_contents_utf8_sync(scriptPath);
        let lines = fileContents.split('\n');
        let metadata: ScriptMetadata = {};

        console.log(`Found ${lines.length} lines in script file`);

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (line.startsWith('#!')) {
                console.log(`Line ${i}: Skipping shebang line: ${line}`);
                continue;
            }
            if (line.startsWith('#')) {
                console.log(`Line ${i}: Processing comment line: ${line}`);
                let match = line.match(/#\s*(\w+):\s*(.*)/);
                if (match) {
                    const key = match[1].toLowerCase();
                    console.log(`  Found metadata: ${key} = "${match[2]}"`);

                    if (key === 'notify') {
                        // Type-check the notify value
                        const notifyValue = match[2] as NotificationType;
                        if (['status', 'stdout', 'none'].includes(notifyValue)) {
                            metadata.notify = notifyValue;
                        } else {
                            console.warn(`Invalid notify value "${notifyValue}" in ${scriptPath}, using default`);
                            metadata.notify = defaultNotificationStyle;
                        }
                    } else if (key === 'name') {
                        metadata.name = match[2];
                    } else if (key === 'description') {
                        metadata.description = match[2];
                    } else if (key === 'icon') {
                        metadata.icon = match[2];
                    }
                } else {
                    console.log(`  Not a metadata comment: ${line}`);
                }
            } else {
                console.log(`Line ${i}: Stopping at non-comment line: ${line}`);
                break;
            }
        }

        // Set default notification style if not specified
        if (!metadata.notify) {
            console.log(`No notify value specified in ${scriptPath}, using default: ${defaultNotificationStyle}`);
            metadata.notify = defaultNotificationStyle;
        }

        console.log(`Parsed metadata for ${scriptPath}:`, metadata);

        // Check if name is missing
        if (!metadata.name) {
            console.error(`Script ${scriptPath} is missing required 'Name' metadata`);
        }

        return metadata;
    } catch (e) {
        console.error(`Failed to parse script metadata for ${scriptPath}: ${(e as Error).message}`);
        return null;
    }
}

/**
 * Extract directory path from a full path
 *
 * @param path - Full path
 * @returns Directory part of the path
 */
export function getDirectoryPath(path: string): string {
    if (!path.includes('/')) {
        return '';
    }
    return path.substring(0, path.lastIndexOf('/'));
}
