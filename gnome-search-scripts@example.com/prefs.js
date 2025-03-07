import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import GObject from 'gi://GObject';
import GLib from 'gi://GLib';
import Pango from 'gi://Pango';

import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

// Settings keys
const SCRIPT_LOCATION_KEY = 'script-location';
const DEFAULT_ICON_KEY = 'default-icon';
const DEFAULT_NOTIFICATION_STYLE_KEY = 'default-notification-style';
const REFRESH_SCRIPTS_TRIGGER_KEY = 'refresh-scripts-trigger';

export default class ScriptSearchPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        // Get settings (uses the settings-schema from metadata.json)
        const settings = this.getSettings();

        // Create a preferences page
        const page = new Adw.PreferencesPage({
            title: _('Settings'),
            icon_name: 'preferences-system-symbolic'
        });
        window.add(page);

        // Create a preferences group for script location
        const locationGroup = new Adw.PreferencesGroup({
            title: _('Script Location'),
            description: _('Configure where your scripts are stored')
        });
        page.add(locationGroup);

        // Create a file chooser row for script location
        const locationRow = new Adw.ActionRow({
            title: _('Scripts Directory'),
            subtitle: _('Directory where scripts are stored')
        });

        // Get current location
        const currentLocation = settings.get_string(SCRIPT_LOCATION_KEY);

        // Create a label to display the current location
        const locationLabel = new Gtk.Label({
            label: currentLocation,
            ellipsize: Pango.EllipsizeMode.MIDDLE,
            hexpand: true,
            xalign: 0
        });
        locationRow.add_suffix(locationLabel);

        // Create a button to choose a new location
        const chooseButton = new Gtk.Button({
            label: _('Choose'),
            valign: Gtk.Align.CENTER
        });
        locationRow.add_suffix(chooseButton);

        // Connect the button to a file chooser dialog
        chooseButton.connect('clicked', () => {
            const dialog = new Gtk.FileChooserDialog({
                title: _('Select Scripts Directory'),
                action: Gtk.FileChooserAction.SELECT_FOLDER,
                transient_for: window,
                modal: true
            });

            dialog.add_button(_('Cancel'), Gtk.ResponseType.CANCEL);
            dialog.add_button(_('Select'), Gtk.ResponseType.ACCEPT);

            // Set the current folder
            if (currentLocation.startsWith('~')) {
                dialog.set_current_folder(
                    Gio.File.new_for_path(
                        GLib.get_home_dir() + currentLocation.substring(1)
                    )
                );
            } else {
                dialog.set_current_folder(
                    Gio.File.new_for_path(currentLocation)
                );
            }

            dialog.connect('response', (dialog, response) => {
                if (response === Gtk.ResponseType.ACCEPT) {
                    const file = dialog.get_file();
                    let path = file.get_path();

                    // Convert to ~ notation if in home directory
                    const home = GLib.get_home_dir();
                    if (path.startsWith(home)) {
                        path = '~' + path.substring(home.length);
                    }

                    // Update settings
                    settings.set_string(SCRIPT_LOCATION_KEY, path);
                    locationLabel.set_label(path);
                }

                dialog.destroy();
            });

            dialog.show();
        });

        // Add a reset button
        const resetLocationButton = new Gtk.Button({
            icon_name: 'edit-clear-symbolic',
            tooltip_text: _('Reset to default'),
            valign: Gtk.Align.CENTER
        });
        locationRow.add_suffix(resetLocationButton);

        // Connect the reset button
        resetLocationButton.connect('clicked', () => {
            const defaultValue = '~/.config/gnome-search-scripts';
            settings.set_string(SCRIPT_LOCATION_KEY, defaultValue);
            locationLabel.set_label(defaultValue);
        });

        locationGroup.add(locationRow);

        // Create a refresh scripts row
        const refreshRow = new Adw.ActionRow({
            title: _('Refresh Scripts'),
            subtitle: _('Manually reload all scripts from the directory')
        });

        // Create the refresh button
        const refreshButton = new Gtk.Button({
            label: _('Refresh'),
            valign: Gtk.Align.CENTER
        });

        refreshRow.add_suffix(refreshButton);
        locationGroup.add(refreshRow);

        // Connect the button click to trigger refresh
        refreshButton.connect('clicked', () => {
            // Increment the counter to trigger a refresh
            let counter = settings.get_int(REFRESH_SCRIPTS_TRIGGER_KEY);
            settings.set_int(REFRESH_SCRIPTS_TRIGGER_KEY, counter + 1);

            // Show feedback to the user
            refreshButton.set_sensitive(false);
            refreshButton.set_label(_('Refreshing...'));

            // Re-enable after a short delay
            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
                refreshButton.set_sensitive(true);
                refreshButton.set_label(_('Refresh'));
                return GLib.SOURCE_REMOVE;
            });
        });

        // Create a preferences group for icon settings
        const iconGroup = new Adw.PreferencesGroup({
            title: _('Icon Settings'),
            description: _('Configure the default icon for scripts')
        });
        page.add(iconGroup);

        // Create an entry row for the default icon
        const iconRow = new Adw.EntryRow({
            title: _('Default Icon'),
            text: settings.get_string(DEFAULT_ICON_KEY)
        });

        // Create a preferences group for notification settings
        const notifyGroup = new Adw.PreferencesGroup({
            title: _('Notification Settings'),
            description: _('Configure how scripts notify by default')
        });
        page.add(notifyGroup);

        // Create a combo row for the default notification style
        const notifyRow = new Adw.ComboRow({
            title: _('Default Notification Style'),
            subtitle: _('How scripts notify when not specified')
        });

        // Set up the model with notification style options
        const notifyModel = new Gtk.StringList();
        notifyModel.append(_('Status (Success/Failure)'));
        notifyModel.append(_('Script Output'));
        notifyModel.append(_('No Notification'));
        notifyRow.model = notifyModel;

        // Map combo positions to values
        const notifyMap = ['status', 'stdout', 'none'];
        const currentNotify = settings.get_string(DEFAULT_NOTIFICATION_STYLE_KEY);
        notifyRow.selected = notifyMap.indexOf(currentNotify);

        // Connect to changes
        notifyRow.connect('notify::selected', () => {
            settings.set_string(DEFAULT_NOTIFICATION_STYLE_KEY, notifyMap[notifyRow.selected]);
        });

        notifyGroup.add(notifyRow);

        // Connect the entry to settings
        iconRow.connect('changed', () => {
            settings.set_string(DEFAULT_ICON_KEY, iconRow.get_text());
        });

        // Add a reset button for the icon
        const resetIconButton = new Gtk.Button({
            icon_name: 'edit-clear-symbolic',
            tooltip_text: _('Reset to default'),
            valign: Gtk.Align.CENTER
        });

        // Connect the reset button
        resetIconButton.connect('clicked', () => {
            const defaultValue = 'system-run-symbolic';
            settings.set_string(DEFAULT_ICON_KEY, defaultValue);
            iconRow.set_text(defaultValue);
        });

        iconRow.add_suffix(resetIconButton);
        iconGroup.add(iconRow);

        // Add a help page
        const helpPage = new Adw.PreferencesPage({
            title: _('Help'),
            icon_name: 'help-about-symbolic'
        });
        window.add(helpPage);

        // Create a help group for script format
        const scriptFormatGroup = new Adw.PreferencesGroup({
            title: _('Script Format'),
            description: _('How to format your scripts for this extension')
        });
        helpPage.add(scriptFormatGroup);

        // Add an expander row with script format information
        const formatRow = new Adw.ExpanderRow({
            title: _('Script Metadata Format'),
            subtitle: _('Add metadata to your scripts using comments')
        });

        // Create a label with example script
        const exampleLabel = new Gtk.Label({
            label: _(
                `#!/bin/bash
# Name: My Script
# Description: This script does something useful
# Icon: utilities-terminal-symbolic
# Notify: stdout

echo "Hello, GNOME Shell!"`
            ),
            halign: Gtk.Align.START,
            margin_top: 12,
            margin_bottom: 12,
            margin_start: 12,
            margin_end: 12
        });
        exampleLabel.add_css_class('monospace');
        formatRow.add_row(exampleLabel);
        scriptFormatGroup.add(formatRow);

        // Add notification information
        const notifyHelpGroup = new Adw.PreferencesGroup({
            title: _('Notification Options'),
            description: _('Available notification styles for scripts')
        });
        helpPage.add(notifyHelpGroup);

        // Add an expander row for status notifications
        const statusRow = new Adw.ExpanderRow({
            title: _('Status Notifications'),
            subtitle: _('Default: Shows success or failure with exit code')
        });
        const statusLabel = new Gtk.Label({
            label: _('Add "# Notify: status" to your script to show a simple success/failure notification when the script completes.'),
            wrap: true,
            xalign: 0,
            margin_top: 12,
            margin_bottom: 12,
            margin_start: 12,
            margin_end: 12
        });
        statusRow.add_row(statusLabel);
        notifyHelpGroup.add(statusRow);

        // Add an expander row for stdout notifications
        const stdoutRow = new Adw.ExpanderRow({
            title: _('Output Notifications'),
            subtitle: _('Shows the script\'s output in the notification')
        });
        const stdoutLabel = new Gtk.Label({
            label: _('Add "# Notify: stdout" to your script to show the script\'s output in the notification. If the script fails and has no output, the error message will be shown instead.'),
            wrap: true,
            xalign: 0,
            margin_top: 12,
            margin_bottom: 12,
            margin_start: 12,
            margin_end: 12
        });
        stdoutRow.add_row(stdoutLabel);
        notifyHelpGroup.add(stdoutRow);

        // Add an expander row for no notifications
        const noneRow = new Adw.ExpanderRow({
            title: _('No Notifications'),
            subtitle: _('Runs silently without any notifications')
        });
        const noneLabel = new Gtk.Label({
            label: _('Add "# Notify: none" to your script to run it silently without showing any notifications.'),
            wrap: true,
            xalign: 0,
            margin_top: 12,
            margin_bottom: 12,
            margin_start: 12,
            margin_end: 12
        });
        noneRow.add_row(noneLabel);
        notifyHelpGroup.add(noneRow);

        // Add usage information
        const usageGroup = new Adw.PreferencesGroup({
            title: _('Usage'),
            description: _('How to use this extension')
        });
        helpPage.add(usageGroup);

        const usageRow = new Adw.ActionRow({
            title: _('Searching for Scripts'),
            subtitle: _('Open the Activities overview and start typing the name of your script')
        });
        usageGroup.add(usageRow);
    }
}
