import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Shell from 'gi://Shell';

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const scriptLocation = '/.config/gnome-search-scripts/';

class ScriptProvider {
    constructor(extension) {
        this._extension = extension;
        this._scripts = [];
        this._loadScripts();
    }

    // Required properties for GNOME 45+ search providers
    get appInfo() {
        return null;
    }

    get canLaunchSearch() {
        return false;
    }

    get id() {
        return this._extension.uuid;
    }

    _loadScripts() {
        let scriptDir = GLib.get_home_dir() + scriptLocation;
        let dir = GLib.Dir.open(scriptDir, 0);
        if (!dir) return;

        let file;
        while ((file = dir.read_name()) !== null) {
            if (file.endsWith('.sh')) {
                let scriptPath = scriptDir + file;
                let metadata = this._parseScriptMetadata(scriptPath);
                if (metadata) {
                    this._scripts.push({
                        file: file,
                        name: metadata.name || file,
                        description: metadata.description || '',
                        icon: metadata.icon || 'system-run-symbolic'
                    });
                }
            }
        }
        dir.close();
    }

    _parseScriptMetadata(scriptPath) {
        let fileContents = Shell.get_file_contents_utf8_sync(scriptPath);
        let lines = fileContents.split('\n');
        let metadata = {};

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (line.startsWith('#!')) continue;
            if (line.startsWith('#')) {
                let match = line.match(/#\s*(\w+):\s*(.*)/);
                if (match) {
                    metadata[match[1].toLowerCase()] = match[2];
                }
            } else {
                break;
            }
        }

        return metadata;
    }

    // Updated to use Promise-based API with cancellable
    async getInitialResultSet(terms, cancellable) {
        return new Promise((resolve, reject) => {
            // Handle cancellation
            const cancelId = cancellable?.connect(() => {
                reject(new Error('Search cancelled'));
            });

            // Filter scripts based on search terms
            const results = this._scripts
                .filter(script =>
                    script.name.toLowerCase().includes(terms.join(' ').toLowerCase()) ||
                    script.description.toLowerCase().includes(terms.join(' ').toLowerCase()))
                .map((_, index) => index.toString());

            if (cancelId && !cancellable.is_cancelled())
                cancellable.disconnect(cancelId);

            resolve(results);
        });
    }

    // Updated to use Promise-based API with cancellable
    async getSubsearchResultSet(results, terms, cancellable) {
        return this.getInitialResultSet(terms, cancellable);
    }

    // New method required for GNOME 45+
    filterResults(results, maxResults) {
        if (results.length <= maxResults)
            return results;
        return results.slice(0, maxResults);
    }

    // Updated to use Promise-based API with cancellable
    async getResultMetas(resultIds, cancellable) {
        return new Promise((resolve, reject) => {
            const cancelId = cancellable?.connect(() => {
                reject(new Error('Operation cancelled'));
            });

            const metas = resultIds.map(id => {
                const script = this._scripts[parseInt(id)];
                const scaleFactor = St.ThemeContext.get_for_stage(global.stage).scale_factor;

                return {
                    id: id,
                    name: script.name,
                    description: script.description,
                    createIcon: (size) => {
                        return new St.Icon({
                            icon_name: script.icon,
                            width: size * scaleFactor,
                            height: size * scaleFactor
                        });
                    }
                };
            });

            if (cancelId && !cancellable.is_cancelled())
                cancellable.disconnect(cancelId);

            resolve(metas);
        });
    }

    // Updated to match GNOME 45+ API
    activateResult(resultId, terms) {
        let script = this._scripts[parseInt(resultId)];
        let scriptPath = GLib.get_home_dir() + scriptLocation + script.file;

        // Use Gio.SubprocessLauncher to run the script
        let launcher = new Gio.SubprocessLauncher({
            flags: Gio.SubprocessFlags.NONE
        });

        launcher.set_cwd(GLib.get_home_dir() + scriptLocation);

        try {
            // Use spawnv instead of spawn_async
            let proc = launcher.spawnv([scriptPath]);

            // Optional: Wait for the process to complete
            proc.wait_check_async(null, (proc, result) => {
                try {
                    proc.wait_check_finish(result);
                } catch (e) {
                    console.error(`Script execution failed: ${e}`);
                }
            });
        } catch (e) {
            console.error(`Failed to launch script: ${e}`);
        }

        Main.overview.hide();
    }

    // Optional method for custom result display
    createResultObject(meta) {
        return null; // Use default implementation
    }
}

export default class ScriptSearchExtension extends Extension {
    enable() {
        this._scriptProvider = new ScriptProvider(this);

        // Use the modern API for GNOME 45+
        Main.overview.searchController.addProvider(this._scriptProvider);
    }

    disable() {
        // Use the modern API for GNOME 45+
        Main.overview.searchController.removeProvider(this._scriptProvider);
        this._scriptProvider = null;
    }
}
