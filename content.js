import { showActiveBadge } from './ui/badge.js';
import { registerPhysicalScanner } from './scanner/physicalScanner.js';
import { registerMockScanner } from './scanner/mockScanner.js';
// import { registerPhysicalScanner } from './scanner/physicalScanner.js';

// import { registerMockScanner } from './scanners/mockScanner.js';

showActiveBadge();

registerPhysicalScanner();
registerMockScanner();
