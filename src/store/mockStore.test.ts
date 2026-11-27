import { contractSuite } from './contract.suite';
import { createMockStore } from './mockStore';

contractSuite('mock', createMockStore);
