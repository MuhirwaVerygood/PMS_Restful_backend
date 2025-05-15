import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createRequire } from 'module';

// Convert Windows path to file URL
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Or create a require function for importing CommonJS modules
const require = createRequire(import.meta.url);
