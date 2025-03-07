import St from 'gi://St';
import Gio from 'gi://Gio';
import { NotificationType } from './constants.js';

/**
 * Script object interface
 */
export interface Script {
    file: string;
    path: string;
    name: string;
    description: string;
    icon: string;
    notify: NotificationType;
}

/**
 * Result metadata interface
 */
export interface ResultMeta {
    id: string;
    name: string;
    description: string;
    createIcon: (size: number) => St.Icon;
}

/**
 * Handles search functionality for scripts
 */
export class SearchHandler {
    private _scripts: Script[];

    /**
     * Create a new SearchHandler
     *
     * @param scripts - Array of script objects
     */
    constructor(scripts: Script[]) {
        this._scripts = scripts;
    }

    /**
     * Update the scripts array
     *
     * @param scripts - New array of script objects
     */
    updateScripts(scripts: Script[]): void {
        this._scripts = scripts;
    }

    /**
     * Get initial result set based on search terms
     *
     * @param terms - Search terms
     * @param cancellable - Cancellable object
     * @returns Promise resolving to array of result IDs
     */
    async getInitialResultSet(terms: string[], cancellable?: Gio.Cancellable): Promise<string[]> {
        return new Promise((resolve, reject) => {
            // Handle cancellation
            const cancelId = cancellable?.connect(() => {
                reject(new Error('Search cancelled'));
            });

            // Log search operation
            const searchTerm = terms.join(' ').toLowerCase();
            console.log(`Searching for: "${searchTerm}"`);
            console.log(`Total scripts available: ${this._scripts.length}`);

            // Debug log all available scripts
            this._scripts.forEach((script, index) => {
                console.log(`Script ${index}: ${script.name} (path: ${script.path})`);
            });

            // Filter scripts and track original indices
            const matchedScripts: string[] = [];

            this._scripts.forEach((script, originalIndex) => {
                // Check if the search term matches the script name or description
                const nameMatch = script.name.toLowerCase().includes(searchTerm);
                const descriptionMatch = script.description.toLowerCase().includes(searchTerm);

                // Check if the search term matches part of the directory path
                let pathMatch = false;
                if (script.path && script.path !== script.file) {
                    // Extract the directory part of the path
                    const dirPath = script.path.substring(0, script.path.lastIndexOf('/'));
                    pathMatch = dirPath.toLowerCase().includes(searchTerm);
                }

                // Log match details for debugging
                const matches = nameMatch || descriptionMatch || pathMatch;
                console.log(`Checking "${script.name}": nameMatch=${nameMatch}, descMatch=${descriptionMatch}, pathMatch=${pathMatch}, RESULT=${matches}`);

                if (matches) {
                    console.log(`Match found: ${script.name} at original index ${originalIndex}`);
                    matchedScripts.push(originalIndex.toString());
                }
            });

            const results = matchedScripts;

            console.log(`Search results: ${results.length} matches found`);

            if (cancelId && !cancellable?.is_cancelled())
                cancellable.disconnect(cancelId);

            resolve(results);
        });
    }

    /**
     * Get subsearch result set based on previous results and new terms
     *
     * @param previousResults - Previous search results
     * @param terms - Search terms
     * @param cancellable - Cancellable object
     * @returns Promise resolving to array of result IDs
     */
    async getSubsearchResultSet(previousResults: string[], terms: string[], cancellable?: Gio.Cancellable): Promise<string[]> {
        // For simplicity, we just perform a new search
        return this.getInitialResultSet(terms, cancellable);
    }

    /**
     * Filter results to the maximum number allowed
     *
     * @param results - Search results
     * @param maxResults - Maximum number of results to return
     * @returns Filtered results
     */
    filterResults(results: string[], maxResults: number): string[] {
        if (results.length <= maxResults)
            return results;
        return results.slice(0, maxResults);
    }

    /**
     * Get metadata for search results
     *
     * @param resultIds - Result IDs
     * @param cancellable - Cancellable object
     * @returns Promise resolving to array of result metadata
     */
    async getResultMetas(resultIds: string[], cancellable?: Gio.Cancellable): Promise<ResultMeta[]> {
        return new Promise((resolve, reject) => {
            const cancelId = cancellable?.connect(() => {
                reject(new Error('Operation cancelled'));
            });

            console.log(`Getting metadata for result IDs: ${resultIds.join(', ')}`);

            const metas = resultIds.map(id => {
                const index = parseInt(id);
                console.log(`Processing result ID ${id} (index ${index})`);

                if (index < 0 || index >= this._scripts.length) {
                    console.error(`Invalid script index: ${index}, scripts length: ${this._scripts.length}`);
                    return null;
                }

                const script = this._scripts[index];
                console.log(`Found script for ID ${id}: ${script.name}`);

                const scaleFactor = St.ThemeContext.get_for_stage(global.stage).scale_factor;

                // For scripts in subdirectories, include the path in the description
                let description = script.description;
                if (script.path && script.path !== script.file) {
                    // Extract the directory part of the path
                    const dirPath = script.path.substring(0, script.path.lastIndexOf('/'));
                    // If there's a description, append the path. Otherwise, just use the path.
                    description = description ?
                        `${description} [${dirPath}]` :
                        `[${dirPath}]`;
                }

                return {
                    id: id,
                    name: script.name,
                    description: description,
                    createIcon: (size: number) => {
                        return new St.Icon({
                            icon_name: script.icon,
                            width: size * scaleFactor,
                            height: size * scaleFactor
                        });
                    }
                };
            }).filter((meta): meta is ResultMeta => meta !== null);

            console.log(`Returning ${metas.length} metadata objects`);

            if (cancelId && !cancellable?.is_cancelled())
                cancellable.disconnect(cancelId);

            resolve(metas);
        });
    }
}
