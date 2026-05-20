require('dotenv').config();

const app = require('./app');
const { env } = require('./config/env');

app.listen(env.port, () => {
  console.log(`RBT Lab API running on port ${env.port}`);
});
