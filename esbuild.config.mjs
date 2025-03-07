import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';

const watch = process.argv.includes('--watch');

// Extension UUID
const extensionUUID = 'gnome-search-scripts@example.com';

// Output directory
const outDir = path.join(process.cwd(), 'dist', extensionUUID);

// Ensure output directory exists
fs.mkdirSync(outDir, { recursive: true });

// Copy metadata.json and schemas to output directory
fs.copyFileSync(
    path.join(process.cwd(), 'gnome-search-scripts@example.com', 'metadata.json'),
    path.join(outDir, 'metadata.json')
);

// Create schemas directory in output
const schemasDir = path.join(outDir, 'schemas');
fs.mkdirSync(schemasDir, { recursive: true });

// Copy schema file
fs.copyFileSync(
    path.join(process.cwd(), 'gnome-search-scripts@example.com', 'schemas', 'org.gnome.shell.extensions.gnome-search-scripts.gschema.xml'),
    path.join(schemasDir, 'org.gnome.shell.extensions.gnome-search-scripts.gschema.xml')
);

// Copy compiled schemas if they exist
const compiledSchemaPath = path.join(process.cwd(), 'gnome-search-scripts@example.com', 'schemas', 'gschemas.compiled');
if (fs.existsSync(compiledSchemaPath)) {
    fs.copyFileSync(
        compiledSchemaPath,
        path.join(schemasDir, 'gschemas.compiled')
    );
}

// Build configuration
const config = {
    entryPoints: [
        'src/extension.ts',
        'src/prefs.ts'
    ],
    outdir: outDir,
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    external: [
        'gi://*',
        'resource://*'
    ],
    logLevel: 'info',
    minify: false,
    treeShaking: true
};

// Run the build
if (watch) {
    // Watch mode
    const context = await esbuild.context(config);
    await context.watch();
    console.log('Watching for changes...');
} else {
    // Build once
    await esbuild.build(config);
    console.log('Build complete!');
}
