// API suite against the JSON mock database (MOCK_DB_PATH in a temp dir).
require('./helpers/setup');
const { defineApiSuite } = require('./apiSuite');

defineApiSuite('mock');
