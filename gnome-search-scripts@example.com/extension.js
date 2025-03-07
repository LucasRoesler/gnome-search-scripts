import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import { ScriptProvider } from './lib/scriptProvider.js';
import {
    SCRIPT_LOCATION_KEY,
    DEFAULT_ICON_KEY,
    DEFAULT_NOTIFICATION_STYLE_KEY,
    REFRESH_SCRIPTS_TRIGGER_KEY
} from './lib/constants.js';

/**
 * Main extension class
 */
export default class ScriptSearchExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        this._settings = null;
        this._settingsChangedIds = [];
    }

    enable() {
        // Load settings (uses the settings-schema from metadata.json)
        this._settings = this.getSettings();

        // Initialize the provider with the settings
        this._scriptProvider = new ScriptProvider(this, this._settings);

        // Connect to settings changes
        this._settingsChangedIds.push(
            this._settings.connect(`changed::${SCRIPT_LOCATION_KEY}`,
                () => this._scriptProvider.updateScriptLocation())
        );
        this._settingsChangedIds.push(
            this._settings.connect(`changed::${DEFAULT_ICON_KEY}`,
                () => this._scriptProvider.updateDefaultIcon())
        );
        this._settingsChangedIds.push(
            this._settings.connect(`changed::${DEFAULT_NOTIFICATION_STYLE_KEY}`,
                () => this._scriptProvider.updateDefaultNotificationStyle())
        );

        // Connect to refresh trigger
        this._settingsChangedIds.push(
            this._settings.connect(`changed::${REFRESH_SCRIPTS_TRIGGER_KEY}`,
                () => this._scriptProvider.refreshScripts())
        );

        // Register the provider
        Main.overview.searchController.addProvider(this._scriptProvider);
    }

    disable() {
        // Unregister the provider
        Main.overview.searchController.removeProvider(this._scriptProvider);

        // Disconnect settings signals
        this._settingsChangedIds.forEach(id => {
            if (this._settings) {
                this._settings.disconnect(id);
            }
        });
        this._settingsChangedIds = [];

        // Clean up the provider
        if (this._scriptProvider) {
            this._scriptProvider.destroy();
            this._scriptProvider = null;
        }

        this._settings = null;
    }
}
