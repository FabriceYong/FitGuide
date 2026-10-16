// API suite against MongoDB, using a throwaway mongodb-memory-server instance.
require('./helpers/setup');
const { defineApiSuite } = require('./apiSuite');

defineApiSuite('mongo');
