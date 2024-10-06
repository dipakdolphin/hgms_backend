require('dotenv').config();

module.exports = {
    apps: [
        {
            name: 'hgms',
            script: './src/index.js',  // Entry point to your app
            env: {
                NODE_ENV: 'development',
                PORT: process.env.PORT,              // Use variables from .env
                DATABASE_URL: process.env.DATABASE_URL,
                SECRET_KEY: process.env.SECRET_KEY
            },
            env_production: {
                NODE_ENV: 'prod',
                DATABASE_PORT: process.env.DATABASE_PORT,              // Use variables from .env
                DATABASE_NAME: process.env.DATABASE_NAME,
                DATABASE_USER: process.env.DATABASE_USER,
                DATABASE_PASSWORD: process.env.DATABASE_PASSWORD,
                HOST: process.env.HOST,
                DATABASE_URL: process.env.DATABASE_URL,
                SECRET_KEY: process.env.SECRET_KEY
            }
        }
    ]
};