import GLib from 'gi://GLib';
import Shell from 'gi://Shell';

/**
 * Expand ~ to home directory in a path
 *
 * @param {string} path - Path that may contain ~
 * @returns {string} Expanded path
 */
export function expandPath(path) {
    if (path.startsWith('~')) {
        return GLib.get_home_dir() + path.substring(1);
    }
    return path;
}

/**
 * Parse metadata from script file
 *
 * @param {string} scriptPath - Path to the script file
 * @param {string} defaultNotificationStyle - Default notification style to use if not specified
 * @returns {Object|null} Metadata object or null if parsing failed
 */
export function parseScriptMetadata(scriptPath, defaultNotificationStyle) {
    console.log(`Parsing metadata for script: ${scriptPath}`);
    try {
        let fileContents = Shell.get_file_contents_utf8_sync(scriptPath);
        let lines = fileContents.split('\n');
        let metadata = {};

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
                    console.log(`  Found metadata: ${match[1].toLowerCase()} = "${match[2]}"`);
                    metadata[match[1].toLowerCase()] = match[2];
                } else {
                    console.log(`  Not a metadata comment: ${line}`);
                }
            } else {
                console.log(`Line ${i}: Stopping at non-comment line: ${line}`);
                break;
            }
        }

        // Validate notify value
        if (metadata.notify && !['status', 'stdout', 'none'].includes(metadata.notify)) {
            console.warn(`Invalid notify value "${metadata.notify}" in ${scriptPath}, using default`);
            metadata.notify = defaultNotificationStyle;
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
        console.error(`Failed to parse script metadata for ${scriptPath}: ${e.message}`);
        return null;
    }
}

/**
 * Extract directory path from a full path
 *
 * @param {string} path - Full path
 * @returns {string} Directory part of the path
 */
export function getDirectoryPath(path) {
    if (!path.includes('/')) {
        return '';
    }
    return path.substring(0, path.lastIndexOf('/'));
}
