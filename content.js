import { registerPhysicalScanner } from './scanner/physicalScanner.js';
import { registerMockScanner } from './scanner/mockScanner.js';
import { registerUserSwitcher } from './listener/userSwitcher.js';
import { showActiveBadge } from './ui/badge.js';
import { findUser } from './db/userRepo.js';



showActiveBadge();

registerPhysicalScanner();
registerMockScanner();
registerUserSwitcher();



