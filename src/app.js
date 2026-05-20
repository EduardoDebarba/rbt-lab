const express = require('express');
const cors = require('cors');

const routes = require('./routes');
const { env } = require('./config/env');
const { notFoundMiddleware } = require('./middlewares/notFound.middleware');
const { errorMiddleware } = require('./middlewares/error.middleware');

const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', routes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
