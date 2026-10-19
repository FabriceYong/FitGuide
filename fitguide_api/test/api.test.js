// API suite against a throwaway embedded Postgres.
require('./helpers/setup');
const { defineApiSuite } = require('./apiSuite');

defineApiSuite();
