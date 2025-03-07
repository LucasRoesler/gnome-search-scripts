import St from 'gi://St';
import * as Utils from './utils.js';

/**
 * Handles search functionality for scripts
 */
export class SearchHandler {
    /**
     * Create a new SearchHandler
     *
     * @param {Array} scripts - Array of script objects
     */
    constructor(scripts) {
        this._scripts = scripts;
    }

    /**
     * Update the scripts array
     *
     * @param {Array} scripts - New array of script objects
     */
    updateScripts(scripts) {
        this._scripts = scripts;
    }

    /**
     * Get initial result set based on search terms
     *
     * @param {Array} terms - Search terms
     * @param {Object} cancellable - Cancellable object
     * @returns {Promise<Array>} Promise resolving to array of result IDs
     */
    async getInitialResultSet(terms, cancellable) {
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
            const matchedScripts = [];

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

            if (cancelId && !cancellable.is_cancelled())
                cancellable.disconnect(cancelId);

            resolve(results);
        });
    }

    /**
     * Get subsearch result set based on previous results and new terms
     *
     * @param {Array} previousResults - Previous search results
     * @param {Array} terms - Search terms
     * @param {Object} cancellable - Cancellable object
     * @returns {Promise<Array>} Promise resolving to array of result IDs
     */
    async getSubsearchResultSet(previousResults, terms, cancellable) {
        // For simplicity, we just perform a new search
        return this.getInitialResultSet(terms, cancellable);
    }

    /**
     * Filter results to the maximum number allowed
     *
     * @param {Array} results - Search results
     * @param {number} maxResults - Maximum number of results to return
     * @returns {Array} Filtered results
     */
    filterResults(results, maxResults) {
        if (results.length <= maxResults)
            return results;
        return results.slice(0, maxResults);
    }

    /**
     * Get metadata for search results
     *
     * @param {Array} resultIds - Result IDs
     * @param {Object} cancellable - Cancellable object
     * @returns {Promise<Array>} Promise resolving to array of result metadata
     */
    async getResultMetas(resultIds, cancellable) {
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
                    createIcon: (size) => {
                        return new St.Icon({
                            icon_name: script.icon,
                            width: size * scaleFactor,
                            height: size * scaleFactor
                        });
                    }
                };
            }).filter(meta => meta !== null);

            console.log(`Returning ${metas.length} metadata objects`);

            if (cancelId && !cancellable.is_cancelled())
                cancellable.disconnect(cancelId);

            resolve(metas);
        });
    }
}
